import { create } from 'zustand';
import { dbGetProducts, dbSaveProduct, dbDeleteProduct, dbUpdateStock, Product } from '@/lib/db';

interface ProductsState {
  products: Product[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  lastFetch: number | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateStock: (id: string, delta: number) => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  getFilteredProducts: () => Product[];
  getProductById: (id: string) => Product | undefined;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,
  error: null,
  selectedCategory: null,
  searchQuery: '',
  lastFetch: null,

  fetchProducts: async () => {
    const { lastFetch } = get();
    const now = Date.now();
    
    if (lastFetch && (now - lastFetch) < CACHE_TTL) {
      return;
    }
    
    set({ isLoading: true, error: null });
    try {
      const products = await dbGetProducts();
      const categories = Array.from(new Set(products.map((p) => p.category))).sort();
      set({ products, categories, isLoading: false, lastFetch: now });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  forceFetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const products = await dbGetProducts();
      const categories = Array.from(new Set(products.map((p) => p.category))).sort();
      set({ products, categories, isLoading: false, lastFetch: Date.now() });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addProduct: async (product: Product) => {
    await dbSaveProduct(product);
    await get().fetchProducts();
  },

  updateProduct: async (product: Product) => {
    await dbSaveProduct(product);
    await get().fetchProducts();
  },

  deleteProduct: async (id: string) => {
    await dbDeleteProduct(id);
    await get().fetchProducts();
  },

  updateStock: async (id: string, delta: number) => {
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
      ),
    }));
    await dbUpdateStock(id, delta);
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
}));
