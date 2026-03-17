import { create } from 'zustand';
import { dbGetInventoryAlerts, dbCheckInventoryAlerts, dbClearInventoryAlert, InventoryAlert } from '@/lib/db';

interface AlertsState {
  alerts: InventoryAlert[];
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  fetchAlerts: () => Promise<void>;
  checkAlerts: () => Promise<void>;
  clearAlert: (id: string) => Promise<void>;
  markAsRead: () => void;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  isLoading: false,
  error: null,
  unreadCount: 0,

  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const alerts = await dbGetInventoryAlerts();
      set({ alerts, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  checkAlerts: async () => {
    try {
      const newAlerts = await dbCheckInventoryAlerts();
      set((state) => ({
        alerts: newAlerts,
        unreadCount: state.unreadCount + (newAlerts.length > state.alerts.length ? newAlerts.length - state.alerts.length : 0),
      }));
    } catch (err) {
      console.error('Failed to check alerts:', err);
    }
  },

  clearAlert: async (id: string) => {
    await dbClearInventoryAlert(id);
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    }));
  },

  markAsRead: () => set({ unreadCount: 0 }),
}));
