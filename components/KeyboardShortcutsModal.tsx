"use client";
import { useEffect, useRef } from "react";
import { X, Keyboard } from "lucide-react";
import { GLOBAL_SHORTCUTS, POS_SHORTCUTS, KeyboardShortcut } from "@/lib/keyboard";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showPOS?: boolean;
}

function ShortcutGroup({ title, shortcuts }: { title: string; shortcuts: KeyboardShortcut[] }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#9090A8" }}>
        {title}
      </h3>
      <div className="space-y-1">
        {shortcuts.map((s) => (
          <div key={s.key} className="flex items-center justify-between py-1">
            <span className="text-sm" style={{ color: "#E8E8F0" }}>{s.description}</span>
            <kbd
              className="px-2 py-1 rounded text-xs font-mono font-medium"
              style={{ background: "#1E1E26", color: "#F5C842", border: "1px solid #2E2E3E" }}
            >
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KeyboardShortcutsModal({ isOpen, onClose, showPOS = false }: KeyboardShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    const timer = setTimeout(() => {
      const closeBtn = modalRef.current?.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
      closeBtn?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="card p-6 w-[480px] max-h-[80vh] overflow-y-auto fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-title"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard size={20} style={{ color: "#F5C842" }} />
            <h2 id="keyboard-title" className="font-display text-lg" style={{ color: "#F5C842" }}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="btn-ghost py-1 px-3"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <ShortcutGroup title="Global" shortcuts={GLOBAL_SHORTCUTS} />
        
        {showPOS && (
          <ShortcutGroup title="POS Screen" shortcuts={POS_SHORTCUTS} />
        )}

        <div className="mt-4 pt-4 border-t border-border" style={{ color: "#4A4A5A", fontSize: 12 }}>
          Press <kbd className="px-1.5 py-0.5 rounded mx-1" style={{ background: "#1E1E26" }}>?</kbd> to toggle this help
        </div>
      </div>
    </div>
  );
}
