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
        if (!orgId) return false;
        const user = await verifyPin(pin, orgId);
        if (user) {
          set({
            user,
            isAuthenticated: true,
            sessionStart: new Date().toISOString(),
          });
          return true;
        }
        return false;
      },
      loginWithCredentials: async (email: string, pass: string) => {
        const res = await dbLogin(email, pass);
        if (res) {
          setOrganizationId(res.organization.id);
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
