import React, { createContext, useContext, useState, useCallback } from "react";
import { uploadToE2, listE2Folder } from "@/lib/idrive-e2-api";
import { supabase } from "@/integrations/supabase/client";

const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mxf', 'wmv', 'flv'];
function isVideo(name: string) {
  return VIDEO_EXTS.includes(name.split('.').pop()?.toLowerCase() || '');
}

export interface XitoUploadSessionMeta {
  shotBy: string;
  eventName: string;
  eventDate: string;
  expectedCount: number;
  folderPrefix: string;
}

export interface XitoUploadJob {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'skipped';
  error?: string;
}

export interface XitoUploadSession {
  id: string;
  meta: XitoUploadSessionMeta;
  jobs: XitoUploadJob[];
  startedAt: number;
}

interface XitoDriveUploadContextType {
  sessions: XitoUploadSession[];
  activeSession: XitoUploadSession | null;
  startUpload: (files: File[], meta: XitoUploadSessionMeta) => Promise<void>;
  activeCount: number;
  clearCompleted: () => void;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}

const XitoDriveUploadContext = createContext<XitoDriveUploadContextType>({
  sessions: [],
  activeSession: null,
  startUpload: async () => {},
  activeCount: 0,
  clearCompleted: () => {},
  expanded: false,
  setExpanded: () => {},
});

export const useXitoDriveUploadContext = () => useContext(XitoDriveUploadContext);

export function XitoDriveUploadProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<XitoUploadSession[]>([]);
  const [expanded, setExpanded] = useState(false);

  const updateJob = useCallback((sessionId: string, jobId: string, patch: Partial<XitoUploadJob>) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, jobs: s.jobs.map(j => j.id === jobId ? { ...j, ...patch } : j) }
        : s
    ));
  }, []);

  const startUpload = useCallback(async (files: File[], meta: XitoUploadSessionMeta) => {
    const sessionId = `xito-${Date.now()}`;

    // Fetch existing files in the target folder to skip duplicates
    let existingFileNames = new Set<string>();
    try {
      const listing = await listE2Folder(meta.folderPrefix);
      existingFileNames = new Set(listing.files.map(f => {
        const parts = f.key.split("/");
        return parts[parts.length - 1].toLowerCase();
      }));
    } catch {
      // If listing fails, upload all
    }

    const jobs: XitoUploadJob[] = files.map(file => ({
      id: `${sessionId}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: existingFileNames.has(file.name.toLowerCase()) ? 'skipped' as const : 'pending' as const,
    }));

    const session: XitoUploadSession = {
      id: sessionId,
      meta,
      jobs,
      startedAt: Date.now(),
    };

    setSessions(prev => [session, ...prev]);

    // Process non-skipped jobs sequentially
    const pendingJobs = jobs.filter(j => j.status === 'pending');
    let completedCount = 0;
    let completedSize = 0;
    const videoFiles: { name: string; size: number }[] = [];

    for (const job of pendingJobs) {
      updateJob(sessionId, job.id, { status: 'uploading', progress: 5 });
      try {
        await uploadToE2(meta.folderPrefix, job.file, (percent) => {
          updateJob(sessionId, job.id, { progress: percent });
        });
        updateJob(sessionId, job.id, { status: 'completed', progress: 100 });
        completedCount++;
        completedSize += job.file.size;
        if (isVideo(job.file.name)) {
          videoFiles.push({ name: job.file.name, size: job.file.size });
        }
      } catch (err: any) {
        updateJob(sessionId, job.id, { status: 'failed', progress: 0, error: err.message });
      }
    }

    // Log activity to database
    try {
      const photoCount = completedCount - videoFiles.length;
      const photoSize = completedSize - videoFiles.reduce((s, v) => s + v.size, 0);

      // Derive client name from folder path segments (2nd segment typically)
      const pathSegments = meta.folderPrefix.split('/').filter(Boolean);
      const derivedClientName = pathSegments.length >= 2 ? pathSegments[1] : pathSegments[0] || '';

      // Log bulk photo entry
      if (photoCount > 0) {
        await supabase.from("xito_activity_log").insert({
          action_type: 'upload',
          folder_path: meta.folderPrefix,
          client_name: derivedClientName,
          event_name: meta.eventName,
          photographer: meta.shotBy,
          file_count: photoCount,
          total_size_bytes: photoSize,
          file_name: '',
          is_video: false,
        });
      }

      // Log each video individually
      for (const vid of videoFiles) {
        await supabase.from("xito_activity_log").insert({
          action_type: 'upload',
          folder_path: meta.folderPrefix,
          client_name: meta.eventName ? meta.eventName : '',
          event_name: meta.eventName,
          photographer: meta.shotBy,
          file_count: 1,
          total_size_bytes: vid.size,
          file_name: vid.name,
          is_video: true,
        });
      }
    } catch (err) {
      console.warn("Failed to log xito activity:", err);
    }
  }, [updateJob]);

  const clearCompleted = useCallback(() => {
    setSessions(prev => prev.filter(s => s.jobs.some(j => j.status === 'pending' || j.status === 'uploading')));
  }, []);

  const activeSession = sessions.find(s => s.jobs.some(j => j.status === 'uploading' || j.status === 'pending')) || null;
  const activeCount = sessions.reduce((sum, s) => sum + s.jobs.filter(j => j.status === 'uploading' || j.status === 'pending').length, 0);

  return (
    <XitoDriveUploadContext.Provider value={{ sessions, activeSession, startUpload, activeCount, clearCompleted, expanded, setExpanded }}>
      {children}
    </XitoDriveUploadContext.Provider>
  );
}
