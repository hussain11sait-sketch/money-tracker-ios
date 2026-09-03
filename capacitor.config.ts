import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spendly.app',
  appName: 'Spendly',
  webDir: 'public',
  server: {
  url: 'https://money-tracker-rho-ebon.vercel.app',
  cleartext: true
}
};

export default config;