import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface FloatingYouTubeVideo {
  videoId: string;
  title: string;
  editor?: string;
  colorist?: string;
  editStartedAt?: string;
  videoEditStatus?: string;
  updatedAt?: string;
  eventDateAD?: string;
  editType?: string;
  stageHistory?: string;
}

interface FloatingYouTubePlayerContextType {
  video: FloatingYouTubeVideo | null;
  open: (video: FloatingYouTubeVideo) => void;
  close: () => void;
}

const FloatingYouTubePlayerContext = createContext<FloatingYouTubePlayerContextType>({
  video: null,
  open: () => {},
  close: () => {},
});

export function FloatingYouTubePlayerProvider({ children }: { children: ReactNode }) {
  const [video, setVideo] = useState<FloatingYouTubeVideo | null>(null);
  const open = useCallback((v: FloatingYouTubeVideo) => setVideo(v), []);
  const close = useCallback(() => setVideo(null), []);

  return (
    <FloatingYouTubePlayerContext.Provider value={{ video, open, close }}>
      {children}
    </FloatingYouTubePlayerContext.Provider>
  );
}

export function useFloatingYouTubePlayer() {
  return useContext(FloatingYouTubePlayerContext);
}

export type { FloatingYouTubeVideo };
