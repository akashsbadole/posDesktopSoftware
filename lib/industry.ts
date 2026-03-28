// lib/industry.ts
import { Store } from "./db";

export interface IndustryLabels {
  tables: string;
  table: string;
  kitchen: string;
  takeaway: string;
  dine_in: string;
  staff: string;
  customers: string;
}

export const industryLabels: Record<Store["industry"], IndustryLabels> = {
  food: {
    tables: "Tables",
    table: "Table",
    kitchen: "Kitchen/KDS",
    takeaway: "Dine-in / Takeaway",
    dine_in: "Dine-in",
    staff: "Staff",
    customers: "Customers",
  },
  retail: {
    tables: "Counters",
    table: "Counter",
    kitchen: "Inventory",
    takeaway: "In-store / Pick-up",
    dine_in: "In-store",
    staff: "Employees",
    customers: "Clients",
  },
  pharmacy: {
    tables: "Counters",
    table: "Counter",
    kitchen: "Inventory",
    takeaway: "Over Counter / Delivery",
    dine_in: "Counter",
    staff: "Pharmacists",
    customers: "Patients",
  },
  gift_shop: {
    tables: "Sections",
    table: "Section",
    kitchen: "Inventory",
    takeaway: "In-store / Wrapping",
    dine_in: "In-store",
    staff: "Staff",
    customers: "Clients",
  },
  salon_spa: {
    tables: "Stations",
    table: "Station",
    kitchen: "Services",
    takeaway: "Service / Booking",
    dine_in: "Service",
    staff: "Stylists",
    customers: "Clients",
  },
  repair_shop: {
    tables: "Workbenches",
    table: "Workbench",
    kitchen: "Technician",
    takeaway: "In-store / Pick-up",
    dine_in: "Repair",
    staff: "Technicians",
    customers: "Clients",
  },
};

export function getIndustryLabels(industry: Store["industry"] | string): IndustryLabels {
  return industryLabels[industry as Store["industry"]] || industryLabels.food;
}
