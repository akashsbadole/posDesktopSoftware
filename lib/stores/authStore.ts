import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { verifyPin, getUsers, User } from '@/lib/db';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  sessionStart: string | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => boolean;
  resetSessionTimer: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      sessionStart: null,
      login: async (pin: string) => {
        const user = await verifyPin(pin);
        if (user) {
          set({ user, isAuthenticated: true, sessionStart: new Date().toISOString() });
          return true;
        }
        return false;
      },
      logout: () => {
        set({ user: null, isAuthenticated: false, sessionStart: null });
      },
      checkSession: () => {
        const { sessionStart, logout } = get();
        if (sessionStart) {
          const elapsed = Date.now() - new Date(sessionStart).getTime();
          if (elapsed > SESSION_TIMEOUT_MS) {
            logout();
            return false;
          }
        }
        return true;
      },
      resetSessionTimer: () => {
        const { isAuthenticated } = get();
        if (isAuthenticated) {
          set({ sessionStart: new Date().toISOString() });
        }
      },
    }),
    { 
      name: 'pos-auth',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        sessionStart: state.sessionStart,
      }),
    }
  )
);
