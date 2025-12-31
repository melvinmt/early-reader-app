/**
 * Speech Recognition Hook
 * 
 * Manages speech recognition lifecycle for pronunciation validation.
 * Handles feature flag, permissions, and session-based pass state.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Voice from '@react-native-voice/voice';
import { FEATURES } from '@/config/features';
import { getLocale } from '@/config/locale';
import { speechRecognitionService, FuzzyMatchResult } from '@/services/speech/speechRecognitionService';
import { audioPlayer } from '@/services/audio/audioPlayer';

export type SpeechRecognitionState = 'idle' | 'listening' | 'matched' | 'incorrect' | 'no-input';

export interface UseSpeechRecognitionResult {
  isEnabled: boolean;
  state: SpeechRecognitionState;
  hasCorrectPronunciation: boolean;
  hasSaidAnything: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  restart: () => Promise<void>;
}

export interface UseSpeechRecognitionOptions {
  targetText: string; // The word/phrase the child should pronounce
  onMatch?: (confidence: number) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for speech recognition with pronunciation validation
 * 
 * Returns:
 * - isEnabled: Whether speech recognition is available and enabled
 * - state: Current recognition state
 * - hasCorrectPronunciation: Whether the target was matched (persists once matched)
 * - hasSaidAnything: Whether any speech was detected
 * - startListening: Start listening for speech
 * - stopListening: Stop listening
 * - restart: Restart recognition for a new card
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions
): UseSpeechRecognitionResult {
  const { targetText, onMatch, onError } = options;

  const [isEnabled, setIsEnabled] = useState(false);
  const [state, setState] = useState<SpeechRecognitionState>('idle');
  const [hasCorrectPronunciation, setHasCorrectPronunciation] = useState(false);
  const [hasSaidAnything, setHasSaidAnything] = useState(false);

  const targetTextRef = useRef(targetText);
  const isMountedRef = useRef(true);
  const hasMatchedRef = useRef(false); // Session-based pass persistence

  // Update target text ref when it changes
  useEffect(() => {
    targetTextRef.current = targetText;
  }, [targetText]);

  // Check feature flag and availability on mount
  useEffect(() => {
    isMountedRef.current = true;

    const checkAvailability = async () => {
      if (!FEATURES.SPEECH_RECOGNITION_ENABLED) {
        setIsEnabled(false);
        setHasCorrectPronunciation(true); // Always pass when disabled
        return;
      }

      try {
        const available = await speechRecognitionService.checkAvailability();
        setIsEnabled(available);
        
        if (!available) {
          setHasCorrectPronunciation(true); // Always pass when unavailable
        }
      } catch (error) {
        console.error('Error checking speech recognition availability:', error);
        setIsEnabled(false);
        setHasCorrectPronunciation(true); // Always pass on error
      }
    };

    checkAvailability();

    return () => {
      isMountedRef.current = false;
      // Cleanup will be handled by the cleanup effect
    };
  }, []);

  // Set up Voice event handlers
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const onSpeechStart = () => {
      if (!isMountedRef.current) return;
      setState('listening');
    };

    const onSpeechEnd = () => {
      if (!isMountedRef.current) return;
      // Don't change state here - let onSpeechResults handle it
    };

    const onSpeechResults = (event: any) => {
      if (!isMountedRef.current) return;
      
      const results = event.value || [];
      if (results.length === 0) {
        setState('no-input');
        setHasSaidAnything(false);
        return;
      }

      const recognizedText = results[0];
      speechRecognitionService.setRecognizedText(recognizedText);
      setHasSaidAnything(true);

      // Fuzzy match against target
      const matchResult = speechRecognitionService.fuzzyMatch(
        recognizedText,
        targetTextRef.current
      );

      if (matchResult.matched) {
        hasMatchedRef.current = true;
        setHasCorrectPronunciation(true);
        setState('matched');
        
        // Stop listening once matched (session-based pass persistence)
        speechRecognitionService.stopListening().catch(console.error);
        // Disable recording mode when matched
        audioPlayer.disableRecordingMode().catch(console.error);
        
        onMatch?.(matchResult.confidence);
      } else {
        setState('incorrect');
      }
    };

    const onSpeechPartialResults = (event: any) => {
      if (!isMountedRef.current) return;
      
      const results = event.value || [];
      if (results.length > 0) {
        const recognizedText = results[0];
        speechRecognitionService.setRecognizedText(recognizedText);
        setHasSaidAnything(true);
      }
    };

    const onSpeechError = (event: any) => {
      if (!isMountedRef.current) return;
      
      const error = event.error?.message || event.error || 'Unknown error';
      console.error('Speech recognition error:', error);
      setState('idle');
      
      onError?.(error);
    };

    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      Voice.removeAllListeners();
    };
  }, [isEnabled, targetText, onMatch, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (isEnabled) {
        speechRecognitionService.destroy().catch(console.error);
        audioPlayer.disableRecordingMode().catch(console.error);
      }
    };
  }, [isEnabled]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!isEnabled) {
      return;
    }

    // If already matched for this card, don't start listening again
    if (hasMatchedRef.current) {
      return;
    }

    try {
      // Enable recording mode for speech recognition
      await audioPlayer.enableRecordingMode();
      
      const locale = getLocale();
      const result = await speechRecognitionService.startListening(locale);
      
      if (!result.available) {
        setIsEnabled(false);
        setHasCorrectPronunciation(true); // Fallback to always pass
        await audioPlayer.disableRecordingMode(); // Disable if not available
        if (result.error) {
          onError?.(result.error);
        }
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsEnabled(false);
      setHasCorrectPronunciation(true); // Fallback to always pass
      await audioPlayer.disableRecordingMode(); // Disable on error
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [isEnabled, onError]);

  // Stop listening
  const stopListening = useCallback(async () => {
    if (!isEnabled) {
      return;
    }

    try {
      await speechRecognitionService.stopListening();
      setState('idle');
      // Disable recording mode when not listening
      await audioPlayer.disableRecordingMode();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      await audioPlayer.disableRecordingMode(); // Disable on error
    }
  }, [isEnabled]);

  // Restart for a new card
  const restart = useCallback(async () => {
    if (!isEnabled) {
      return;
    }

    // Reset state for new card
    hasMatchedRef.current = false;
    setHasCorrectPronunciation(false);
    setHasSaidAnything(false);
    setState('idle');
    speechRecognitionService.setRecognizedText(null);

    // Stop any active listening
    await speechRecognitionService.stopListening();
  }, [isEnabled]);

  // Auto-start listening when target text changes (new card)
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // Reset for new card
    hasMatchedRef.current = false;
    setHasCorrectPronunciation(false);
    setHasSaidAnything(false);
    setState('idle');

    // Start listening after a short delay
    const timer = setTimeout(() => {
      if (isMountedRef.current && !hasMatchedRef.current) {
        startListening();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [targetText, isEnabled, startListening]);

  return {
    isEnabled,
    state,
    hasCorrectPronunciation,
    hasSaidAnything,
    startListening,
    stopListening,
    restart,
  };
}

