"use client";
import { useState, useEffect } from "react";
import { getQuickSalePresets, QuickSalePreset, Product } from "@/lib/db";
import { Zap } from "lucide-react";

interface QuickSaleButtonsProps {
  products: Product[];
  onAddItems: (items: { product: Product; quantity: number }[]) => void;
}

export default function QuickSaleButtons({ products, onAddItems }: QuickSaleButtonsProps) {
  const [presets, setPresets] = useState<QuickSalePreset[]>([]);

  useEffect(() => { loadPresets(); }, []);

  const loadPresets = async () => {
    try {
      const p = await getQuickSalePresets();
      setPresets(p);
    } catch { }
  };

  const handleQuickSale = (preset: QuickSalePreset) => {
    const ids = preset.product_ids.split(",");
    const qtys = preset.quantities.split(",").map(Number);
    const items: { product: Product; quantity: number }[] = [];
    ids.forEach((id, i) => {
      const product = products.find((p) => p.id === id);
      if (product) items.push({ product, quantity: qtys[i] || 1 });
    });
    if (items.length > 0) onAddItems(items);
  };

  if (presets.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap" role="group" aria-label="Quick sale presets">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => handleQuickSale(preset)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
          style={{ background: `${preset.color}20`, color: preset.color, border: `1px solid ${preset.color}40` }}
          title={`Quick add: ${preset.name}${preset.discount > 0 ? ` (${preset.discount}% off)` : ""}`}
        >
          <Zap size={12} />
          {preset.name}
        </button>
      ))}
    </div>
  );
}
