import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dbGetSettings, dbSaveSettings, Settings } from '@/lib/db';

interface SettingsState {
  settings: Settings;
  activeStoreId: string;
  isLoading: boolean;
  error: string | null;
  isDarkMode: boolean;
  fontScale: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  setLastSyncTime: (time: string) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
  setDarkMode: (isDarkMode: boolean) => void;
  setFontScale: (scale: number) => void;
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
  auto_print_receipt: false,
  receipt_printer_name: '',
  allow_negative_stock: true,
  upi_id: '',
  show_logo_on_receipt: true,
  receipt_header_text: '',
  merchant_id: '',
  show_tax_breakdown: true,
  enable_round_off: true,
  auto_reminders_enabled: false,
  auto_reminder_days: 30,
  license_agreed: false,
  onboarding_completed: false,
  license_key: '',
  hidden_menus: '',
  store_type: 'general',
  // Payment Gateway Settings
  paytm_merchant_id: '',
  paytm_merchant_key: '',
  paytm_website: '',
  paytm_industry_type: '',
  paytm_channel_id: '',
  paytm_upi_id: '',
  razorpay_key_id: '',
  razorpay_key_secret: '',
  razorpay_upi_id: '',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      activeStoreId: process.env.NEXT_PUBLIC_DEFAULT_STORE_ID || 'default',
      isLoading: false,
      error: null,
      isDarkMode: false,
      fontScale: 1,
      lastSyncTime: null,
      isSyncing: false,

      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      setIsSyncing: (isSyncing) => set({ isSyncing }),

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const settings = await dbGetSettings(get().activeStoreId);
          set({
            settings,
            isLoading: false
          });
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
      setFontScale: (fontScale) => set({ fontScale }),

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
        fontScale: state.fontScale,
        activeStoreId: state.activeStoreId
      }),
    }
  )
);
