import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dbGetSettings, dbSaveSettings, Settings } from '@/lib/db';

function applyThemeColors(settings: Settings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (settings.primary_color) root.style.setProperty('--accent', settings.primary_color);
  if (settings.primary_color) root.style.setProperty('--accent-hover', adjustBrightness(settings.primary_color, -10));
  if (settings.secondary_color) root.style.setProperty('--surface', settings.secondary_color);
  if (settings.accent_color) root.style.setProperty('--success', settings.accent_color);
  const body = document.body;
  if (settings.dark_mode) {
    root.removeAttribute('data-theme');
    root.style.setProperty('--bg', '#0D0D0F');
    root.style.setProperty('--border', '#1E1E26');
    root.style.setProperty('--text', '#E8E8F0');
    root.style.setProperty('--text-muted', '#9090A8');
  } else {
    root.setAttribute('data-theme', 'light');
    root.style.setProperty('--bg', '#F5F5F7');
    root.style.setProperty('--border', '#E0E0E5');
    root.style.setProperty('--text', '#1A1A2E');
    root.style.setProperty('--text-muted', '#666680');
  }
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

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
  store_type: 'food',
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
  smtp_enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: '',
  first_run: true,
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
          applyThemeColors(settings);
          set({ settings, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      saveSettings: async (newSettings: Partial<Settings>) => {
        const updated = { ...get().settings, ...newSettings };
        await dbSaveSettings(updated);
        const freshSettings = await dbGetSettings();
        applyThemeColors(freshSettings);
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
