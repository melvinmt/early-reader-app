import { Audio } from 'expo-av';

class AudioPlayerService {
  private soundCache: Map<string, Audio.Sound> = new Map();

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

  async playPhoneme(phoneme: string): Promise<void> {
    // In production, load from assets/sounds/phonemes/
    const soundUri = `asset:/sounds/phonemes/${phoneme}.mp3`;
    await this.playSound(soundUri);
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


