import { create } from 'zustand';
import { dbGetTables, dbSaveTable, dbDeleteTable, dbUpdateTableStatus, Table } from '@/lib/db';
import { useSettingsStore } from './settingsStore';

interface TablesState {
  tables: Table[];
  isLoading: boolean;
  error: string | null;
  selectedTableId: string | null;
  fetchTables: () => Promise<void>;
  addTable: (table: Table) => Promise<void>;
  updateTable: (table: Table) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  setTableStatus: (id: string, status: Table['status']) => Promise<void>;
  setSelectedTableId: (id: string | null) => void;
  getTableById: (id: string) => Table | undefined;
  getAvailableTables: () => Table[];
  getOccupiedTables: () => Table[];
}

export const useTablesStore = create<TablesState>((set, get) => ({
  tables: [],
  isLoading: false,
  error: null,
  selectedTableId: null,

  fetchTables: async () => {
    const storeId = useSettingsStore.getState().activeStoreId;
    set({ isLoading: true, error: null });
    try {
      const tables = await dbGetTables(storeId);
      set({ tables, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addTable: async (table: Table) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    await dbSaveTable(table, storeId);
    await get().fetchTables();
  },

  updateTable: async (table: Table) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    await dbSaveTable(table, storeId);
    await get().fetchTables();
  },

  deleteTable: async (id: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    await dbDeleteTable(id, storeId);
    await get().fetchTables();
  },

  setTableStatus: async (id: string, status: Table['status']) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    await dbUpdateTableStatus(id, status, storeId);
    set((state) => ({
      tables: state.tables.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  },

  setSelectedTableId: (selectedTableId) => set({ selectedTableId }),

  getTableById: (id: string) => get().tables.find((t) => t.id === id),

  getAvailableTables: () => get().tables.filter((t) => t.status === 'available'),

  getOccupiedTables: () => get().tables.filter((t) => t.status === 'occupied'),
}));
