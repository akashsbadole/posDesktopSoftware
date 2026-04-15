"use client";
import { useState, useRef, useCallback } from "react";
import { Search, Plus, Minus, Package, Star } from "lucide-react";
import { Product, ProductVariant, Batch, SerialNumber, Combo } from "@/lib/db";
import { useGridNavigation } from "@/lib/keyboard";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { uiLogger } from "@/lib/logger";

interface ProductGridProps {
  products: Product[];
  combos: Combo[];
  onAddItem: (product: Product) => void;
  onAddCombo: (combo: Combo) => void;
  onSelectVariant?: (product: Product) => void;
  onSelectBatch?: (product: Product) => void;
  onSelectSerial?: (product: Product) => void;
  labels: { [key: string]: string };
  premiumEnabled: boolean;
}

export default function ProductGrid({
  products,
  combos,
  onAddItem,
  onAddCombo,
  onSelectVariant,
  onSelectBatch,
  onSelectSerial,
  labels,
  premiumEnabled,
}: ProductGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedProductIndex, setFocusedProductIndex] = useState<number>(-1);
  const [isGridFocused, setIsGridFocused] = useState(false);
  const productGridRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGridColumns = useCallback(() => {
    if (typeof window === "undefined") return 4;
    const width = window.innerWidth;
    if (width < 768) return 2;
    if (width < 1024) return 3;
    if (width < 1280) return 4;
    return 5;
  }, []);

  const totalItems = filteredProducts.length + (premiumEnabled ? combos.length : 0);

  const getNewIndex = useGridNavigation(
    totalItems,
    setFocusedProductIndex,
    getGridColumns()
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        setFocusedProductIndex(0);
        setIsGridFocused(true);
        productGridRef.current?.focus();
      }
    }
    if (e.key === "Escape") {
      setSearchTerm("");
      setFocusedProductIndex(-1);
      setIsGridFocused(false);
    }
  };

  const handleProductGridKeyDown = (e: React.KeyboardEvent) => {
    const newIndex = getNewIndex(focusedProductIndex, e.key);
    if (newIndex !== focusedProductIndex) {
      setFocusedProductIndex(newIndex);
    }

    if (e.key === "Enter" && focusedProductIndex >= 0) {
      e.preventDefault();
      const product = filteredProducts[focusedProductIndex];
      if (product) {
        handleAddItem(product);
      }
    }

    if (e.key === "Escape") {
      setIsGridFocused(false);
      setFocusedProductIndex(-1);
      searchInputRef.current?.focus();
    }
  };

  const handleAddItem = async (product: Product) => {
    try {
      // Check if product has variants
      if (product.metadata && typeof product.metadata === 'object' && 'variants' in product.metadata) {
        if (onSelectVariant) {
          onSelectVariant(product);
          return;
        }
      }

      // Check if product requires batch selection
      if (product.status === 'active' && onSelectBatch) {
        // This would need batch checking logic
      }

      // Check if product requires serial selection
      if (product.status === 'active' && onSelectSerial) {
        // This would need serial checking logic
      }

      onAddItem(product);
    } catch (err) {
      uiLogger.error("Failed to add item to cart", err);
    }
  };

  const columns = getGridColumns();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={`Search ${labels.products || 'products'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>
      </div>

      {/* Product Grid */}
      <div
        ref={productGridRef}
        className="flex-1 overflow-y-auto p-4"
        tabIndex={0}
        onKeyDown={handleProductGridKeyDown}
        onFocus={() => setIsGridFocused(true)}
        onBlur={() => setIsGridFocused(false)}
      >
        <div
          className={`grid gap-3`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {/* Combo Products */}
          {premiumEnabled && combos.map((combo, index) => (
            <div
              key={`combo-${combo.id}`}
              className={`relative p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                focusedProductIndex === index && isGridFocused
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => onAddCombo(combo)}
            >
              <div className="flex items-center justify-between mb-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                  COMBO
                </span>
              </div>
              <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                {combo.name}
              </h3>
              <p className="text-lg font-bold text-gray-900">
                ₹{combo.combo_price.toFixed(2)}
              </p>
              <div className="text-xs text-gray-500 mt-1">
                {combo.items.length} items
              </div>
            </div>
          ))}

          {/* Regular Products */}
          {filteredProducts.map((product, index) => {
            const actualIndex = premiumEnabled ? combos.length + index : index;
            return (
              <div
                key={product.id}
                className={`relative p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  focusedProductIndex === actualIndex && isGridFocused
                    ? "ring-2 ring-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleAddItem(product)}
              >
                {product.is_favorite && (
                  <Star className="absolute top-2 right-2 w-4 h-4 text-yellow-500 fill-current" />
                )}

                {product.image_url && (
                  <div className="w-full h-20 mb-2 rounded overflow-hidden">
                    <img
                      src={convertFileSrc(product.image_url)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                  {product.name}
                </h3>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    ₹{product.price.toFixed(2)}
                  </span>
                  {product.stock <= 5 && (
                    <span className="text-xs text-red-600 font-medium">
                      Low: {product.stock}
                    </span>
                  )}
                </div>

                {product.barcode && (
                  <div className="text-xs text-gray-500 mt-1">
                    {product.barcode}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-500">
            No products found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}