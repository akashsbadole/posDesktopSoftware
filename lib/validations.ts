// lib/validations.ts
// Comprehensive input validation schemas using Zod

import { z } from "zod";

// Basic string validations
export const nonEmptyString = z.string().min(1, "This field is required");
export const emailString = z.string().email("Invalid email format");
export const phoneString = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format");

// Numeric validations
export const positiveNumber = z.number().positive("Must be a positive number");
export const nonNegativeNumber = z.number().min(0, "Cannot be negative");

// Common field patterns
export const nameString = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters")
  .regex(/^[a-zA-Z\s\-'\.]+$/, "Name contains invalid characters");

export const descriptionString = z
  .string()
  .max(1000, "Description cannot exceed 1000 characters")
  .optional();

// Product validation schemas
export const productSchema = z.object({
  id: z.string().optional(),
  name: nameString,
  price: positiveNumber,
  cost_price: nonNegativeNumber,
  wholesale_price: nonNegativeNumber,
  category: nonEmptyString,
  subcategory: z.string().optional(),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  description: descriptionString,
  tax: z.number().min(0).max(100, "Tax rate must be between 0-100%"),
  status: z.enum(["active", "inactive", "discontinued"]),
  tags: z.string().optional(),
  is_digital: z.boolean(),
  is_favorite: z.boolean(),
  base_unit: z.string().optional(),
  conversion_factor: z.number().positive().optional(),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  product_id: z.string(),
  name: nonEmptyString,
  value: nonEmptyString,
  sku: z.string().optional(),
  price: positiveNumber,
  stock: z.number().int().min(0),
});

// Order validation schemas
export const orderItemSchema = z.object({
  product_id: z.string(),
  product_name: nameString,
  price: positiveNumber,
  quantity: positiveNumber,
  discount: nonNegativeNumber,
  discount_type: z.enum(["percentage", "fixed"]).optional(),
  tax: nonNegativeNumber,
});

export const orderSchema = z.object({
  id: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  subtotal: positiveNumber,
  tax_amount: nonNegativeNumber,
  discount_amount: nonNegativeNumber,
  total: positiveNumber,
  payment_method: z.enum(["cash", "card", "upi", "wallet"]),
  amount_paid: nonNegativeNumber,
  change_amount: nonNegativeNumber,
  customer_name: z.string().optional(),
  status: z.enum(["pending", "completed", "cancelled", "refunded"]),
  order_type: z.enum(["dine_in", "takeaway", "delivery"]),
  delivery_status: z
    .enum(["pending", "preparing", "ready", "delivered", "cancelled"])
    .optional(),
  delivery_address: z.string().optional(),
  delivery_phone: z.string().optional(),
  notes: z.string().optional(),
});

// Customer validation schemas
export const customerSchema = z.object({
  id: z.string().optional(),
  name: nameString,
  phone: phoneString,
  email: emailString.optional().or(z.literal("")),
  loyalty_points: z.number().int().min(0),
  total_spent: nonNegativeNumber,
  visits: z.number().int().min(0),
  group_name: z.string().optional(),
  notes: descriptionString,
  birthday: z.string().optional(),
  anniversary: z.string().optional(),
  credit_limit: positiveNumber.optional(),
  price_tier: z.string().optional(),
  loyalty_tier: z.string().optional(),
  tax_id: z.string().optional(),
});

export const customerAddressSchema = z.object({
  id: z.string().optional(),
  customer_id: z.string(),
  label: nonEmptyString,
  address: nonEmptyString,
  city: nonEmptyString,
  state: nonEmptyString,
  zip: z.string().regex(/^\d{5,6}$/, "Invalid ZIP/postal code"),
  phone: phoneString.optional(),
});

// User/Staff validation schemas
export const userSchema = z.object({
  id: z.string().optional(),
  name: nameString,
  pin: z
    .string()
    .min(4, "PIN must be at least 4 digits")
    .max(8, "PIN cannot exceed 8 digits")
    .regex(/^\d+$/, "PIN must contain only numbers"),
  role: z.enum(["admin", "cashier", "manager"]),
});

export const staffAttendanceSchema = z.object({
  user_id: z.string(),
  user_name: nameString,
  clock_in: z.string(),
  clock_out: z.string().optional(),
  date: z.string(),
});

export const staffSalarySchema = z.object({
  id: z.string().optional(),
  staff_id: z.string(),
  staff_name: nameString,
  amount: positiveNumber,
  total_hours: positiveNumber,
  period_start: z.string(),
  period_end: z.string(),
  status: z.enum(["pending", "paid", "cancelled"]),
});

// Settings validation schemas
export const storeSchema = z.object({
  id: z.string().optional(),
  name: nameString,
  industry: z.enum([
    "food",
    "retail",
    "pharmacy",
    "gift_shop",
    "salon_spa",
    "repair_shop",
  ]),
  is_active: z.boolean(),
});

export const settingsSchema = z.object({
  store_name: nameString,
  currency: z.string().length(3, "Currency code must be 3 characters"),
  currency_symbol: nonEmptyString,
  country: nonEmptyString,
  timezone: nonEmptyString,
  tax_rate: z.number().min(0).max(100),
  tax_name: nonEmptyString,
  tax_system: z.enum(["inclusive", "exclusive"]),
  address: nonEmptyString,
  phone: phoneString,
  neon_url: z.string().url().optional().or(z.literal("")),
  business_name: nameString,
  tax_id: z.string().optional(),
  receipt_save_path: z.string().optional(),
  twilio_sid: z.string().optional(),
  twilio_token: z.string().optional(),
  twilio_phone: z.string().optional(),
  lan_sync_enabled: z.boolean(),
  lan_server_port: z.number().int().min(1024).max(65535),
  dark_mode: z.boolean(),
  language: z.string(),
  show_logo_on_receipt: z.boolean(),
  receipt_header_text: z.string().optional(),
  merchant_id: z.string().optional(),
  show_tax_breakdown: z.boolean(),
  enable_round_off: z.boolean(),
  auto_reminders_enabled: z.boolean(),
  auto_reminder_days: z.number().int().min(1).max(365),
  license_agreed: z.boolean(),
  onboarding_completed: z.boolean(),
  license_key: z.string().optional(),
});

// Authentication validation schemas
export const loginSchema = z.object({
  email: emailString,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    organization_name: nameString,
    email: emailString,
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

export const pinSchema = z.object({
  pin: z
    .string()
    .length(4, "PIN must be exactly 4 digits")
    .regex(/^\d{4}$/, "PIN must be 4 digits"),
});

// Coupon validation schemas
export const couponSchema = z.object({
  id: z.string().optional(),
  code: z
    .string()
    .min(3, "Coupon code must be at least 3 characters")
    .max(20, "Coupon code cannot exceed 20 characters")
    .regex(
      /^[A-Z0-9\-_]+$/,
      "Coupon code can only contain uppercase letters, numbers, hyphens, and underscores",
    ),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: positiveNumber,
  min_order_amount: nonNegativeNumber,
  max_uses: z.number().int().positive(),
  valid_from: z.string(),
  valid_until: z.string(),
  active: z.boolean(),
});

// Expense validation schemas
export const expenseSchema = z.object({
  id: z.string().optional(),
  category: nonEmptyString,
  amount: positiveNumber,
  description: descriptionString,
  date: z.string(),
  payment_method: z.enum(["cash", "card", "bank_transfer", "upi"]),
});

export const expenseCategorySchema = z.object({
  id: z.string().optional(),
  name: nameString,
  icon: z.string().min(1, "Icon is required"),
});

// Reservation validation schemas
export const reservationSchema = z.object({
  id: z.string().optional(),
  table_id: z.string(),
  table_name: nameString,
  customer_name: nameString,
  phone: phoneString,
  date: z.string(),
  time: z.string(),
  party_size: z.number().int().min(1).max(20),
  status: z.enum(["confirmed", "cancelled", "completed", "no_show"]),
  notes: descriptionString,
});

// Supplier validation schemas
export const supplierSchema = z.object({
  id: z.string().optional(),
  name: nameString,
  phone: phoneString,
  email: emailString.optional().or(z.literal("")),
  address: nonEmptyString,
});

export const purchaseOrderSchema = z.object({
  id: z.string().optional(),
  supplier_id: z.string(),
  supplier_name: nameString,
  status: z.enum(["draft", "sent", "received", "cancelled"]),
  total: positiveNumber,
  notes: descriptionString,
});

// Type exports for use in components
export type ProductFormData = z.infer<typeof productSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type SettingsFormData = z.infer<typeof settingsSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CouponFormData = z.infer<typeof couponSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type ReservationFormData = z.infer<typeof reservationSchema>;
export type SupplierFormData = z.infer<typeof supplierSchema>;
export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

// Validation helper functions
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.issues.forEach((err) => {
    const path = err.path.join(".");
    errors[path] = err.message;
  });
  return errors;
}
