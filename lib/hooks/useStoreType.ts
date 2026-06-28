import { useSettingsStore } from '@/lib/stores';
import { getStoreTypeConfig } from '@/lib/utils/storeTypeConfig';

export function useStoreType() {
    const { settings } = useSettingsStore();
    const storeType = settings.store_type || 'general';
    const config = getStoreTypeConfig(storeType);

    // Check if a menu should be visible
    const isMenuVisible = (menuKey: string): boolean => {
        const hiddenMenus = settings.hidden_menus?.split(',').filter(Boolean) || [];
        return !hiddenMenus.includes(menuKey);
    };

    // Get all visible menus
    const getVisibleMenus = (): string[] => {
        const allMenus = [
            'orders',
            'products',
            'tables',
            'reservations',
            'kds',
            'customers',
            'expenses',
            'ingredients',
            'suppliers',
            'purchase_orders',
            'wallet',
            'coupons',
            'inventory_alerts',
            'inventory',
            'refund_requests',
            'staff',
            'scheduling',
            'reconciliation',
            'reports',
            'gst',
            'logs',
            'stores',
            'support',
        ];
        return allMenus.filter(isMenuVisible);
    };

    return {
        storeType,
        config,
        isMenuVisible,
        getVisibleMenus,
    };
}
