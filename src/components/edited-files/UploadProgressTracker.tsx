import { useUploadContext } from "./EditedFilesUploadContext";
import { Progress } from "@/components/ui/progress";
import { X, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { useState } from "react";

export function UploadProgressTracker() {
  const { jobs, activeCount } = useUploadContext();
  const [collapsed, setCollapsed] = useState(false);

  if (jobs.length === 0) return null;

  const recentJobs = jobs.slice(0, 10);

  if (collapsed) {
    return (
      <div
        className="bg-card border rounded-full px-4 py-2 shadow-lg cursor-pointer flex items-center gap-2"
        onClick={() => setCollapsed(false)}
      >
        <Upload className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {activeCount > 0 ? `${activeCount} uploading...` : 'Uploads done'}
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <span className="text-sm font-semibold">
          {activeCount > 0 ? `Uploading ${activeCount} file(s)` : 'Upload Complete'}
        </span>
        <button onClick={() => setCollapsed(true)} className="p-1 hover:bg-muted rounded">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto p-2 space-y-2">
        {recentJobs.map(job => (
          <div key={job.id} className="flex items-center gap-2 text-xs">
            {job.status === 'completed' && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
            {job.status === 'failed' && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
            {(job.status === 'uploading' || job.status === 'pending') && (
              <Upload className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate">{job.file.name}</p>
              {job.status === 'uploading' && <Progress value={job.progress} className="h-1 mt-0.5" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
