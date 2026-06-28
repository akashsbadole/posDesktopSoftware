// Store type configurations that determine which features are visible/enabled
export type StoreType = 'food' | 'retail' | 'pharmacy' | 'general' | 'others';

export interface StoreTypeConfig {
    label: string;
    description: string;
    icon: string;
    defaultHiddenMenus: string[];
    defaultSettings: {
        auto_print_kot?: boolean;
        auto_print_receipt?: boolean;
        allow_negative_stock?: boolean;
        enable_round_off?: boolean;
    };
}

export const storeTypeConfigs: Record<StoreType, StoreTypeConfig> = {
    food: {
        label: 'Food & Restaurant',
        description: 'Restaurants, cafes, fast food, cloud kitchens',
        icon: '🍔',
        defaultHiddenMenus: ['pharmacy', 'purchase_orders'],
        defaultSettings: {
            auto_print_kot: true,
            auto_print_receipt: true,
            allow_negative_stock: false,
            enable_round_off: true,
        },
    },
    retail: {
        label: 'Retail Store',
        description: 'Clothing, electronics, general merchandise',
        icon: '🛍️',
        defaultHiddenMenus: ['kds', 'ingredients', 'suppliers', 'pharmacy'],
        defaultSettings: {
            auto_print_kot: false,
            auto_print_receipt: false,
            allow_negative_stock: false,
            enable_round_off: false,
        },
    },
    pharmacy: {
        label: 'Pharmacy',
        description: 'Medical stores, chemists',
        icon: '💊',
        defaultHiddenMenus: ['kds', 'ingredients', 'suppliers', 'tables', 'reservations'],
        defaultSettings: {
            auto_print_kot: false,
            auto_print_receipt: true,
            allow_negative_stock: false,
            enable_round_off: false,
        },
    },
    general: {
        label: 'General Store',
        description: 'All features enabled',
        icon: '🏪',
        defaultHiddenMenus: [],
        defaultSettings: {
            auto_print_kot: false,
            auto_print_receipt: false,
            allow_negative_stock: true,
            enable_round_off: true,
        },
    },
    others: {
        label: 'Others',
        description: 'Customizable store type',
        icon: '🛒',
        defaultHiddenMenus: [],
        defaultSettings: {
            auto_print_kot: false,
            auto_print_receipt: false,
            allow_negative_stock: false,
            enable_round_off: false,
        },
    },
};

export function getStoreTypeConfig(storeType: StoreType): StoreTypeConfig {
    return storeTypeConfigs[storeType] || storeTypeConfigs.general;
}

export function applyStoreTypeDefaults(storeType: StoreType) {
    const config = getStoreTypeConfig(storeType);
    return {
        store_type: storeType,
        hidden_menus: config.defaultHiddenMenus.join(','),
        ...config.defaultSettings,
    };
}
