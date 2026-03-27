
export enum SoundType {
  NOTIFICATION = 'notification',
  SENT = 'sent',
  RECEIVED = 'received',
  TYPING = 'typing'
}

const SOUND_URLS: Record<SoundType, string> = {
  [SoundType.NOTIFICATION]: 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-back-2575.mp3',
  [SoundType.SENT]: 'https://assets.mixkit.co/sfx/preview/mixkit-fast-small-sweep-transition-166.mp3',
  [SoundType.RECEIVED]: 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3',
  [SoundType.TYPING]: 'https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3124.mp3'
};

class SoundService {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Preload sounds
    if (typeof window !== 'undefined') {
      Object.entries(SOUND_URLS).forEach(([type, url]) => {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.sounds.set(type as SoundType, audio);
      });
    }
  }

  public play(type: SoundType) {
    if (!this.enabled) return;
    
    const audio = this.sounds.get(type);
    if (audio) {
      // Reset to start if already playing
      audio.currentTime = 0;
      audio.play().catch(err => console.warn('Audio playback failed:', err));
    }

    // Haptic feedback for mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        switch (type) {
          case SoundType.SENT:
            navigator.vibrate(10); // Light tap
            break;
          case SoundType.RECEIVED:
            navigator.vibrate([20, 30, 20]); // Double tap
            break;
          case SoundType.NOTIFICATION:
            navigator.vibrate([50, 50, 50]); // Noticeable buzz
            break;
          case SoundType.TYPING:
            // No vibration for typing to avoid annoyance
            break;
        }
      } catch (err) {
        console.warn('Vibration failed:', err);
      }
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}

export const soundService = new SoundService();
