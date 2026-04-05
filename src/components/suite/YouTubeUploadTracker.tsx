import { useYouTubeUploadContext, YouTubeUploadJob, RemoteYTSession } from "@/contexts/YouTubeUploadContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, AlertCircle, Maximize2, Minimize2, Trash2, Pause, Play, Ban, Youtube } from "lucide-react";
import { useState } from "react";
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
  const { jobs, remoteJobs, activeCount, clearCompleted, expanded, setExpanded } = useYouTubeUploadContext();
  const [collapsed, setCollapsed] = useState(false);

  // Show remote sessions that aren't already tracked locally
  const localDbIds = new Set(jobs.map(j => j.sessionDbId));
  const remoteOnly = remoteJobs.filter(r => !localDbIds.has(r.id));

  // Filter out remote sessions that were already dismissed (persisted)
  const dismissedIds: string[] = JSON.parse(localStorage.getItem('yt_dismissed_sessions') || '[]');
  const remoteVisible = remoteOnly.filter(r => !dismissedIds.includes(r.id));

  const totalItems = jobs.length + remoteVisible.length;
  if (totalItems === 0) return null;

  const hasActive = activeCount > 0 || remoteVisible.some(r => r.status === 'uploading' || r.status === 'pending');

  // If no active uploads and no local jobs, nothing to show
  if (!hasActive && jobs.length === 0 && remoteVisible.length === 0) return null;

  const handleDismiss = () => {
    clearCompleted();
    setDismissed(true);
  };

  if (collapsed) {
    return (
      <div
        className="bg-card border border-red-500/30 rounded-full px-4 py-2.5 shadow-xl cursor-pointer flex items-center gap-2.5 hover:border-red-500/50 transition-all"
        onClick={() => setCollapsed(false)}
      >
        <div className="relative">
          <Youtube className="h-4 w-4 text-red-500" />
          {hasActive && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
        </div>
        <span className="text-sm font-medium">
          {hasActive ? `Uploading to YouTube...` : 'YouTube upload complete'}
        </span>
        {!hasActive && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="p-0.5 hover:bg-muted rounded-full ml-1"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20">
              <Youtube className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">YouTube Uploads</h2>
              <p className="text-xs text-muted-foreground">
                {hasActive ? `Uploading...` : 'All uploads complete'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!hasActive && totalItems > 0 && (
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Clear & Close
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setExpanded(false)}>
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
          {jobs.map(job => <LocalJobCard key={job.id} job={job} />)}
          {remoteOnly.map(s => <RemoteJobCard key={s.id} session={s} />)}
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(true)} title="Expand">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          {!hasActive && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDismiss} title="Dismiss">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <button onClick={() => setCollapsed(true)} className="p-1.5 hover:bg-muted rounded-lg">
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto p-3 space-y-3">
        {jobs.map(job => <LocalJobCard key={job.id} job={job} />)}
        {remoteOnly.map(s => <RemoteJobCard key={s.id} session={s} />)}
      </div>
    </div>
  );
}
