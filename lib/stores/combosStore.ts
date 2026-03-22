import { create } from 'zustand';
import { dbGetCombos, dbSaveCombo, dbDeleteCombo, dbToggleCombo, Combo } from '@/lib/db';

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
    set({ isLoading: true, error: null });
    try {
      const combos = await dbGetCombos();
      set({ combos, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  saveCombo: async (combo: Combo) => {
    try {
      await dbSaveCombo(combo);
      await get().fetchCombos();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  deleteCombo: async (id: string) => {
    try {
      await dbDeleteCombo(id);
      await get().fetchCombos();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  toggleCombo: async (id: string, isActive: boolean) => {
    try {
      await dbToggleCombo(id, isActive);
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
