import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dbGetSettings, dbSaveSettings, Settings } from '@/lib/db';

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  isDarkMode: boolean;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
  setDarkMode: (isDarkMode: boolean) => void;
  updateCurrency: (currency: string, currencySymbol: string) => Promise<void>;
}

const defaultSettings: Settings = {
  store_name: 'My POS Store',
  currency: 'USD',
  currency_symbol: '$',
  country: 'US',
  timezone: 'America/New_York',
  tax_system: 'sales',
  tax_rate: 8,
  tax_name: 'Sales Tax',
  tax_id: '',
  address: '123 Main Street, City',
  phone: '+1 234 567 890',
  neon_url: '',
  business_name: '',
  receipt_save_path: '',
  language: 'en',
  dark_mode: false,
  offline_mode: true,
  whatsapp_enabled: false,
  whatsapp_api_url: '',
  twilio_sid: '',
  twilio_token: '',
  twilio_phone: '',
  lan_sync_enabled: false,
  lan_server_port: 8765,
  logo_url: '',
  primary_color: '#F5C842',
  secondary_color: '#1E1E26',
  accent_color: '#2ECC71',
  footer_text: 'Powered by POS Billing',
  contact_email: '',
  contact_website: '',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,
      error: null,
      isDarkMode: false,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const settings = await dbGetSettings();
          set({ settings, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      saveSettings: async (newSettings: Partial<Settings>) => {
        const updated = { ...get().settings, ...newSettings };
        await dbSaveSettings(updated);
        // Fetch fresh settings from database to ensure consistency
        const freshSettings = await dbGetSettings();
        set({ settings: freshSettings });
      },

      setDarkMode: (isDarkMode) => set({ isDarkMode }),

      updateCurrency: async (currency: string, currencySymbol: string) => {
        const updated = { 
          ...get().settings, 
          currency, 
          currency_symbol: currencySymbol 
        };
        await dbSaveSettings(updated);
        // Fetch fresh settings from database to ensure consistency
        const freshSettings = await dbGetSettings();
        set({ settings: freshSettings });
      },
    }),
    {
      name: 'pos-settings',
      partialize: (state) => ({ isDarkMode: state.isDarkMode }),
    }
  )
);
