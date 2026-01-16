import { useEffect, useRef, useState, useCallback } from "react";
import { User, Sparkles, Trophy, Star, Volume2, Zap } from "lucide-react";
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

// Audio URLs - royalty free
const AUDIO_URLS = {
  casino: "https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3", // Arcade game music
  crowd: "https://assets.mixkit.co/active_storage/sfx/477/477-preview.mp3", // Crowd cheering
  spin: "https://assets.mixkit.co/active_storage/sfx/146/146-preview.mp3", // Slot spin
  win: "https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3", // Big win
  tick: "https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3", // Tick sound
};

export function HandlerJackpotPopup({
  isOpen,
  handlers,
  onSelectHandler,
  onClose,
  casinoAudioRef,
}: HandlerJackpotPopupProps) {
  const cheerAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isSpinning, setIsSpinning] = useState(true);
  const [spinningIndex, setSpinningIndex] = useState(0);
  const [selectedHandler, setSelectedHandler] = useState<string | null>(null);
  const [showWinEffect, setShowWinEffect] = useState(false);
  const [displayedHandler, setDisplayedHandler] = useState<Handler | null>(null);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop all audio
  const stopAllAudio = useCallback(() => {
    const audios = [casinoAudioRef.current, cheerAudioRef.current, spinAudioRef.current, tickAudioRef.current];
    audios.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
      }
    });
  }, [casinoAudioRef]);

  // Initialize and play audio when popup opens
  useEffect(() => {
    if (isOpen && handlers.length > 0) {
      setIsSpinning(true);
      setSelectedHandler(null);
      setShowWinEffect(false);
      setDisplayedHandler(handlers[0]);

      // Ensure casino music is at full volume
      if (casinoAudioRef.current) {
        casinoAudioRef.current.volume = 0.5;
        casinoAudioRef.current.play().catch(() => {});
      }

      // Start crowd cheering
      if (!cheerAudioRef.current) {
        cheerAudioRef.current = new Audio(AUDIO_URLS.crowd);
        cheerAudioRef.current.loop = true;
      }
      cheerAudioRef.current.volume = 0.3;
      cheerAudioRef.current.play().catch(() => {});

      // Prepare spin sound
      if (!spinAudioRef.current) {
        spinAudioRef.current = new Audio(AUDIO_URLS.spin);
        spinAudioRef.current.loop = true;
      }
      spinAudioRef.current.volume = 0.4;
      spinAudioRef.current.play().catch(() => {});

      // Prepare tick sound
      if (!tickAudioRef.current) {
        tickAudioRef.current = new Audio(AUDIO_URLS.tick);
      }

      // Prepare win sound
      if (!winAudioRef.current) {
        winAudioRef.current = new Audio(AUDIO_URLS.win);
      }

      // Start slot machine spinning animation
      let currentIndex = 0;
      spinIntervalRef.current = setInterval(() => {
        currentIndex = (currentIndex + 1) % handlers.length;
        setSpinningIndex(currentIndex);
        setDisplayedHandler(handlers[currentIndex]);
        
        // Play tick sound occasionally
        if (tickAudioRef.current && currentIndex % 2 === 0) {
          tickAudioRef.current.currentTime = 0;
          tickAudioRef.current.volume = 0.2;
          tickAudioRef.current.play().catch(() => {});
        }
      }, 80); // Very fast spinning

      // Slow down and stop after 2.5 seconds
      const slowdownTimeout = setTimeout(() => {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current);
        }
        
        // Gradually slow down
        let speed = 80;
        const slowDown = () => {
          speed += 50;
          currentIndex = (currentIndex + 1) % handlers.length;
          setSpinningIndex(currentIndex);
          setDisplayedHandler(handlers[currentIndex]);
          
          if (tickAudioRef.current) {
            tickAudioRef.current.currentTime = 0;
            tickAudioRef.current.volume = 0.3;
            tickAudioRef.current.play().catch(() => {});
          }
          
          if (speed < 500) {
            spinIntervalRef.current = setTimeout(slowDown, speed);
          } else {
            // Stop spinning
            setIsSpinning(false);
            if (spinAudioRef.current) {
              spinAudioRef.current.pause();
            }
          }
        };
        slowDown();
      }, 2500);

      return () => {
        clearTimeout(slowdownTimeout);
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current);
        }
      };
    }

    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, [isOpen, handlers, casinoAudioRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, [stopAllAudio]);

  const handleSelect = (handler: string) => {
    if (isSpinning) return;
    
    setSelectedHandler(handler);
    setShowWinEffect(true);

    // Play win sound - LOUD
    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0;
      winAudioRef.current.volume = 0.8;
      winAudioRef.current.play().catch(() => {});
    }

    // Stop all other audio immediately
    stopAllAudio();

    // Navigate after short delay
    setTimeout(() => {
      onSelectHandler(handler);
      setSelectedHandler(null);
      setShowWinEffect(false);
    }, 1500);
  };

  const handleSkip = () => {
    stopAllAudio();
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
    }
    onClose();
  };

  if (!isOpen) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Blurred backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        onClick={handleSkip}
      />

      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Spinning light rays */}
        <div className="absolute inset-0 jackpot-rays opacity-50" />
        
        {/* Electric bolts around edges */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
        
        {/* Floating sparkles */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full jackpot-sparkle"
            style={{
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F59E0B'][Math.floor(Math.random() * 5)],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1.5 + Math.random()}s`,
              boxShadow: `0 0 10px currentColor`,
            }}
          />
        ))}
        
        {/* Laser beams */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`laser-${i}`}
            className="absolute h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            style={{
              width: '100%',
              top: `${15 + i * 15}%`,
              animation: `laserSweep 2s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* Main popup container */}
      <div className="relative z-10 w-[95%] max-w-md animate-jackpot-entrance">
        {/* Glowing border container */}
        <div className="relative p-1.5 rounded-3xl jackpot-border-glow">
          <div className="relative bg-gradient-to-b from-gray-900 via-gray-900 to-black rounded-3xl p-5 overflow-hidden">
            {/* Inner neon glow effects */}
            <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 via-transparent to-purple-500/20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-cyan-500/10 pointer-events-none animate-pulse" />
            
            {/* Marquee lights at top and bottom */}
            <div className="absolute top-0 left-0 right-0 h-3 jackpot-marquee rounded-t-3xl" />
            <div className="absolute bottom-0 left-0 right-0 h-3 jackpot-marquee rounded-b-3xl" style={{ animationDirection: 'reverse' }} />

            {/* Sound indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-1 text-yellow-400">
              <Volume2 className="w-4 h-4 animate-pulse" />
            </div>

            {/* Header */}
            <div className="relative text-center mb-5 pt-2">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 jackpot-text-glow tracking-wider">
                  JACKPOT
                </h2>
                <Zap className="w-6 h-6 text-yellow-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
              <p className="text-sm text-yellow-200/80 font-bold tracking-widest">
                🎰 SPIN TO WIN 🎰
              </p>
            </div>

            {/* Slot Machine Display */}
            <div className="relative mb-6">
              {/* Slot machine frame */}
              <div className="relative mx-auto w-48 h-32 rounded-2xl overflow-hidden jackpot-slot-frame">
                {/* Slot window */}
                <div className="absolute inset-2 bg-black rounded-xl overflow-hidden border-4 border-yellow-600">
                  {/* Spinning handler display */}
                  <div 
                    className={cn(
                      "absolute inset-0 flex items-center justify-center transition-all",
                      isSpinning && "animate-pulse"
                    )}
                  >
                    {displayedHandler && (
                      <div className="flex flex-col items-center">
                        <div 
                          className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-xl",
                            "bg-gradient-to-br shadow-lg transition-all duration-75",
                            displayedHandler.colorClass,
                            isSpinning && "blur-sm scale-110"
                          )}
                          style={{
                            boxShadow: isSpinning 
                              ? '0 0 30px rgba(255,215,0,0.8)' 
                              : '0 0 20px rgba(255,215,0,0.5)',
                          }}
                        >
                          {getInitials(displayedHandler.name) || <User className="w-8 h-8" />}
                        </div>
                        <span className={cn(
                          "mt-2 text-lg font-black text-yellow-400 tracking-wider transition-all",
                          isSpinning && "blur-sm"
                        )}>
                          {displayedHandler.name.split(" ")[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Scan line effect during spin */}
                  {isSpinning && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
                        animation: 'slotScan 0.1s linear infinite',
                      }}
                    />
                  )}
                </div>
                
                {/* Slot machine lever indicator */}
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-16 bg-gradient-to-b from-red-500 to-red-700 rounded-full shadow-lg" />
              </div>
              
              {/* Spinning status */}
              <div className="text-center mt-3">
                <span className={cn(
                  "text-sm font-bold tracking-wider",
                  isSpinning ? "text-yellow-400 animate-pulse" : "text-green-400"
                )}>
                  {isSpinning ? "⚡ SPINNING... ⚡" : "✓ TAP TO SELECT"}
                </span>
              </div>
            </div>

            {/* Handler cards grid - only show when not spinning */}
            <div className={cn(
              "grid grid-cols-3 gap-3 mb-5 transition-all duration-500",
              isSpinning ? "opacity-30 blur-sm scale-95" : "opacity-100"
            )}>
              {handlers.map((handler, idx) => {
                const initials = getInitials(handler.name);
                const isSelected = selectedHandler === handler.name;
                const isHighlighted = !isSpinning && displayedHandler?.name === handler.name;

                return (
                  <button
                    key={handler.name}
                    onClick={() => handleSelect(handler.name)}
                    disabled={isSpinning || !!selectedHandler}
                    className={cn(
                      "relative flex flex-col items-center p-3 rounded-2xl transition-all duration-300",
                      "bg-gradient-to-b from-gray-800 to-gray-900 border-2",
                      "hover:scale-105 hover:shadow-2xl active:scale-95",
                      "jackpot-card",
                      isSelected
                        ? "border-yellow-400 shadow-yellow-400/50 shadow-2xl scale-110 z-10"
                        : isHighlighted
                          ? "border-green-400 shadow-green-400/30 shadow-xl ring-2 ring-green-400"
                          : "border-yellow-600/50 hover:border-yellow-400/80"
                    )}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    {/* Highlighted badge */}
                    {isHighlighted && !isSelected && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 rounded-full text-[8px] font-bold text-white shadow-lg">
                        LANDED
                      </div>
                    )}
                    
                    {/* Slot machine reel effect */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-base mb-1.5",
                        "bg-gradient-to-br shadow-lg ring-2 ring-yellow-400/30",
                        "jackpot-avatar",
                        handler.colorClass,
                        isSelected && "ring-4 ring-yellow-400 animate-pulse",
                        isHighlighted && "ring-4 ring-green-400"
                      )}
                    >
                      {initials || <User className="w-5 h-5" />}
                    </div>

                    {/* Handler name */}
                    <span className="text-[10px] font-bold text-white truncate max-w-full">
                      {handler.name.split(" ")[0].toUpperCase()}
                    </span>

                    {/* Client count with stars */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-[9px] font-bold text-yellow-400">
                        {handler.clientCount}
                      </span>
                    </div>

                    {/* Win effect overlay */}
                    {isSelected && showWinEffect && (
                      <div className="absolute inset-0 rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-yellow-400/40 animate-pulse" />
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
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* Win celebration overlay */}
      {showWinEffect && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Flash effect */}
          <div className="absolute inset-0 bg-yellow-400/30 animate-flash" />
          
          {/* Trophy burst */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="w-32 h-32 text-yellow-400 animate-bounce opacity-80" style={{ filter: 'drop-shadow(0 0 30px gold)' }} />
          </div>
          
          {/* Confetti */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full jackpot-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${8 + Math.random() * 12}px`,
                height: `${8 + Math.random() * 12}px`,
                backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#F59E0B", "#EC4899"][
                  Math.floor(Math.random() * 6)
                ],
                animationDelay: `${Math.random() * 0.5}s`,
                boxShadow: '0 0 10px currentColor',
              }}
            />
          ))}
        </div>
      )}

      {/* Extra CSS for slot machine */}
      <style>{`
        @keyframes slotScan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        
        @keyframes laserSweep {
          0%, 100% { opacity: 0; transform: scaleX(0); }
          50% { opacity: 0.6; transform: scaleX(1); }
        }
        
        .jackpot-slot-frame {
          background: linear-gradient(135deg, #b8860b 0%, #ffd700 20%, #b8860b 40%, #ffd700 60%, #b8860b 80%, #ffd700 100%);
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(0,0,0,0.5);
        }
        
        .animate-flash {
          animation: flash 0.3s ease-out forwards;
        }
        
        @keyframes flash {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
