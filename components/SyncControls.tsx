// components/SyncControls.tsx
// UI component for cloud sync status and manual sync controls
// Premium feature: Cloud sync requires premium license

"use client";

import React, { useEffect, useState } from "react";
import { useSyncStore } from "@/lib/stores/syncStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import ConflictResolutionModal from "./ConflictResolutionModal";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertCircle,
  Wifi,
  WifiOff,
  Lock,
} from "lucide-react";

export const SyncControls = () => {
  const {
    isOnline,
    isSyncing,
    syncStatus,
    syncError,
    lastSyncTime,
    syncToCloud,
    syncFromCloud,
    bidirectionalSync,
    clearSyncError,
    conflicts,
  } = useSyncStore();

  const { organization } = useAuthStore();
  const [showDetails, setShowDetails] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const storeId = organization?.id || "default";

  // Setup auto-sync every 5 minutes when online
  useEffect(() => {
    if (!autoSync || !isOnline) return;

    const syncInterval = setInterval(
      () => {
        bidirectionalSync(storeId);
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(syncInterval);
  }, [autoSync, isOnline, storeId, bidirectionalSync]);

  const formatLastSync = () => {
    if (!lastSyncTime) return "Never";
    const date = new Date(lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
      {/* Online Status */}
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded ${
          isOnline ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span className="text-xs font-medium">
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      {/* Sync Status */}
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
          syncStatus === "syncing"
            ? "bg-blue-50 text-blue-700"
            : syncStatus === "success"
              ? "bg-green-50 text-green-700"
              : syncStatus === "error"
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-700"
        }`}
      >
        {syncStatus === "syncing" && (
          <>
            <RefreshCw size={14} className="animate-spin" />
            <span>Syncing...</span>
          </>
        )}
        {syncStatus === "success" && (
          <>
            <Check size={14} />
            <span>{formatLastSync()}</span>
          </>
        )}
        {syncStatus === "error" && (
          <>
            <AlertCircle size={14} />
            <span>Sync error</span>
          </>
        )}
        {syncStatus === "idle" && (
          <>
            <Cloud size={14} />
            <span>Ready</span>
          </>
        )}
      </div>

      {/* Auto-sync Toggle */}
      <label className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 cursor-pointer text-xs">
        <input
          type="checkbox"
          checked={autoSync}
          onChange={(e) => setAutoSync(e.target.checked)}
          className="w-4 h-4"
          disabled={isSyncing || !isOnline}
        />
        <span className="font-medium">Auto</span>
      </label>

      {/* Manual Sync Buttons */}
      <button
        onClick={() => syncToCloud(storeId)}
        disabled={isSyncing || !isOnline}
        className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
        title="Push local data to cloud"
      >
        <Cloud size={14} />
        Push
      </button>

      <button
        onClick={() => syncFromCloud(storeId)}
        disabled={isSyncing || !isOnline}
        className="flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
        title="Pull cloud data to local"
      >
        <CloudOff size={14} />
        Pull
      </button>

      <button
        onClick={() => bidirectionalSync(storeId)}
        disabled={isSyncing || !isOnline}
        className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
        title="Sync both ways"
      >
        <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
        Sync All
      </button>

      {/* Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
      >
        {showDetails ? "Hide" : "Details"}
      </button>

      {/* Error Message */}
      {syncStatus === "error" && syncError && (
        <div className="absolute top-full mt-1 right-0 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 max-w-xs z-10">
          <div className="flex justify-between items-start gap-2">
            <div>{syncError}</div>
            <button
              onClick={clearSyncError}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Detailed Info Panel */}
      {showDetails && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-300 rounded shadow-lg p-3 w-64 text-xs z-20">
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Connection: </span>
              <span>{isOnline ? "Online" : "Offline"}</span>
            </div>
            <div>
              <span className="font-semibold">Sync Status: </span>
              <span>{syncStatus}</span>
            </div>
            <div>
              <span className="font-semibold">Last Sync: </span>
              <span>{formatLastSync()}</span>
            </div>
            {lastSyncTime && (
              <div>
                <span className="font-semibold">At: </span>
                <span>{new Date(lastSyncTime).toLocaleTimeString()}</span>
              </div>
            )}
            <div>
              <span className="font-semibold">Auto-sync: </span>
              <span>{autoSync ? "Enabled (5min)" : "Disabled"}</span>
            </div>
            {syncError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <span className="font-semibold text-red-700">Error: </span>
                <span className="text-red-600">{syncError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {conflicts.length > 0 && <ConflictResolutionModal onClose={() => {}} />}
    </div>
  );
};

export default SyncControls;
