import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.khataghar.app',
  appName: 'KhataGHAR',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#0a0f0c',
  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: '#0a0f0c',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
