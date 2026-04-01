import { useXitoDriveUploadContext, XitoUploadSession } from "@/contexts/XitoDriveUploadContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  X, CheckCircle, AlertCircle, CloudUpload, Trash2,
  Maximize2, Minimize2, SkipForward, Camera, Calendar,
  ImageIcon, Pause, Play, Ban
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function SessionCard({ session }: { session: XitoUploadSession }) {
  const { pauseSession, resumeSession, cancelSession } = useXitoDriveUploadContext();
  const completed = session.jobs.filter(j => j.status === 'completed').length;
  const failed = session.jobs.filter(j => j.status === 'failed').length;
  const skipped = session.jobs.filter(j => j.status === 'skipped').length;
  const cancelled = session.jobs.filter(j => j.status === 'cancelled').length;
  const pending = session.jobs.filter(j => j.status === 'pending' || j.status === 'uploading').length;
  const total = session.jobs.length;
  const progressPercent = total > 0 ? Math.round(((completed + skipped + cancelled) / total) * 100) : 0;
  const uploadedSize = session.jobs.filter(j => j.status === 'completed').reduce((s, j) => s + j.file.size, 0);
  const totalSize = session.jobs.filter(j => j.status !== 'skipped').reduce((s, j) => s + j.file.size, 0);
  const hasActive = pending > 0;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-2.5">
      {/* Session meta + controls */}
      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded-lg bg-primary/15 shrink-0">
          <Camera className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {session.meta.shotBy && (
              <span className="text-xs font-semibold text-foreground">{session.meta.shotBy}</span>
            )}
            {session.meta.eventName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{session.meta.eventName}</span>
            )}
            {session.meta.eventDate && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" /> {session.meta.eventDate}
              </span>
            )}
            {session.paused && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">Paused</span>
            )}
          </div>
        </div>
        {hasActive && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => session.paused ? resumeSession(session.id) : pauseSession(session.id)}
              title={session.paused ? "Resume" : "Pause"}
            >
              {session.paused ? <Play className="h-3 w-3 text-amber-400" /> : <Pause className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => cancelSession(session.id)}
              title="Cancel all"
            >
              <Ban className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{completed}/{total - skipped} uploaded • {formatBytes(uploadedSize)} / {formatBytes(totalSize)}</span>
          <span>{progressPercent}%</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] flex-wrap">
        {pending > 0 && (
          <span className="flex items-center gap-1 text-primary font-medium">
            <CloudUpload className="h-3 w-3 animate-pulse" /> {pending} remaining
          </span>
        )}
        {completed > 0 && (
          <span className="flex items-center gap-1 text-green-500">
            <CheckCircle className="h-3 w-3" /> {completed} done
          </span>
        )}
        {skipped > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
            <SkipForward className="h-3 w-3" /> {skipped} skipped
          </span>
        )}
        {cancelled > 0 && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Ban className="h-3 w-3" /> {cancelled} cancelled
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-3 w-3" /> {failed} failed
          </span>
        )}
        {session.meta.expectedCount > 0 && session.meta.expectedCount > total && (
          <span className="flex items-center gap-1 text-amber-400">
            <ImageIcon className="h-3 w-3" /> {session.meta.expectedCount - total} not in batch
          </span>
        )}
      </div>

      {/* Current uploading file */}
      {session.jobs.filter(j => j.status === 'uploading').map(job => (
        <div key={job.id} className="flex items-center gap-2 text-[11px] bg-primary/5 rounded-lg px-2 py-1.5">
          <CloudUpload className="h-3 w-3 text-primary animate-pulse shrink-0" />
          <span className="truncate flex-1 font-medium">{job.file.name}</span>
          <span className="text-primary font-bold shrink-0">{job.progress}%</span>
        </div>
      ))}
    </div>
  );
}

export function XitoUploadTracker() {
  const { sessions, activeCount, clearCompleted, expanded, setExpanded } = useXitoDriveUploadContext();
  const [collapsed, setCollapsed] = useState(false);

  if (sessions.length === 0) return null;

  const hasActive = activeCount > 0;

  if (collapsed) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 bg-card border border-primary/20 rounded-full px-4 py-2.5 shadow-xl cursor-pointer flex items-center gap-2.5 hover:border-primary/40 transition-all"
        onClick={() => setCollapsed(false)}
      >
        <div className="relative">
          <CloudUpload className="h-4 w-4 text-primary" />
          {hasActive && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />}
        </div>
        <span className="text-sm font-medium">
          {hasActive ? `${activeCount} uploading...` : 'Uploads complete'}
        </span>
      </div>
    );
  }

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <CloudUpload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">XITO Drive Uploads</h2>
              <p className="text-xs text-muted-foreground">
                {hasActive ? `${activeCount} files remaining` : 'All uploads complete'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!hasActive && sessions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCompleted} className="text-xs gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setExpanded(false)}>
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 w-[380px] bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden",
      hasActive && "border-primary/20"
    )}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-muted/80 to-muted/40 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <CloudUpload className="h-4 w-4 text-primary" />
            {hasActive && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
          </div>
          <span className="text-sm font-semibold">
            {hasActive ? `Uploading ${activeCount} file(s)` : 'Upload Complete'}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(true)} title="Expand">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          {!hasActive && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearCompleted} title="Clear">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <button onClick={() => setCollapsed(true)} className="p-1.5 hover:bg-muted rounded-lg">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto p-3 space-y-3">
        {sessions.slice(0, 5).map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}
