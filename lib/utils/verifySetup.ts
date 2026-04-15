// lib/utils/verifySetup.ts
// Run this in browser console to verify complete setup

export async function verifyCompleteSetup() {
  console.clear();
  console.log("🔍 Verifying Cloud & Offline Setup...\n");

  const results: Record<string, boolean> = {};
  const errors: string[] = [];

  try {
    // 1. Check if Zustand stores are accessible
    console.log("1️⃣ Checking Zustand Stores...");
    try {
      const { useSyncStore, useAuthStore, useSettingsStore } =
        await import("@/lib/stores");
      console.log("  ✓ useAuthStore imported");
      console.log("  ✓ useSyncStore imported");
      console.log("  ✓ useSettingsStore imported");
      results["Stores Imported"] = true;
    } catch (e) {
      errors.push(`Failed to import stores: ${e}`);
      results["Stores Imported"] = false;
    }

    // 2. Check if components exist
    console.log("\n2️⃣ Checking Components...");
    try {
      const { default: SyncControls } =
        await import("@/components/SyncControls");
      const { default: CloudOfflineIntegration } =
        await import("@/components/CloudOfflineIntegration");
      console.log("  ✓ SyncControls component loaded");
      console.log("  ✓ CloudOfflineIntegration component loaded");
      results["Components Loaded"] = true;
    } catch (e) {
      errors.push(`Failed to load components: ${e}`);
      results["Components Loaded"] = false;
    }

    // 3. Check sync service
    console.log("\n3️⃣ Checking Cloud Sync Service...");
    try {
      const { cloudSyncService } =
        await import("@/lib/services/cloudSyncService");
      const status = cloudSyncService.getSyncStatus();
      console.log("  ✓ Cloud sync service accessible");
      console.log("  ✓ Sync status:", status.status);
      console.log(
        "  ✓ Online status:",
        status.isOnline ? "✓ ONLINE" : "⚠️ OFFLINE",
      );
      results["Cloud Sync Service"] = true;
    } catch (e) {
      errors.push(`Failed to access cloud sync service: ${e}`);
      results["Cloud Sync Service"] = false;
    }

    // 4. Check authentication
    console.log("\n4️⃣ Checking Authentication...");
    try {
      const { useAuthStore } = await import("@/lib/stores");
      const auth = useAuthStore.getState();
      console.log("  ✓ Auth store accessible");
      console.log(
        "  ✓ Authenticated:",
        auth.isAuthenticated ? "✓ YES" : "⚠️ NO",
      );
      if (auth.organization) {
        console.log("  ✓ Organization:", auth.organization.name);
      } else {
        console.log("  ⚠️ No organization (need to login)");
      }
      results["Authentication"] = true;
    } catch (e) {
      errors.push(`Failed to check auth: ${e}`);
      results["Authentication"] = false;
    }

    // 5. Check network status
    console.log("\n5️⃣ Checking Network Status...");
    const isOnline = navigator.onLine;
    console.log("  ✓ Network:", isOnline ? "✓ ONLINE" : "⚠️ OFFLINE");
    console.log(
      "  ✓ User agent:",
      navigator.userAgent.substring(0, 50) + "...",
    );
    results["Network"] = true;

    // 6. Check database connection
    console.log("\n6️⃣ Checking Database Setup...");
    try {
      const neonUrl = process.env.NEXT_PUBLIC_NEON_URL;
      if (neonUrl) {
        console.log("  ✓ NEON_URL configured");
        const masked = neonUrl.substring(0, 50) + "...";
        console.log("  ✓ Connection:", masked);
        results["Database Config"] = true;
      } else {
        console.log("  ⚠️ NEON_URL not set in .env.local");
        errors.push("NEON_URL not configured");
        results["Database Config"] = false;
      }
    } catch (e) {
      errors.push(`Failed to check database config: ${e}`);
      results["Database Config"] = false;
    }

    // 7. Run sync tests
    console.log("\n7️⃣ Running Sync Tests...");
    try {
      const { runCloudOfflineTests } =
        await import("@/lib/tests/cloudOfflineTest");
      const testResults = await runCloudOfflineTests();
      console.log(
        `  ✓ Tests completed: ${testResults.passed}/${testResults.total} passed`,
      );
      results["Sync Tests"] =
        testResults.failed === 0 || (testResults.failed <= 2 && !isOnline); // Allow sync failures when offline
    } catch (e) {
      errors.push(`Failed to run tests: ${e}`);
      results["Sync Tests"] = false;
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 VERIFICATION SUMMARY");
    console.log("=".repeat(50));

    const passed = Object.values(results).filter((r) => r).length;
    const total = Object.keys(results).length;
    const percentage = Math.round((passed / total) * 100);

    Object.entries(results).forEach(([key, passed]) => {
      const icon = passed ? "✅" : "❌";
      console.log(`${icon} ${key}`);
    });

    console.log(`\n📈 Overall: ${passed}/${total} passed (${percentage}%)\n`);

    if (errors.length > 0) {
      console.log("⚠️ ERRORS FOUND:");
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    } else {
      console.log("🎉 All checks passed! Your setup is ready.");
    }

    // Next steps
    console.log("\n📋 NEXT STEPS:");
    if (!navigator.onLine) {
      console.log("1. Go online to test cloud sync");
    }
    if (passed === total) {
      console.log("✓ Setup is complete!");
      console.log("✓ Review SETUP_AND_TESTING_GUIDE.md for detailed testing");
      console.log("✓ Run tests with: await runCloudOfflineTests()");
      console.log("✓ Deploy using DEPLOYMENT_CHECKLIST.md");
    } else {
      console.log("⚠️ Fix issues above before deploying");
      console.log("✓ Check documentation for troubleshooting");
    }

    return { passed, total, percentage, errors, results };
  } catch (e) {
    console.error("❌ Verification failed:", e);
    return { passed: 0, total: 1, percentage: 0, errors: [`${e}`], results };
  }
}

// Export for easy access
export default verifyCompleteSetup;
