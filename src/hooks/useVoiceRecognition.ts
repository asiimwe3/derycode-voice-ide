import { useEffect, useRef, useState } from 'react';

interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

// Minimal type defs for Web Speech API (not in standard TS lib)
interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
  resultIndex: number;
}

export function useVoiceRecognition(onResult: (result: SpeechRecognitionResult) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript;
      onResult({ transcript, isFinal: last.isFinal });
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (isListening) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [isListening, onResult]);

  const start = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // Already started
      }
    }
  };

  const stop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggle = () => (isListening ? stop() : start());

  return { isListening, start, stop, toggle };
}
