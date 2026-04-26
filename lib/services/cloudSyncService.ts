// lib/services/cloudSyncService.ts
// Service for managing automatic cloud sync operations
// Premium feature: Only available for premium users

import { useSyncStore } from "@/lib/stores/syncStore";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { dbLogger } from "@/lib/logger";

class CloudSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Initialize the cloud sync service with auto-sync
   * Only initializes if user has premium license
   */
  async initialize(storeId: string) {
    if (this.isInitialized) return;

    // Check if Neon URL is configured
    const neonUrl = useSettingsStore.getState().settings?.neon_url;
    if (!neonUrl || neonUrl.trim() === "") {
      dbLogger.info("Cloud sync service init blocked - Neon URL not configured", {
        storeId,
      });
      return;
    }

    dbLogger.info("Initializing cloud sync service", { storeId });
    this.isInitialized = true;

    // Initial sync
    this.performSync(storeId);

    // Setup periodic sync
    this.setupAutoSync(storeId);
  }

  /**
   * Setup periodic auto-sync every 5 minutes when online
   */
  private setupAutoSync(storeId: string) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(
      () => {
        const syncStore = useSyncStore.getState();
        if (syncStore.isOnline && !syncStore.isSyncing) {
          this.performSync(storeId);
        }
      },
      5 * 60 * 1000,
    ); // 5 minutes

    dbLogger.info("Auto-sync interval configured");
  }

  /**
   * Perform bidirectional sync
   */
  private async performSync(storeId: string) {
    try {
      const syncStore = useSyncStore.getState();
      await syncStore.bidirectionalSync(storeId);
    } catch (error) {
      dbLogger.error("Auto-sync failed", error);
    }
  }

  /**
   * Cleanup service
   */
  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isInitialized = false;
    dbLogger.info("Cloud sync service cleaned up");
  }

  /**
   * Force a sync operation
   */
  async forceSync(storeId: string): Promise<boolean> {
    dbLogger.info("Forcing cloud sync", { storeId });
    const syncStore = useSyncStore.getState();
    return syncStore.bidirectionalSync(storeId);
  }

  /**
   * Sync to cloud only (push)
   */
  async syncToCloud(storeId: string): Promise<boolean> {
    const syncStore = useSyncStore.getState();
    return syncStore.syncToCloud(storeId);
  }

  /**
   * Sync from cloud only (pull)
   */
  async syncFromCloud(storeId: string): Promise<boolean> {
    const syncStore = useSyncStore.getState();
    return syncStore.syncFromCloud(storeId);
  }

  /**
   * Get current sync status
   */
  getSyncStatus() {
    const syncStore = useSyncStore.getState();
    return {
      isOnline: syncStore.isOnline,
      isSyncing: syncStore.isSyncing,
      status: syncStore.syncStatus,
      lastSyncTime: syncStore.lastSyncTime,
      error: syncStore.syncError,
    };
  }
}

export const cloudSyncService = new CloudSyncService();
