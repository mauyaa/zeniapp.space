import type { CapacitorConfig } from '@capacitor/cli';

const devServerUrl = process.env.CAP_SERVER_URL?.trim();
const useExternalServer = Boolean(devServerUrl);

const config: CapacitorConfig = {
  appId: 'com.zeni.app',
  appName: 'Zeni',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: useExternalServer
    ? {
        url: devServerUrl,
        cleartext: !devServerUrl?.startsWith('https'),
        iosScheme: 'https',
      }
    : {
        androidScheme: 'https',
        iosScheme: 'https',
      },
  android: {
    /**
     * Allow HTTP during device/emulator development (e.g., hitting 10.0.2.2:4000).
     * Use HTTPS for production API.
     */
    allowMixedContent: true,
  },
};

export default config;
