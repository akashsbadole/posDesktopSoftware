// lib/storeTypes.ts
// Store type definitions — controls UI labels, order types, variant fields, and feature visibility

export type StoreTypeId = "food" | "garment" | "gift" | "retail" | "pharmacy" | "electronics";

export interface StoreTypeFeatures {
  tables: boolean;
  kds: boolean;
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
  giftWrapping: boolean;
  wallet: boolean;
  ingredients: boolean;
}

export interface StoreTypeConfig {
  id: StoreTypeId;
  label: string;
  icon: string;
  description: string;
  features: StoreTypeFeatures;
  labels: {
    product: string;
    products: string;
    productCategory: string;
    orderType: string;
  };
  orderTypes: { id: string; label: string }[];
  variantFields: { key: string; label: string; type: "text" | "select"; options?: string[] }[];
}

export const STORE_TYPES: Record<StoreTypeId, StoreTypeConfig> = {
  food: {
    id: "food",
    label: "Restaurant / Café",
    icon: "ChefHat",
    description: "Restaurants, cafés, food trucks, bakeries",
    features: {
      tables: true,
      kds: true,
      dineIn: true,
      takeaway: true,
      delivery: true,
      giftWrapping: false,
      wallet: true,
      ingredients: true,
    },
    labels: {
      product: "Menu Item",
      products: "Menu",
      productCategory: "Category",
      orderType: "Order Type",
    },
    orderTypes: [
      { id: "dine_in", label: "Dine In" },
      { id: "takeaway", label: "Takeaway" },
      { id: "delivery", label: "Delivery" },
    ],
    variantFields: [],
  },

  garment: {
    id: "garment",
    label: "Garment / Clothing",
    icon: "Shirt",
    description: "Clothing stores, fashion boutiques, tailoring shops",
    features: {
      tables: false,
      kds: false,
      dineIn: false,
      takeaway: false,
      delivery: false,
      giftWrapping: false,
      wallet: true,
      ingredients: false,
    },
    labels: {
      product: "Product",
      products: "Products",
      productCategory: "Department",
      orderType: "Sale Type",
    },
    orderTypes: [
      { id: "in_store", label: "In Store" },
      { id: "online", label: "Online" },
    ],
    variantFields: [
      { key: "size", label: "Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
      { key: "color", label: "Color", type: "text" },
      { key: "material", label: "Material", type: "text" },
    ],
  },

  gift: {
    id: "gift",
    label: "Gift Shop",
    icon: "Gift",
    description: "Gift shops, souvenir stores, stationery shops",
    features: {
      tables: false,
      kds: false,
      dineIn: false,
      takeaway: false,
      delivery: false,
      giftWrapping: true,
      wallet: true,
      ingredients: false,
    },
    labels: {
      product: "Product",
      products: "Products",
      productCategory: "Category",
      orderType: "Sale Type",
    },
    orderTypes: [
      { id: "in_store", label: "In Store" },
      { id: "online", label: "Online" },
    ],
    variantFields: [],
  },

  retail: {
    id: "retail",
    label: "General Retail",
    icon: "ShoppingBag",
    description: "General stores, supermarkets, grocery stores",
    features: {
      tables: false,
      kds: false,
      dineIn: false,
      takeaway: false,
      delivery: false,
      giftWrapping: false,
      wallet: true,
      ingredients: false,
    },
    labels: {
      product: "Product",
      products: "Products",
      productCategory: "Category",
      orderType: "Sale Type",
    },
    orderTypes: [
      { id: "in_store", label: "In Store" },
      { id: "online", label: "Online" },
    ],
    variantFields: [],
  },

  pharmacy: {
    id: "pharmacy",
    label: "Pharmacy",
    icon: "Pill",
    description: "Pharmacies, medical stores, drug stores",
    features: {
      tables: false,
      kds: false,
      dineIn: false,
      takeaway: false,
      delivery: true,
      giftWrapping: false,
      wallet: true,
      ingredients: false,
    },
    labels: {
      product: "Medicine",
      products: "Medicines",
      productCategory: "Category",
      orderType: "Sale Type",
    },
    orderTypes: [
      { id: "in_store", label: "In Store" },
      { id: "delivery", label: "Delivery" },
    ],
    variantFields: [
      { key: "batch", label: "Batch Number", type: "text" },
      { key: "expiry", label: "Expiry Date", type: "text" },
    ],
  },

  electronics: {
    id: "electronics",
    label: "Electronics",
    icon: "Monitor",
    description: "Electronics stores, mobile shops, computer stores",
    features: {
      tables: false,
      kds: false,
      dineIn: false,
      takeaway: false,
      delivery: false,
      giftWrapping: false,
      wallet: true,
      ingredients: false,
    },
    labels: {
      product: "Product",
      products: "Products",
      productCategory: "Category",
      orderType: "Sale Type",
    },
    orderTypes: [
      { id: "in_store", label: "In Store" },
      { id: "online", label: "Online" },
    ],
    variantFields: [
      { key: "warranty", label: "Warranty (months)", type: "text" },
      { key: "serial", label: "Serial Number", type: "text" },
    ],
  },
};

export function getStoreTypeConfig(id: string): StoreTypeConfig {
  return STORE_TYPES[id as StoreTypeId] ?? STORE_TYPES.retail;
}
