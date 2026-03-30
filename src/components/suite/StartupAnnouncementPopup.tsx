import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useActivityFeed, ActivityItem } from "@/hooks/useActivityFeed";
import {
  Newspaper, Volume2, VolumeX, X, CloudUpload, CheckCircle2, AlertTriangle,
  CreditCard, MessageSquare, Activity, UserPlus, Phone, CalendarCheck, FileText, UserCog, Brain, XCircle, Bell
} from "lucide-react";

interface PCloudFileCheck {
  clientName: string;
  eventName: string;
  status: 'pending' | 'done';
}

const iconMap: Record<string, React.ElementType> = {
  CreditCard, MessageSquare, Activity, UserPlus, Phone, CalendarCheck, FileText, UserCog, Brain, XCircle, Bell,
};

function getActivityIcon(type: string) {
  switch (type) {
    case 'payment': return 'CreditCard';
    case 'comment': return 'MessageSquare';
    case 'status': return 'Activity';
    case 'client_added': return 'UserPlus';
    case 'call': return 'Phone';
    case 'booking': return 'CalendarCheck';
    case 'quotation': return 'FileText';
    case 'handler_change': return 'UserCog';
    case 'mindset': return 'Brain';
    case 'lost': return 'XCircle';
    default: return 'Bell';
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'payment': return 'bg-emerald-500/20 text-emerald-400';
    case 'comment': return 'bg-blue-500/20 text-blue-400';
    case 'status': return 'bg-purple-500/20 text-purple-400';
    case 'client_added': return 'bg-violet-500/20 text-violet-400';
    case 'call': return 'bg-amber-500/20 text-amber-400';
    case 'booking': return 'bg-rose-500/20 text-rose-400';
    case 'quotation': return 'bg-cyan-500/20 text-cyan-400';
    case 'handler_change': return 'bg-orange-500/20 text-orange-400';
    case 'mindset': return 'bg-pink-500/20 text-pink-400';
    case 'lost': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function MusicBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-violet-500 to-fuchsia-400"
          style={{
            height: playing ? undefined : '4px',
            animation: playing ? `musicBar 0.8s ease-in-out ${i * 0.12}s infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export function StartupAnnouncementPopup() {
  const [open, setOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pcloudChecks, setPcloudChecks] = useState<PCloudFileCheck[]>([]);
  const [animateIn, setAnimateIn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { activities, isLoading: isLoadingActivities } = useActivityFeed(1, 50);

  // Filter to last 24 hours
  const last24h = activities.filter(a => {
    const diff = Date.now() - a.timestamp.getTime();
    return diff <= 24 * 60 * 60 * 1000;
  });

  // Check pCloud/file move status
  useEffect(() => {
    const checkFiles = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("files_management")
        .select("client_name, event_name, drive_upload, final_generated_path")
        .eq("deleted_or_not", false)
        .eq("event_date_ad", today);

      if (data && data.length > 0) {
        const uniqueMap = new Map<string, PCloudFileCheck>();
        for (const r of data) {
          const key = `${r.client_name}-${r.event_name}`;
          if (!uniqueMap.has(key)) {
            const hasPath = !!(r.final_generated_path && r.final_generated_path.trim());
            uniqueMap.set(key, {
              clientName: r.client_name || "Unknown",
              eventName: r.event_name || "",
              status: hasPath ? 'done' : 'pending',
            });
          }
        }
        setPcloudChecks(Array.from(uniqueMap.values()));
      }
    };
    checkFiles();
  }, []);

  // Show popup once activities load
  useEffect(() => {
    if (!isLoadingActivities) {
      setOpen(true);
      setTimeout(() => setAnimateIn(true), 50);
    }
  }, [isLoadingActivities]);

  // Play audio when popup opens
  useEffect(() => {
    if (open) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('/audio/startup-music.mp3');
          audioRef.current.loop = true;
          audioRef.current.volume = 0.5;
        }
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } catch {
        setIsPlaying(false);
      }
    }
    return () => {
      // Cleanup on unmount
    };
  }, [open]);

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const toggleMusic = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const handleClose = useCallback(() => {
    setAnimateIn(false);
    stopMusic();
    setTimeout(() => setOpen(false), 300);
  }, [stopMusic]);

  const pendingFiles = pcloudChecks.filter(c => c.status === 'pending');
  const doneFiles = pcloudChecks.filter(c => c.status === 'done');

  return (
    <>
      <style>{`
        @keyframes musicBar {
          0% { height: 4px; }
          100% { height: 20px; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 15px hsl(270 80% 60% / 0.3); }
          50% { box-shadow: 0 0 30px hsl(270 80% 60% / 0.5); }
        }
        .announcement-item {
          animation: slideUp 0.4s ease-out both;
        }
        .announcement-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent 
          className={`max-w-lg border-0 p-0 overflow-hidden transition-all duration-500 ${
            animateIn ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
          }`}
          style={{
            background: 'linear-gradient(145deg, hsl(260,30%,8%) 0%, hsl(240,25%,12%) 50%, hsl(280,20%,10%) 100%)',
            borderRadius: '20px',
          }}
        >
          {/* Decorative header */}
          <div className="relative overflow-hidden px-6 pt-6 pb-4">
            {/* Animated gradient background */}
            <div className="absolute inset-0 opacity-20"
              style={{
                background: 'radial-gradient(ellipse at 30% 20%, hsl(270,80%,50%) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, hsl(330,70%,50%) 0%, transparent 60%)',
              }}
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/40 announcement-glow">
                  <Newspaper className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Latest Updates</h2>
                  <p className="text-xs text-violet-300/70">Last 24 hours • {last24h.length} updates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MusicBars playing={isPlaying} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMusic}
                  className="h-8 w-8 rounded-full text-violet-300 hover:text-white hover:bg-violet-500/20"
                >
                  {isPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Updates section */}
          <ScrollArea className="max-h-[280px] px-6">
            <div className="space-y-2 pb-2">
              {last24h.length === 0 ? (
                <div className="text-center py-8 text-violet-300/50 text-sm">
                  No updates in the last 24 hours
                </div>
              ) : (
                last24h.slice(0, 20).map((activity, i) => {
                  const IconComp = iconMap[getActivityIcon(activity.type)] || Bell;
                  const colorClass = getActivityColor(activity.type);
                  return (
                    <div
                      key={activity.id}
                      className="announcement-item flex items-center gap-3 rounded-xl p-3"
                      style={{
                        animationDelay: `${i * 0.06}s`,
                        background: 'hsl(260,20%,14%)',
                        border: '1px solid hsl(260,20%,20%)',
                      }}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white/90 truncate">{activity.clientName}</p>
                        <p className="text-xs text-violet-300/50 truncate">{activity.description}</p>
                      </div>
                      <span className="text-[10px] text-violet-300/40 shrink-0">{activity.relativeTime}</span>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* File reminder section */}
          {pcloudChecks.length > 0 && (
            <div className="px-6 py-3" style={{ borderTop: '1px solid hsl(260,20%,18%)' }}>
              <div className="flex items-center gap-2 mb-2">
                <CloudUpload className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">File Move Reminder</span>
              </div>
              <div className="space-y-1.5">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-amber-200/80 truncate">{f.clientName} — {f.eventName}</span>
                    <span className="ml-auto text-amber-500/70 text-[10px] font-medium">NOT MOVED</span>
                  </div>
                ))}
                {doneFiles.map((f, i) => (
                  <div key={`d-${i}`} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-emerald-200/60 truncate">{f.clientName} — {f.eventName}</span>
                    <span className="ml-auto text-emerald-500/70 text-[10px] font-medium">DONE</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 pb-5 pt-3">
            <Button
              onClick={handleClose}
              className="w-full h-11 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 transition-all duration-300"
            >
              <X className="w-4 h-4 mr-2" />
              Dismiss & Start Working
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
