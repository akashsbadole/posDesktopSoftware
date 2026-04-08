import { create } from "zustand";
import {
  getUsers,
  dbClockIn,
  dbClockOut,
  dbGetTodayAttendance,
  dbIsClockedIn,
  dbUpsertUser,
  dbDeleteUser,
  dbGetSalaries,
  User,
  StaffAttendance,
  StaffSalary,
  dbSaveSalary,
  dbGetAttendanceByRange,
} from "@/lib/db";
import { uiLogger } from "@/lib/logger";

import { useSettingsStore } from "./settingsStore";

interface StaffState {
  users: User[];
  todayAttendance: StaffAttendance[];
  salaries: StaffSalary[];
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
  upsertUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  fetchSalaries: () => Promise<void>;
  saveSalary: (salary: StaffSalary) => Promise<void>;
  getAttendanceByRange: (
    startDate: string,
    endDate: string,
  ) => Promise<StaffAttendance[]>;
}

export const useStaffStore = create<StaffState>((set, get) => ({
  users: [],
  todayAttendance: [],
  salaries: [],
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
      uiLogger.error("Failed to fetch attendance", err);
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

  upsertUser: async (user: User) => {
    await dbUpsertUser(user);
    await get().fetchUsers();
  },

  deleteUser: async (id: string) => {
    await dbDeleteUser(id);
    await get().fetchUsers();
  },

  fetchSalaries: async () => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      const salaries = await dbGetSalaries(storeId);
      set({ salaries });
    } catch (err) {
      uiLogger.error("Failed to fetch salaries", err);
    }
  },

  saveSalary: async (salary: StaffSalary) => {
    await dbSaveSalary(salary);
    await get().fetchSalaries();
  },

  getAttendanceByRange: async (startDate: string, endDate: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    return await dbGetAttendanceByRange(storeId, startDate, endDate);
  },
}));
