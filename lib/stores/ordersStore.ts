import { create } from 'zustand';
import { dbGetOrders, dbSaveOrder, dbRefundOrder, updateDeliveryStatus, dbGetDailySummary, dbGetWeeklyRevenue, dbGetTopProducts, dbGetLowStock, Order } from '@/lib/db';

interface DashboardData {
  revenue: number;
  transactions: number;
  avg_order: number;
  items_sold: number;
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

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const orders = await dbGetOrders();
      set({ orders, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  saveOrder: async (order: Order) => {
    try {
      await dbSaveOrder(order);
      await get().fetchOrders();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  refundOrder: async (id: string, userId?: string, userName?: string) => {
    try {
      await dbRefundOrder(id, userId, userName);
      await get().fetchOrders();
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  updateDeliveryStatus: async (id: string, status: Order['delivery_status']) => {
    try {
      await updateDeliveryStatus(id, status);
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
    try {
      await dbSaveOrder(order);
      set((state) => ({
        orders: state.orders.map((o) => o.id === order.id ? order : o)
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [dashboardData, weeklyRevenue, topProducts, lowStock] = await Promise.all([
        dbGetDailySummary(),
        dbGetWeeklyRevenue(),
        dbGetTopProducts(),
        dbGetLowStock()
      ]);
      set({ dashboardData, weeklyRevenue, topProducts, lowStock, isLoading: false });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
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
