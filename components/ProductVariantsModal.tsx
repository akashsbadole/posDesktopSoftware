"use client";
import { useState, useEffect } from "react";
import { Product } from "@/lib/db";
import { X, Plus, Minus } from "lucide-react";

interface ProductVariantsModalProps {
  product: Product;
  onAdd: (product: Product, quantity: number, variant: string) => void;
  onClose: () => void;
}

export default function ProductVariantsModal({ product, onAdd, onClose }: ProductVariantsModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [variants, setVariants] = useState<string[]>([]);

  useEffect(() => {
    try {
      if (product.variants) {
        const parsed = JSON.parse(product.variants);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVariants(parsed);
          setSelectedVariant(parsed[0]);
        }
      }
    } catch {
      // No valid variants, close immediately
      onAdd(product, 1, "");
      onClose();
    }
  }, []);

  if (variants.length === 0) {
    onAdd(product, 1, "");
    onClose();
    return null;
  }

  const handleAdd = () => {
    onAdd(product, quantity, selectedVariant);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rounded-xl p-5 max-w-sm w-full mx-4" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold" style={{ color: "#F5C842" }}>{product.name}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2A2A35]" style={{ color: "#9090A8" }}><X size={16} /></button>
        </div>

        <div className="mb-4">
          <label className="text-xs block mb-2" style={{ color: "#9090A8" }}>Select Variant</label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVariant(v)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: selectedVariant === v ? "#F5C842" : "#2A2A35",
                  color: selectedVariant === v ? "#0D0D0F" : "#9090A8",
                  border: `1px solid ${selectedVariant === v ? "#F5C842" : "#3A3A45"}`,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs block mb-2" style={{ color: "#9090A8" }}>Quantity</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#2A2A35", color: "#fff" }}><Minus size={16} /></button>
            <span className="text-lg font-bold w-8 text-center" style={{ color: "#F5C842" }}>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#2A2A35", color: "#fff" }}><Plus size={16} /></button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 p-3 rounded-lg" style={{ background: "#16161A" }}>
          <span style={{ color: "#9090A8" }}>Total</span>
          <span className="text-lg font-bold" style={{ color: "#F5C842" }}>${(product.price * quantity).toFixed(2)}</span>
        </div>

        <button onClick={handleAdd} className="w-full py-3 rounded-lg font-semibold" style={{ background: "#F5C842", color: "#0D0D0F" }}>
          Add to Cart
        </button>
      </div>
    </div>
  );
}
