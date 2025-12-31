import { Audio, AVPlaybackStatus } from 'expo-av';
import { Asset } from 'expo-asset';
import { getAudioSource } from '@/utils/audioAssetMap';

class AudioPlayerService {
  private soundCache: Map<string, Audio.Sound> = new Map();
  private audioInitialized = false;
  private currentlyPlaying: Audio.Sound | null = null;
  private recordingModeEnabled = false;

  /**
   * Initialize audio mode for playback
   * @param allowRecording - Set to true when speech recognition is active
   */
  private async initializeAudio(allowRecording: boolean = false) {
    // Re-initialize if recording mode changed
    if (this.audioInitialized && this.recordingModeEnabled === allowRecording) {
      return;
    }
    
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: allowRecording, // Enable recording when speech recognition is active
        playsInSilentModeIOS: true, // Play audio even if device is on silent
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });
      this.audioInitialized = true;
      this.recordingModeEnabled = allowRecording;
      console.log(`Audio mode initialized (recording: ${allowRecording})`);
    } catch (error) {
      console.error('Error initializing audio mode:', error);
    }
  }

  /**
   * Enable recording mode for speech recognition
   * Call this when speech recognition is active
   */
  async enableRecordingMode(): Promise<void> {
    await this.initializeAudio(true);
  }

  /**
   * Disable recording mode (playback only)
   * Call this when speech recognition is not active
   */
  async disableRecordingMode(): Promise<void> {
    await this.initializeAudio(false);
  }

  /**
   * Play sound from URI (remote or local file)
   */
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

  /**
   * Stop all currently playing audio
   */
  async stopAllAudio(): Promise<void> {
    try {
      if (this.currentlyPlaying) {
        await this.currentlyPlaying.stopAsync();
        this.currentlyPlaying = null;
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }

  /**
   * Play sound from static asset path (e.g., "assets/en-US/001-l/audio.mp3")
   * Uses expo-asset to properly load bundled audio files
   */
  async playSoundFromAsset(assetPath: string): Promise<void> {
    try {
      // Stop any currently playing audio
      await this.stopAllAudio();
      
      // Initialize audio mode first
      await this.initializeAudio();
      
      // Check cache first
      let sound = this.soundCache.get(assetPath);

      if (!sound) {
        // Get the audio source (require() module or URI)
        const audioSource = getAudioSource(assetPath);
        
        let uri: string;
        
        // If it's a require() module (number), use Asset.fromModule to get URI
        if (typeof audioSource === 'number') {
          const asset = Asset.fromModule(audioSource);
          await asset.downloadAsync(); // Ensure asset is loaded
          uri = asset.localUri || asset.uri;
        } else if (audioSource?.uri) {
          // Already a URI object
          uri = audioSource.uri;
        } else {
          // Fallback: try assetPath as-is
          uri = assetPath;
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false }
        );
        sound = newSound;
        this.soundCache.set(assetPath, sound);
      }

      this.currentlyPlaying = sound;
      await sound.replayAsync();
      
      // Clear currentlyPlaying when sound finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          if (this.currentlyPlaying === sound) {
            this.currentlyPlaying = null;
          }
          sound.setOnPlaybackStatusUpdate(null);
        }
      });
    } catch (error) {
      console.error('Error playing sound from asset:', error);
      console.error('Asset path was:', assetPath);
      this.currentlyPlaying = null;
    }
  }

  /**
   * Play sound from asset and wait for it to complete
   * Returns a promise that resolves when the audio finishes playing
   */
  async playSoundFromAssetAndWait(assetPath: string): Promise<void> {
    return new Promise(async (resolve) => {
      try {
        // Stop any currently playing audio
        await this.stopAllAudio();
        
        // Initialize audio mode first
        await this.initializeAudio();
        
        // Check cache first
        let sound = this.soundCache.get(assetPath);

        if (!sound) {
          // Get the audio source (require() module or URI)
          const audioSource = getAudioSource(assetPath);
          
          let uri: string;
          
          // If it's a require() module (number), use Asset.fromModule to get URI
          if (typeof audioSource === 'number') {
            const asset = Asset.fromModule(audioSource);
            await asset.downloadAsync(); // Ensure asset is loaded
            uri = asset.localUri || asset.uri;
          } else if (audioSource?.uri) {
            // Already a URI object
            uri = audioSource.uri;
          } else {
            // Fallback: try assetPath as-is
            uri = assetPath;
          }

          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: false }
          );
          sound = newSound;
          this.soundCache.set(assetPath, sound);
        }

        this.currentlyPlaying = sound;

        // Set up playback status listener to detect when audio finishes
        const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            if (this.currentlyPlaying === sound) {
              this.currentlyPlaying = null;
            }
            sound?.setOnPlaybackStatusUpdate(null);
            resolve();
          }
        };

        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

        // Play sound
        await sound.replayAsync();
      } catch (error) {
        console.error('Error playing sound from asset:', error);
        console.error('Asset path was:', assetPath);
        this.currentlyPlaying = null;
        // Resolve anyway to not block the flow
        resolve();
      }
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
