"use client";
import { useNotificationStore } from "@/lib/stores";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

export default function ToastContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: { bg: "rgba(46,204,113,0.1)", border: "rgba(46,204,113,0.3)", text: "#2ECC71", icon: "#2ECC71" },
    error: { bg: "rgba(231,76,60,0.1)", border: "rgba(231,76,60,0.3)", text: "#E74C3C", icon: "#E74C3C" },
    warning: { bg: "rgba(245,200,66,0.1)", border: "rgba(245,200,66,0.3)", text: "#F5C842", icon: "#F5C842" },
    info: { bg: "rgba(52,152,219,0.1)", border: "rgba(52,152,219,0.3)", text: "#3498DB", icon: "#3498DB" },
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm" role="alert" aria-live="polite">
      {notifications.map((n) => {
        const Icon = icons[n.type];
        const c = colors[n.type];
        return (
          <div
            key={n.id}
            className="flex items-start gap-3 p-3 rounded-xl shadow-lg animate-slide-in"
            style={{ background: c.bg, border: `1px solid ${c.border}`, backdropFilter: "blur(8px)" }}
          >
            <Icon size={18} style={{ color: c.icon, flexShrink: 0, marginTop: 1 }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: c.text }}>{n.title}</div>
              <div className="text-xs mt-0.5" style={{ color: "#9090A8" }}>{n.message}</div>
            </div>
            <button onClick={() => removeNotification(n.id)} className="p-0.5 rounded hover:bg-white/10" style={{ color: "#4A4A5A" }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
