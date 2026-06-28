"use client";
import { useState } from "react";
import { Trash2, Minus, Plus, Edit, Clock, Package } from "lucide-react";
import { OrderItem, Product } from "@/lib/db";
import { uiLogger } from "@/lib/logger";

interface CartPanelProps {
  items: OrderItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onEditItem?: (index: number) => void;
  onClearCart: () => void;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  labels: { [key: string]: string };
  currencySymbol?: string;
}

export default function CartPanel({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onEditItem,
  onClearCart,
  subtotal,
  taxAmount,
  discountAmount,
  total,
  labels,
  currencySymbol,
}: CartPanelProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const sym = currencySymbol ?? "$";

  const handleQuantityEdit = (index: number, currentQuantity: number) => {
    setEditingIndex(index);
    setEditQuantity(currentQuantity.toString());
  };

  const handleQuantitySave = (index: number) => {
    const newQuantity = parseFloat(editQuantity);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      onUpdateQuantity(index, newQuantity);
    }
    setEditingIndex(null);
    setEditQuantity("");
  };

  const handleQuantityCancel = () => {
    setEditingIndex(null);
    setEditQuantity("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200">
      {/* Cart Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {labels.cart || 'Cart'} ({items.length})
          </h2>
          {items.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Package className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">Cart is empty</p>
            <p className="text-sm">Add items to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {items.map((item, index) => (
              <div
                key={`${item.product_id}-${index}`}
                className="bg-white rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">
                      {item.product_name}
                    </h3>
                    <div className="text-xs text-gray-500 mt-1">
                      {sym}{item.price.toFixed(2)} each
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveItem(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                      className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    {editingIndex === index ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuantitySave(index);
                            if (e.key === 'Escape') handleQuantityCancel();
                          }}
                          className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                          min="0.1"
                          step="0.1"
                          autoFocus
                        />
                        <button
                          onClick={() => handleQuantitySave(index)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleQuantityCancel}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span
                        className="w-8 text-center cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        onClick={() => handleQuantityEdit(index, item.quantity)}
                        title="Click to edit quantity"
                      >
                        {item.quantity}
                      </span>
                    )}

                    <button
                      onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                      className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {sym}{(item.price * item.quantity).toFixed(2)}
                    </div>
                    {item.discount > 0 && (
                      <div className="text-xs text-green-600">
                        -{sym}{item.discount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {item.done && (
                  <div className="flex items-center mt-2 text-xs text-green-600">
                    <Clock className="w-3 h-3 mr-1" />
                    Ready for pickup
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      {items.length > 0 && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{sym}{subtotal.toFixed(2)}</span>
            </div>

            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">{sym}{taxAmount.toFixed(2)}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium text-green-600">-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t border-gray-300 pt-2 mt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}