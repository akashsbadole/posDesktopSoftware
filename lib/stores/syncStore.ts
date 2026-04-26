// lib/stores/syncStore.ts
// Manages cloud sync operations and offline/online state
// Premium feature: Cloud sync only available for premium users

import { create } from "zustand";
import { syncToNeon, syncFromNeon } from "@/lib/db";
import { dbLogger } from "@/lib/logger";
import { useSettingsStore } from "./settingsStore";

// Check actual internet connectivity by pinging a reliable endpoint
async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

export interface Conflict {
  id: string;
  table: string;
  localData: any;
  cloudData: any;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  pendingSyncCount: number;
  pendingSyncQueue: string[];
  conflicts: Conflict[];

  // Methods
  setOnlineStatus: (online: boolean) => Promise<void>;
  syncToCloud: (storeId: string) => Promise<boolean>;
  syncFromCloud: (storeId: string) => Promise<boolean>;
  bidirectionalSync: (storeId: string) => Promise<boolean>;
  clearSyncError: () => void;
  resetSyncState: () => void;
  processPendingQueue: () => Promise<void>;
  resolveConflict: (conflictId: string, choice: 'local' | 'cloud') => void;
}

// Load pending queue from localStorage
function loadPendingQueue(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("pending_sync_queue");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save pending queue to localStorage
function savePendingQueue(queue: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("pending_sync_queue", JSON.stringify(queue));
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: typeof window !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  syncStatus: "idle",
  pendingSyncCount: 0,
  pendingSyncQueue: loadPendingQueue(),
  conflicts: [],

  setOnlineStatus: async (navigatorOnline: boolean) => {
    // Check actual connectivity, not just navigator.onLine (handles captive portals)
    const actualOnline = navigatorOnline && await checkConnectivity();
    set({ isOnline: actualOnline });
    dbLogger.info("Online status changed", { navigatorOnline, actualOnline });

    // Process pending queue when coming back online
    if (actualOnline) {
      await get().processPendingQueue();
    }

    // Auto-sync when coming back online
    if (actualOnline && get().lastSyncTime) {
      const lastSync = new Date(get().lastSyncTime || 0).getTime();
      const now = Date.now();
      // If last sync was more than 1 minute ago, sync again
      if (now - lastSync > 60000) {
        // Check if Neon URL is configured
        const neonUrl = useSettingsStore.getState().settings?.neon_url;
        if (!neonUrl || neonUrl.trim() === "") {
          dbLogger.info("Auto-sync skipped - Neon URL not configured");
        } else {
          dbLogger.info("Auto-syncing after network restoration");
          get().bidirectionalSync("default");
        }
      }
    }
  },

  syncToCloud: async (storeId: string) => {
    try {

      // Check if Neon URL is configured
      const neonUrl = useSettingsStore.getState().settings?.neon_url;
      if (!neonUrl || neonUrl.trim() === "") {
        const error = "Neon database URL not configured. Set it in Settings > Cloud Sync.";
        set({
          isSyncing: false,
          syncStatus: "error",
          syncError: error,
        });
        dbLogger.warn("Cloud sync blocked - Neon URL missing", { storeId });
        return false;
      }

      set({ isSyncing: true, syncStatus: "syncing", syncError: null });
      dbLogger.info("Starting sync to cloud", { storeId });

      const result = await syncToNeon(storeId);

      if (result.error) {
        set({
          isSyncing: false,
          syncStatus: "error",
          syncError: result.error,
        });
        dbLogger.error("Cloud sync failed", result.error);
        return false;
      }

      set({
        isSyncing: false,
        syncStatus: "success",
        lastSyncTime: new Date().toISOString(),
        syncError: null,
      });
      dbLogger.info("Successfully synced to cloud", { synced: result.synced });
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      set({
        isSyncing: false,
        syncStatus: "error",
        syncError: errorMsg,
      });
      dbLogger.error("Sync to cloud failed", error);
      return false;
    }
  },

  syncFromCloud: async (storeId: string) => {
    try {
      // Check if Neon URL is configured
      const neonUrl = useSettingsStore.getState().settings?.neon_url;
      if (!neonUrl || neonUrl.trim() === "") {
        const error = "Neon database URL not configured. Set it in Settings > Cloud Sync.";
        set({
          isSyncing: false,
          syncStatus: "error",
          syncError: error,
        });
        dbLogger.warn("Cloud sync blocked - Neon URL missing", { storeId });
        return false;
      }

      set({ isSyncing: true, syncStatus: "syncing", syncError: null });
      dbLogger.info("Starting sync from cloud", { storeId });

      const result = await syncFromNeon(storeId);

      if (result.error) {
        set({
          isSyncing: false,
          syncStatus: "error",
          syncError: result.error,
        });
        dbLogger.error("Cloud import failed", result.error);
        return false;
      }

      set({
        isSyncing: false,
        syncStatus: "success",
        lastSyncTime: new Date().toISOString(),
        syncError: null,
      });
      dbLogger.info("Successfully synced from cloud", {
        synced: result.synced,
      });
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      set({
        isSyncing: false,
        syncStatus: "error",
        syncError: errorMsg,
      });
      dbLogger.error("Sync from cloud failed", error);
      return false;
    }
  },

  bidirectionalSync: async (storeId: string) => {
    // If offline, queue the sync
    if (!get().isOnline) {
      const queue = [...get().pendingSyncQueue, `bidirectionalSync:${storeId}`];
      set({ pendingSyncQueue: queue });
      savePendingQueue(queue);
      dbLogger.info("Queued bidirectional sync - offline", { storeId });
      return false; // Not synced yet
    }

    try {

      // Check if Neon URL is configured
      const neonUrl = useSettingsStore.getState().settings?.neon_url;
      if (!neonUrl || neonUrl.trim() === "") {
        const error = "Neon database URL not configured. Set it in Settings > Cloud Sync.";
        set({
          isSyncing: false,
          syncStatus: "error",
          syncError: error,
        });
        dbLogger.warn("Bidirectional sync blocked - Neon URL missing", {
          storeId,
        });
        return false;
      }

      set({ isSyncing: true, syncStatus: "syncing" });
      dbLogger.info("Starting bidirectional sync", { storeId });

      // First push local changes to cloud
      const pushResult = await get().syncToCloud(storeId);
      if (!pushResult) {
        dbLogger.warn("Bidirectional sync: push failed, skipping pull");
        return false;
      }

      // Then pull latest from cloud
      const pullResult = await get().syncFromCloud(storeId);
      if (!pullResult) {
        dbLogger.warn("Bidirectional sync: pull failed but push succeeded");
        return true; // Consider partial success
      }

      set({
        isSyncing: false,
        syncStatus: "success",
        lastSyncTime: new Date().toISOString(),
      });
      dbLogger.info("Bidirectional sync completed successfully");
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      set({
        isSyncing: false,
        syncStatus: "error",
        syncError: errorMsg,
      });
      dbLogger.error("Bidirectional sync failed", error);
      return false;
    }
  },

  clearSyncError: () => {
    set({ syncError: null });
  },

  processPendingQueue: async () => {
    const queue = [...get().pendingSyncQueue];
    if (queue.length === 0) return;

    dbLogger.info("Processing pending sync queue", { count: queue.length });

    // Check if Neon URL is configured before attempting any sync
    const neonUrl = useSettingsStore.getState().settings?.neon_url;
    if (!neonUrl || neonUrl.trim() === "") {
      dbLogger.info("Skipping pending queue - Neon URL not configured");
      return;
    }

    for (const item of queue) {
      const [action, storeId] = item.split(':');
      if (action === 'bidirectionalSync') {
        const success = await get().bidirectionalSync(storeId);
        if (success) {
          // Remove from queue
          const newQueue = get().pendingSyncQueue.filter(q => q !== item);
          set({ pendingSyncQueue: newQueue });
          savePendingQueue(newQueue);
        } else {
          // If failed, keep in queue for next time
          break;
        }
      }
    }
  },

  resolveConflict: (conflictId: string, choice: 'local' | 'cloud') => {
    // TODO: Implement conflict resolution logic (call Rust backend)
    dbLogger.info("Resolving conflict", { conflictId, choice });
    // For now, remove from conflicts
    const newConflicts = get().conflicts.filter(c => c.id !== conflictId);
    set({ conflicts: newConflicts });
  },

  resetSyncState: () => {
    set({
      isSyncing: false,
      syncStatus: "idle",
      syncError: null,
      pendingSyncCount: 0,
      pendingSyncQueue: [],
    });
    savePendingQueue([]);
  },
}));

// Setup online/offline listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", async () => {
    await useSyncStore.getState().setOnlineStatus(true);
  });

  window.addEventListener("offline", async () => {
    await useSyncStore.getState().setOnlineStatus(false);
  });
}
