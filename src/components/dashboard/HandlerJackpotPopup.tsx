import { useEffect, useRef, useState } from "react";
import { User, X, Sparkles, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Handler {
  name: string;
  clientCount: number;
  colorClass: string;
}

interface HandlerJackpotPopupProps {
  isOpen: boolean;
  handlers: Handler[];
  onSelectHandler: (handler: string) => void;
  onClose: () => void;
  casinoAudioRef: React.RefObject<HTMLAudioElement | null>;
}

export function HandlerJackpotPopup({
  isOpen,
  handlers,
  onSelectHandler,
  onClose,
  casinoAudioRef,
}: HandlerJackpotPopupProps) {
  const cheerAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedHandler, setSelectedHandler] = useState<string | null>(null);
  const [showWinEffect, setShowWinEffect] = useState(false);

  // Initialize and play audio when popup opens
  useEffect(() => {
    if (isOpen) {
      // Ensure casino music is at full volume
      if (casinoAudioRef.current) {
        casinoAudioRef.current.volume = 0.4;
      }

      // Start crowd cheering
      if (!cheerAudioRef.current) {
        cheerAudioRef.current = new Audio(
          "https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3"
        );
        cheerAudioRef.current.loop = true;
      }
      cheerAudioRef.current.volume = 0.25;
      cheerAudioRef.current.play().catch(() => {});

      // Prepare win sound
      if (!winAudioRef.current) {
        winAudioRef.current = new Audio(
          "https://assets.mixkit.co/active_storage/sfx/1990/1990-preview.mp3"
        );
      }
    }

    return () => {
      // Cleanup audio when popup closes (but don't stop casino music here, it's managed by Dashboard)
      if (cheerAudioRef.current) {
        cheerAudioRef.current.pause();
        cheerAudioRef.current.currentTime = 0;
      }
    };
  }, [isOpen, casinoAudioRef]);

  const handleSelect = (handler: string) => {
    setSelectedHandler(handler);
    setShowWinEffect(true);

    // Play win sound
    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0;
      winAudioRef.current.volume = 0.5;
      winAudioRef.current.play().catch(() => {});
    }

    // Fade out all audio
    const fadeOut = setInterval(() => {
      if (casinoAudioRef.current && casinoAudioRef.current.volume > 0.05) {
        casinoAudioRef.current.volume -= 0.05;
      }
      if (cheerAudioRef.current && cheerAudioRef.current.volume > 0.03) {
        cheerAudioRef.current.volume -= 0.03;
      }
      if (
        (!casinoAudioRef.current || casinoAudioRef.current.volume <= 0.05) &&
        (!cheerAudioRef.current || cheerAudioRef.current.volume <= 0.03)
      ) {
        clearInterval(fadeOut);
        if (casinoAudioRef.current) {
          casinoAudioRef.current.pause();
          casinoAudioRef.current.currentTime = 0;
        }
        if (cheerAudioRef.current) {
          cheerAudioRef.current.pause();
          cheerAudioRef.current.currentTime = 0;
        }
      }
    }, 50);

    // Navigate after short delay
    setTimeout(() => {
      onSelectHandler(handler);
      setSelectedHandler(null);
      setShowWinEffect(false);
    }, 1200);
  };

  const handleSkip = () => {
    // Fade out audio quickly
    const fadeOut = setInterval(() => {
      if (casinoAudioRef.current && casinoAudioRef.current.volume > 0.05) {
        casinoAudioRef.current.volume -= 0.1;
      }
      if (cheerAudioRef.current && cheerAudioRef.current.volume > 0.03) {
        cheerAudioRef.current.volume -= 0.1;
      }
      if (
        (!casinoAudioRef.current || casinoAudioRef.current.volume <= 0.05) &&
        (!cheerAudioRef.current || cheerAudioRef.current.volume <= 0.03)
      ) {
        clearInterval(fadeOut);
        if (casinoAudioRef.current) {
          casinoAudioRef.current.pause();
          casinoAudioRef.current.currentTime = 0;
        }
        if (cheerAudioRef.current) {
          cheerAudioRef.current.pause();
          cheerAudioRef.current.currentTime = 0;
        }
      }
    }, 30);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Blurred backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in"
        onClick={handleSkip}
      />

      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Spinning light rays */}
        <div className="absolute inset-0 jackpot-rays" />
        
        {/* Floating sparkles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full jackpot-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1.5 + Math.random()}s`,
            }}
          />
        ))}
      </div>

      {/* Main popup container */}
      <div className="relative z-10 w-[90%] max-w-md animate-jackpot-entrance">
        {/* Glowing border container */}
        <div className="relative p-1 rounded-3xl jackpot-border-glow">
          <div className="relative bg-gradient-to-b from-gray-900 via-gray-900 to-black rounded-3xl p-6 overflow-hidden">
            {/* Inner glow effects */}
            <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 via-transparent to-purple-500/10 pointer-events-none" />
            
            {/* Marquee lights at top */}
            <div className="absolute top-0 left-0 right-0 h-2 jackpot-marquee" />

            {/* Header */}
            <div className="relative text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-6 h-6 text-yellow-400 animate-bounce" />
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 jackpot-text-glow">
                  TEAM HANDLERS
                </h2>
                <Trophy className="w-6 h-6 text-yellow-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <p className="text-sm text-yellow-200/70 font-medium tracking-wide">
                ✨ SELECT YOUR CHAMPION ✨
              </p>
            </div>

            {/* Handler cards grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {handlers.map((handler, idx) => {
                const initials = handler.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const isSelected = selectedHandler === handler.name;

                return (
                  <button
                    key={handler.name}
                    onClick={() => handleSelect(handler.name)}
                    disabled={!!selectedHandler}
                    className={cn(
                      "relative flex flex-col items-center p-3 rounded-2xl transition-all duration-300",
                      "bg-gradient-to-b from-gray-800 to-gray-900 border-2",
                      "hover:scale-105 hover:shadow-2xl active:scale-95",
                      "jackpot-card",
                      isSelected
                        ? "border-yellow-400 shadow-yellow-400/50 shadow-2xl scale-110"
                        : "border-yellow-600/50 hover:border-yellow-400/80"
                    )}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    {/* Slot machine reel effect */}
                    <div
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-lg mb-2",
                        "bg-gradient-to-br shadow-lg ring-2 ring-yellow-400/30",
                        "jackpot-avatar",
                        handler.colorClass,
                        isSelected && "ring-4 ring-yellow-400 animate-pulse"
                      )}
                    >
                      {initials || <User className="w-6 h-6" />}
                    </div>

                    {/* Handler name */}
                    <span className="text-xs font-bold text-white truncate max-w-full">
                      {handler.name.split(" ")[0].toUpperCase()}
                    </span>

                    {/* Client count with stars */}
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-bold text-yellow-400">
                        {handler.clientCount}
                      </span>
                    </div>

                    {/* Win effect overlay */}
                    {isSelected && showWinEffect && (
                      <div className="absolute inset-0 rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-yellow-400/30 animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-yellow-400 animate-spin" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Skip
            </button>

            {/* Bottom decorative lights */}
            <div className="absolute bottom-0 left-0 right-0 h-2 jackpot-marquee" style={{ animationDirection: 'reverse' }} />
          </div>
        </div>
      </div>

      {/* Win celebration overlay */}
      {showWinEffect && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full jackpot-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#F59E0B"][
                  Math.floor(Math.random() * 5)
                ],
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
