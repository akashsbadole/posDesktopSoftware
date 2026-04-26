// components/CloudOfflineIntegration.tsx
// Main integration component that sets up cloud sync service and authentication
// Premium feature: Cloud sync only initializes for premium users

"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useSyncStore } from "@/lib/stores/syncStore";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { cloudSyncService } from "@/lib/services/cloudSyncService";
import { dbLogger } from "@/lib/logger";

/**
 * CloudOfflineIntegration
 *
 * This component should be placed high up in your component tree
 * (e.g., in app/layout.tsx or the main POSScreen wrapper).
 *
 * It handles:
 * 1. Initializing cloud sync service on login (premium users only)
 * 2. Cleaning up on logout
 * 3. Setting up online/offline listeners
 * 4. Triggering initial sync after login
 */
export function CloudOfflineIntegration() {
  const { isAuthenticated, organization } = useAuthStore();
  const { isOnline } = useSyncStore();

  // Initialize cloud sync service on login (premium users only)
  useEffect(() => {
    if (isAuthenticated && organization) {
      dbLogger.info(
        "Authenticated premium user detected, initializing cloud sync",
        {
          orgId: organization.id,
          online: isOnline,
        },
      );

      // Initialize the sync service
      cloudSyncService.initialize(organization.id);

      // Perform initial sync
      cloudSyncService.forceSync(organization.id).then((success) => {
        dbLogger.info("Initial sync completed", { success });
      });

      // Cleanup on unmount
      return () => {
        cloudSyncService.cleanup();
      };
    } else if (isAuthenticated) {
      dbLogger.info("Free user logged in - cloud sync not available", {
        orgId: organization?.id,
      });
    }
  }, [isAuthenticated, organization, isOnline]);

  // Monitor online status changes
  useEffect(() => {
    const handleOnline = () => {
      dbLogger.info("Network online detected");
      if (organization) {
        cloudSyncService.forceSync(organization.id);
      }
    };

    const handleOffline = () => {
      dbLogger.info("Network offline detected");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [organization]);

  return null; // This component is invisible, just handles side effects
}

export default CloudOfflineIntegration;
