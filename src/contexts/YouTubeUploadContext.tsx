import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface YouTubeUploadJob {
  id: string;
  sessionDbId: string;
  file: File;
  title: string;
  clientName: string;
  eventName: string;
  editType: string;
  playlistId: string;
  playlistTitle: string;
  thumbnailFile: File | null;
  trackerRowId: string;
  uploadUri: string;
  progress: number;
  bytesUploaded: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused' | 'cancelled';
  youtubeVideoId: string;
  youtubeLink: string;
  error?: string;
}

interface YouTubeUploadContextType {
  jobs: YouTubeUploadJob[];
  remoteJobs: RemoteYTSession[];
  startUpload: (params: StartUploadParams) => Promise<void>;
  pauseJob: (jobId: string) => void;
  resumeJob: (jobId: string) => void;
  cancelJob: (jobId: string) => void;
  clearCompleted: () => void;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  activeCount: number;
}

export interface StartUploadParams {
  file: File;
  title: string;
  clientName: string;
  eventName: string;
  editType: string;
  playlistId: string;
  playlistTitle: string;
  thumbnailFile: File | null;
  trackerRowId: string;
  privacy: string;
}

export interface RemoteYTSession {
  id: string;
  client_name: string;
  event_name: string;
  edit_type: string;
  title: string;
  video_file_name: string;
  file_size_bytes: number;
  bytes_uploaded: number;
  status: string;
  youtube_link: string;
  started_by: string;
}

const YouTubeUploadContext = createContext<YouTubeUploadContextType>({
  jobs: [],
  remoteJobs: [],
  startUpload: async () => {},
  pauseJob: () => {},
  resumeJob: () => {},
  cancelJob: () => {},
  clearCompleted: () => {},
  expanded: false,
  setExpanded: () => {},
  activeCount: 0,
});

export const useYouTubeUploadContext = () => useContext(YouTubeUploadContext);

/** Invalidate all YouTube-related localStorage caches */
function invalidateYTCache(playlistId?: string) {
  try {
    // Clear recent cache
    localStorage.removeItem("yt_cache_recent");
    localStorage.removeItem("yt_cache_recent_ts");
    // Clear playlists cache
    localStorage.removeItem("yt_cache_playlists");
    localStorage.removeItem("yt_cache_playlists_ts");
    // Clear specific playlist video cache
    if (playlistId) {
      localStorage.removeItem(`yt_cache_plvids_${playlistId}`);
      localStorage.removeItem(`yt_cache_plvids_ts_${playlistId}`);
    }
  } catch {}
}

export function YouTubeUploadProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<YouTubeUploadJob[]>([]);
  const [remoteJobs, setRemoteJobs] = useState<RemoteYTSession[]>([]);
  const [expanded, setExpanded] = useState(false);
  const pausedRef = useRef<Set<string>>(new Set());
  const cancelledRef = useRef<Set<string>>(new Set());
  const xhrRef = useRef<Map<string, XMLHttpRequest>>(new Map());
  // Dedup guard: track recent startUpload calls
  const startingRef = useRef<Map<string, number>>(new Map());

  // Subscribe to realtime updates from youtube_upload_sessions
  useEffect(() => {
    const channel = supabase
      .channel('yt-upload-sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'youtube_upload_sessions' },
        () => {
          loadRemoteSessions();
        }
      )
      .subscribe();

    loadRemoteSessions();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadRemoteSessions = async () => {
    const { data } = await supabase
      .from('youtube_upload_sessions')
      .select('*')
      .in('status', ['pending', 'uploading', 'completed', 'failed', 'paused'])
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setRemoteJobs(data as RemoteYTSession[]);
  };

  const updateJob = useCallback((jobId: string, patch: Partial<YouTubeUploadJob>) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...patch } : j));
  }, []);

  const updateRemoteSession = async (dbId: string, patch: Record<string, any>) => {
    await supabase.from('youtube_upload_sessions').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', dbId);
  };

  const pauseJob = useCallback((jobId: string) => {
    pausedRef.current.add(jobId);
    const xhr = xhrRef.current.get(jobId);
    if (xhr) xhr.abort();
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'paused' as const } : j));
    const job = jobs.find(j => j.id === jobId);
    if (job) updateRemoteSession(job.sessionDbId, { status: 'paused', bytes_uploaded: job.bytesUploaded });
  }, [jobs]);

  const resumeJob = useCallback((jobId: string) => {
    pausedRef.current.delete(jobId);
    const job = jobs.find(j => j.id === jobId);
    if (job && job.status === 'paused') {
      resumeUpload(job);
    }
  }, [jobs]);

  const cancelJob = useCallback((jobId: string) => {
    cancelledRef.current.add(jobId);
    const xhr = xhrRef.current.get(jobId);
    if (xhr) xhr.abort();
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'cancelled' as const } : j));
    const job = jobs.find(j => j.id === jobId);
    if (job) updateRemoteSession(job.sessionDbId, { status: 'failed' });
  }, [jobs]);

  const clearCompleted = useCallback(() => {
    const completedDbIds = jobs.filter(j => j.status === 'completed' || j.status === 'cancelled' || j.status === 'failed').map(j => j.sessionDbId);
    setJobs(prev => prev.filter(j => j.status === 'pending' || j.status === 'uploading' || j.status === 'paused'));
    // Clean remote sessions
    for (const dbId of completedDbIds) {
      supabase.from('youtube_upload_sessions').delete().eq('id', dbId).then(() => {});
    }
  }, [jobs]);

  const resumeUpload = async (job: YouTubeUploadJob) => {
    if (!job.uploadUri || cancelledRef.current.has(job.id)) return;

    updateJob(job.id, { status: 'uploading' });
    await updateRemoteSession(job.sessionDbId, { status: 'uploading' });

    // Query YouTube for bytes already received
    let startByte = job.bytesUploaded;
    try {
      const checkXhr = new XMLHttpRequest();
      checkXhr.open("PUT", job.uploadUri, false);
      checkXhr.setRequestHeader("Content-Range", `bytes */${job.file.size}`);
      checkXhr.send(null);
      if (checkXhr.status === 308) {
        const range = checkXhr.getResponseHeader("Range");
        if (range) {
          const match = range.match(/bytes=0-(\d+)/);
          if (match) startByte = parseInt(match[1]) + 1;
        }
      }
    } catch {
      // If check fails, resume from last known position
    }

    doUpload(job, startByte);
  };

  const checkUploadStatus = async (uploadUri: string, fileSize: number): Promise<{ completed: boolean; videoId?: string; responseText?: string }> => {
    try {
      const resp = await fetch(uploadUri, {
        method: 'PUT',
        headers: { 'Content-Range': `bytes */${fileSize}` },
      });
      if (resp.status === 200 || resp.status === 201) {
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          return { completed: true, videoId: data.id, responseText: text };
        } catch {
          return { completed: true, responseText: text };
        }
      }
      return { completed: false };
    } catch {
      return { completed: false };
    }
  };

  const handleUploadSuccess = async (job: YouTubeUploadJob, videoId: string) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    updateJob(job.id, {
      status: 'completed',
      progress: 100,
      youtubeVideoId: videoId,
      youtubeLink: youtubeUrl,
      bytesUploaded: job.file.size,
    });

    await updateRemoteSession(job.sessionDbId, {
      status: 'completed',
      bytes_uploaded: job.file.size,
      youtube_video_id: videoId,
      youtube_link: youtubeUrl,
    });

    if (job.trackerRowId) {
      try {
        const { data: existing } = await supabase
          .from('video_edit_tracker')
          .select('youtube_link')
          .eq('id', job.trackerRowId)
          .maybeSingle();
        const currentLinks = existing?.youtube_link || '';
        const newLink = currentLinks ? `${currentLinks},${youtubeUrl}` : youtubeUrl;
        await supabase
          .from('video_edit_tracker')
          .update({ youtube_link: newLink, updated_at: new Date().toISOString() })
          .eq('id', job.trackerRowId);
      } catch (err) {
        console.warn("Failed to update tracker youtube_link:", err);
      }
    }

    if (job.playlistId && videoId) {
      try {
        await supabase.functions.invoke("youtube-upload", {
          body: { action: "addToPlaylist", playlistId: job.playlistId, videoId },
        });
        invalidateYTCache(job.playlistId);
      } catch (err) {
        console.warn("Failed to add to playlist:", err);
      }
    }

    if (job.thumbnailFile && videoId) {
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(job.thumbnailFile!);
        });
        await supabase.functions.invoke("youtube-upload", {
          body: { action: "setThumbnail", videoId, thumbnailBase64: base64, mimeType: job.thumbnailFile!.type },
        });
      } catch (err) {
        console.warn("Failed to set thumbnail:", err);
      }
    }
  };

  const retryStatusCheck = async (job: YouTubeUploadJob): Promise<boolean> => {
    // Retry 1: wait 3s
    await new Promise(r => setTimeout(r, 3000));
    const check1 = await checkUploadStatus(job.uploadUri, job.file.size);
    if (check1.completed && check1.videoId) {
      await handleUploadSuccess(job, check1.videoId);
      return true;
    }
    // Retry 2: wait 5s
    await new Promise(r => setTimeout(r, 5000));
    const check2 = await checkUploadStatus(job.uploadUri, job.file.size);
    if (check2.completed && check2.videoId) {
      await handleUploadSuccess(job, check2.videoId);
      return true;
    }
    return false;
  };

  const doUpload = (job: YouTubeUploadJob, startByte: number) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current.set(job.id, xhr);
    xhr.open("PUT", job.uploadUri);

    const fileSlice = startByte > 0 ? job.file.slice(startByte) : job.file;
    const contentType = job.file.type || "video/mp4";
    xhr.setRequestHeader("Content-Type", contentType);

    if (startByte > 0) {
      xhr.setRequestHeader("Content-Range", `bytes ${startByte}-${job.file.size - 1}/${job.file.size}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const uploaded = startByte + e.loaded;
        const percent = Math.round((uploaded / job.file.size) * 100);
        updateJob(job.id, { progress: percent, bytesUploaded: uploaded });
        if (percent % 5 === 0) {
          updateRemoteSession(job.sessionDbId, { bytes_uploaded: uploaded, status: 'uploading' });
        }
      }
    };

    xhr.onload = async () => {
      xhrRef.current.delete(job.id);
      if (xhr.status >= 200 && xhr.status < 300) {
        let videoId = '';

        // Try parsing response
        try {
          const text = xhr.responseText;
          if (text) {
            const result = JSON.parse(text);
            videoId = result.id;
          }
        } catch (err: any) {
          console.warn("Failed to parse upload response:", err);
        }

        // Fallback: if no videoId from response, do a status check
        if (!videoId) {
          const check = await checkUploadStatus(job.uploadUri, job.file.size);
          if (check.completed && check.videoId) {
            videoId = check.videoId;
          }
        }

        if (videoId) {
          await handleUploadSuccess(job, videoId);
        } else {
          updateJob(job.id, { status: 'failed', error: 'Upload completed but could not retrieve video ID' });
          await updateRemoteSession(job.sessionDbId, { status: 'failed' });
        }
      } else {
        // Non-2xx: if all bytes were sent, retry status check before failing
        if (!pausedRef.current.has(job.id) && !cancelledRef.current.has(job.id)) {
          const allBytesSent = (startByte + fileSlice.size) >= job.file.size;
          if (allBytesSent) {
            console.warn(`[YT-UPLOAD] Got ${xhr.status} after full transfer, checking status...`);
            updateJob(job.id, { status: 'uploading', error: undefined });
            const recovered = await retryStatusCheck(job);
            if (!recovered) {
              updateJob(job.id, { status: 'failed', error: `Upload failed: ${xhr.status} (verified not completed)` });
              await updateRemoteSession(job.sessionDbId, { status: 'failed' });
            }
          } else {
            updateJob(job.id, { status: 'failed', error: `Upload failed: ${xhr.status}` });
            await updateRemoteSession(job.sessionDbId, { status: 'failed' });
          }
        }
      }
    };

    xhr.onerror = async () => {
      xhrRef.current.delete(job.id);
      if (!pausedRef.current.has(job.id) && !cancelledRef.current.has(job.id)) {
        // If nearly all bytes uploaded, check if YouTube actually received it
        if (job.bytesUploaded >= job.file.size * 0.99) {
          console.warn("[YT-UPLOAD] Network error after 99%+ transfer, checking status...");
          updateJob(job.id, { status: 'uploading', error: undefined });
          const recovered = await retryStatusCheck(job);
          if (!recovered) {
            updateJob(job.id, { status: 'failed', error: "Network error (verified not completed)" });
            await updateRemoteSession(job.sessionDbId, { status: 'failed' });
          }
        } else {
          updateJob(job.id, { status: 'failed', error: "Network error" });
          await updateRemoteSession(job.sessionDbId, { status: 'failed' });
        }
      }
    };

    xhr.send(fileSlice);
  };

  const startUpload = useCallback(async (params: StartUploadParams) => {
    // Dedup guard: prevent double-invocation for the same file within 2 seconds
    const dedupKey = `${params.file.name}|${params.eventName}|${params.editType}`;
    const now = Date.now();
    const lastStart = startingRef.current.get(dedupKey);
    if (lastStart && now - lastStart < 2000) {
      console.warn("[YT-UPLOAD] Duplicate upload prevented:", dedupKey);
      return;
    }
    startingRef.current.set(dedupKey, now);

    // Also check if a job with the same key is already active
    const existingJob = jobs.find(j =>
      j.file.name === params.file.name &&
      j.eventName === params.eventName &&
      j.editType === params.editType &&
      (j.status === 'uploading' || j.status === 'pending')
    );
    if (existingJob) {
      console.warn("[YT-UPLOAD] Job already in progress:", dedupKey);
      return;
    }

    const jobId = `yt-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create DB session first
    const { data: dbSession } = await supabase.from('youtube_upload_sessions').insert({
      client_name: params.clientName,
      event_name: params.eventName,
      edit_type: params.editType,
      title: params.title,
      video_file_name: params.file.name,
      file_size_bytes: params.file.size,
      status: 'uploading',
      started_by: 'user',
      playlist_id: params.playlistId,
    }).select('id').single();

    // Init resumable upload via edge function
    const { data: initData, error: initError } = await supabase.functions.invoke("youtube-upload", {
      body: {
        action: "initUpload",
        title: params.title,
        description: `${params.title} | Xito Production`,
        tags: ["wedding", "nepal", "xito", "weddingtalesnepal"],
        privacy: params.privacy || "private",
      },
    });

    if (initError || !initData?.upload_uri) {
      throw new Error(initData?.error || initError?.message || "Failed to init upload");
    }

    const uploadUri = initData.upload_uri;

    // Find matching tracker row
    let trackerRowId = params.trackerRowId;

    const job: YouTubeUploadJob = {
      id: jobId,
      sessionDbId: dbSession?.id || '',
      file: params.file,
      title: params.title,
      clientName: params.clientName,
      eventName: params.eventName,
      editType: params.editType,
      playlistId: params.playlistId,
      playlistTitle: params.playlistTitle,
      thumbnailFile: params.thumbnailFile,
      trackerRowId,
      uploadUri,
      progress: 0,
      bytesUploaded: 0,
      status: 'uploading',
      youtubeVideoId: '',
      youtubeLink: '',
    };

    setJobs(prev => [job, ...prev]);
    setExpanded(true);

    // Update DB with upload URI
    if (dbSession?.id) {
      await updateRemoteSession(dbSession.id, { upload_uri: uploadUri, status: 'uploading' });
    }

    // Start upload
    doUpload(job, 0);
  }, [jobs]);

  const activeCount = jobs.filter(j => j.status === 'uploading' || j.status === 'pending' || j.status === 'paused').length;

  return (
    <YouTubeUploadContext.Provider value={{
      jobs, remoteJobs, startUpload, pauseJob, resumeJob, cancelJob, clearCompleted, expanded, setExpanded, activeCount,
    }}>
      {children}
    </YouTubeUploadContext.Provider>
  );
}
