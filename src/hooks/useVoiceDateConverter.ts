// Voice Date Converter Hook
// Uses Web Speech API for voice recognition

import { useState, useCallback, useRef, useEffect } from 'react';

// Extend Window interface for Speech Recognition
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface VoiceRecognitionState {
  isListening: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
}

export function useVoiceDateConverter() {
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    transcript: '',
    error: null,
    isSupported: typeof window !== 'undefined' && 
      (!!window.SpeechRecognition || !!window.webkitSpeechRecognition),
  });
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultCallback = useRef<((transcript: string) => void) | null>(null);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    if (!state.isSupported) return null;
    
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    // Configure for quick response
    recognition.continuous = false;
    recognition.interimResults = false; // Only final results for speed
    recognition.maxAlternatives = 1;
    
    // Support both Nepali and English
    // Note: Browser may not support all languages
    recognition.lang = 'ne-NP'; // Primary Nepali, will also recognize English
    
    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }));
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      if (result.isFinal) {
        const transcript = result[0].transcript;
        setState(prev => ({ ...prev, transcript }));
        onResultCallback.current?.(transcript);
      }
    };
    
    recognition.onerror = (event) => {
      let errorMessage = 'Voice recognition error';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied.';
          break;
        case 'network':
          errorMessage = 'Network error. Check your connection.';
          break;
      }
      setState(prev => ({ ...prev, error: errorMessage, isListening: false }));
    };
    
    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
    };
    
    return recognition;
  }, [state.isSupported]);

  // Start listening
  const startListening = useCallback((onResult?: (transcript: string) => void) => {
    if (!state.isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: 'Voice recognition not supported in this browser.' 
      }));
      return;
    }
    
    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    
    // Store callback
    onResultCallback.current = onResult || null;
    
    // Create new recognition instance
    recognitionRef.current = initRecognition();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to start voice recognition.' 
        }));
      }
    }
  }, [state.isSupported, initRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', error: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    clearTranscript,
  };
}
