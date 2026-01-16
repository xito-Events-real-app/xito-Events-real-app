import { useEffect, useRef, useState, useCallback } from "react";
import { User, Sparkles, Trophy, Star, Zap, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Handler {
  name: string;
  clientCount: number;
  colorClass: string;
}

interface HandlerJackpotPopupProps {
  isOpen: boolean;
  handlers: Handler[];
  onSelectHandler: (handler: string, shouldRemember: boolean) => void;
  onClose: () => void;
  casinoAudioRef: React.RefObject<HTMLAudioElement | null>;
}

// Audio URLs
const AUDIO_URLS = {
  spin: "https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3", // Fast tick
  win: "https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3", // Big win explosion
};

export function HandlerJackpotPopup({
  isOpen,
  handlers,
  onSelectHandler,
  onClose,
  casinoAudioRef,
}: HandlerJackpotPopupProps) {
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const [selectedHandler, setSelectedHandler] = useState<string | null>(null);
  const [showWinEffect, setShowWinEffect] = useState(false);
  const [spinIndex, setSpinIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [showRememberPrompt, setShowRememberPrompt] = useState(false);
  const [pendingHandler, setPendingHandler] = useState<string | null>(null);
  const spinIntervalRef = useRef<number | null>(null);
  const spinCountRef = useRef(0);

  // Stop all audio immediately
  const stopAllAudio = useCallback(() => {
    if (casinoAudioRef.current) {
      casinoAudioRef.current.pause();
      casinoAudioRef.current.currentTime = 0;
      casinoAudioRef.current.volume = 0;
    }
    if (tickAudioRef.current) {
      tickAudioRef.current.pause();
    }
  }, [casinoAudioRef]);

  // Ultra fast slot spin effect
  useEffect(() => {
    if (!isOpen || handlers.length === 0) return;

    setIsSpinning(true);
    setSelectedHandler(null);
    setShowWinEffect(false);
    spinCountRef.current = 0;

    // Ensure casino music plays
    if (casinoAudioRef.current) {
      casinoAudioRef.current.volume = 0.4;
      casinoAudioRef.current.play().catch(() => {});
    }

    // Prepare tick sound
    if (!tickAudioRef.current) {
      tickAudioRef.current = new Audio(AUDIO_URLS.spin);
    }

    // Prepare win sound
    if (!winAudioRef.current) {
      winAudioRef.current = new Audio(AUDIO_URLS.win);
    }

    // ULTRA FAST spinning - 30ms intervals
    const totalSpins = 25; // Only 25 spins = ~750ms total
    let currentSpeed = 30;
    
    const spin = () => {
      spinCountRef.current++;
      setSpinIndex(prev => (prev + 1) % handlers.length);
      
      // Play tick every few spins
      if (tickAudioRef.current && spinCountRef.current % 3 === 0) {
        tickAudioRef.current.currentTime = 0;
        tickAudioRef.current.volume = 0.15;
        tickAudioRef.current.play().catch(() => {});
      }

      if (spinCountRef.current < totalSpins) {
        // Speed up slightly at end
        currentSpeed = spinCountRef.current > 20 ? 60 : 30;
        spinIntervalRef.current = window.setTimeout(spin, currentSpeed);
      } else {
        // Stop immediately
        setIsSpinning(false);
        if (tickAudioRef.current) tickAudioRef.current.pause();
      }
    };

    // Start spinning immediately
    spinIntervalRef.current = window.setTimeout(spin, 30);

    return () => {
      if (spinIntervalRef.current) {
        clearTimeout(spinIntervalRef.current);
      }
    };
  }, [isOpen, handlers, casinoAudioRef]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearTimeout(spinIntervalRef.current);
    };
  }, []);

  const handleSelect = (handler: string) => {
    if (isSpinning) return;
    
    setSelectedHandler(handler);
    setShowWinEffect(true);

    // Stop all audio IMMEDIATELY
    stopAllAudio();

    // Play win sound
    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0;
      winAudioRef.current.volume = 0.7;
      winAudioRef.current.play().catch(() => {});
    }

    // Show remember prompt after brief win effect
    setTimeout(() => {
      setShowWinEffect(false);
      setPendingHandler(handler);
      setShowRememberPrompt(true);
    }, 600);
  };

  const handleRememberChoice = (shouldRemember: boolean) => {
    if (pendingHandler) {
      onSelectHandler(pendingHandler, shouldRemember);
    }
    setShowRememberPrompt(false);
    setPendingHandler(null);
  };

  const handleSkip = () => {
    stopAllAudio();
    if (spinIntervalRef.current) clearTimeout(spinIntervalRef.current);
    onClose();
  };

  if (!isOpen) return null;

  const getInitials = (name: string) => 
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const currentHandler = handlers[spinIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" onClick={handleSkip} />

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 jackpot-rays opacity-40" />
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full jackpot-sparkle"
            style={{
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
              background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7'][i % 4],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Main popup */}
      <div className="relative z-10 w-[90%] max-w-sm animate-jackpot-entrance">
        <div className="relative p-1 rounded-2xl jackpot-border-glow">
          <div className="relative bg-gradient-to-b from-gray-900 to-black rounded-2xl p-4 overflow-hidden">
            {/* Rainbow marquee */}
            <div className="absolute top-0 left-0 right-0 h-2 jackpot-marquee rounded-t-2xl" />
            <div className="absolute bottom-0 left-0 right-0 h-2 jackpot-marquee rounded-b-2xl" style={{ animationDirection: 'reverse' }} />

            {/* Header */}
            <div className="text-center mb-4 pt-1">
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 jackpot-text-glow">
                  JACKPOT
                </h2>
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
            </div>

            {/* SLOT MACHINE DISPLAY */}
            <div className="relative mx-auto w-40 h-28 mb-4 rounded-xl overflow-hidden" 
              style={{ 
                background: 'linear-gradient(135deg, #b8860b, #ffd700, #b8860b)',
                boxShadow: '0 0 30px rgba(255,215,0,0.5), inset 0 0 20px rgba(0,0,0,0.5)'
              }}>
              <div className="absolute inset-2 bg-black rounded-lg overflow-hidden border-4 border-yellow-600 flex items-center justify-center">
                {currentHandler && (
                  <div className={cn(
                    "flex flex-col items-center transition-all duration-[30ms]",
                    isSpinning && "blur-[2px]"
                  )}>
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg bg-gradient-to-br",
                      currentHandler.colorClass
                    )} style={{ boxShadow: '0 0 20px rgba(255,215,0,0.6)' }}>
                      {getInitials(currentHandler.name) || <User className="w-6 h-6" />}
                    </div>
                    <span className="mt-1 text-sm font-black text-yellow-400 tracking-wide">
                      {currentHandler.name.split(" ")[0].toUpperCase()}
                    </span>
                  </div>
                )}
                {isSpinning && (
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)',
                    animation: 'slotScan 0.08s linear infinite',
                  }} />
                )}
              </div>
            </div>

            {/* Status */}
            <div className="text-center mb-3">
              <span className={cn(
                "text-xs font-bold tracking-wider",
                isSpinning ? "text-yellow-400 animate-pulse" : "text-green-400"
              )}>
                {isSpinning ? "⚡ SPINNING ⚡" : "✓ TAP TO SELECT"}
              </span>
            </div>

            {/* Handler grid */}
            <div className={cn(
              "grid grid-cols-3 gap-2 mb-3 transition-all duration-200",
              isSpinning ? "opacity-40 blur-[1px]" : "opacity-100"
            )}>
              {handlers.map((handler, idx) => {
                const isSelected = selectedHandler === handler.name;
                const isLanded = !isSpinning && spinIndex === idx;

                return (
                  <button
                    key={handler.name}
                    onClick={() => handleSelect(handler.name)}
                    disabled={isSpinning || !!selectedHandler}
                    className={cn(
                      "relative flex flex-col items-center p-2 rounded-xl transition-all",
                      "bg-gradient-to-b from-gray-800 to-gray-900 border-2",
                      "active:scale-90",
                      isSelected ? "border-yellow-400 shadow-yellow-400/50 shadow-xl scale-105" :
                      isLanded ? "border-green-400 shadow-green-400/30 shadow-lg ring-2 ring-green-400" :
                      "border-yellow-600/40 hover:border-yellow-400/70"
                    )}
                  >
                    {isLanded && !isSelected && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-green-500 rounded text-[7px] font-bold text-white">
                        LANDED
                      </div>
                    )}
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br",
                      handler.colorClass,
                      (isSelected || isLanded) && "ring-2 ring-yellow-400"
                    )}>
                      {getInitials(handler.name) || <User className="w-4 h-4" />}
                    </div>
                    <span className="text-[9px] font-bold text-white mt-1 truncate max-w-full">
                      {handler.name.split(" ")[0].toUpperCase()}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2 h-2 text-yellow-400 fill-yellow-400" />
                      <span className="text-[8px] font-bold text-yellow-400">{handler.clientCount}</span>
                    </div>

                    {isSelected && showWinEffect && (
                      <div className="absolute inset-0 rounded-xl overflow-hidden">
                        <div className="absolute inset-0 bg-yellow-400/50 animate-pulse" />
                        <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-yellow-400 animate-spin" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Skip */}
            <button onClick={handleSkip} className="w-full py-1 text-[10px] text-gray-500 hover:text-gray-300">
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* Win overlay */}
      {showWinEffect && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute inset-0 bg-yellow-400/20 animate-flash" />
          <Trophy className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 text-yellow-400 animate-bounce" style={{ filter: 'drop-shadow(0 0 20px gold)' }} />
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full jackpot-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${6 + Math.random() * 10}px`,
                height: `${6 + Math.random() * 10}px`,
                backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#F59E0B"][i % 5],
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Remember Me Prompt */}
      {showRememberPrompt && pendingHandler && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 w-[85%] max-w-xs bg-gradient-to-b from-gray-900 to-black rounded-2xl p-5 border-2 border-yellow-500/50 shadow-2xl animate-jackpot-entrance">
            {/* Handler Display */}
            <div className="flex flex-col items-center mb-4">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-xl bg-gradient-to-br mb-2",
                handlers.find(h => h.name === pendingHandler)?.colorClass || "from-violet-500 to-purple-600"
              )} style={{ boxShadow: '0 0 25px rgba(255,215,0,0.5)' }}>
                {getInitials(pendingHandler)}
              </div>
              <h3 className="text-xl font-black text-yellow-400">{pendingHandler}</h3>
            </div>

            {/* Question */}
            <div className="text-center mb-5">
              <p className="text-sm text-gray-300 mb-1">Is this <span className="font-bold text-white">YOUR</span> device?</p>
              <p className="text-[10px] text-gray-500">App will auto-open your tasks next time</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => handleRememberChoice(false)}
                variant="outline"
                className="flex-1 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <X className="w-4 h-4 mr-1.5" />
                No, Skip
              </Button>
              <Button
                onClick={() => handleRememberChoice(true)}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold hover:from-yellow-400 hover:to-amber-400"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Yes, Remember
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slotScan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-flash {
          animation: flash 0.2s ease-out forwards;
        }
        @keyframes flash {
          0% { opacity: 0.6; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
