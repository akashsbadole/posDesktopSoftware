import { create } from 'zustand';
import { dbGetProducts, dbSaveProduct, dbDeleteProduct, dbUpdateStock, Product, exportProductsCsv, importProductsCsv } from '@/lib/db';
import { useSettingsStore } from './settingsStore';

interface ProductsState {
  products: Product[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateStock: (id: string, delta: number) => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  getFilteredProducts: () => Product[];
  getProductById: (id: string) => Product | undefined;
  exportProducts: () => Promise<string>;
  importProducts: (csvData: string) => Promise<{ imported: number; errors: number }>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,
  error: null,
  selectedCategory: null,
  searchQuery: '',

  fetchProducts: async () => {
    const storeId = useSettingsStore.getState().activeStoreId;
    set({ isLoading: true, error: null });
    try {
      const products = await dbGetProducts(storeId);
      const categories = Array.from(new Set(products.map((p) => p.category))).sort();
      set({ products, categories, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addProduct: async (product: Product) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      await dbSaveProduct(product, storeId);
      await get().fetchProducts();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  updateProduct: async (product: Product) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      await dbSaveProduct(product, storeId);
      await get().fetchProducts();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  deleteProduct: async (id: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      await dbDeleteProduct(id, storeId);
      await get().fetchProducts();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  updateStock: async (id: string, delta: number) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    const previousProducts = get().products;
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
      ),
    }));
    try {
      await dbUpdateStock(id, delta, storeId);
    } catch (err) {
      set({ products: previousProducts, error: (err as Error).message });
      throw err;
    }
  },

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  getFilteredProducts: () => {
    const { products, selectedCategory, searchQuery } = get();
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
      );
    }
    return filtered;
  },

  getProductById: (id: string) => get().products.find((p) => p.id === id),

  exportProducts: async () => {
    const storeId = useSettingsStore.getState().activeStoreId;
    return exportProductsCsv(storeId);
  },

  importProducts: async (csvData: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    const result = await importProductsCsv(csvData, storeId);
    await get().fetchProducts();
    return result;
  },
}));
