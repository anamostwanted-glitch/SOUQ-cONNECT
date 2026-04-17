export enum SoundType {
  NOTIFICATION = 'notification',
  SUCCESS = 'success',
  ERROR = 'error',
  MESSAGE = 'message',
  TYPING = 'typing',
  RECEIVED = 'received',
  SENT = 'sent',
  AI_PULSE = 'ai_pulse'
}

const SOUND_URLS: Record<string, string> = {
  notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  message: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  ai_pulse: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
};

export const soundService = {
  play: (type: SoundType) => {
    try {
      const url = SOUND_URLS[type] || SOUND_URLS.notification;
      const audio = new Audio(url);
      audio.volume = 0.4;
      audio.play().catch(e => console.warn('Sound play blocked by browser:', e));
    } catch (error) {
      console.warn('Sound service error:', error);
    }
  }
};
