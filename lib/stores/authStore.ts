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
  setOrganizationId,
} from "@/lib/db";
import { authRateLimiter } from "@/lib/rateLimiter";
import { authLogger } from "@/lib/logger";
import { useSettingsStore } from "./settingsStore";

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  sessionStart: string | null;
  login: (pin: string) => Promise<boolean>;
  loginWithCredentials: (email: string, pass: string) => Promise<boolean>;
  register: (orgName: string, email: string, pass: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (email: string, code: string, pass: string) => Promise<boolean>;
  forgotUser: (email: string) => Promise<boolean>;
  logout: () => void;
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
        const rateLimitResult = authRateLimiter.recordAttempt(rateLimitKey, false);

        if (!rateLimitResult.allowed) {
          authLogger.warn("PIN login blocked due to rate limiting", {
            orgId,
            blockedUntil: rateLimitResult.blockedUntil,
            remainingTime: authRateLimiter.getRemainingTime(rateLimitKey)
          });
          return false;
        }

        try {
          const user = await verifyPin(pin, orgId);
          if (user) {
            // Successful login - reset rate limiter
            authRateLimiter.recordAttempt(rateLimitKey, true);

            set({
              user,
              isAuthenticated: true,
              sessionStart: new Date().toISOString(),
            });

            authLogger.info("User logged in successfully", {
              userId: user.id,
              role: user.role,
              orgId
            });

            return true;
          } else {
            authLogger.warn("Invalid PIN attempt", {
              orgId,
              remainingAttempts: rateLimitResult.remainingAttempts
            });
            return false;
          }
        } catch (error) {
          authLogger.error("PIN verification failed", error);
          return false;
        }
      },
      loginWithCredentials: async (email: string, pass: string) => {
        const res = await dbLogin(email, pass);
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
    }),
    { name: "pos-auth-v2" }
  )
);
