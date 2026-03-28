import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dbGetSettings, dbSaveSettings, Settings } from '@/lib/db';

interface SettingsState {
  settings: Settings;
  activeStoreId: string;
  isLoading: boolean;
  error: string | null;
  isDarkMode: boolean;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
  setDarkMode: (isDarkMode: boolean) => void;
  updateCurrency: (currency: string, currencySymbol: string) => Promise<void>;
  setActiveStore: (id: string) => void;
}

const defaultSettings: Settings = {
  store_name: process.env.NEXT_PUBLIC_DEFAULT_STORE_NAME || 'My POS Store',
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
  neon_url: process.env.NEXT_PUBLIC_NEON_URL || '',
  business_name: '',
  receipt_save_path: '',
  language: 'en',
  dark_mode: false,
  offline_mode: true,
  whatsapp_enabled: false,
  whatsapp_api_url: process.env.NEXT_PUBLIC_WHATSAPP_API || '',
  twilio_sid: '',
  twilio_token: '',
  twilio_phone: '',
  lan_sync_enabled: false,
  lan_server_port: 8765,
  logo_url: '',
  primary_color: '#F5C842',
  secondary_color: '#1E1E26',
  accent_color: '#2ECC71',
  footer_text: 'Powered by AppIXEN',
  contact_email: '',
  contact_website: '',
  tax_inclusive: false,
  tax_breakdown: '[]',
  auto_print_kot: false,
  upi_id: '',
  show_logo_on_receipt: true,
  receipt_header_text: '',
  merchant_id: '',
  show_tax_breakdown: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      activeStoreId: process.env.NEXT_PUBLIC_DEFAULT_STORE_ID || 'default',
      isLoading: false,
      error: null,
      isDarkMode: false,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const settings = await dbGetSettings(get().activeStoreId);
          set({ settings, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      saveSettings: async (newSettings: Partial<Settings>) => {
        const updated = { ...get().settings, ...newSettings };
        await dbSaveSettings(updated, get().activeStoreId);
        // Fetch fresh settings from database to ensure consistency
        const freshSettings = await dbGetSettings(get().activeStoreId);
        set({ settings: freshSettings });
      },

      setDarkMode: (isDarkMode) => set({ isDarkMode }),

      updateCurrency: async (currency: string, currencySymbol: string) => {
        const updated = { 
          ...get().settings, 
          currency, 
          currency_symbol: currencySymbol 
        };
        await dbSaveSettings(updated, get().activeStoreId);
        // Fetch fresh settings from database to ensure consistency
        const freshSettings = await dbGetSettings(get().activeStoreId);
        set({ settings: freshSettings });
      },

      setActiveStore: (id) => {
        set({ activeStoreId: id });
        get().fetchSettings();
      },
    }),
    {
      name: 'pos-settings-v2',
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        activeStoreId: state.activeStoreId
      }),
    }
  )
);
