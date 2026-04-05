import { usePCloudUploadContext } from "@/contexts/PCloudUploadContext";
import { Progress } from "@/components/ui/progress";
import { X, CheckCircle, AlertCircle, CloudUpload, Trash2, Pause, Play, Ban } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PCloudUploadTracker() {
  const { jobs, activeCount, clearCompleted, paused, pauseUpload, resumeUpload, cancelAll } = usePCloudUploadContext();
  const [collapsed, setCollapsed] = useState(false);

  if (jobs.length === 0) return null;

  const recentJobs = jobs.slice(0, 20);
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const failedCount = jobs.filter(j => j.status === 'failed').length;
  const cancelledCount = jobs.filter(j => j.status === 'cancelled').length;

  if (collapsed) {
    return (
      <div
        className="bg-card border rounded-full px-4 py-2 shadow-lg cursor-pointer flex items-center gap-2"
        onClick={() => setCollapsed(false)}
      >
        <CloudUpload className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {activeCount > 0 ? `${activeCount} uploading to pCloud...` : `pCloud uploads done`}
        </span>
        {failedCount > 0 && (
          <span className="text-xs text-destructive font-medium">({failedCount} failed)</span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-card border rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <CloudUpload className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {activeCount > 0 ? `Uploading ${activeCount} file(s) to pCloud` : 'pCloud Upload Complete'}
          </span>
          {paused && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">Paused</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={paused ? resumeUpload : pauseUpload}
                title={paused ? "Resume" : "Pause"}
              >
                {paused ? <Play className="h-3 w-3 text-amber-400" /> : <Pause className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelAll} title="Cancel all">
                <Ban className="h-3 w-3 text-destructive" />
              </Button>
            </>
          )}
          {(completedCount > 0 || cancelledCount > 0) && activeCount === 0 && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearCompleted} title="Clear completed">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <button onClick={() => setCollapsed(true)} className="p-1 hover:bg-muted rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto p-2 space-y-2">
        {recentJobs.map(job => (
          <div key={job.id} className="flex items-center gap-2 text-xs">
            {job.status === 'completed' && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
            {job.status === 'failed' && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
            {job.status === 'cancelled' && <Ban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            {(job.status === 'uploading' || job.status === 'pending') && (
              <CloudUpload className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{job.file.name}</p>
              <p className="truncate text-muted-foreground text-[10px]">{job.targetPath}</p>
              {job.status === 'uploading' && <Progress value={job.progress} className="h-1 mt-0.5" />}
              {job.status === 'failed' && job.error && (
                <p className="text-destructive text-[10px] truncate">{job.error}</p>
              )}
              {job.status === 'cancelled' && (
                <p className="text-muted-foreground text-[10px]">Cancelled</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
