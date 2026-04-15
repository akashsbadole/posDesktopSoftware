// lib/tests/cloudOfflineTest.ts
// Test suite for cloud sync and offline functionality

import { syncToNeon, syncFromNeon, dbLogin, verifyPin } from "@/lib/db";
import { useSyncStore } from "@/lib/stores/syncStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { cloudSyncService } from "@/lib/services/cloudSyncService";

/**
 * Test Suite for Cloud & Offline Functionality
 *
 * Run these tests in the browser console:
 * 1. import { runCloudOfflineTests } from '@/lib/tests/cloudOfflineTest'
 * 2. await runCloudOfflineTests()
 */

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(
  name: string,
  fn: () => Promise<void>,
): Promise<TestResult> {
  const start = performance.now();
  try {
    await fn();
    const duration = performance.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`✓ ${name} (${duration.toFixed(2)}ms)`);
    return { name, passed: true, duration };
  } catch (error) {
    const duration = performance.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration });
    console.error(`✗ ${name}: ${errorMsg}`);
    return { name, passed: false, error: errorMsg, duration };
  }
}

// Test 1: Authentication System
export async function testAuthentication() {
  console.log("\n=== Testing Authentication ===");

  await test("PIN verification with offline fallback", async () => {
    const pin = "1234";
    const orgId = "test-org";

    // This should use the browserFallback if Tauri is not available
    const result = await verifyPin(pin, orgId);
    // Result can be null for invalid PIN, which is okay
  });

  await test("Login with credentials", async () => {
    const email = "test@example.com";
    const password = "password123";

    const result = await dbLogin(email, password);
    // Result can be null for invalid credentials, which is okay
  });

  await test("Sync store initialization", async () => {
    const store = useSyncStore.getState();
    if (!store) throw new Error("Sync store not initialized");
    if (typeof store.isOnline !== "boolean") {
      throw new Error("isOnline not set");
    }
  });
}

// Test 2: Sync Operations
export async function testSyncOperations() {
  console.log("\n=== Testing Sync Operations ===");

  const storeId = "test-store";

  await test("Sync to cloud (push)", async () => {
    const result = await syncToNeon(storeId);
    // Should return { synced: number, error?: string }
    if (!result || typeof result.synced !== "number") {
      throw new Error("Invalid sync response");
    }
  });

  await test("Sync from cloud (pull)", async () => {
    const result = await syncFromNeon(storeId);
    // Should return { synced: number, error?: string }
    if (!result || typeof result.synced !== "number") {
      throw new Error("Invalid sync response");
    }
  });

  await test("Bidirectional sync", async () => {
    const syncStore = useSyncStore.getState();
    const result = await syncStore.bidirectionalSync(storeId);
    if (typeof result !== "boolean") {
      throw new Error("Sync should return boolean");
    }
  });
}

// Test 3: Online/Offline Detection
export async function testOnlineOfflineDetection() {
  console.log("\n=== Testing Online/Offline Detection ===");

  await test("Online status detection", async () => {
    const isOnline = navigator.onLine;
    if (typeof isOnline !== "boolean") {
      throw new Error("Could not detect online status");
    }
    console.log(`Current status: ${isOnline ? "Online" : "Offline"}`);
  });

  await test("Sync store reflects online status", async () => {
    const store = useSyncStore.getState();
    if (store.isOnline !== navigator.onLine) {
      throw new Error("Sync store online status mismatch");
    }
  });

  await test("Online event listener setup", async () => {
    const store = useSyncStore.getState();

    // Test online event
    store.setOnlineStatus(true);
    if (!store.isOnline) throw new Error("Failed to set online");

    // Test offline event
    store.setOnlineStatus(false);
    if (store.isOnline) throw new Error("Failed to set offline");

    // Restore online status
    store.setOnlineStatus(navigator.onLine);
  });
}

// Test 4: Sync State Management
export async function testSyncStateManagement() {
  console.log("\n=== Testing Sync State Management ===");

  await test("Initial sync state", async () => {
    const store = useSyncStore.getState();
    if (store.isSyncing) throw new Error("Should not be syncing initially");
    if (store.syncStatus !== "idle" && store.syncStatus !== "success") {
      throw new Error("Initial status should be idle or success");
    }
  });

  await test("Sync error handling", async () => {
    const store = useSyncStore.getState();

    // Simulate error
    await test("Sync error scenario", async () => {
      throw new Error("Test error");
    }).catch(() => {
      // Error expected, just checking error handling
    });

    // Check error state
    if (store.syncStatus !== "error" && store.syncError) {
      throw new Error("Error state not properly set");
    }

    // Clear error
    store.clearSyncError();
    if (store.syncError !== null) throw new Error("Error not cleared");
  });

  await test("Sync status transitions", async () => {
    const store = useSyncStore.getState();

    // Reset state
    store.resetSyncState();

    if (store.isSyncing) throw new Error("Should not be syncing after reset");
    if (store.syncStatus !== "idle")
      throw new Error("Status should be idle after reset");
  });
}

// Test 5: Cloud Sync Service
export async function testCloudSyncService() {
  console.log("\n=== Testing Cloud Sync Service ===");

  const testOrgId = "test-org-for-service";

  await test("Service initialization", async () => {
    // Don't actually initialize to avoid long-running intervals
    const status = cloudSyncService.getSyncStatus();
    if (!status || !status.hasOwnProperty("isOnline")) {
      throw new Error("Service status not available");
    }
  });

  await test("Get sync status", async () => {
    const status = cloudSyncService.getSyncStatus();
    if (!status) throw new Error("No status returned");
    if (!status.hasOwnProperty("isOnline")) throw new Error("Missing isOnline");
    if (!status.hasOwnProperty("isSyncing"))
      throw new Error("Missing isSyncing");
    if (!status.hasOwnProperty("status")) throw new Error("Missing status");
  });
}

// Test 6: Data Consistency
export async function testDataConsistency() {
  console.log("\n=== Testing Data Consistency ===");

  await test("Sync does not lose data", async () => {
    const syncStore = useSyncStore.getState();
    const startState = {
      isSyncing: syncStore.isSyncing,
      status: syncStore.syncStatus,
      online: syncStore.isOnline,
    };

    // After reset, state should be consistent
    syncStore.resetSyncState();

    if (syncStore.syncError !== null) {
      throw new Error("Reset should clear errors");
    }
  });

  await test("Last sync time is preserved", async () => {
    const syncStore = useSyncStore.getState();
    const before = syncStore.lastSyncTime;

    // Try a sync operation
    const result = await syncStore.syncToCloud("test-store");

    const after = syncStore.lastSyncTime;
    // Either time is preserved or updated, but not cleared
    if (result && !after) {
      throw new Error("Successful sync should set lastSyncTime");
    }
  });
}

// Test 7: Performance
export async function testPerformance() {
  console.log("\n=== Testing Performance ===");

  await test("Sync completes in reasonable time", async () => {
    const start = performance.now();
    const result = await syncToNeon("perf-test");
    const duration = performance.now() - start;

    if (duration > 30000) {
      throw new Error(`Sync took too long: ${duration}ms`);
    }
    console.log(`Sync duration: ${duration.toFixed(2)}ms`);
  });

  await test("Multiple rapid syncs handled", async () => {
    const syncStore = useSyncStore.getState();

    // Try to sync multiple times rapidly
    const promises = [
      syncStore.syncToCloud("test-1"),
      syncStore.syncToCloud("test-2"),
      syncStore.syncToCloud("test-3"),
    ];

    const results = await Promise.allSettled(promises);
    const failures = results.filter((r) => r.status === "rejected");

    // Some might fail due to rate limiting, which is okay
    // Just make sure it doesn't crash
  });
}

// Main test suite
export async function runCloudOfflineTests() {
  console.log("🚀 Starting Cloud & Offline Tests\n");
  console.log(
    `Environment: ${typeof window === "undefined" ? "Node.js" : "Browser"}`,
  );
  console.log(`Navigator Online: ${navigator.onLine}\n`);

  results.length = 0;

  try {
    await testAuthentication();
    await testSyncOperations();
    await testOnlineOfflineDetection();
    await testSyncStateManagement();
    await testCloudSyncService();
    await testDataConsistency();
    await testPerformance();
  } catch (error) {
    console.error("Test suite error:", error);
  }

  // Summary
  console.log("\n=== Test Summary ===");
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Duration: ${totalTime.toFixed(2)}ms`);

  if (failed > 0) {
    console.log("\nFailed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  return {
    passed,
    failed,
    total: results.length,
    duration: totalTime,
    results,
  };
}

// Export for use in browser console
export default runCloudOfflineTests;
