import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { uploadToPCloudByPath } from "@/lib/pcloud-api";

export interface PCloudUploadJob {
  id: string;
  file: File;
  targetPath: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

interface PCloudUploadContextType {
  jobs: PCloudUploadJob[];
  addJobs: (files: File[], targetPath: string) => void;
  activeCount: number;
  clearCompleted: () => void;
  paused: boolean;
  pauseUpload: () => void;
  resumeUpload: () => void;
  cancelAll: () => void;
}

const PCloudUploadContext = createContext<PCloudUploadContextType>({
  jobs: [],
  addJobs: () => {},
  activeCount: 0,
  clearCompleted: () => {},
  paused: false,
  pauseUpload: () => {},
  resumeUpload: () => {},
  cancelAll: () => {},
});

export const usePCloudUploadContext = () => useContext(PCloudUploadContext);

export function PCloudUploadProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<PCloudUploadJob[]>([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const pauseUpload = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const resumeUpload = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
  }, []);

  const cancelAll = useCallback(() => {
    cancelledRef.current = true;
    pausedRef.current = false;
    setPaused(false);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setJobs(prev => prev.map(j =>
      j.status === 'pending' || j.status === 'uploading'
        ? { ...j, status: 'cancelled' as const, progress: 0 }
        : j
    ));
  }, []);

  const processJob = useCallback(async (job: PCloudUploadJob) => {
    // Check cancelled
    if (cancelledRef.current) return;

    // Wait while paused
    while (pausedRef.current) {
      if (cancelledRef.current) return;
      await new Promise(r => setTimeout(r, 500));
    }
    if (cancelledRef.current) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'uploading' as const, progress: 20 } : j));
    try {
      await uploadToPCloudByPath(job.targetPath, job.file, (progress) => {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progress } : j));
      }, controller.signal);
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'completed' as const, progress: 100 } : j));
    } catch (err: any) {
      if (err.message === 'Upload cancelled') {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'cancelled' as const, progress: 0 } : j));
      } else {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed' as const, progress: 0, error: err.message } : j));
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  const addJobs = useCallback((files: File[], targetPath: string) => {
    cancelledRef.current = false;
    const newJobs: PCloudUploadJob[] = files.map(file => ({
      id: `pcloud-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      targetPath,
      progress: 0,
      status: 'pending' as const,
    }));
    setJobs(prev => [...newJobs, ...prev]);
    let chain = Promise.resolve();
    for (const job of newJobs) {
      chain = chain.then(() => processJob(job));
    }
  }, [processJob]);

  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(j => j.status !== 'completed' && j.status !== 'cancelled'));
  }, []);

  const activeCount = jobs.filter(j => j.status === 'uploading' || j.status === 'pending').length;

  return (
    <PCloudUploadContext.Provider value={{ jobs, addJobs, activeCount, clearCompleted, paused, pauseUpload, resumeUpload, cancelAll }}>
      {children}
    </PCloudUploadContext.Provider>
  );
}
