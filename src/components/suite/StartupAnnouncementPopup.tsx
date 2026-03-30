import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Volume2, VolumeX, X, Sparkles, CloudUpload, ArrowRight } from "lucide-react";

const STORAGE_KEY = "startup_announcement_last_shown";
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const APP_UPDATES = [
  {
    title: "Multi-Month Folder Creation",
    description: "Clients with events in multiple months now get folders in EVERY month (e.g., FALGUN + CHAITRA) instead of just one.",
    tag: "XITO DRIVE / pCloud / Research",
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Instant Photo Re-Loads",
    description: "Photos are now cached in the browser — clients don't have to wait when switching tabs or revisiting the Photos section.",
    tag: "Client Portal / Albums",
    color: "from-emerald-500 to-teal-500",
  },
  {
    title: "Browser-Level Photo Caching",
    description: "Both admin Album section and Client Portal photos use module-level caching for 0ms re-loads on tab switches.",
    tag: "Performance",
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Startup Announcement Popup",
    description: "This popup! Shows latest app feature updates and pCloud migration reminders with music on every app open.",
    tag: "Suite",
    color: "from-fuchsia-500 to-pink-500",
  },
];

function MusicBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-violet-400 to-fuchsia-300"
          style={{
            height: playing ? undefined : '4px',
            animation: playing ? `musicBar 0.8s ease-in-out ${i * 0.12}s infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function PCloudLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M19.5 13.5a4.5 4.5 0 0 0-4.2-4.48A6 6 0 0 0 3.5 11a4 4 0 0 0 .5 7.96h14a4.5 4.5 0 0 0 1.5-5.46Z" 
        fill="hsl(200,80%,50%)" stroke="hsl(200,80%,40%)" strokeWidth="0.5"/>
    </svg>
  );
}

export function StartupAnnouncementPopup() {
  const [open, setOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check interval
  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY);
    if (last && Date.now() - Number(last) < INTERVAL_MS) return;

    setOpen(true);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setTimeout(() => setAnimateIn(true), 50);
  }, []);

  // Play audio
  useEffect(() => {
    if (open) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('/audio/startup-music.mp3');
          audioRef.current.loop = true;
          audioRef.current.volume = 0.45;
        }
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } catch {
        setIsPlaying(false);
      }
    }
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

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes musicBar {
          0% { height: 4px; }
          100% { height: 24px; }
        }
        @keyframes cardSlide {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes floatCloud {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .update-card { animation: cardSlide 0.5s ease-out both; }
        .shimmer-text {
          background: linear-gradient(90deg, hsl(270,80%,70%) 0%, hsl(330,80%,80%) 50%, hsl(270,80%,70%) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .float-cloud { animation: floatCloud 3s ease-in-out infinite; }
      `}</style>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent 
          className={`max-w-none w-screen h-screen m-0 p-0 border-0 rounded-none transition-all duration-500 ${
            animateIn ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(160deg, hsl(260,35%,6%) 0%, hsl(240,30%,10%) 40%, hsl(280,25%,8%) 100%)',
          }}
        >
          {/* Ambient glow effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, hsl(270,80%,50%), transparent 70%)' }} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, hsl(200,80%,50%), transparent 70%)' }} />
          </div>

          <div className="relative h-full flex flex-col">
            {/* Header */}
            <div className="shrink-0 px-8 pt-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold shimmer-text">What's New in Xito Suite</h1>
                  <p className="text-sm text-violet-300/50 mt-0.5">Latest features & improvements</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MusicBars playing={isPlaying} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMusic}
                  className="h-10 w-10 rounded-full text-violet-300 hover:text-white hover:bg-violet-500/20"
                >
                  {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-10 w-10 rounded-full text-violet-300/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1 px-8">
              <div className="max-w-3xl mx-auto pb-8">
                {/* Feature update cards */}
                <div className="grid gap-4 mb-8">
                  {APP_UPDATES.map((update, i) => (
                    <div
                      key={i}
                      className="update-card rounded-2xl p-5 flex items-start gap-4"
                      style={{
                        animationDelay: `${i * 0.12}s`,
                        background: 'hsl(260,20%,12%)',
                        border: '1px solid hsl(260,20%,18%)',
                      }}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${update.color} flex items-center justify-center shrink-0 shadow-lg`}>
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-white/90">{update.title}</h3>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300/70 uppercase tracking-wider whitespace-nowrap">
                            {update.tag}
                          </span>
                        </div>
                        <p className="text-sm text-violet-200/50 leading-relaxed">{update.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* pCloud migration reminder */}
                <div
                  className="update-card rounded-2xl p-6"
                  style={{
                    animationDelay: `${APP_UPDATES.length * 0.12}s`,
                    background: 'linear-gradient(135deg, hsl(200,30%,12%) 0%, hsl(210,25%,10%) 100%)',
                    border: '1px solid hsl(200,30%,22%)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center shrink-0 float-cloud">
                      <PCloudLogo className="w-9 h-9" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CloudUpload className="w-4 h-4 text-sky-400" />
                        <h3 className="text-base font-bold text-sky-300">pCloud Migration Reminder</h3>
                      </div>
                      <p className="text-sm text-sky-200/50 leading-relaxed mb-3">
                        Have all files from the <span className="text-sky-300/80 font-medium">old pCloud folders</span> been moved to the 
                        <span className="text-sky-300/80 font-medium"> new organized folder structure</span>? 
                        Make sure every client's photos and videos are in the correct month-based folders.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-sky-400/60">
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Old structure → [MONTH] EVENTS [YEAR] / Client Name / Event / ...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="shrink-0 px-8 py-5 flex justify-center" style={{ borderTop: '1px solid hsl(260,20%,14%)' }}>
              <Button
                onClick={handleClose}
                className="h-12 px-10 rounded-2xl font-bold text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-xl shadow-violet-500/30 transition-all duration-300 hover:scale-105"
              >
                <X className="w-4 h-4 mr-2" />
                Got it, let's work!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
