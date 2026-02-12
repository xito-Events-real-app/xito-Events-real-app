import { useState, useEffect } from "react";
import { Users, Sparkles, ArrowRight, X, Camera, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

const ANNOUNCEMENT_KEY = "all-clients-announcement-dismissed";
const ANNOUNCEMENT_EXPIRY = new Date("2026-02-15T23:59:59").getTime();

const CONFETTI_COLORS = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF78F0", "#B983FF", "#FF9F45", "#00D2FF"];
const DANCING_EMOJIS = ["📸", "💃", "🕺", "🎬", "📷", "🎊", "🎉", "💐"];

export function AllClientsAnnouncementDialog({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(ANNOUNCEMENT_KEY);
    if (dismissed || Date.now() > ANNOUNCEMENT_EXPIRY) return;
    const timer = setTimeout(() => {
      setOpen(true);
      setTimeout(() => setShowContent(true), 100);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, "true");
    setShowContent(false);
    setTimeout(() => setOpen(false), 300);
  };

  const handleNavigate = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, "true");
    setOpen(false);
    onNavigate();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Dark gradient background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 transition-opacity duration-500 ${showContent ? "opacity-100" : "opacity-0"}`}
      />

      {/* Camera flash effect */}
      <div className="announcement-camera-flash absolute inset-0 pointer-events-none" />

      {/* Confetti particles */}
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

      {/* Dancing people / photographers */}
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

      {/* Radial glow behind content */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-6 right-6 z-10 text-white/40 hover:text-white transition-colors p-2"
      >
        <X className="h-7 w-7" />
      </button>

      {/* Main content */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center transition-all duration-700 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        {/* Party poppers */}
        <div className="flex items-center gap-4 mb-6">
          <PartyPopper className="w-10 h-10 text-amber-400 announcement-float" style={{ animationDelay: "0s" }} />
          <Camera className="w-8 h-8 text-indigo-300 announcement-float" style={{ animationDelay: "0.5s" }} />
          <PartyPopper className="w-10 h-10 text-pink-400 announcement-float" style={{ animationDelay: "1s" }} />
        </div>

        {/* Main icon */}
        <div className="mb-8 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/40 announcement-icon-pulse">
          <Users className="h-14 w-14 sm:h-20 sm:w-20 text-white" />
        </div>

        {/* NEW FEATURE badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-bold mb-6 tracking-wider">
          <Sparkles className="h-4 w-4" />
          ✨ NEW FEATURE ✨
          <Sparkles className="h-4 w-4" />
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
          Meet{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            ALL CLIENTS
          </span>
        </h1>

        <p className="text-5xl sm:text-6xl mb-6">🎉🎊🥳</p>

        {/* Description */}
        <p className="text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed mb-10">
          Your favourite crew dashboard is here! View all monthly assignments, freelancer roles, and client bookings — 
          <span className="text-white font-semibold"> all in one beautiful view.</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <Button
            onClick={handleNavigate}
            className="w-full rounded-2xl h-16 text-xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 shadow-2xl shadow-purple-500/40 gap-3 group announcement-cta-glow"
          >
            Yes, show me! 🚀
            <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-2" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full rounded-2xl h-12 text-base text-white/40 hover:text-white/70 hover:bg-white/5"
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
