"use client";
import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => { setIsOnline(true); setShowBanner(true); setTimeout(() => setShowBanner(false), 3000); };
    const handleOffline = () => { setIsOnline(false); setShowBanner(true); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {/* Status dot in header area - small indicator */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: isOnline ? "rgba(46,204,113,0.1)" : "rgba(231,76,60,0.1)" }}>
        <div className="w-2 h-2 rounded-full" style={{ background: isOnline ? "#2ECC71" : "#E74C3C" }} />
        <span className="text-xs" style={{ color: isOnline ? "#2ECC71" : "#E74C3C" }}>{isOnline ? "Online" : "Offline"}</span>
      </div>

      {/* Offline banner */}
      {showBanner && !isOnline && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-3" style={{ background: "rgba(231,76,60,0.95)", color: "#fff" }}>
          <WifiOff size={16} />
          <span className="text-sm font-medium">You are offline. Data is saved locally and will sync when connection is restored.</span>
        </div>
      )}

      {/* Back online toast */}
      {showBanner && isOnline && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-3" style={{ background: "rgba(46,204,113,0.95)", color: "#0D0D0F" }}>
          <Wifi size={16} />
          <span className="text-sm font-medium">Back online!</span>
        </div>
      )}
    </>
  );
}
