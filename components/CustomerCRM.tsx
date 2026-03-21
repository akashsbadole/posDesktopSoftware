"use client";
import { useState, useEffect } from "react";
import { dbGetCustomers, dbSaveCustomer, dbGetCustomerOrders, dbAddLoyaltyPoints, Customer, Order } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { X, Users, Star, History, Plus, Search, Phone, Mail } from "lucide-react";

interface CustomerCRMProps {
  onClose?: () => void;
}

export default function CustomerCRM({ onClose }: CustomerCRMProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: "",
    phone: "",
    email: "",
    loyalty_points: 0,
    total_spent: 0,
    visits: 0,
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await dbGetCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
    setLoading(false);
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const orders = await dbGetCustomerOrders(customer.phone);
      setCustomerOrders(orders);
    } catch (err) {
      console.error("Failed to load customer orders:", err);
    }
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    try {
      const customer: Customer = {
        id: uuid(),
        name: newCustomer.name!,
        phone: newCustomer.phone!,
        email: newCustomer.email || "",
        loyalty_points: 0,
        total_spent: 0,
        visits: 0,
        created_at: new Date().toISOString(),
      };
      await dbSaveCustomer(customer);
      await loadCustomers();
      setShowAddForm(false);
      setNewCustomer({ name: "", phone: "", email: "", loyalty_points: 0, total_spent: 0, visits: 0 });
    } catch (err) {
      console.error("Failed to save customer:", err);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="card p-6 w-[800px] max-h-[85vh] overflow-hidden fade-in flex flex-col" role="dialog" aria-modal="true" aria-labelledby="crm-title" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="crm-title" className="font-display text-lg" style={{ color: "#F5C842" }}>Customer Loyalty</h2>
          <button onClick={onClose} className="btn-ghost py-1 px-3" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Customer List */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4A4A5A" }} />
                <input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8"
                />
              </div>
              <button onClick={() => setShowAddForm(true)} className="btn-accent py-2 px-3 flex items-center gap-1">
                <Plus size={14} /> Add
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8" style={{ color: "#4A4A5A" }}>Loading...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8" style={{ color: "#4A4A5A" }}>No customers found</div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedCustomer?.id === customer.id ? "bg-[#1E1E26]" : "bg-[#141418] hover:bg-[#1A1A20]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{customer.name}</div>
                      <div className="flex items-center gap-1" style={{ color: "#F5C842" }}>
                        <Star size={12} fill="#F5C842" />
                        <span className="text-xs">{customer.loyalty_points}</span>
                      </div>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#4A4A5A" }}>
                      {customer.phone} • {customer.visits} visits • ₹{customer.total_spent.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Details */}
          <div className="w-1/2 border-l border-border pl-4 overflow-y-auto">
            {selectedCustomer ? (
              <>
                <div className="mb-4">
                  <h3 className="font-medium text-lg">{selectedCustomer.name}</h3>
                  <div className="flex gap-4 mt-2 text-sm" style={{ color: "#4A4A5A" }}>
                    <span className="flex items-center gap-1"><Phone size={12} /> {selectedCustomer.phone}</span>
                    {selectedCustomer.email && (
                      <span className="flex items-center gap-1"><Mail size={12} /> {selectedCustomer.email}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg text-center" style={{ background: "#1E1E26" }}>
                    <div className="text-xl font-bold" style={{ color: "#F5C842" }}>{selectedCustomer.loyalty_points}</div>
                    <div className="text-xs" style={{ color: "#4A4A5A" }}>Points</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: "#1E1E26" }}>
                    <div className="text-xl font-bold" style={{ color: "#2ECC71" }}>{selectedCustomer.visits}</div>
                    <div className="text-xs" style={{ color: "#4A4A5A" }}>Visits</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: "#1E1E26" }}>
                    <div className="text-xl font-bold">₹{selectedCustomer.total_spent.toFixed(0)}</div>
                    <div className="text-xs" style={{ color: "#4A4A5A" }}>Total Spent</div>
                  </div>
                </div>

                <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: "#9090A8" }}>
                  <History size={14} /> Order History
                </h4>
                {customerOrders.length === 0 ? (
                  <div className="text-center py-4" style={{ color: "#4A4A5A" }}>No orders yet</div>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.slice(0, 10).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-2 rounded text-sm" style={{ background: "#141418" }}>
                        <div>
                          <div className="text-xs" style={{ color: "#4A4A5A" }}>
                            {new Date(order.created_at).toLocaleDateString("en-IN")}
                          </div>
                          <div>{order.items.length} items</div>
                        </div>
                        <div className="font-medium" style={{ color: "#2ECC71" }}>₹{order.total.toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center" style={{ color: "#4A4A5A" }}>
                Select a customer to view details
              </div>
            )}
          </div>
        </div>

        {/* Add Customer Form */}
        {showAddForm && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
            <div className="card p-6 w-96 fade-in">
              <h3 className="font-medium mb-4">Add New Customer</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Name *</label>
                  <input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Phone *</label>
                  <input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Email</label>
                  <input
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full"
                    placeholder="Email (optional)"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSaveCustomer} className="btn-accent flex-1 py-2">Save</button>
                  <button onClick={() => setShowAddForm(false)} className="btn-ghost py-2 px-4">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
