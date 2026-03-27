import React, { createContext, useContext, useState, useCallback } from "react";
import { uploadToPCloudByPath } from "@/lib/pcloud-api";

export interface PCloudUploadJob {
  id: string;
  file: File;
  targetPath: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

interface PCloudUploadContextType {
  jobs: PCloudUploadJob[];
  addJobs: (files: File[], targetPath: string) => void;
  activeCount: number;
  clearCompleted: () => void;
}

const PCloudUploadContext = createContext<PCloudUploadContextType>({
  jobs: [],
  addJobs: () => {},
  activeCount: 0,
  clearCompleted: () => {},
});

export const usePCloudUploadContext = () => useContext(PCloudUploadContext);

export function PCloudUploadProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<PCloudUploadJob[]>([]);

  const processJob = useCallback(async (job: PCloudUploadJob) => {
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'uploading' as const, progress: 20 } : j));
    try {
      await uploadToPCloudByPath(job.targetPath, job.file, (progress) => {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progress } : j));
      });
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'completed' as const, progress: 100 } : j));
    } catch (err: any) {
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed' as const, progress: 0, error: err.message } : j));
    }
  }, []);

  const addJobs = useCallback((files: File[], targetPath: string) => {
    const newJobs: PCloudUploadJob[] = files.map(file => ({
      id: `pcloud-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      targetPath,
      progress: 0,
      status: 'pending' as const,
    }));
    setJobs(prev => [...newJobs, ...prev]);
    // Process sequentially to avoid overwhelming pCloud API
    let chain = Promise.resolve();
    for (const job of newJobs) {
      chain = chain.then(() => processJob(job));
    }
  }, [processJob]);

  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(j => j.status !== 'completed'));
  }, []);

  const activeCount = jobs.filter(j => j.status === 'uploading' || j.status === 'pending').length;

  return (
    <PCloudUploadContext.Provider value={{ jobs, addJobs, activeCount, clearCompleted }}>
      {children}
    </PCloudUploadContext.Provider>
  );
}
