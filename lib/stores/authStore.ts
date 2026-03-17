import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { verifyPin, getUsers, User } from '@/lib/db';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  sessionStart: string | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
    }),
    { name: 'pos-auth' }
  )
);
