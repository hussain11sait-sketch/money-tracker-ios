import { Capacitor, registerPlugin } from '@capacitor/core';

// Define the interface for the plugin methods
interface SMSInboxPlugin {
  checkPermissions(): Promise<{ messages: string }>;
  requestPermissions(): Promise<{ messages: string }>;
  getSMSList(options?: any): Promise<{ messages: any[] }>;
}

// Register the native plugin safely
const SMSInboxReader = registerPlugin<SMSInboxPlugin>('SMSInboxReader');

export async function checkBankSMS() {
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    const permissions = await SMSInboxReader.checkPermissions();
    if (permissions.messages !== 'granted') {
      const requested = await SMSInboxReader.requestPermissions();
      if (requested.messages !== 'granted') return;
    }

    const result = await SMSInboxReader.getSMSList({
      filter: { limit: 5 }
    });

    // Loop through messages safely
    if (result && result.messages) {
      result.messages.forEach((msg: { body: string }) => {
        if (msg.body.toLowerCase().includes('debited') || msg.body.toLowerCase().includes('spent')) {
          console.log('Bank SMS detected:', msg.body);
        }
      });
    }
  } catch (err) {
    console.error('SMS read error:', err);
  }
}