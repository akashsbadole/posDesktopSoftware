// lib/stores/licenseStore.ts
// License/subscription state management
// Uses Rust backend (HMAC-SHA256) for key validation

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LicenseTier, hasAccess } from '@/lib/premium';
import { Screen } from '@/app/page';
import { dbValidateLicense, dbGenerateLicense } from '@/lib/db';

interface LicenseState {
  licenseKey: string;
  tier: LicenseTier;
  activatedAt: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  activateLicense: (key: string) => Promise<boolean>;
  deactivateLicense: () => void;
  checkAccess: (screen: Screen) => boolean;
  isExpired: () => boolean;
}

// Generate a demo license key via Rust backend
export async function generateDemoLicenseKey(tier: "pro" | "business"): Promise<string> {
  const now = new Date();
  return dbGenerateLicense(tier, now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      licenseKey: "",
      tier: "free",
      activatedAt: null,
      expiresAt: null,
      isLoading: false,
      error: null,

      activateLicense: async (key: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Use Rust backend for HMAC-SHA256 validation
          const result = await dbValidateLicense(key);
          
          if (!result.valid) {
            set({ isLoading: false, error: result.message || "Invalid license key." });
            return false;
          }

          set({
            licenseKey: key.trim().toUpperCase(),
            tier: result.tier as LicenseTier,
            activatedAt: new Date().toISOString(),
            expiresAt: result.expires_at,
            isLoading: false,
            error: null,
          });
          
          return true;
        } catch (err) {
          set({ isLoading: false, error: "Failed to validate license key. Please try again." });
          return false;
        }
      },

      deactivateLicense: () => {
        set({
          licenseKey: "",
          tier: "free",
          activatedAt: null,
          expiresAt: null,
          error: null,
        });
      },

      checkAccess: (screen: Screen) => {
        const { tier } = get();
        return hasAccess(tier, screen);
      },

      isExpired: () => {
        const { expiresAt } = get();
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
      },
    }),
    {
      name: 'pos-license',
    }
  )
);
