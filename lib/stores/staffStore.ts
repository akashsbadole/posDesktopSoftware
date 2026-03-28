import { create } from 'zustand';
import { getUsers, dbClockIn, dbClockOut, dbGetTodayAttendance, dbIsClockedIn, User, StaffAttendance } from '@/lib/db';
import { useSettingsStore } from './settingsStore';

interface StaffState {
  users: User[];
  todayAttendance: StaffAttendance[];
  isLoading: boolean;
  error: string | null;
  currentUserClockedIn: boolean;
  fetchUsers: () => Promise<void>;
  fetchTodayAttendance: () => Promise<void>;
  clockIn: (userId: string, userName: string) => Promise<void>;
  clockOut: (userId: string) => Promise<void>;
  checkClockedIn: (userId: string) => Promise<void>;
  getUserById: (id: string) => User | undefined;
  getClockedInUsers: () => StaffAttendance[];
}

export const useStaffStore = create<StaffState>((set, get) => ({
  users: [],
  todayAttendance: [],
  isLoading: false,
  error: null,
  currentUserClockedIn: false,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await getUsers();
      set({ users, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchTodayAttendance: async () => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      const todayAttendance = await dbGetTodayAttendance(storeId);
      set({ todayAttendance });
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    }
  },

  clockIn: async (userId: string, userName: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    await dbClockIn(userId, userName, storeId);
    set({ currentUserClockedIn: true });
    await get().fetchTodayAttendance();
  },

  clockOut: async (userId: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    await dbClockOut(userId, storeId);
    set({ currentUserClockedIn: false });
    await get().fetchTodayAttendance();
  },

  checkClockedIn: async (userId: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    const isClockedIn = await dbIsClockedIn(userId, storeId);
    set({ currentUserClockedIn: isClockedIn });
  },

  getUserById: (id: string) => get().users.find((u) => u.id === id),

  getClockedInUsers: () => get().todayAttendance.filter((a) => !a.clock_out),
}));
