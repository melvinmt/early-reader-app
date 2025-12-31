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
  recognizedText: string | null; // Real-time recognized text for parent feedback
  matchConfidence: number | null; // Confidence of the match (1.0 = perfect, < 1.0 = close enough)
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  pauseListening: () => Promise<void>; // Temporarily pause (e.g., during audio playback)
  resumeListening: () => Promise<void>; // Resume after pause
  restart: () => Promise<void>;
  clearTranscript: () => void; // Clear the recognized text
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
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [matchConfidence, setMatchConfidence] = useState<number | null>(null);

  const targetTextRef = useRef(targetText);
  const isMountedRef = useRef(true);
  const hasMatchedRef = useRef(false); // Session-based pass persistence
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timer to reset after pause

  // Update target text ref when it changes
  useEffect(() => {
    targetTextRef.current = targetText;
  }, [targetText]);

  // Check feature flag and availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      if (!FEATURES.SPEECH_RECOGNITION_ENABLED) {
        console.log('🎤 Speech recognition disabled by feature flag');
        setIsEnabled(false);
        setHasCorrectPronunciation(true); // Always pass when disabled
        return;
      }

      try {
        console.log('🎤 Checking speech recognition availability...');
        const available = await speechRecognitionService.checkAvailability();
        console.log('🎤 Speech recognition available:', available);
        
        if (!available) {
          setIsEnabled(false);
          setHasCorrectPronunciation(true); // Always pass when unavailable
          return;
        }

        // Mark as enabled - permissions will be requested when we actually start listening
        setIsEnabled(true);
        console.log('🎤 Speech recognition enabled - permissions will be requested on first use');
      } catch (error) {
        console.error('🎤 Error checking speech recognition availability:', error);
        setIsEnabled(false);
        setHasCorrectPronunciation(true); // Always pass on error
      }
    };

    checkAvailability();
  }, []);

  // Set up Voice event handlers
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const onSpeechStart = () => {
      console.log('🎤 onSpeechStart event fired');
      if (!isMountedRef.current) return;
      setState('listening');
    };

    const onSpeechEnd = () => {
      console.log('🎤 onSpeechEnd event fired');
      if (!isMountedRef.current) return;
      // Don't change state here - let onSpeechResults handle it
    };
    
    // Helper to restart speech recognition (clears iOS buffer)
    const restartRecognition = async () => {
      if (!isMountedRef.current || hasMatchedRef.current) return;
      console.log('🎤 Restarting recognition after pause (clearing buffer)');
      try {
        await speechRecognitionService.stopListening();
        setRecognizedText(null);
        speechRecognitionService.setRecognizedText(null);
        // Short delay before restarting
        setTimeout(async () => {
          if (!isMountedRef.current || hasMatchedRef.current) return;
          const locale = getLocale();
          await speechRecognitionService.startListening(locale);
        }, 100);
      } catch (error) {
        console.error('🎤 Error restarting recognition:', error);
      }
    };

    const onSpeechResults = (event: any) => {
      console.log('🎤 onSpeechResults event fired:', event);
      if (!isMountedRef.current) return;
      
      const results = event.value || [];
      console.log('🎤 Speech results:', results);
      
      if (results.length === 0) {
        console.log('🎤 No speech results - no input detected');
        setState('no-input');
        setHasSaidAnything(false);
        setRecognizedText(null);
        return;
      }

      const recognizedText = results[0].toLowerCase();
      console.log('🎤 Recognized text:', recognizedText);
      setRecognizedText(recognizedText);
      speechRecognitionService.setRecognizedText(recognizedText);
      setHasSaidAnything(true);

      // Fuzzy match against target (use the last word for matching)
      const words = recognizedText.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      const matchResult = speechRecognitionService.fuzzyMatch(
        lastWord,
        targetTextRef.current
      );
      console.log('🎤 Match result:', {
        recognized: recognizedText,
        target: targetTextRef.current,
        matched: matchResult.matched,
        confidence: matchResult.confidence,
      });

      if (matchResult.matched) {
        console.log('🎤 ✅ Pronunciation matched!');
        hasMatchedRef.current = true;
        setHasCorrectPronunciation(true);
        setMatchConfidence(matchResult.confidence);
        setState('matched');
        
        // Stop listening once matched (session-based pass persistence)
        speechRecognitionService.stopListening().catch(console.error);
        // Disable recording mode when matched
        audioPlayer.disableRecordingMode().catch(console.error);
        
        onMatch?.(matchResult.confidence);
      } else {
        console.log('🎤 ❌ Pronunciation did not match');
        setState('incorrect');
      }
    };

    const onSpeechPartialResults = (event: any) => {
      if (!isMountedRef.current) return;
      
      const results = event.value || [];
      if (results.length > 0) {
        const recognizedText = results[0].toLowerCase();
        console.log('🎤 Partial result:', recognizedText);
        setRecognizedText(recognizedText);
        speechRecognitionService.setRecognizedText(recognizedText);
        setHasSaidAnything(true);
        
        // Reset the pause timer - will restart recognition after 3 seconds of silence
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
        }
        resetTimeoutRef.current = setTimeout(() => {
          restartRecognition();
        }, 3000);
      }
    };

    const onSpeechError = (event: any) => {
      const error = event.error?.message || event.error || 'Unknown error';
      console.error('🎤 Speech recognition error event:', error);
      console.error('🎤 Error event details:', event);
      if (!isMountedRef.current) return;
      
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

  // Cleanup on unmount ONLY (empty dependency array)
  useEffect(() => {
    // Set mounted on init
    isMountedRef.current = true;
    
    return () => {
      // Only set to false on actual unmount
      isMountedRef.current = false;
      speechRecognitionService.destroy().catch(console.error);
      audioPlayer.disableRecordingMode().catch(console.error);
    };
  }, []); // Empty deps - only runs on mount/unmount

  // Start listening
  const startListening = useCallback(async () => {
    if (!isEnabled) {
      console.log('🎤 Cannot start listening - speech recognition not enabled');
      return;
    }

    // If already matched for this card, don't start listening again
    if (hasMatchedRef.current) {
      console.log('🎤 Already matched for this card - skipping start');
      return;
    }

    try {
      console.log('🎤 Starting speech recognition...');
      
      // Enable recording mode for speech recognition FIRST
      console.log('🎤 Enabling recording mode...');
      await audioPlayer.enableRecordingMode();
      console.log('🎤 Recording mode enabled');
      
      const locale = getLocale();
      console.log('🎤 Starting Voice API with locale:', locale);
      const result = await speechRecognitionService.startListening(locale);
      
      if (!result.available) {
        console.error('🎤 Speech recognition not available:', result.error);
        setIsEnabled(false);
        setHasCorrectPronunciation(true); // Fallback to always pass
        await audioPlayer.disableRecordingMode(); // Disable if not available
        if (result.error) {
          onError?.(result.error);
        }
      } else {
        console.log('🎤 Speech recognition started successfully');
        setState('listening');
      }
    } catch (error: any) {
      console.error('🎤 Error starting speech recognition:', error);
      
      // Check if it's a permission error
      if (error?.message?.includes('permission') || 
          error?.message?.includes('Permission') ||
          error?.code === 'permission_denied' ||
          error?.message?.includes('not authorized')) {
        console.log('🎤 Permission denied - user needs to grant microphone/speech permissions');
        setIsEnabled(false);
        setHasCorrectPronunciation(true); // Fallback to always pass
      } else {
        setIsEnabled(false);
        setHasCorrectPronunciation(true); // Fallback to always pass
      }
      
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

  // Pause listening temporarily (e.g., during audio playback)
  const pauseListening = useCallback(async () => {
    if (!isEnabled) {
      return;
    }

    console.log('🎤 Pausing speech recognition...');
    try {
      await speechRecognitionService.stopListening();
      // Don't change state - we're just pausing temporarily
    } catch (error) {
      console.error('Error pausing speech recognition:', error);
    }
  }, [isEnabled]);

  // Resume listening after a pause
  const resumeListening = useCallback(async () => {
    if (!isEnabled) {
      return;
    }

    // Don't resume if already matched
    if (hasMatchedRef.current) {
      console.log('🎤 Not resuming - already matched');
      return;
    }

    console.log('🎤 Resuming speech recognition...');
    try {
      await audioPlayer.enableRecordingMode();
      const locale = getLocale();
      const result = await speechRecognitionService.startListening(locale);
      
      if (result.available) {
        setState('listening');
      }
    } catch (error) {
      console.error('Error resuming speech recognition:', error);
    }
  }, [isEnabled]);

  // Clear the transcript
  const clearTranscript = useCallback(() => {
    setRecognizedText(null);
    speechRecognitionService.setRecognizedText(null);
  }, []);

  // Restart for a new card
  const restart = useCallback(async () => {
    if (!isEnabled) {
      return;
    }

    // Reset state for new card
    hasMatchedRef.current = false;
    lastStartedTargetRef.current = null; // Allow re-starting for the same target
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    setHasCorrectPronunciation(false);
    setHasSaidAnything(false);
    setRecognizedText(null);
    setMatchConfidence(null);
    setState('idle');
    speechRecognitionService.setRecognizedText(null);

    // Stop any active listening
    await speechRecognitionService.stopListening();
    await audioPlayer.disableRecordingMode();
  }, [isEnabled]);

  // Use a ref to track if we've already started for this target text
  const lastStartedTargetRef = useRef<string | null>(null);

  // Auto-start listening when target text changes (new card)
  useEffect(() => {
    if (!isEnabled) {
      console.log('🎤 Auto-start skipped - speech recognition not enabled');
      return;
    }

    if (!targetText) {
      console.log('🎤 Auto-start skipped - no target text');
      return;
    }

    // Prevent starting multiple times for the same target
    if (lastStartedTargetRef.current === targetText) {
      console.log('🎤 Auto-start skipped - already started for this target');
      return;
    }

    console.log('🎤 New card detected, preparing to start listening for:', targetText);

    // Reset for new card
    hasMatchedRef.current = false;
    setHasCorrectPronunciation(false);
    setHasSaidAnything(false);
    setRecognizedText(null);
    setMatchConfidence(null);
    setState('idle');

    // Mark that we're starting for this target
    lastStartedTargetRef.current = targetText;

    // Start listening after a short delay (to allow card to render)
    const timer = setTimeout(async () => {
      if (isMountedRef.current && !hasMatchedRef.current) {
        console.log('🎤 Auto-starting speech recognition...');
        try {
          // Enable recording mode for speech recognition FIRST
          console.log('🎤 Enabling recording mode...');
          await audioPlayer.enableRecordingMode();
          console.log('🎤 Recording mode enabled');
          
          const locale = getLocale();
          console.log('🎤 Starting Voice API with locale:', locale);
          const result = await speechRecognitionService.startListening(locale);
          
          if (!result.available) {
            console.error('🎤 Speech recognition not available:', result.error);
            setIsEnabled(false);
            setHasCorrectPronunciation(true); // Fallback to always pass
            await audioPlayer.disableRecordingMode();
          } else {
            console.log('🎤 Speech recognition started successfully');
            setState('listening');
          }
        } catch (error: any) {
          console.error('🎤 Error starting speech recognition:', error);
          setIsEnabled(false);
          setHasCorrectPronunciation(true);
          await audioPlayer.disableRecordingMode();
        }
      } else {
        console.log('🎤 Auto-start cancelled:', {
          isMounted: isMountedRef.current,
          hasMatched: hasMatchedRef.current,
        });
      }
    }, 1000); // Delay to ensure everything is ready

    return () => {
      clearTimeout(timer);
    };
  }, [targetText, isEnabled]); // Removed startListening from deps to prevent infinite loop

  return {
    isEnabled,
    state,
    hasCorrectPronunciation,
    hasSaidAnything,
    recognizedText,
    matchConfidence,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    restart,
    clearTranscript,
  };
}

