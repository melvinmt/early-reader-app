import { Audio, AVPlaybackStatus } from 'expo-av';
import { Asset } from 'expo-asset';
import { getAudioSource } from '@/utils/audioAssetMap';

class AudioPlayerService {
  private soundCache: Map<string, Audio.Sound> = new Map();
  private audioInitialized = false;
  private currentlyPlaying: Audio.Sound | null = null;
  private recordingModeEnabled = false;

  private async initializeAudio(allowRecording: boolean = false) {
    if (this.audioInitialized && this.recordingModeEnabled === allowRecording) {
      return;
    }
    
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: allowRecording,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });
      this.audioInitialized = true;
      this.recordingModeEnabled = allowRecording;
    } catch (error) {
      console.error('Error initializing audio mode:', error);
    }
  }

  /**
   * Get or create a sound from the cache
   */
  private async getOrCreateSound(assetPath: string): Promise<Audio.Sound> {
    let sound = this.soundCache.get(assetPath);
    if (sound) return sound;

    const audioSource = getAudioSource(assetPath);
    let uri: string;
    
    if (typeof audioSource === 'number') {
      const asset = Asset.fromModule(audioSource);
      await asset.downloadAsync();
      uri = asset.localUri || asset.uri;
    } else if (audioSource?.uri) {
      uri = audioSource.uri;
    } else {
      uri = assetPath;
    }

    if (!uri) {
      throw new Error(`Failed to resolve audio URI for assetPath: ${assetPath}`);
    }

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );
    this.soundCache.set(assetPath, newSound);
    return newSound;
  }

  async enableRecordingMode(): Promise<void> {
    await this.stopAllAudio();
    this.recordingModeEnabled = true;
  }

  async disableRecordingMode(): Promise<void> {
    this.audioInitialized = false;
    await this.initializeAudio(false);
  }

  async playSound(soundUri: string): Promise<void> {
    try {
      let sound = this.soundCache.get(soundUri);
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: soundUri },
          { shouldPlay: false }
        );
        sound = newSound;
        this.soundCache.set(soundUri, sound);
      }
      await sound.replayAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  async stopAllAudio(): Promise<void> {
    if (this.currentlyPlaying) {
      try {
        await this.currentlyPlaying.stopAsync();
      } catch (error) {
        // Ignore - sound may already be stopped
      }
      this.currentlyPlaying = null;
    }
  }

  /**
   * Play sound from asset (fire and forget)
   */
  async playSoundFromAsset(assetPath: string): Promise<void> {
    try {
      await this.stopAllAudio();
      await this.initializeAudio(this.recordingModeEnabled);
      
      const sound = await this.getOrCreateSound(assetPath);
      this.currentlyPlaying = sound;
      await sound.replayAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          if (this.currentlyPlaying === sound) this.currentlyPlaying = null;
          sound.setOnPlaybackStatusUpdate(null);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', assetPath, error);
      this.currentlyPlaying = null;
    }
  }

  /**
   * Play sound and wait for completion
   */
  async playSoundFromAssetAndWait(assetPath: string): Promise<void> {
    await this.stopAllAudio();
    await this.initializeAudio(this.recordingModeEnabled);
    
    let sound: Audio.Sound;
    try {
      sound = await this.getOrCreateSound(assetPath);
    } catch (error) {
      console.error('Error loading sound:', assetPath, error);
      throw error;
    }
    
    this.currentlyPlaying = sound;

    return new Promise<void>((resolve, reject) => {
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          if (this.currentlyPlaying === sound) this.currentlyPlaying = null;
          sound.setOnPlaybackStatusUpdate(null);
          resolve();
        }
      });

      sound.replayAsync().catch((error) => {
        console.error('Error playing sound:', assetPath, error);
        if (this.currentlyPlaying === sound) this.currentlyPlaying = null;
        sound.setOnPlaybackStatusUpdate(null);
        reject(error);
      });
    });
  }

  /**
   * Play sound with dynamic timeout based on audio duration
   * Timeout = audio duration + buffer (default 3 seconds)
   */
  async playSoundWithTimeout(assetPath: string, bufferMs: number = 3000): Promise<'completed' | 'timeout' | 'error'> {
    // Setup phase (async) - do all awaiting before creating the Promise
    try {
      await this.stopAllAudio();
      await this.initializeAudio(this.recordingModeEnabled);
    } catch (error) {
      console.error('Error initializing audio:', error);
      return 'error';
    }

    let sound: Audio.Sound;
    try {
      sound = await this.getOrCreateSound(assetPath);
    } catch (error) {
      console.error('Error loading sound:', assetPath, error);
      return 'error';
    }

    this.currentlyPlaying = sound;

    // Get duration for timeout
    let timeoutMs: number;
    try {
      const status = await sound.getStatusAsync();
      const durationMs = status.isLoaded && status.durationMillis 
        ? status.durationMillis 
        : 10000;
      timeoutMs = durationMs + bufferMs;
    } catch {
      timeoutMs = 10000 + bufferMs;
    }

    // Playback phase (non-async Promise)
    return new Promise<'completed' | 'timeout' | 'error'>((resolve) => {
      let resolved = false;
      let timeoutTimer: NodeJS.Timeout | null = null;

      const safeResolve = (result: 'completed' | 'timeout' | 'error') => {
        if (resolved) return;
        resolved = true;
        if (timeoutTimer) clearTimeout(timeoutTimer);
        sound.setOnPlaybackStatusUpdate(null);
        resolve(result);
      };

      timeoutTimer = setTimeout(() => {
        console.warn(`Audio timeout after ${timeoutMs}ms: ${assetPath}`);
        sound.stopAsync().catch(() => {});
        if (this.currentlyPlaying === sound) this.currentlyPlaying = null;
        safeResolve('timeout');
      }, timeoutMs);

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          if (this.currentlyPlaying === sound) this.currentlyPlaying = null;
          safeResolve('completed');
        }
      });

      sound.replayAsync().catch((error) => {
        console.error('Error playing sound:', assetPath, error);
        if (this.currentlyPlaying === sound) this.currentlyPlaying = null;
        safeResolve('error');
      });
    });
  }

  /**
   * Play phoneme sound
   */
  async playPhoneme(phoneme: string): Promise<void> {
    const soundPath = `assets/sounds/phonemes/${phoneme.replace(/[^a-z0-9]/gi, '_')}.mp3`;
    await this.playSoundFromAsset(soundPath);
  }

  /**
   * Play word sound
   */
  async playWord(word: string, soundedOut: boolean = false): Promise<void> {
    const suffix = soundedOut ? '-sounded' : '';
    const soundPath = `assets/sounds/words/${word}${suffix}.mp3`;
    await this.playSoundFromAsset(soundPath);
  }

  /**
   * Play sentence sound
   */
  async playSentence(sentence: string): Promise<void> {
    const soundPath = `assets/sounds/sentences/${sentence.replace(/\s+/g, '-')}.mp3`;
    await this.playSoundFromAsset(soundPath);
  }

  async playSuccess(): Promise<void> {
    const soundUri = 'asset:/sounds/feedback/success.mp3';
    await this.playSound(soundUri);
  }

  async playTryAgain(): Promise<void> {
    const soundUri = 'asset:/sounds/feedback/try_again.mp3';
    await this.playSound(soundUri);
  }

  async cleanup(): Promise<void> {
    await this.stopAllAudio();
    for (const sound of this.soundCache.values()) {
      await sound.unloadAsync();
    }
    this.soundCache.clear();
    this.currentlyPlaying = null;
  }
}

export const audioPlayer = new AudioPlayerService();
