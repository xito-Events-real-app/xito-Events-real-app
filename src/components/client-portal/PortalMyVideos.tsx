import { useState, useEffect } from "react";
import { Film, Youtube, Cloud, Loader2, Download, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listPCloudFolderByPath, getPCloudFileLink, getPCloudThumbsBatch, isPCloudVideo, PCloudItem, formatPCloudSize } from "@/lib/pcloud-api";
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
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Build pCloud path
  const pcloudPath = (() => {
    const monthNum = parseInt(eventMonth, 10);
    const monthLabel = NEPALI_MONTHS[monthNum] || `MONTH ${eventMonth}`;
    const year = String(parseInt(eventYear || "0"));
    return `/WEDDING TALES NEPAL/${monthLabel} EVENTS ${year}/${clientName}/Videos`;
  })();

  useEffect(() => {
    if (subTab !== 'pcloud' || !clientName || !eventYear || !eventMonth) return;
    setIsLoading(true);
    setError('');
    setVideos([]);
    setThumbs({});

    listPCloudFolderByPath(pcloudPath)
      .then(async (folder) => {
        const videoFiles = folder.contents.filter(isPCloudVideo);
        setVideos(videoFiles);

        // Fetch thumbnails
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

  const handleDownload = async (video: PCloudItem) => {
    if (!video.fileid) return;
    setDownloadingId(video.fileid);
    try {
      const url = await getPCloudFileLink(video.fileid);
      const a = document.createElement('a');
      a.href = url;
      a.download = video.name;
      a.target = '_blank';
      a.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

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
        <div className="px-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-white/50">Loading videos...</span>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <Film className="h-10 w-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40">{error}</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="py-16 text-center">
              <Film className="h-10 w-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40">No videos available yet</p>
            </div>
          ) : (
            videos.map((video) => (
              <Card key={video.fileid} className="bg-white/5 border-white/10 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail */}
                    <div className="w-28 h-20 rounded-md overflow-hidden bg-white/5 flex-shrink-0 relative">
                      {thumbs[video.fileid!] ? (
                        <img src={thumbs[video.fileid!]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-6 w-6 text-white/20" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <p className="text-sm font-medium text-white truncate">{video.name}</p>
                      <div className="flex items-center gap-2">
                        {video.size && (
                          <span className="text-xs text-white/40">{formatPCloudSize(video.size)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownload(video)}
                        disabled={downloadingId === video.fileid}
                        className="self-start flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors disabled:opacity-50"
                      >
                        {downloadingId === video.fileid ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Download
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PortalMyVideos;
