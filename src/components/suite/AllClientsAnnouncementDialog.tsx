import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, ArrowRight, X } from "lucide-react";

const ANNOUNCEMENT_KEY = "all-clients-announcement-dismissed";
// Show for 3 days from Feb 12, 2026
const ANNOUNCEMENT_EXPIRY = new Date("2026-02-15T23:59:59").getTime();

export function AllClientsAnnouncementDialog({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(ANNOUNCEMENT_KEY);
    if (dismissed || Date.now() > ANNOUNCEMENT_EXPIRY) return;
    // Small delay so app loads first
    const timer = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, "true");
    setOpen(false);
  };

  const handleNavigate = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, "true");
    setOpen(false);
    onNavigate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden">
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl overflow-hidden border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-indigo-400/30 animate-pulse"
                style={{
                  top: `${15 + i * 15}%`,
                  left: `${10 + i * 14}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${2 + i * 0.5}s`,
                }}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 z-10 text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="relative p-6 text-center">
            {/* Icon with animation */}
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-scale-in shadow-lg shadow-indigo-500/40">
              <Users className="h-10 w-10 text-white" />
            </div>

            {/* Sparkle badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Sparkles className="h-3.5 w-3.5" />
              NEW FEATURE
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              Meet <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">ALL CLIENTS</span> 🎉
            </h2>

            {/* Description */}
            <p className="text-white/70 text-sm leading-relaxed mb-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              Your favourite crew dashboard is here! View all monthly assignments, freelancer roles, and client bookings — all in one beautiful view.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-2.5 animate-fade-in" style={{ animationDelay: "0.5s" }}>
              <Button
                onClick={handleNavigate}
                className="w-full rounded-xl h-12 text-base font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/30 gap-2 group"
              >
                Yes, show me!
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleDismiss}
                className="w-full rounded-xl h-10 text-sm text-white/50 hover:text-white/80 hover:bg-white/5"
              >
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
