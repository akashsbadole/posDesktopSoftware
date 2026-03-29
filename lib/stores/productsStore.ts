import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';
import {
  dbGetProducts, dbSaveProduct, dbDeleteProduct, dbUpdateStock, Product,
  exportProductsCsv, importProductsCsv, ProductVariant, dbGetProductVariants,
  dbSaveProductVariant, dbDeleteProductVariant
} from '@/lib/db';

interface ProductsState {
  products: Product[];
  categories: string[];
  subcategories: string[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  searchQuery: string;
  sortBy: 'name' | 'price' | 'stock' | 'category';
  sortOrder: 'asc' | 'desc';
  fetchProducts: () => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateStock: (id: string, delta: number) => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  setSelectedSubcategory: (subcategory: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSorting: (by: ProductsState['sortBy'], order: 'asc' | 'desc') => void;
  getFilteredProducts: () => Product[];
  getProductById: (id: string) => Product | undefined;
  exportProducts: () => Promise<string>;
  importProducts: (csvData: string) => Promise<{ imported: number; errors: number }>;
  fetchVariants: (productId: string) => Promise<ProductVariant[]>;
  saveVariant: (variant: ProductVariant) => Promise<void>;
  deleteVariant: (id: string) => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  categories: [],
  subcategories: [],
  isLoading: false,
  error: null,
  selectedCategory: null,
  selectedSubcategory: null,
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',

  fetchProducts: async () => {
    const storeId = useSettingsStore.getState().activeStoreId;
    set({ isLoading: true, error: null });
    try {
      const products = await dbGetProducts(storeId);
      const categories = Array.from(new Set(products.map((p) => p.category))).sort();
      const subcategories = Array.from(new Set(products.map((p) => p.subcategory).filter(Boolean))).sort() as string[];
      set({ products, categories, subcategories, isLoading: false });
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

  setSelectedCategory: (selectedCategory) => set({ selectedCategory, selectedSubcategory: null }),
  setSelectedSubcategory: (selectedSubcategory) => set({ selectedSubcategory }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

  getFilteredProducts: () => {
    const { products, selectedCategory, selectedSubcategory, searchQuery, sortBy, sortOrder } = get();
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    if (selectedSubcategory) {
      filtered = filtered.filter((p) => p.subcategory === selectedSubcategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.tags && p.tags.toLowerCase().includes(q))
      );
    }

    return [...filtered].sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;

      let comp = 0;
      if (sortBy === 'name') comp = a.name.localeCompare(b.name);
      else if (sortBy === 'price') comp = a.price - b.price;
      else if (sortBy === 'stock') comp = a.stock - b.stock;
      else if (sortBy === 'category') comp = a.category.localeCompare(b.category);

      return sortOrder === 'asc' ? comp : -comp;
    });
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

  fetchVariants: async (productId: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      return await dbGetProductVariants(productId, storeId);
    } catch (err) {
      console.error("Failed to fetch variants:", err);
      return [];
    }
  },

  saveVariant: async (variant: ProductVariant) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    await dbSaveProductVariant(variant, storeId);
  },

  deleteVariant: async (id: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    await dbDeleteProductVariant(id, storeId);
  },
}));
