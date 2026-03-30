export enum SoundType {
  NOTIFICATION = 'notification',
  SUCCESS = 'success',
  ERROR = 'error',
  MESSAGE = 'message',
  TYPING = 'typing',
  RECEIVED = 'received',
  SENT = 'sent',
}

export const soundService = {
  play: (type: SoundType) => {
    console.log(`Playing sound: ${type}`);
  }
};
