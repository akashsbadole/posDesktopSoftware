import { create } from 'zustand';
import { dbGetCombos, dbSaveCombo, dbDeleteCombo, dbToggleCombo, Combo } from '@/lib/db';
import { useSettingsStore } from './settingsStore';

interface CombosState {
  combos: Combo[];
  isLoading: boolean;
  error: string | null;
  fetchCombos: () => Promise<void>;
  saveCombo: (combo: Combo) => Promise<void>;
  deleteCombo: (id: string) => Promise<void>;
  toggleCombo: (id: string, isActive: boolean) => Promise<void>;
  getActiveCombos: () => Combo[];
}

export const useCombosStore = create<CombosState>((set, get) => ({
  combos: [],
  isLoading: false,
  error: null,

  fetchCombos: async () => {
    const storeId = useSettingsStore.getState().activeStoreId;
    set({ isLoading: true, error: null });
    try {
      const combos = await dbGetCombos(storeId);
      set({ combos, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  saveCombo: async (combo: Combo) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      await dbSaveCombo(combo, storeId);
      await get().fetchCombos();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  deleteCombo: async (id: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      await dbDeleteCombo(id, storeId);
      await get().fetchCombos();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  toggleCombo: async (id: string, isActive: boolean) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      await dbToggleCombo(id, isActive, storeId);
      await get().fetchCombos();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  getActiveCombos: () => {
    return get().combos.filter(c => c.is_active);
  },
}));
