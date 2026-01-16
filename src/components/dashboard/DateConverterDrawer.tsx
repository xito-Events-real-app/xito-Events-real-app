// Ultra-Fast Bilingual Voice Date Converter
// Spiritual UI with instant client-side conversion

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, Keyboard, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceDateConverter } from '@/hooks/useVoiceDateConverter';
import { parseDateFromInput, numberToNepali, getNepaliMonthName } from '@/lib/date-parser';
import { adToBS, bsToAD, getCurrentBSDate, nepaliMonthsEnglish } from '@/lib/nepali-date';

interface DateConverterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConversionResult {
  nepaliDate: { year: number; month: number; day: number };
  englishDate: Date;
  nepaliFormatted: string;
  nepaliFormattedDevanagari: string;
  englishFormatted: string;
  targetCalendar: 'BS' | 'AD';
}

export function DateConverterDrawer({ isOpen, onClose }: DateConverterDrawerProps) {
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    isListening,
    transcript,
    error: voiceError,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoiceDateConverter();

  // Convert and get result - defined before useEffects
  const processInput = useCallback((input: string) => {
    if (!input.trim()) return;
    
    console.log('Processing input:', input);
    setIsProcessing(true);
    
    // Parse the input (instant - no network)
    const parsed = parseDateFromInput(input);
    console.log('Parsed result:', parsed);
    
    let nepaliDate: { year: number; month: number; day: number };
    let englishDate: Date;
    
    if (parsed.isToday) {
      // Today's date
      const currentBS = getCurrentBSDate();
      nepaliDate = { 
        year: currentBS.year, 
        month: currentBS.month, 
        day: typeof currentBS.day === 'number' ? currentBS.day : 1 
      };
      englishDate = new Date();
    } else if (parsed.targetCalendar === 'AD') {
      // Input is likely BS, convert to AD
      const currentBS = getCurrentBSDate();
      const year = parsed.year || currentBS.year;
      const month = parsed.month || currentBS.month;
      const day = parsed.day || 1;
      nepaliDate = { year, month, day };
      
      const adResult = bsToAD(year, month, day);
      if (adResult instanceof Date) {
        englishDate = adResult;
      } else {
        // Handle unknown day case
        englishDate = new Date();
      }
    } else {
      // Input is likely AD, convert to BS
      const now = new Date();
      const year = parsed.year || now.getFullYear();
      const month = parsed.month || now.getMonth() + 1;
      const day = parsed.day || now.getDate();
      
      englishDate = new Date(year, month - 1, day);
      const bsResult = adToBS(englishDate);
      nepaliDate = { 
        year: bsResult.year, 
        month: bsResult.month, 
        day: typeof bsResult.day === 'number' ? bsResult.day : 1 
      };
    }
    
    // Format results
    const nepaliFormatted = `${nepaliDate.day} ${nepaliMonthsEnglish[nepaliDate.month - 1]} ${nepaliDate.year}`;
    const nepaliFormattedDevanagari = `${numberToNepali(nepaliDate.day)} ${getNepaliMonthName(nepaliDate.month)} ${numberToNepali(nepaliDate.year)}`;
    const englishFormatted = englishDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    console.log('Setting result:', { nepaliFormatted, englishFormatted });
    
    setResult({
      nepaliDate,
      englishDate,
      nepaliFormatted,
      nepaliFormattedDevanagari,
      englishFormatted,
      targetCalendar: parsed.targetCalendar,
    });
    
    setIsProcessing(false);
  }, []);


  // Auto-start voice listening when drawer opens
  useEffect(() => {
    if (isOpen && voiceSupported && !hasAutoStarted && !result) {
      setHasAutoStarted(true);
      const timer = setTimeout(() => {
        console.log('Auto-starting voice recognition...');
        clearTranscript();
        startListening();
      }, 600);
      return () => clearTimeout(timer);
    }
    
    // Reset auto-start flag when drawer closes
    if (!isOpen) {
      setHasAutoStarted(false);
    }
  }, [isOpen, voiceSupported, hasAutoStarted, result, clearTranscript, startListening]);

  // Process voice transcript when received
  useEffect(() => {
    if (transcript && transcript.trim()) {
      console.log('Transcript received:', transcript);
      processInput(transcript);
    }
  }, [transcript, processInput]);

  // Handle text input submit
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Text submit:', textInput);
    if (textInput.trim()) {
      processInput(textInput);
      setTextInput(''); // Clear after processing
    }
  };

  // Handle mic button click
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      clearTranscript();
      setResult(null);
      startListening();
    }
  };


  // Reset state when drawer closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTextInput('');
      setResult(null);
      setShowTextInput(false);
      setHasAutoStarted(false);
      clearTranscript();
      if (isListening) {
        stopListening();
      }
      onClose();
    }
  };

  // Retry voice recognition
  const handleRetryVoice = () => {
    clearTranscript();
    setResult(null);
    startListening();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 border border-purple-500/30 max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        {/* Sacred geometry background pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 rounded-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-purple-400/50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-indigo-400/50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-violet-400/50" />
        </div>

        {/* Close button */}
        <button
          onClick={() => handleOpenChange(false)}
          className="absolute top-3 left-3 p-2 text-purple-300/70 hover:text-purple-200 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>


        <DialogHeader className="text-center pt-10 pb-4 px-6">
          <DialogTitle className="text-purple-200 flex items-center justify-center gap-2">
            <span className="text-2xl">🕉️</span>
            <span className="font-light tracking-wide">Date Converter</span>
          </DialogTitle>
          <p className="text-purple-400/70 text-xs mt-1">
            Speak or type in any language
          </p>
        </DialogHeader>

        <div className="px-6 pb-8 space-y-6 relative z-10">
          {/* Mic Button - Primary Action */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleMicClick}
              disabled={!voiceSupported}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                "border-2 shadow-lg",
                isListening
                  ? "bg-purple-500 border-purple-300 shadow-purple-500/50 animate-pulse"
                  : "bg-purple-900/50 border-purple-500/50 hover:bg-purple-800/50 hover:border-purple-400",
                !voiceSupported && "opacity-50 cursor-not-allowed"
              )}
            >
              {isListening ? (
                <Mic className="w-8 h-8 text-white animate-bounce" />
              ) : (
                <Mic className="w-8 h-8 text-purple-200" />
              )}
            </button>
            
            <p className={cn(
              "text-sm mt-3 transition-colors",
              isListening ? "text-purple-300" : "text-purple-400/70"
            )}>
              {isListening ? "Listening..." : voiceSupported ? "Tap to speak" : "Voice not supported"}
            </p>
            
            {/* Voice error with retry */}
            {voiceError && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <p className="text-red-400 text-xs">{voiceError}</p>
                <button
                  onClick={handleRetryVoice}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-700 hover:bg-purple-600 text-white rounded-full transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Text input toggle */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                setShowTextInput(!showTextInput);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="text-purple-400/70 text-xs flex items-center gap-1 hover:text-purple-300 transition-colors"
            >
              <Keyboard className="w-3 h-3" />
              {showTextInput ? "Hide keyboard" : "Type instead"}
            </button>
          </div>

          {/* Text input */}
          {showTextInput && (
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a date... (e.g., 2079 magh 15)"
                className="flex-1 bg-purple-900/30 border-purple-500/30 text-purple-100 placeholder:text-purple-400/50 focus:border-purple-400"
              />
              <Button
                type="submit"
                size="icon"
                className="bg-purple-600 hover:bg-purple-500"
              >
                →
              </Button>
            </form>
          )}

          {/* Transcript display */}
          {transcript && (
            <div className="text-center">
              <p className="text-purple-300/50 text-xs uppercase tracking-wider mb-1">You said:</p>
              <p className="text-purple-100 text-lg font-light">{transcript}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              
              {/* Primary result (what they asked for) */}
              <div className={cn(
                "p-4 rounded-xl text-center",
                result.targetCalendar === 'BS'
                  ? "bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30"
                  : "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30"
              )}>
                <p className="text-xs uppercase tracking-wider mb-2 opacity-70">
                  {result.targetCalendar === 'BS' ? '🇳🇵 Nepali (BS)' : '🇬🇧 English (AD)'}
                </p>
                {result.targetCalendar === 'BS' ? (
                  <>
                    <p className="text-2xl font-bold text-white mb-1">
                      {result.nepaliFormattedDevanagari}
                    </p>
                    <p className="text-sm text-purple-200/70">
                      {result.nepaliFormatted}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-white">
                    {result.englishFormatted}
                  </p>
                )}
              </div>

              {/* Secondary result */}
              <div className={cn(
                "p-3 rounded-xl text-center opacity-70",
                result.targetCalendar === 'AD'
                  ? "bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20"
                  : "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
              )}>
                <p className="text-xs uppercase tracking-wider mb-1 opacity-70">
                  {result.targetCalendar === 'AD' ? '🇳🇵 Nepali (BS)' : '🇬🇧 English (AD)'}
                </p>
                {result.targetCalendar === 'AD' ? (
                  <p className="text-lg text-white">
                    {result.nepaliFormattedDevanagari}
                  </p>
                ) : (
                  <p className="text-lg text-white">
                    {result.englishFormatted}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex justify-center">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
