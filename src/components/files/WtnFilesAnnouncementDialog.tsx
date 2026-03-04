import { useState, useEffect, useRef } from "react";
import { FolderOpen, Sparkles, ArrowRight, X, PartyPopper, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";

const ANNOUNCEMENT_KEY = "wtn-files-announcement-last-shown";
const ANNOUNCEMENT_EXPIRY = new Date("2026-03-06T23:59:59").getTime();
const SHOW_INTERVAL = 2 * 60 * 60 * 1000;

const CONFETTI_COLORS = ["#4D96FF", "#00D2FF", "#60A5FA", "#38BDF8", "#818CF8", "#7DD3FC", "#93C5FD", "#A5B4FC"];
const DANCING_EMOJIS = ["📁", "💾", "🗂️", "📂", "🎊", "🎉", "🥳", "💿"];

export function WtnFilesAnnouncementDialog({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (Date.now() > ANNOUNCEMENT_EXPIRY) return;
    const lastShown = localStorage.getItem(ANNOUNCEMENT_KEY);
    if (lastShown && Date.now() - parseInt(lastShown) < SHOW_INTERVAL) return;
    const timer = setTimeout(() => {
      setOpen(true);
      setTimeout(() => setShowContent(true), 100);
      try {
        const audio = new Audio("/audio/meditation-music.mp3");
        audio.loop = true;
        audio.volume = 0.5;
        audio.play().catch(() => {});
        audioRef.current = audio;
      } catch {}
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, Date.now().toString());
    stopAudio();
    setShowContent(false);
    setTimeout(() => setOpen(false), 300);
  };

  const handleNavigate = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, Date.now().toString());
    stopAudio();
    setOpen(false);
    onNavigate();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 transition-opacity duration-500 ${showContent ? "opacity-100" : "opacity-0"}`} />

      <div className="announcement-camera-flash absolute inset-0 pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <div
            key={`confetti-${i}`}
            className="announcement-confetti absolute w-3 h-3 rounded-sm"
            style={{
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              left: `${Math.random() * 100}%`,
              top: `-5%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none overflow-hidden">
        {DANCING_EMOJIS.map((emoji, i) => (
          <div
            key={`dancer-${i}`}
            className="announcement-dance-sway absolute bottom-4 text-4xl sm:text-5xl md:text-6xl select-none"
            style={{
              left: `${5 + i * 12}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${1.5 + Math.random() * 1}s`,
              opacity: 0.7,
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <button onClick={handleDismiss} className="absolute top-6 right-6 z-10 text-white/40 hover:text-white transition-colors p-2">
        <X className="h-7 w-7" />
      </button>

      <div className={`relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center transition-all duration-700 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="flex items-center gap-4 mb-6">
          <PartyPopper className="w-10 h-10 text-amber-400 announcement-float" style={{ animationDelay: "0s" }} />
          <HardDrive className="w-9 h-9 text-cyan-400 announcement-float" style={{ animationDelay: "0.3s" }} />
          <FolderOpen className="w-8 h-8 text-blue-300 announcement-float" style={{ animationDelay: "0.6s" }} />
          <HardDrive className="w-9 h-9 text-cyan-400 announcement-float" style={{ animationDelay: "0.9s" }} />
          <PartyPopper className="w-10 h-10 text-pink-400 announcement-float" style={{ animationDelay: "1.2s" }} />
        </div>

        <div className="mb-8 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 flex items-center justify-center shadow-2xl shadow-blue-500/40 announcement-icon-pulse relative">
          <FolderOpen className="h-14 w-14 sm:h-20 sm:w-20 text-white" />
          <div className="absolute -top-2 -right-2 announcement-float" style={{ animationDelay: "0s" }}>
            <HardDrive className="w-6 h-6 text-cyan-300" />
          </div>
          <div className="absolute -bottom-1 -left-3 announcement-float" style={{ animationDelay: "0.7s" }}>
            <FolderOpen className="w-5 h-5 text-blue-300" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-bold mb-6 tracking-wider">
          <Sparkles className="h-4 w-4" />
          ✨ NEW FEATURE ✨
          <Sparkles className="h-4 w-4" />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
          Oh Yes!!{" "}
          <span className="text-cyan-400 font-black uppercase" style={{ textShadow: "0 0 30px rgba(34, 211, 238, 0.5)" }}>
            WTN FILES
          </span>
          <br />
          <span className="text-3xl sm:text-4xl md:text-5xl">is finally here!</span>
        </h1>

        <p className="text-3xl sm:text-4xl mb-2 text-white/90 font-bold">Check it out</p>
        <p className="text-5xl sm:text-6xl mb-6">🎉🎊🥳</p>

        <p className="text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed mb-10">
          So <span className="text-cyan-300 font-bold">Mr. Jeewan</span>, Are you{" "}
          <span className="text-white font-black text-2xl">readdddyyyy</span> ???
        </p>

        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <Button
            onClick={handleNavigate}
            className="w-full rounded-2xl h-16 text-xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 hover:from-blue-600 hover:via-cyan-600 hover:to-sky-600 text-white border-0 shadow-2xl shadow-cyan-500/40 gap-3 group announcement-cta-glow"
          >
            Open WTN Files Now 🚀
            <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-2" />
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="w-full rounded-2xl h-12 text-base text-white/40 hover:text-white/70 hover:bg-white/5">
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
