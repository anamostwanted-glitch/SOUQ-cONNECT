export enum SoundType {
  NOTIFICATION = 'notification',
  SUCCESS = 'success',
  ERROR = 'error',
  MESSAGE = 'message',
  TYPING = 'typing',
  RECEIVED = 'received',
  SENT = 'sent',
  AI_PULSE = 'ai_pulse',
  GHOST_PULSE = 'ghost_pulse',
  NEURAL_TAP = 'neural_tap',
  TAP_LIGHT = 'tap_light',
  TAP_MEDIUM = 'tap_medium',
  TAP_HEAVY = 'tap_heavy',
  MODAL_OPEN = 'modal_open',
  MODAL_CLOSE = 'modal_close',
  SWEEP = 'sweep',
  GLOW = 'glow'
}

const SOUND_URLS: Record<string, string> = {
  notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  message: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  ai_pulse: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  ghost_pulse: 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3',
  neural_tap: 'https://assets.mixkit.co/active_storage/sfx/132/132-preview.mp3',
  tap_light: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  tap_medium: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  tap_heavy: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
  modal_open: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  modal_close: 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3',
  sweep: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  glow: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
};

const audioCache: Record<string, HTMLAudioElement> = {};

export const soundService = {
  play: (type: SoundType, volume: number = 0.3) => {
    try {
      const url = SOUND_URLS[type] || SOUND_URLS.notification;
      
      // Use cached audio if available
      let audio = audioCache[url];
      if (!audio) {
        audio = new Audio(url);
        audioCache[url] = audio;
      }
      
      // Clone for overlapping sounds
      const playInstance = audio.cloneNode() as HTMLAudioElement;
      playInstance.volume = volume;
      playInstance.play().catch(e => {
        // Only log if it's not a generic browser block
        if (e.name !== 'NotAllowedError') {
          console.warn('Sound play error:', e);
        }
      });
    } catch (error) {
      console.warn('Sound service error:', error);
    }
  },
  preload: () => {
    // Preload common interaction sounds
    [SoundType.TAP_LIGHT, SoundType.SUCCESS, SoundType.AI_PULSE].forEach(type => {
      const url = SOUND_URLS[type];
      if (url && !audioCache[url]) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audioCache[url] = audio;
      }
    });
  }
};
