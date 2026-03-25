import React, { createContext, useContext, useState, useCallback } from "react";
import { uploadEditedFile } from "@/lib/edited-files-api";

export interface UploadJob {
  id: string;
  file: File;
  clientName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  meta: {
    registered_date_time_ad: string;
    client_name: string;
    file_type: 'photo' | 'video';
    event_name: string;
    folder_event_name: string;
    side_folder: string;
    photographer_name: string;
  };
}

interface UploadContextType {
  jobs: UploadJob[];
  addJobs: (files: File[], meta: UploadJob['meta']) => void;
  activeCount: number;
}

const UploadContext = createContext<UploadContextType>({
  jobs: [],
  addJobs: () => {},
  activeCount: 0,
});

export const useUploadContext = () => useContext(UploadContext);

export function EditedFilesUploadProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const processJob = useCallback(async (job: UploadJob) => {
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'uploading', progress: 10 } : j));
    try {
      const result = await uploadEditedFile(job.file, job.meta);
      setJobs(prev => prev.map(j => j.id === job.id
        ? { ...j, status: result?.upload_status === 'completed' ? 'completed' : 'failed', progress: 100 }
        : j
      ));
    } catch {
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed', progress: 0 } : j));
    }
  }, []);

  const addJobs = useCallback((files: File[], meta: UploadJob['meta']) => {
    const newJobs: UploadJob[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      clientName: meta.client_name,
      progress: 0,
      status: 'pending' as const,
      meta,
    }));
    setJobs(prev => [...newJobs, ...prev]);
    // Process sequentially
    let chain = Promise.resolve();
    for (const job of newJobs) {
      chain = chain.then(() => processJob(job));
    }
  }, [processJob]);

  const activeCount = jobs.filter(j => j.status === 'uploading' || j.status === 'pending').length;

  return (
    <UploadContext.Provider value={{ jobs, addJobs, activeCount }}>
      {children}
    </UploadContext.Provider>
  );
}
