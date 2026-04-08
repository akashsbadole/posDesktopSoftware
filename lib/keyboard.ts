"use client";
import { useCallback, useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  description: string;
  category: "navigation" | "pos" | "general";
}

export const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  { key: "F1", description: "Go to POS", category: "navigation" },
  { key: "F2", description: "Go to Dashboard", category: "navigation" },
  { key: "F3", description: "Go to Orders", category: "navigation" },
  { key: "F4", description: "Go to Products", category: "navigation" },
  { key: "F5", description: "Go to Reports", category: "navigation" },
  { key: "F6", description: "Go to Logs", category: "navigation" },
  { key: "F7", description: "Go to Settings", category: "navigation" },
  { key: "?", description: "Show keyboard shortcuts", category: "general" },
  { key: "Esc", description: "Close modal / Clear search", category: "general" },
];

export const POS_SHORTCUTS: KeyboardShortcut[] = [
  { key: "Enter", description: "Add scanned barcode to cart", category: "pos" },
  { key: "↑↓←→", description: "Navigate products", category: "pos" },
  { key: "1-9", description: "Quick add product (when focused)", category: "pos" },
  { key: "+/-", description: "Increase/decrease quantity", category: "pos" },
  { key: "Delete", description: "Remove item from cart", category: "pos" },
  { key: "C", description: "Clear cart", category: "pos" },
  { key: "P", description: "Process payment", category: "pos" },
  { key: "N", description: "New order (after checkout)", category: "pos" },
  { key: "1", description: "Dine In order type", category: "pos" },
  { key: "2", description: "Takeaway order type", category: "pos" },
  { key: "3", description: "Delivery order type", category: "pos" },
  { key: "Alt+1-5", description: "Switch Payment Method", category: "pos" },
  { key: "Alt+Q", description: "Toggle Price Tier", category: "pos" },
  { key: "F9", description: "Print KOT", category: "pos" },
  { key: "F10", description: "Hold Order", category: "pos" },
  { key: "F12", description: "Process Charge / Checkout", category: "pos" },
  { key: "Tab", description: "Switch between search and categories", category: "pos" },
];

export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  deps: React.DependencyList = []
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === key || e.key.toLowerCase() === key.toLowerCase()) {
        callback(e);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, ...deps]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function useGridNavigation(
  itemsLength: number,
  onSelect: (index: number) => void,
  columnsPerRow: number
) {
  const getIndex = useCallback(
    (currentIndex: number, key: string) => {
      const totalRows = Math.ceil(itemsLength / columnsPerRow);
      const currentRow = Math.floor(currentIndex / columnsPerRow);
      const currentCol = currentIndex % columnsPerRow;

      switch (key) {
        case "ArrowRight":
          return Math.min(currentIndex + 1, itemsLength - 1);
        case "ArrowLeft":
          return Math.max(currentIndex - 1, 0);
        case "ArrowDown":
          const nextRow = currentRow + 1;
          if (nextRow >= totalRows) return currentIndex;
          return Math.min(nextRow * columnsPerRow + currentCol, itemsLength - 1);
        case "ArrowUp":
          const prevRow = currentRow - 1;
          if (prevRow < 0) return currentIndex;
          return Math.max(prevRow * columnsPerRow + currentCol, 0);
        default:
          return currentIndex;
      }
    },
    [itemsLength, columnsPerRow]
  );

  return getIndex;
}

export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  element.addEventListener("keydown", handleKeyDown);
  return () => element.removeEventListener("keydown", handleKeyDown);
}
