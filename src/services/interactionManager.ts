/**
 * Interaction Manager
 * 
 * Coordinates audio playback and speech recognition as a unified state machine.
 * Ensures robust handling of timeouts, errors, and state transitions.
 */

import { audioPlayer } from './audio/audioPlayer';
import { speechRecognitionService } from './speech/speechRecognitionService';
import { getLocale } from '@/config/locale';
import Voice from '@react-native-voice/voice';
import { FEATURES } from '@/config/features';

export type InteractionState = 
  | 'idle'
  | 'playing_prompt'
  | 'listening'
  | 'playing_feedback'
  | 'matched'
  | 'fallback';

export interface SpeechResult {
  matched: boolean;
  text: string;
  confidence?: number;
}

type StateChangeCallback = (state: InteractionState) => void;
type SpeechResultCallback = (result: SpeechResult) => void;

class InteractionManager {
  private state: InteractionState = 'idle';
  private targetText: string = '';
  private swipeAttempts: number = 0;
  
  // Timers
  private watchdogTimer: NodeJS.Timeout | null = null;
  private cardStartTimer: NodeJS.Timeout | null = null;
  
  // State tracking
  private hasCorrectPronunciation: boolean = false;
  private recognizedText: string | null = null;
  private matchConfidence: number | null = null;
  private restartAttempts: number = 0; // Track restart attempts for watchdog
  
  // Callbacks
  private onStateChangeCallbacks: Set<StateChangeCallback> = new Set();
  private onSpeechResultCallbacks: Set<SpeechResultCallback> = new Set();
  
  // Configuration
  private readonly CARD_TIMEOUT_MS = 15000; // 15 seconds before fallback
  private readonly WATCHDOG_INTERVAL_MS = 5000; // Check every 5 seconds
  private readonly VOICE_EVENT_TIMEOUT_MS = 10000; // 10 seconds without events = restart
  private readonly AUDIO_TIMEOUT_MS = 10000; // 10 seconds audio timeout
  private readonly MAX_RESTART_ATTEMPTS = 3; // Max restarts before fallback
  
  private lastVoiceEventTime: number = 0;

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.onStateChangeCallbacks.add(callback);
    return () => {
      this.onStateChangeCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to speech results
   */
  onSpeechResult(callback: SpeechResultCallback): () => void {
    this.onSpeechResultCallbacks.add(callback);
    return () => {
      this.onSpeechResultCallbacks.delete(callback);
    };
  }

  /**
   * Notify all state change callbacks
   */
  private notifyStateChange(newState: InteractionState) {
    this.state = newState;
    this.onStateChangeCallbacks.forEach(callback => {
      try {
        callback(newState);
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    });
  }

  /**
   * Notify all speech result callbacks
   */
  private notifySpeechResult(result: SpeechResult) {
    this.onSpeechResultCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in speech result callback:', error);
      }
    });
  }

  /**
   * Get current state
   */
  getState(): InteractionState {
    return this.state;
  }

  /**
   * Get recognized text
   */
  getRecognizedText(): string | null {
    return this.recognizedText;
  }

  /**
   * Get whether pronunciation matched
   */
  hasMatched(): boolean {
    return this.hasCorrectPronunciation;
  }

  /**
   * Get match confidence
   */
  getMatchConfidence(): number | null {
    return this.matchConfidence;
  }

  /**
   * Check if swipe can complete the card
   * 
   * PRIORITY ORDER (first match wins):
   * 1. 2-swipe override - ALWAYS allows completion regardless of state
   * 2. Pronunciation matched
   * 3. Fallback mode active
   */
  canSwipeComplete(): boolean {
    // 2-SWIPE OVERRIDE: Always works, no matter what state we're in
    if (this.swipeAttempts >= 2) {
      return true;
    }
    // Pronunciation matched
    if (this.hasCorrectPronunciation) {
      return true;
    }
    // Fallback mode
    if (this.state === 'fallback') {
      return true;
    }
    return false;
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.state === 'listening';
  }

  /**
   * Check if speech recognition is enabled and available
   */
  async isEnabled(): Promise<boolean> {
    if (!FEATURES.SPEECH_RECOGNITION_ENABLED) {
      return false;
    }
    return await speechRecognitionService.checkAvailability();
  }

  /**
   * Start a new card interaction
   */
  async startCard(targetText: string, promptPath?: string, skipSpeech: boolean = false): Promise<void> {
    // Reset state
    this.targetText = targetText;
    this.swipeAttempts = 0;
    this.hasCorrectPronunciation = false;
    this.recognizedText = null;
    this.matchConfidence = null;
    this.lastVoiceEventTime = Date.now();

    // Clear any existing timers
    this.clearAllTimers();

    // If skipping speech (phonemes), go directly to fallback mode
    if (skipSpeech) {
      this.notifyStateChange('fallback');
      return;
    }

    // Start card timeout (15s to fallback)
    this.cardStartTimer = setTimeout(() => {
      console.log('⏱️ Card timeout reached, activating fallback mode');
      this.activateFallbackMode();
    }, this.CARD_TIMEOUT_MS);

    // Play prompt if provided, then start listening
    if (promptPath) {
      await this.playPromptThenListen(promptPath);
    } else {
      // No prompt, start listening directly
      await this.startListening();
    }
  }

  /**
   * Play prompt audio then start listening
   */
  async playPromptThenListen(promptPath: string): Promise<void> {
    this.notifyStateChange('playing_prompt');

    try {
      const result = await audioPlayer.playSoundWithTimeout(promptPath, this.AUDIO_TIMEOUT_MS);
      
      if (result === 'timeout') {
        console.warn('⚠️ Prompt audio timed out, starting listening anyway');
      } else if (result === 'error') {
        console.warn('⚠️ Prompt audio error, starting listening anyway');
      }
      
      // Always start listening after prompt (even on timeout/error)
      await this.startListening();
    } catch (error) {
      console.error('Error in playPromptThenListen:', error);
      // Start listening even on error
      await this.startListening();
    }
  }

  /**
   * Set up Voice event handlers
   * Call this once to register handlers that feed events into InteractionManager
   */
  setupVoiceHandlers(): void {
    if (!FEATURES.SPEECH_RECOGNITION_ENABLED) {
      return;
    }

    Voice.onSpeechStart = () => {
      console.log('🎤 onSpeechStart event fired');
      this.lastVoiceEventTime = Date.now();
      if (this.state === 'listening') {
        // State is already listening, this confirms it
      }
    };

    Voice.onSpeechEnd = () => {
      console.log('🎤 onSpeechEnd event fired');
      this.lastVoiceEventTime = Date.now();
      // Sync state - Voice API stopped listening
      speechRecognitionService.markAsStopped();
    };

    Voice.onSpeechResults = (event: any) => {
      console.log('🎤 onSpeechResults event fired:', event);
      this.lastVoiceEventTime = Date.now();
      
      const results = event.value || [];
      console.log('🎤 Speech results:', results);
      
      if (results.length === 0) {
        console.log('🎤 No speech results - no input detected');
        return;
      }

      const recognizedText = results[0].toLowerCase();
      console.log('🎤 Recognized text:', recognizedText);
      
      // Fuzzy match against target
      const words = recognizedText.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      const matchResult = speechRecognitionService.fuzzyMatch(
        lastWord,
        this.targetText
      );
      
      console.log('🎤 Match result:', {
        recognized: recognizedText,
        target: this.targetText,
        matched: matchResult.matched,
        confidence: matchResult.confidence,
      });

      this.handleSpeechResult(recognizedText, matchResult.matched, matchResult.confidence || 0);
    };

    Voice.onSpeechPartialResults = (event: any) => {
      this.lastVoiceEventTime = Date.now();
      
      const results = event.value || [];
      if (results.length > 0) {
        const recognizedText = results[0].toLowerCase();
        console.log('🎤 Partial result:', recognizedText);
        this.recognizedText = recognizedText;
        speechRecognitionService.setRecognizedText(recognizedText);
        
        // Notify about partial result (not matched yet)
        this.notifySpeechResult({
          matched: false,
          text: recognizedText,
        });
      }
    };

    Voice.onSpeechError = (event: any) => {
      const error = event.error?.message || event.error || 'Unknown error';
      // Sync state - error means Voice API stopped
      speechRecognitionService.markAsStopped();
      // handleSpeechError will filter benign errors and log appropriately
      this.handleSpeechError(error);
    };
  }

  /**
   * Remove Voice event handlers
   */
  removeVoiceHandlers(): void {
    Voice.removeAllListeners();
  }

  /**
   * Start listening for speech
   */
  private async startListening(): Promise<void> {
    if (this.state === 'fallback' || this.state === 'matched') {
      return; // Don't start if already in terminal state
    }

    this.notifyStateChange('listening');
    this.lastVoiceEventTime = Date.now();

    try {
      // Enable recording mode
      await audioPlayer.enableRecordingMode();

      // Start speech recognition
      const locale = getLocale();
      const result = await speechRecognitionService.startListening(locale);

      if (!result.available) {
        console.warn('⚠️ Speech recognition not available, activating fallback');
        this.activateFallbackMode();
        return;
      }

      // Start watchdog timer
      this.startWatchdog();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.activateFallbackMode();
    }
  }

  /**
   * Start watchdog timer to monitor speech recognition health
   */
  private startWatchdog(): void {
    this.clearWatchdog();
    this.restartAttempts = 0; // Reset restart counter

    this.watchdogTimer = setInterval(async () => {
      if (this.state !== 'listening') {
        this.clearWatchdog();
        return;
      }

      try {
        // Sync our internal state with Voice API
        const isRecognizing = await speechRecognitionService.syncState();
        
        // Check if we've received any voice events recently
        const timeSinceLastEvent = Date.now() - this.lastVoiceEventTime;
        const hasStaleEvents = timeSinceLastEvent > this.VOICE_EVENT_TIMEOUT_MS;

        if (!isRecognizing || hasStaleEvents) {
          this.restartAttempts++;
          console.warn('⚠️ Speech recognition health check failed:', {
            isRecognizing,
            timeSinceLastEvent,
            hasStaleEvents,
            restartAttempts: this.restartAttempts,
          });
          
          // If too many restart attempts, activate fallback
          if (this.restartAttempts >= this.MAX_RESTART_ATTEMPTS) {
            console.warn('⚠️ Max restart attempts reached, activating fallback mode');
            this.activateFallbackMode();
            return;
          }
          
          // Try to restart
          await this.restartListening();
        } else {
          // Health check passed, reset restart counter
          this.restartAttempts = 0;
        }
      } catch (error) {
        console.error('Error in watchdog check:', error);
        // On error, activate fallback
        this.activateFallbackMode();
      }
    }, this.WATCHDOG_INTERVAL_MS);
  }

  /**
   * Handle speech recognition result
   */
  handleSpeechResult(recognized: string, matched: boolean, confidence: number): void {
    this.lastVoiceEventTime = Date.now();
    this.recognizedText = recognized;

    if (matched) {
      this.hasCorrectPronunciation = true;
      this.matchConfidence = confidence;
      this.notifyStateChange('matched');
      this.clearAllTimers();
      
      // Stop listening
      speechRecognitionService.stopListening().catch(console.error);
      audioPlayer.disableRecordingMode().catch(console.error);

      this.notifySpeechResult({
        matched: true,
        text: recognized,
        confidence,
      });
    } else {
      this.notifySpeechResult({
        matched: false,
        text: recognized,
        confidence,
      });
    }
  }

  /**
   * Handle speech recognition error
   */
  handleSpeechError(error: string): void {
    this.lastVoiceEventTime = Date.now();
    
    // Don't restart if we're intentionally stopped (playing audio)
    if (this.state === 'playing_prompt' || this.state === 'playing_feedback' || 
        this.state === 'fallback' || this.state === 'matched') {
      return;
    }
    
    // Handle "No speech detected" errors (error code 1110)
    if (error.includes('1110') || error.includes('No speech detected')) {
      console.log('🎤 No speech detected - restarting');
      this.restartListening();
      return;
    }
    
    console.error('🎤 Speech recognition error:', error);
    this.restartListening();
  }

  /**
   * Restart speech recognition (recovery from errors or stale state)
   */
  private async restartListening(): Promise<void> {
    // Only restart if we're supposed to be listening
    if (this.state !== 'listening') {
      return;
    }

    try {
      await speechRecognitionService.stopListening();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Re-check state after delay
      if (this.state !== 'listening') {
        return;
      }

      await this.startListening();
    } catch (error) {
      console.error('Error restarting speech recognition:', error);
    }
  }

  /**
   * Pause listening temporarily (e.g., during audio playback)
   * Will stop speech recognition regardless of current state to ensure silence during audio
   */
  async pauseListening(): Promise<void> {
    if (this.state === 'fallback' || this.state === 'matched') {
      return; // In terminal states, nothing to pause
    }

    try {
      await speechRecognitionService.stopListening();
      // Don't change state - we're just pausing temporarily
    } catch (error) {
      console.error('Error pausing speech recognition:', error);
    }
  }

  /**
   * Resume listening after a pause
   */
  async resumeListening(): Promise<void> {
    if (this.state === 'fallback' || this.state === 'matched') {
      return; // Don't resume in terminal states
    }

    // Resume listening
    await this.startListening();
  }

  /**
   * Play audio with speech recognition paused
   * Pauses listening, plays audio, then resumes listening
   */
  async playAudioWithPause(audioPath: string): Promise<void> {
    if (this.state === 'fallback' || this.state === 'matched') {
      await audioPlayer.playSoundFromAssetAndWait(audioPath);
      return;
    }

    // Set state BEFORE stopping to prevent error handlers from restarting
    this.notifyStateChange('playing_feedback');
    await this.pauseListening();
    await audioPlayer.disableRecordingMode();

    try {
      await audioPlayer.playSoundFromAssetAndWait(audioPath);
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      await this.resumeListening();
    }
  }

  /**
   * Play feedback audio then resume listening
   * Stops speech recognition before playing to avoid transcribing the audio
   */
  async playFeedbackThenResume(feedbackPath: string): Promise<void> {
    if (this.state === 'fallback' || this.state === 'matched') {
      return;
    }

    await this.pauseListening();
    await audioPlayer.disableRecordingMode();
    this.notifyStateChange('playing_feedback');

    try {
      const result = await audioPlayer.playSoundWithTimeout(feedbackPath, this.AUDIO_TIMEOUT_MS);
      
      if (result === 'timeout') {
        console.warn('⚠️ Feedback audio timed out, resuming listening anyway');
      } else if (result === 'error') {
        console.warn('⚠️ Feedback audio error, resuming listening anyway');
      }
      
      await this.startListening();
    } catch (error) {
      console.error('Error in playFeedbackThenResume:', error);
      await this.startListening();
    }
  }

  /**
   * Handle swipe attempt
   */
  handleSwipeAttempt(): void {
    this.swipeAttempts++;
  }

  /**
   * Get current swipe attempt count
   */
  getSwipeAttempts(): number {
    return this.swipeAttempts;
  }

  /**
   * Activate fallback mode (skip speech requirements)
   */
  activateFallbackMode(): void {
    if (this.state === 'fallback' || this.state === 'matched') {
      return; // Already in terminal state
    }

    console.log('🔓 Activating fallback mode - speech requirements disabled');
    this.clearAllTimers();
    
    // Stop any active speech recognition
    speechRecognitionService.stopListening().catch(console.error);
    audioPlayer.disableRecordingMode().catch(console.error);

    this.notifyStateChange('fallback');
  }

  /**
   * Clear all timers
   */
  private clearAllTimers(): void {
    this.clearWatchdog();
    if (this.cardStartTimer) {
      clearTimeout(this.cardStartTimer);
      this.cardStartTimer = null;
    }
  }

  /**
   * Clear watchdog timer
   */
  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  /**
   * Reset and cleanup
   */
  async reset(): Promise<void> {
    this.clearAllTimers();
    this.state = 'idle';
    this.targetText = '';
    this.swipeAttempts = 0;
    this.hasCorrectPronunciation = false;
    this.recognizedText = null;
    this.matchConfidence = null;
    this.lastVoiceEventTime = 0;
    this.restartAttempts = 0;

    // Stop speech recognition
    try {
      await speechRecognitionService.stopListening();
      await audioPlayer.disableRecordingMode();
    } catch (error) {
      console.error('Error during reset:', error);
    }
  }
}

export const interactionManager = new InteractionManager();

