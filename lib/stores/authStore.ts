import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  verifyPin,
  getUsers,
  User,
  Organization,
  dbLogin,
  dbRegister,
  dbForgotPassword,
  dbResetPassword,
  dbForgotUser,
  loginWithPinOffline,
  setOrganizationId,
  verifyPinOffline,
  getOrganizationById,
} from "@/lib/db";
import { findOrganizationByEmail, getUserByEmail } from "@/lib/utils/offline";
import { authRateLimiter } from "@/lib/rateLimiter";
import { authLogger } from "@/lib/logger";
import { isOfflineMode } from "@/lib/utils/offline";
import { useSettingsStore } from "./settingsStore";

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  sessionStart: string | null;
  login: (pin: string) => Promise<boolean>;
  loginWithCredentials: (email: string, pass: string) => Promise<boolean>;
  loginWithPinOnly: (
    email: string,
    pin: string,
  ) => Promise<boolean>;
  loginWithPinOffline: (
    pin: string,
    organizationId: string,
  ) => Promise<boolean>;
  register: (orgName: string, email: string, pass: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<string | boolean>;
  resetPassword: (
    email: string,
    code: string,
    pass: string,
  ) => Promise<boolean>;
  forgotUser: (email: string) => Promise<string | boolean>;
  logout: () => void;
  lock: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      isAuthenticated: false,
      sessionStart: null,
      login: async (pin: string) => {
        const orgId = get().organization?.id;
        if (!orgId) {
          authLogger.warn("Login attempted without organization context");
          return false;
        }

        // Check rate limiting
        const rateLimitKey = `pin_${orgId}`;
        const rateLimitResult = authRateLimiter.recordAttempt(
          rateLimitKey,
          false,
        );

        if (!rateLimitResult.allowed) {
          authLogger.warn("PIN login blocked due to rate limiting", {
            orgId,
            blockedUntil: rateLimitResult.blockedUntil,
            remainingTime: authRateLimiter.getRemainingTime(rateLimitKey),
          });
          return false;
        }

        try {
          console.log(
            "[authStore.login] Calling verifyPin with pin:",
            pin,
            "orgId:",
            orgId,
          );
          const user = await verifyPin(pin, orgId);
          console.log(
            "[authStore.login] verifyPin returned:",
            user ? "user found" : "null",
          );
          if (user) {
            // Successful login - reset rate limiter
            authRateLimiter.recordAttempt(rateLimitKey, true);

            // Set active store from user
            if (user.store_id) {
              useSettingsStore.getState().setActiveStore(user.store_id);
            }

            set({
              user,
              isAuthenticated: true,
              sessionStart: new Date().toISOString(),
            });

            authLogger.info("User logged in successfully", {
              userId: user.id,
              role: user.role,
              orgId,
            });

            return true;
          } else {
            authLogger.warn("Invalid PIN attempt", {
              orgId,
              remainingAttempts: rateLimitResult.remainingAttempts,
            });
            return false;
          }
        } catch (error) {
          authLogger.error("PIN verification failed", error);
          return false;
        }
      },
      loginWithCredentials: async (email: string, pass: string) => {
        console.log(
          "[authStore.loginWithCredentials] Calling dbLogin with email:",
          email,
        );
        const res = await dbLogin(email, pass);
        console.log(
          "[authStore.loginWithCredentials] dbLogin returned:",
          res ? "data" : "null",
        );
        if (res) {
          setOrganizationId(res.organization.id);
          if (res.user.store_id) {
            useSettingsStore.getState().setActiveStore(res.user.store_id);
          }
          set({
            user: res.user,
            organization: res.organization,
            isAuthenticated: false, // Wait for PIN
          });
          return true;
        }
        return false;
      },
      loginWithPinOnly: async (email: string, pin: string) => {
        console.log("[authStore.loginWithPinOnly] Attempting PIN-only login with email:", email);

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPin = pin.trim();

        if (!trimmedEmail || !trimmedPin) {
          authLogger.warn("PIN-only login: missing email or PIN");
          return false;
        }

        if (!isOfflineMode()) {
          try {
            const org = await findOrganizationByEmail(trimmedEmail);
            if (!org) {
              authLogger.warn("PIN-only login: organization not found for email", { email: trimmedEmail });
              return false;
            }

            const rateLimitKey = `pin_${org.id}`;
            const rateLimitResult = authRateLimiter.recordAttempt(rateLimitKey, false);

            if (!rateLimitResult.allowed) {
              authLogger.warn("PIN login blocked due to rate limiting", {
                organizationId: org.id,
                blockedUntil: rateLimitResult.blockedUntil,
              });
              return false;
            }

            try {
              const res = await verifyPin(trimmedPin, org.id);
              if (res) {
                authRateLimiter.recordAttempt(rateLimitKey, true);

                const fullOrg = await getOrganizationById(org.id);
                if (!fullOrg) {
                  authLogger.warn("PIN-only login: organization not found by ID", { orgId: org.id });
                  return false;
                }

                setOrganizationId(fullOrg.id);
                if (res.store_id) {
                  useSettingsStore.getState().setActiveStore(res.store_id);
                }

                set({
                  user: res,
                  organization: fullOrg,
                  isAuthenticated: true,
                  sessionStart: new Date().toISOString(),
                });

                authLogger.info("User logged in via PIN-only (cloud)", {
                  userId: res.id,
                  role: res.role,
                  orgId: fullOrg.id,
                });

                return true;
              } else {
                authLogger.warn("Invalid PIN attempt", {
                  orgId: org.id,
                  remainingAttempts: rateLimitResult.remainingAttempts,
                });
                return false;
              }
            } catch (error) {
              authLogger.error("PIN verification failed", error);
              return false;
            }
          } catch (error) {
            authLogger.error("PIN-only login failed", error);
            return false;
          }
        } else {
          try {
            const org = findOrganizationByEmail(trimmedEmail);
            if (!org) {
              authLogger.warn("PIN-only login: organization not found for email", { email: trimmedEmail });
              return false;
            }

            const rateLimitKey = `pin_offline_${org.id}`;
            const rateLimitResult = authRateLimiter.recordAttempt(rateLimitKey, false);

            if (!rateLimitResult.allowed) {
              authLogger.warn("PIN login blocked due to rate limiting", {
                organizationId: org.id,
                blockedUntil: rateLimitResult.blockedUntil,
              });
              return false;
            }

            const res = await verifyPinOffline(trimmedPin, org.id);
            if (res) {
              authRateLimiter.recordAttempt(rateLimitKey, true);

              if (res.user.store_id) {
                useSettingsStore.getState().setActiveStore(res.user.store_id);
              }

              set({
                user: res.user,
                organization: res.organization,
                isAuthenticated: true,
                sessionStart: new Date().toISOString(),
              });

              authLogger.info("User logged in via PIN-only (offline)", {
                userId: res.user.id,
                role: res.user.role,
                organizationId: org.id,
              });

              return true;
            } else {
              authLogger.warn("Invalid PIN attempt", {
                organizationId: org.id,
                remainingAttempts: rateLimitResult.remainingAttempts,
              });
              return false;
            }
          } catch (error) {
            authLogger.error("PIN-only login failed (offline)", error);
            return false;
          }
        }
      },
      loginWithPinOffline: async (pin: string, organizationId: string) => {
        console.log(
          "[authStore.loginWithPinOffline] Attempting offline PIN login with orgId:",
          organizationId,
        );

        // Only available in offline mode
        if (!isOfflineMode()) {
          authLogger.warn("PIN-only login only available in offline mode");
          return false;
        }

        // Check rate limiting
        const rateLimitKey = `pin_offline_${organizationId}`;
        const rateLimitResult = authRateLimiter.recordAttempt(
          rateLimitKey,
          false,
        );

        if (!rateLimitResult.allowed) {
          authLogger.warn("PIN login blocked due to rate limiting", {
            organizationId,
            blockedUntil: rateLimitResult.blockedUntil,
            remainingTime: authRateLimiter.getRemainingTime(rateLimitKey),
          });
          return false;
        }

        try {
          const res = await loginWithPinOffline(pin, organizationId);
          if (res) {
            // Successful login - reset rate limiter
            authRateLimiter.recordAttempt(rateLimitKey, true);

            // Set active store from user
            if (res.user.store_id) {
              useSettingsStore.getState().setActiveStore(res.user.store_id);
            }

            set({
              user: res.user,
              organization: res.organization,
              isAuthenticated: true,
              sessionStart: new Date().toISOString(),
            });

            authLogger.info("User logged in via offline PIN", {
              userId: res.user.id,
              role: res.user.role,
              organizationId,
            });

            return true;
          } else {
            authLogger.warn("Invalid PIN attempt", {
              organizationId,
              remainingAttempts: rateLimitResult.remainingAttempts,
            });
            return false;
          }
        } catch (error) {
          authLogger.error("Offline PIN login failed", error);
          return false;
        }
      },
      register: async (orgName: string, email: string, pass: string) => {
        const res = await dbRegister(orgName, email, pass);
        if (res) {
          setOrganizationId(res.organization.id);
          if (res.user.store_id) {
            useSettingsStore.getState().setActiveStore(res.user.store_id);
          }
          set({
            user: res.user,
            organization: res.organization,
            isAuthenticated: false, // Wait for PIN
          });
          return true;
        }
        return false;
      },
      forgotPassword: async (email: string) => {
        return dbForgotPassword(email);
      },
      resetPassword: async (email: string, code: string, pass: string) => {
        return dbResetPassword(email, code, pass);
      },
      forgotUser: async (email: string) => {
        return dbForgotUser(email);
      },
      logout: () => {
        setOrganizationId(null);
        set({
          user: null,
          organization: null,
          isAuthenticated: false,
          sessionStart: null,
        });
      },
      lock: () => {
        set({
          user: null,
          isAuthenticated: false,
          sessionStart: null,
        });
        // Keep organization so PIN screen shows
      },
    }),
    { name: "pos-auth-v2" },
  ),
);
