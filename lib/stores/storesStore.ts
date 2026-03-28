import { create } from 'zustand';
import { dbGetStores, dbUpsertStore, dbDeleteStore, Store } from '@/lib/db';

interface StoresState {
  stores: Store[];
  isLoading: boolean;
  error: string | null;
  fetchStores: () => Promise<void>;
  addStore: (store: Store) => Promise<void>;
  updateStore: (store: Store) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  getStoreById: (id: string) => Store | undefined;
}

export const useStoresStore = create<StoresState>((set, get) => ({
  stores: [],
  isLoading: false,
  error: null,

  fetchStores: async () => {
    set({ isLoading: true, error: null });
    try {
      const stores = await dbGetStores();
      set({ stores, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addStore: async (store: Store) => {
    try {
      await dbUpsertStore(store);
      await get().fetchStores();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  updateStore: async (store: Store) => {
    try {
      await dbUpsertStore(store);
      await get().fetchStores();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteStore: async (id: string) => {
    try {
      await dbDeleteStore(id);
      await get().fetchStores();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  getStoreById: (id: string) => get().stores.find(s => s.id === id),
}));
