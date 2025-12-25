import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';

class AudioPlayerService {
  private soundCache: Map<string, Audio.Sound> = new Map();

  /**
   * Play sound from URI (remote or local file)
   */
  async playSound(soundUri: string): Promise<void> {
    try {
      // Check cache first
      let sound = this.soundCache.get(soundUri);

      if (!sound) {
        // Load sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: soundUri },
          { shouldPlay: false }
        );
        sound = newSound;
        this.soundCache.set(soundUri, sound);
      }

      // Play sound
      await sound.replayAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  /**
   * Play sound from static asset path (e.g., "assets/sounds/phonemes/m.mp3")
   * For Expo, we use the file system to load bundled assets
   */
  async playSoundFromAsset(assetPath: string): Promise<void> {
    try {
      // Check cache first
      let sound = this.soundCache.get(assetPath);

      if (!sound) {
        // Construct the full file path
        // In Expo, bundled assets are in the app bundle
        // For development, we can use the local file system
        const fullPath = assetPath.startsWith('assets/')
          ? `${FileSystem.bundleDirectory}${assetPath}`
          : `${FileSystem.bundleDirectory}assets/${assetPath}`;
        
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(fullPath);
        if (!fileInfo.exists) {
          // Try alternative path (for development with Metro bundler)
          const altPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: altPath },
            { shouldPlay: false }
          );
          sound = newSound;
        } else {
          // Load from bundle
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: fullPath },
            { shouldPlay: false }
          );
          sound = newSound;
        }
        
        this.soundCache.set(assetPath, sound);
      }

      // Play sound
      await sound.replayAsync();
    } catch (error) {
      console.error('Error playing sound from asset:', error);
      // Fallback: try as direct URI (might be a remote URL)
      try {
        await this.playSound(assetPath);
      } catch (fallbackError) {
        console.error('Fallback playSound also failed:', fallbackError);
      }
    }
  }

  /**
   * Play sound from asset and wait for it to complete
   * Returns a promise that resolves when the audio finishes playing
   */
  async playSoundFromAssetAndWait(assetPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Check cache first
        let sound = this.soundCache.get(assetPath);

        if (!sound) {
          // Construct the full file path
          const fullPath = assetPath.startsWith('assets/')
            ? `${FileSystem.bundleDirectory}${assetPath}`
            : `${FileSystem.bundleDirectory}assets/${assetPath}`;
          
          // Check if file exists
          const fileInfo = await FileSystem.getInfoAsync(fullPath);
          if (!fileInfo.exists) {
            // Try alternative path (for development with Metro bundler)
            const altPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: altPath },
              { shouldPlay: false }
            );
            sound = newSound;
          } else {
            // Load from bundle
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: fullPath },
              { shouldPlay: false }
            );
            sound = newSound;
          }
          
          this.soundCache.set(assetPath, sound);
        }

        // Set up playback status listener to detect when audio finishes
        const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            // Audio finished playing
            sound?.setOnPlaybackStatusUpdate(null);
            resolve();
          }
        };

        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

        // Play sound
        await sound.replayAsync();
      } catch (error) {
        console.error('Error playing sound from asset:', error);
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
    for (const sound of this.soundCache.values()) {
      await sound.unloadAsync();
    }
    this.soundCache.clear();
  }
}

export const audioPlayer = new AudioPlayerService();
