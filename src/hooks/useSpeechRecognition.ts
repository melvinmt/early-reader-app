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
  const [recognizedText, setRecognizedText] = useState<string | null>(null);

  const targetTextRef = useRef(targetText);
  const isMountedRef = useRef(true);
  const hasMatchedRef = useRef(false); // Session-based pass persistence

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

      // Fuzzy match against target
      const matchResult = speechRecognitionService.fuzzyMatch(
        recognizedText,
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

  // Restart for a new card
  const restart = useCallback(async () => {
    if (!isEnabled) {
      return;
    }

    // Reset state for new card
    hasMatchedRef.current = false;
    lastStartedTargetRef.current = null; // Allow re-starting for the same target
    setHasCorrectPronunciation(false);
    setHasSaidAnything(false);
    setRecognizedText(null);
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
    startListening,
    stopListening,
    restart,
  };
}

