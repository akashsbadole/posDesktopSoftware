import { create } from 'zustand';
import { dbGetOrders, dbSaveOrder, dbRefundOrder, updateDeliveryStatus, dbGetDailySummary, dbGetWeeklyRevenue, dbGetTopProducts, dbGetLowStock, Order } from '@/lib/db';
import { useSettingsStore } from './settingsStore';
import { uiLogger } from '@/lib/logger';

interface DashboardData {
  revenue: number;
  transactions: number;
  avg_order: number;
  items_sold: number;
}

interface PaymentMethodStat {
  method: string;
  count: number;
  amount: number;
}

interface OrdersState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  selectedOrderId: string | null;
  filterStatus: Order['status'] | 'all';
  filterOrderType: Order['order_type'] | 'all';
  dateFrom: string | null;
  dateTo: string | null;
  dashboardData: DashboardData;
  weeklyRevenue: { label: string; revenue: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  lowStock: { name: string; stock: number }[];
  paymentMethodStats: PaymentMethodStat[];
  fetchOrders: () => Promise<void>;
  saveOrder: (order: Order) => Promise<void>;
  refundOrder: (id: string, userId?: string, userName?: string) => Promise<void>;
  updateDeliveryStatus: (id: string, status: Order['delivery_status']) => Promise<void>;
  updateOrder: (order: Order) => Promise<void>;
  fetchDashboardData: () => Promise<void>;
  setSelectedOrderId: (id: string | null) => void;
  setFilterStatus: (status: Order['status'] | 'all') => void;
  setFilterOrderType: (type: Order['order_type'] | 'all') => void;
  setDateRange: (from: string | null, to: string | null) => void;
  getFilteredOrders: () => Order[];
  getOrderById: (id: string) => Order | undefined;
  getTodayOrders: () => Order[];
  getTodayRevenue: () => number;
}

const getTodayStart = () => new Date().toISOString().split('T')[0];

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,
  selectedOrderId: null,
  filterStatus: 'all',
  filterOrderType: 'all',
  dateFrom: null,
  dateTo: null,
  dashboardData: { revenue: 0, transactions: 0, avg_order: 0, items_sold: 0 },
  weeklyRevenue: [],
  topProducts: [],
  lowStock: [],
  paymentMethodStats: [],

  fetchOrders: async (force = false) => {
    const { orders, isLoading } = get();
    if (!force && orders.length > 0 && !isLoading) return;

    const storeId = useSettingsStore.getState().activeStoreId;
    set({ isLoading: true, error: null });
    try {
      const orders = await dbGetOrders(storeId);
      set({ orders, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  saveOrder: async (order: Order) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      await dbSaveOrder(order, storeId);
      await get().fetchOrders();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  refundOrder: async (id: string, userId?: string, userName?: string) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      await dbRefundOrder(id, storeId, userId || "system", userName || "System");
      await get().fetchOrders();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  updateDeliveryStatus: async (id: string, status: Order['delivery_status']) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      await updateDeliveryStatus(id, status, storeId);
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, delivery_status: status } : o
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  updateOrder: async (order: Order) => {
    const storeId = useSettingsStore.getState().activeStoreId;
    try {
      await dbSaveOrder(order, storeId);
      set((state) => ({
        orders: state.orders.map((o) => o.id === order.id ? order : o)
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  fetchDashboardData: async (force = false) => {
    const { dashboardData, isLoading } = get();
    if (!force && dashboardData.revenue > 0 && !isLoading) return;

    const storeId = useSettingsStore.getState().activeStoreId;
    set({ isLoading: true, error: null });
    try {
      const [dashboardData, weeklyRevenue, topProducts, lowStock] =
        await Promise.all([
          dbGetDailySummary(storeId),
          dbGetWeeklyRevenue(storeId),
          dbGetTopProducts(storeId),
          dbGetLowStock(storeId),
        ]);
      // Compute payment method stats from today's orders
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = get().orders.filter(o => o.created_at.startsWith(today) && o.status === 'completed');
      const paymentStats: PaymentMethodStat[] = [];
      const methodMap: {[key: string]: {count: number, amount: number}} = {};
      todayOrders.forEach(order => {
        const method = order.payment_method;
        if (!methodMap[method]) methodMap[method] = {count: 0, amount: 0};
        methodMap[method].count++;
        methodMap[method].amount += order.total;
      });
      Object.keys(methodMap).forEach(method => {
        paymentStats.push({
          method: method.charAt(0).toUpperCase() + method.slice(1),
          count: methodMap[method].count,
          amount: methodMap[method].amount,
        });
      });

      set({
        dashboardData,
        weeklyRevenue,
        topProducts,
        lowStock,
        paymentMethodStats: paymentStats,
        isLoading: false,
      });
    } catch (err) {
      uiLogger.error("Dashboard fetch error", err);
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  setSelectedOrderId: (selectedOrderId) => set({ selectedOrderId }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setFilterOrderType: (filterOrderType) => set({ filterOrderType }),
  setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),

  getFilteredOrders: () => {
    const { orders, filterStatus, filterOrderType, dateFrom, dateTo } = get();
    let filtered = orders;
    if (filterStatus !== 'all') {
      filtered = filtered.filter((o) => o.status === filterStatus);
    }
    if (filterOrderType !== 'all') {
      filtered = filtered.filter((o) => o.order_type === filterOrderType);
    }
    if (dateFrom) {
      filtered = filtered.filter((o) => o.created_at >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((o) => o.created_at <= dateTo + 'T23:59:59');
    }
    return filtered;
  },

  getOrderById: (id: string) => get().orders.find((o) => o.id === id),

  getTodayOrders: () => {
    const today = getTodayStart();
    return get().orders.filter(
      (o) => o.created_at.startsWith(today) && o.status === 'completed'
    );
  },

  getTodayRevenue: () => {
    return get().getTodayOrders().reduce((sum, o) => sum + o.total, 0);
  },
}));
