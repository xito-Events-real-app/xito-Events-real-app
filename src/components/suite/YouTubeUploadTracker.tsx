import { useYouTubeUploadContext, YouTubeUploadJob, RemoteYTSession } from "@/contexts/YouTubeUploadContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, AlertCircle, Pause, Play, Ban, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 2 : 0)} ${units[i]}`;
}

function LocalJobCard({ job }: { job: YouTubeUploadJob }) {
  const { pauseJob, resumeJob, cancelJob } = useYouTubeUploadContext();
  const hasActive = job.status === 'uploading' || job.status === 'paused';

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Youtube className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{job.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {job.clientName} • {job.eventName} • {job.editType}
          </p>
        </div>
        {hasActive && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost" size="icon" className="h-6 w-6"
              onClick={() => job.status === 'paused' ? resumeJob(job.id) : pauseJob(job.id)}
            >
              {job.status === 'paused' ? <Play className="h-3 w-3 text-amber-400" /> : <Pause className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cancelJob(job.id)}>
              <Ban className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Progress value={job.progress} className="h-2 [&>div]:bg-red-500" />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{formatBytes(job.bytesUploaded)} / {formatBytes(job.file.size)}</span>
          <span>{job.progress}%</span>
        </div>
      </div>

      {job.status === 'completed' && (
        <div className="flex items-center gap-1.5 text-green-500 text-[11px] font-medium">
          <CheckCircle className="h-3 w-3" />
          Upload complete!
          {job.youtubeLink && (
            <a href={job.youtubeLink} target="_blank" rel="noopener noreferrer" className="underline ml-1">
              Watch
            </a>
          )}
        </div>
      )}
      {job.status === 'failed' && (
        <div className="flex items-center gap-1.5 text-destructive text-[11px]">
          <AlertCircle className="h-3 w-3" /> {job.error || "Failed"}
        </div>
      )}
      {job.status === 'paused' && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">Paused</span>
      )}
    </div>
  );
}

function RemoteJobCard({ session }: { session: RemoteYTSession }) {
  const percent = session.file_size_bytes > 0 ? Math.round((session.bytes_uploaded / session.file_size_bytes) * 100) : 0;

  return (
    <div className="rounded-xl border border-red-500/10 bg-red-950/10 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Youtube className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{session.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {session.client_name} • {session.event_name}
          </p>
        </div>
      </div>
      <div className="space-y-1">
        <Progress value={percent} className="h-2 [&>div]:bg-red-500" />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{formatBytes(session.bytes_uploaded)} / {formatBytes(session.file_size_bytes)}</span>
          <span>{percent}% • {session.status}</span>
        </div>
      </div>
      {session.status === 'completed' && session.youtube_link && (
        <div className="flex items-center gap-1.5 text-green-500 text-[11px] font-medium">
          <CheckCircle className="h-3 w-3" />
          <a href={session.youtube_link} target="_blank" rel="noopener noreferrer" className="underline">Watch</a>
        </div>
      )}
    </div>
  );
}

export function YouTubeUploadTracker() {
  const { jobs, remoteJobs, activeCount, clearCompleted } = useYouTubeUploadContext();

  // Show remote sessions that aren't already tracked locally
  const localDbIds = new Set(jobs.map(j => j.sessionDbId));
  const remoteOnly = remoteJobs.filter(r => !localDbIds.has(r.id));

  // Filter out remote sessions that were already dismissed (persisted)
  const dismissedIds: string[] = JSON.parse(localStorage.getItem('yt_dismissed_sessions') || '[]');
  const remoteVisible = remoteOnly.filter(r => !dismissedIds.includes(r.id));

  // Filter out local jobs that were dismissed too
  const dismissedLocalIds: string[] = JSON.parse(localStorage.getItem('yt_dismissed_local_jobs') || '[]');
  const jobsVisible = jobs.filter(j => !dismissedLocalIds.includes(j.id));

  const totalItems = jobsVisible.length + remoteVisible.length;
  if (totalItems === 0) return null;

  const hasActive = activeCount > 0 || remoteVisible.some(r => r.status === 'uploading' || r.status === 'pending');

  const handleDismiss = () => {
    // Persist dismissed remote session IDs so they don't reappear on reload (cross-device via session id reuse check)
    const currentDismissed: string[] = JSON.parse(localStorage.getItem('yt_dismissed_sessions') || '[]');
    const allRemoteIds = remoteOnly.map(r => r.id);
    const merged = [...new Set([...currentDismissed, ...allRemoteIds])];
    localStorage.setItem('yt_dismissed_sessions', JSON.stringify(merged));

    // Also dismiss local jobs by id so they hide until a new upload starts
    const currentLocal: string[] = JSON.parse(localStorage.getItem('yt_dismissed_local_jobs') || '[]');
    const allLocalIds = jobs.map(j => j.id);
    const mergedLocal = [...new Set([...currentLocal, ...allLocalIds])];
    localStorage.setItem('yt_dismissed_local_jobs', JSON.stringify(mergedLocal));

    clearCompleted();
  };

  return (
    <div className={cn(
      "w-[380px] bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden",
      hasActive && "border-red-500/30"
    )}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-red-950/40 to-red-950/20 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Youtube className="h-4 w-4 text-red-500" />
            {hasActive && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
          </div>
          <span className="text-sm font-semibold">
            {hasActive ? `YouTube Upload` : 'Upload Complete'}
          </span>
        </div>
        <button onClick={handleDismiss} className="p-1.5 hover:bg-muted rounded-lg" title="Close">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto p-3 space-y-3">
        {jobsVisible.map(job => <LocalJobCard key={job.id} job={job} />)}
        {remoteVisible.map(s => <RemoteJobCard key={s.id} session={s} />)}
      </div>
    </div>
  );
}
