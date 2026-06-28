// Offline detection utility
// Determines if the app is running in offline mode (no Tauri, using localStorage)

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_ENCRYPTION_KEY
    ? process.env.NEXT_PUBLIC_ENCRYPTION_KEY
    : "pos-tauri-encryption-key-2026"; // FIXME: Set NEXT_PUBLIC_ENCRYPTION_KEY in production

function decryptData(raw: string): string {
  try {
    return CryptoJS.AES.decrypt(raw, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  } catch {
    return raw; // fallback to plain text if not encrypted
  }
}

export function isOfflineMode(): boolean {
  // In Tauri, we have access to the __TAURI__ object
  if (typeof window !== "undefined" && "__TAURI__" in window) {
    return false; // Tauri mode, not offline
  }

  // In browser without Tauri, we're in offline mode (localStorage-based)
  return true;
}

export function getAvailableOrganizations(): Array<{
  id: string;
  name: string;
  email: string;
}> {
  if (typeof window === "undefined") return [];

  try {
    const orgs = localStorage.getItem("pos_organizations");
    if (orgs) {
      const decrypted = decryptData(orgs);
      if (decrypted && decrypted.trim()) {
        return JSON.parse(decrypted);
      }
    }
  } catch (e) {
    console.error(
      "[offline.ts] Error reading organizations from localStorage:",
      e,
    );
  }

  return [];
}

export function getUsersForOrganization(organizationId: string): Array<{
  id: string;
  name: string;
  email: string;
  role: string;
  pin?: string;
}> {
  if (typeof window === "undefined") return [];

  try {
    const users = localStorage.getItem("pos_users");
    if (users) {
      const decrypted = decryptData(users);
      if (decrypted && decrypted.trim()) {
        const allUsers = JSON.parse(decrypted);
        return allUsers
          .filter((u: any) => u.organization_id === organizationId)
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            pin: u.pin,
          }));
      }
    }
  } catch (e) {
    console.error("[offline.ts] Error reading users from localStorage:", e);
  }

  return [];
}

export function findOrganizationByEmail(
  email: string,
): { id: string; name: string; email: string } | null {
  if (typeof window === "undefined") return null;

  try {
    const orgs = getAvailableOrganizations();
    const normalizedEmail = email.trim().toLowerCase();
    return (
      orgs.find((org) => org.email.toLowerCase() === normalizedEmail) || null
    );
  } catch (e) {
    console.error(
      "[offline.ts] Error finding organization by email:",
      e,
    );
    return null;
  }
}

export function getUserByEmail(
  email: string,
  organizationId: string,
): { id: string; name: string; email: string; role: string } | null {
  if (typeof window === "undefined") return null;

  try {
    const users = localStorage.getItem("pos_users");
    if (users) {
      const decrypted = decryptData(users);
      if (decrypted && decrypted.trim()) {
        const allUsers = JSON.parse(decrypted);
        const user = allUsers.find(
          (u: any) =>
            u.email.toLowerCase() === email.trim().toLowerCase() &&
            u.organization_id === organizationId,
        );
        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }
      }
    }
  } catch (e) {
    console.error("[offline.ts] Error finding user by email:", e);
  }

  return null;
}
