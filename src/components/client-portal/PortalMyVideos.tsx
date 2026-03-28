import { useState, useEffect, useCallback } from "react";
import { Film, Youtube, Cloud, Loader2, Download, Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { listPCloudFolderByPath, getPCloudStreamUrl, getPCloudThumbsBatch, isPCloudVideo, PCloudItem, formatPCloudSize } from "@/lib/pcloud-api";
import { NEPALI_MONTHS } from "@/lib/nepali-months";

interface PortalMyVideosProps {
  clientName: string;
  eventYear: string;
  eventMonth: string;
}

type VideoSubTab = 'youtube' | 'pcloud';

const PortalMyVideos = ({ clientName, eventYear, eventMonth }: PortalMyVideosProps) => {
  const [subTab, setSubTab] = useState<VideoSubTab>('pcloud');
  const [videos, setVideos] = useState<PCloudItem[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Active video state
  const [activeIndex, setActiveIndex] = useState(0);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Build pCloud path
  const pcloudPath = (() => {
    const monthNum = parseInt(eventMonth, 10);
    const monthLabel = NEPALI_MONTHS[monthNum] || `MONTH ${eventMonth}`;
    const year = String(parseInt(eventYear || "0"));
    return `/WEDDING TALES NEPAL/${monthLabel} EVENTS ${year}/${clientName}/Videos`;
  })();

  // Load videos list
  useEffect(() => {
    if (subTab !== 'pcloud' || !clientName || !eventYear || !eventMonth) return;
    setIsLoading(true);
    setError('');
    setVideos([]);
    setThumbs({});
    setActiveIndex(0);

    listPCloudFolderByPath(pcloudPath, true)
      .then(async (folder) => {
        const allItems = folder.contents || [];
        const videoFiles: PCloudItem[] = [];
        function collectVideos(items: PCloudItem[]) {
          for (const item of items) {
            if (!item.isfolder && isPCloudVideo(item)) {
              videoFiles.push(item);
            } else if (item.isfolder && item.contents) {
              collectVideos(item.contents);
            }
          }
        }
        collectVideos(allItems);
        setVideos(videoFiles);

        const fileIds = videoFiles.filter(f => f.fileid).map(f => f.fileid!);
        if (fileIds.length > 0) {
          try {
            const thumbMap = await getPCloudThumbsBatch(fileIds, '320x240');
            setThumbs(thumbMap);
          } catch {}
        }
      })
      .catch((err) => {
        console.error('Failed to load videos:', err);
        setError('No videos found yet');
      })
      .finally(() => setIsLoading(false));
  }, [subTab, pcloudPath, clientName, eventYear, eventMonth]);

  // Get stream URL for the active video (synchronous, no async needed)
  const activeVideo = videos[activeIndex];
  const activeVideoUrl = activeVideo?.fileid ? getPCloudStreamUrl(activeVideo.fileid) : '';

  const handleDownload = useCallback((video: PCloudItem) => {
    if (!video.fileid) return;
    const url = getPCloudStreamUrl(video.fileid);
    const a = document.createElement('a');
    a.href = url;
    a.download = video.name;
    a.target = '_blank';
    a.click();
  }, []);

  const activeVideo = videos[activeIndex];

  return (
    <div className="pb-20">
      {/* Sub-tab navigation */}
      <div className="flex border-b border-white/10 mb-3">
        <button
          onClick={() => setSubTab('youtube')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2",
            subTab === 'youtube' ? "border-red-500 text-red-400" : "border-transparent text-white/40"
          )}
        >
          <Youtube className="h-4 w-4" />
          YouTube
        </button>
        <button
          onClick={() => setSubTab('pcloud')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2",
            subTab === 'pcloud' ? "border-emerald-500 text-emerald-400" : "border-transparent text-white/40"
          )}
        >
          <Cloud className="h-4 w-4" />
          pCloud
        </button>
      </div>

      {subTab === 'youtube' && (
        <div className="px-4 py-16 text-center">
          <Youtube className="h-12 w-12 mx-auto mb-3 text-red-500/30" />
          <p className="text-white/50 font-medium">Coming Soon</p>
          <p className="text-xs text-white/30 mt-1">YouTube videos will be available here</p>
        </div>
      )}

      {subTab === 'pcloud' && (
        <div className="px-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-white/50">Loading videos...</span>
            </div>
          ) : error || videos.length === 0 ? (
            <div className="py-16 text-center">
              <Film className="h-10 w-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40">{error || 'No videos available yet'}</p>
            </div>
          ) : (
            <>
              {/* === VIDEO PLAYER (Top) === */}
              <div className="rounded-xl overflow-hidden bg-black border border-white/10">
                <div className="aspect-video relative">
                  {loadingVideoUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                  ) : activeVideoUrl ? (
                    <video
                      key={activeVideoUrl}
                      src={activeVideoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <Play className="h-12 w-12 text-white/20" />
                    </div>
                  )}
                </div>

                {/* Player controls bar */}
                <div className="p-3 bg-white/5">
                  <p className="text-sm font-medium text-white truncate mb-1">
                    {activeVideo?.name || 'No video selected'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">
                        {activeIndex + 1} of {videos.length}
                      </span>
                      {activeVideo?.size && (
                        <span className="text-xs text-white/30">• {formatPCloudSize(activeVideo.size)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
                        disabled={activeIndex === 0}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white/60 disabled:text-white/20 transition-colors"
                      >
                        <SkipBack className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setActiveIndex(i => Math.min(videos.length - 1, i + 1))}
                        disabled={activeIndex === videos.length - 1}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white/60 disabled:text-white/20 transition-colors"
                      >
                        <SkipForward className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => activeVideo && handleDownload(activeVideo)}
                        disabled={downloadingId === activeVideo?.fileid}
                        className="ml-1 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors disabled:opacity-50"
                      >
                        {downloadingId === activeVideo?.fileid ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* === PLAYLIST (Bottom) === */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2 px-1">
                  Playlist • {videos.length} videos
                </p>
                <div className="space-y-1.5">
                  {videos.map((video, idx) => (
                    <button
                      key={video.fileid || idx}
                      onClick={() => setActiveIndex(idx)}
                      className={cn(
                        "w-full flex gap-3 p-2 rounded-lg transition-all text-left",
                        idx === activeIndex
                          ? "bg-primary/15 border border-primary/30"
                          : "bg-white/5 border border-transparent hover:bg-white/10"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="w-24 h-16 rounded-md overflow-hidden bg-white/5 flex-shrink-0 relative">
                        {thumbs[video.fileid!] ? (
                          <img src={thumbs[video.fileid!]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-5 w-5 text-white/20" />
                          </div>
                        )}
                        {idx === activeIndex && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Play className="h-5 w-5 text-primary fill-primary" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          idx === activeIndex ? "text-primary" : "text-white"
                        )}>
                          {video.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {video.size && (
                            <span className="text-xs text-white/40">{formatPCloudSize(video.size)}</span>
                          )}
                        </div>
                      </div>
                      {/* Download */}
                      <div className="flex items-center flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(video); }}
                          disabled={downloadingId === video.fileid}
                          className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
                        >
                          {downloadingId === video.fileid ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PortalMyVideos;
