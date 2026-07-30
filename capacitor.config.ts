import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.connectai.marketplace',
  appName: 'Connect AI Marketplace',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
