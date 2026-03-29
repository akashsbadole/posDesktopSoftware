"use client";
import { useState, useEffect } from "react";
import {
  dbGetCustomers, dbSaveCustomer, dbDeleteCustomer, dbGetCustomerOrders,
  dbGetCustomerAddresses, dbSaveCustomerAddress, dbDeleteCustomerAddress,
  exportCustomersCsv, importCustomersCsv, dbGetCustomerStatistics,
  Customer, Order, CustomerAddress, CustomerStatistics
} from "@/lib/db";
import { useSettingsStore } from "@/lib/stores";
import { v4 as uuid } from "uuid";
import {
  X, Users, Star, History, Plus, Search, Phone, Mail, Edit2, Trash2,
  MapPin, Download, Upload, BarChart2, Wallet, Calendar, Tag, CreditCard,
  ChevronRight, Save, User as UserIcon
} from "lucide-react";

interface CustomerCRMProps {
  onClose?: () => void;
  isOpen?: boolean;
}

type TabType = "profile" | "addresses" | "history" | "stats" | "wallet";

export default function CustomerCRM({ onClose, isOpen = true }: CustomerCRMProps) {
  const { settings, activeStoreId } = useSettingsStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [stats, setStats] = useState<CustomerStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showModal, setShowModal] = useState(isOpen);
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: "", phone: "", email: "", group_name: "retail",
    notes: "", birthday: "", anniversary: "", credit_limit: 0,
    price_tier: "standard", loyalty_tier: "bronze"
  });

  const [newAddress, setNewAddress] = useState<Partial<CustomerAddress>>({
    label: "Home", address: "", city: "", state: "", zip: "", phone: ""
  });

  const curr = settings?.currency_symbol ?? "₹";

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setShowModal(false);
    onClose?.();
  };

  useEffect(() => {
    loadCustomers();
  }, [activeStoreId]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await dbGetCustomers(activeStoreId);
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
    setLoading(false);
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoading(true);
    try {
      const [orders, addrs, statistics] = await Promise.all([
        dbGetCustomerOrders(customer.phone, activeStoreId),
        dbGetCustomerAddresses(customer.id),
        dbGetCustomerStatistics(customer.id)
      ]);
      setCustomerOrders(orders);
      setAddresses(addrs);
      setStats(statistics);
    } catch (err) {
      console.error("Failed to load customer details:", err);
    }
    setLoading(false);
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    try {
      const customer: Customer = {
        id: newCustomer.id || uuid(),
        store_id: activeStoreId,
        name: newCustomer.name!,
        phone: newCustomer.phone!,
        email: newCustomer.email || "",
        loyalty_points: newCustomer.loyalty_points || 0,
        total_spent: newCustomer.total_spent || 0,
        visits: newCustomer.visits || 0,
        group_name: newCustomer.group_name,
        notes: newCustomer.notes,
        birthday: newCustomer.birthday,
        anniversary: newCustomer.anniversary,
        credit_limit: newCustomer.credit_limit,
        price_tier: newCustomer.price_tier,
        loyalty_tier: newCustomer.loyalty_tier,
        created_at: newCustomer.created_at || new Date().toISOString(),
      };
      await dbSaveCustomer(customer, activeStoreId);
      await loadCustomers();
      setShowAddForm(false);
      setNewCustomer({
        name: "", phone: "", email: "", group_name: "retail",
        notes: "", birthday: "", anniversary: "", credit_limit: 0,
        price_tier: "standard", loyalty_tier: "bronze"
      });
      if (selectedCustomer?.id === customer.id) setSelectedCustomer(customer);
    } catch (err) {
      console.error("Failed to save customer:", err);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer? This action cannot be undone.")) return;
    try {
      await dbDeleteCustomer(id, activeStoreId);
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (err) {
      console.error("Failed to delete customer:", err);
    }
  };

  const handleSaveAddress = async () => {
    if (!selectedCustomer || !newAddress.address) return;
    try {
      const addr: CustomerAddress = {
        id: newAddress.id || uuid(),
        customer_id: selectedCustomer.id,
        label: newAddress.label || "Home",
        address: newAddress.address!,
        city: newAddress.city || "",
        state: newAddress.state || "",
        zip: newAddress.zip || "",
        phone: newAddress.phone || selectedCustomer.phone,
      };
      await dbSaveCustomerAddress(addr);
      const updated = await dbGetCustomerAddresses(selectedCustomer.id);
      setAddresses(updated);
      setShowAddressForm(false);
      setNewAddress({ label: "Home", address: "", city: "", state: "", zip: "", phone: "" });
    } catch (err) {
      console.error("Failed to save address:", err);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await dbDeleteCustomerAddress(id);
      setAddresses(addresses.filter(a => a.id !== id));
    } catch (err) {
      console.error("Failed to delete address:", err);
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportCustomersCsv(activeStoreId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      alert("Export failed");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      try {
        const res = await importCustomersCsv(csv, activeStoreId);
        alert(`Imported ${res.imported} customers. Errors: ${res.errors}`);
        await loadCustomers();
      } catch (err) {
        alert("Import failed");
      }
    };
    reader.readAsText(file);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!showModal) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center" 
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="card p-6 w-[1000px] h-[85vh] overflow-hidden fade-in flex flex-col" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="text-[#F5C842]" />
            <h2 className="font-display text-lg" style={{ color: "#F5C842" }}>Customer Relationship Management</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-ghost py-2 px-3 flex items-center gap-1.5 text-xs">
              <Download size={14} /> Export
            </button>
            <label className="btn-ghost py-2 px-3 flex items-center gap-1.5 text-xs cursor-pointer">
              <Upload size={14} /> Import
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={handleClose} className="btn-ghost py-1 px-3 ml-2"><X size={16} /></button>
          </div>
        </div>

        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Customer List */}
          <div className="w-[350px] flex flex-col overflow-hidden border-r border-border pr-4">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  placeholder="Search name, phone, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9"
                />
              </div>
              <button onClick={() => {
                setNewCustomer({
                  name: "", phone: "", email: "", group_name: "retail",
                  notes: "", birthday: "", anniversary: "", credit_limit: 0,
                  price_tier: "standard", loyalty_tier: "bronze"
                });
                setShowAddForm(true);
              }} className="btn-accent p-2.5">
                <Plus size={18} />
              </button>
            </div>

            {loading && customers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 italic">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 italic">No customers found</div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      selectedCustomer?.id === customer.id
                      ? "bg-[#1E1E26] border-[#F5C842]/30 shadow-lg"
                      : "bg-[#141418] border-transparent hover:bg-[#1A1A20]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-sm truncate">{customer.name}</div>
                      <div className="flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400">
                        {customer.loyalty_tier || 'bronze'}
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center justify-between">
                       <span>{customer.phone}</span>
                       <span className="font-mono">{curr}{customer.total_spent.toFixed(0)} spent</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Detail View */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedCustomer ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#1E1E26] border border-border flex items-center justify-center text-2xl font-bold text-[#F5C842]">
                      {selectedCustomer.name[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-display flex items-center gap-2">
                        {selectedCustomer.name}
                        <button onClick={() => {
                          setNewCustomer(selectedCustomer);
                          setShowAddForm(true);
                        }} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                          <Edit2 size={14} />
                        </button>
                      </h3>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Phone size={12} /> {selectedCustomer.phone}</span>
                        <span className="flex items-center gap-1"><Mail size={12} /> {selectedCustomer.email || "No email"}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 uppercase font-bold text-[9px]">{selectedCustomer.group_name || 'retail'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex gap-1 mb-6 bg-[#141418] p-1 rounded-xl w-fit">
                  {[
                    { id: "profile", icon: UserIcon, label: "Profile" },
                    { id: "addresses", icon: MapPin, label: "Addresses" },
                    { id: "history", icon: History, label: "History" },
                    { id: "stats", icon: BarChart2, label: "Stats" },
                    { id: "wallet", icon: Wallet, label: "Wallet" },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        activeTab === tab.id ? "bg-[#1E1E26] text-[#F5C842] shadow-sm" : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                  {activeTab === "profile" && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                         <div className="card bg-[#141418] p-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                              <Star size={14} className="text-yellow-400" /> Loyalty Program
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <div className="text-[10px] text-gray-600 uppercase font-bold">Current Points</div>
                                  <div className="text-lg font-bold text-yellow-400">{selectedCustomer.loyalty_points}</div>
                               </div>
                               <div>
                                  <div className="text-[10px] text-gray-600 uppercase font-bold">Tier</div>
                                  <div className="text-lg font-bold capitalize">{selectedCustomer.loyalty_tier || 'bronze'}</div>
                               </div>
                            </div>
                         </div>
                         <div className="card bg-[#141418] p-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                              <CreditCard size={14} className="text-green-400" /> Finance & Pricing
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <div className="text-[10px] text-gray-600 uppercase font-bold">Credit Limit</div>
                                  <div className="text-lg font-bold">{curr}{selectedCustomer.credit_limit || 0}</div>
                               </div>
                               <div>
                                  <div className="text-[10px] text-gray-600 uppercase font-bold">Price Tier</div>
                                  <div className="text-lg font-bold capitalize">{selectedCustomer.price_tier || 'standard'}</div>
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-4">
                         <div className="card bg-[#141418] p-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                              <Calendar size={14} className="text-blue-400" /> Special Dates
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <div className="text-[10px] text-gray-600 uppercase font-bold">Birthday</div>
                                  <div className="text-sm font-bold">{selectedCustomer.birthday || "Not set"}</div>
                               </div>
                               <div>
                                  <div className="text-[10px] text-gray-600 uppercase font-bold">Anniversary</div>
                                  <div className="text-sm font-bold">{selectedCustomer.anniversary || "Not set"}</div>
                               </div>
                            </div>
                         </div>
                         <div className="card bg-[#141418] p-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                               Notes
                            </h4>
                            <p className="text-sm text-gray-400 leading-relaxed italic">
                               {selectedCustomer.notes || "No special instructions or preferences recorded for this customer."}
                            </p>
                         </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "addresses" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm">Saved Addresses ({addresses.length})</h4>
                        <button onClick={() => {
                          setNewAddress({ label: "Home", address: "", city: "", state: "", zip: "", phone: selectedCustomer.phone });
                          setShowAddressForm(true);
                        }} className="btn-accent py-1.5 px-3 text-xs flex items-center gap-1.5">
                          <Plus size={14} /> Add New Address
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {addresses.map(addr => (
                          <div key={addr.id} className="card bg-[#141418] p-4 group relative">
                            <div className="flex items-center justify-between mb-2">
                               <div className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#1E1E26] text-[#F5C842]">{addr.label}</div>
                               <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setNewAddress(addr); setShowAddressForm(true); }} className="p-1 hover:text-yellow-400"><Edit2 size={12}/></button>
                                  <button onClick={() => handleDeleteAddress(addr.id)} className="p-1 hover:text-red-500"><Trash2 size={12}/></button>
                               </div>
                            </div>
                            <div className="text-sm font-medium mb-1">{addr.address}</div>
                            <div className="text-xs text-gray-500">{addr.city}, {addr.state} {addr.zip}</div>
                            <div className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Phone size={10}/> {addr.phone}</div>
                          </div>
                        ))}
                        {addresses.length === 0 && (
                          <div className="col-span-2 py-12 text-center text-gray-500 bg-[#141418] rounded-2xl italic">
                             No saved addresses. Add an address for deliveries.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "history" && (
                    <div className="space-y-3">
                       {customerOrders.length === 0 ? (
                         <div className="py-20 text-center text-gray-500">
                            <History size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No order history found for this customer.</p>
                         </div>
                       ) : (
                         customerOrders.map(order => (
                          <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#141418] hover:bg-[#1A1A20] transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-[#1E1E26] flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <History size={16} className="text-gray-500" />
                               </div>
                               <div>
                                  <div className="text-sm font-bold flex items-center gap-2">
                                     Order #{order.id.slice(-6).toUpperCase()}
                                     <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                       order.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                                     }`}>{order.status}</span>
                                  </div>
                                  <div className="text-[11px] text-gray-600">{new Date(order.created_at).toLocaleString()} • {order.items.length} items</div>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-sm font-bold">{curr}{order.total.toFixed(2)}</div>
                               <div className="text-[10px] text-gray-600">{order.payment_method.toUpperCase()}</div>
                            </div>
                          </div>
                         ))
                       )}
                    </div>
                  )}

                  {activeTab === "stats" && stats && (
                    <div className="grid grid-cols-3 gap-6">
                       <div className="card bg-[#141418] p-6 text-center">
                          <div className="text-gray-500 text-xs uppercase font-bold mb-1">Total Lifetime Spend</div>
                          <div className="text-2xl font-bold font-display text-green-400">{curr}{stats.total_spent.toFixed(2)}</div>
                       </div>
                       <div className="card bg-[#141418] p-6 text-center">
                          <div className="text-gray-500 text-xs uppercase font-bold mb-1">Total Visits</div>
                          <div className="text-2xl font-bold font-display text-blue-400">{stats.visits}</div>
                       </div>
                       <div className="card bg-[#141418] p-6 text-center">
                          <div className="text-gray-500 text-xs uppercase font-bold mb-1">Avg. Order Value</div>
                          <div className="text-2xl font-bold font-display text-[#F5C842]">{curr}{stats.avg_order_value.toFixed(2)}</div>
                       </div>
                       <div className="col-span-3 card bg-[#141418] p-6">
                          <h4 className="font-bold text-sm mb-4">Engagement Status</h4>
                          <div className="h-2 bg-[#1E1E26] rounded-full overflow-hidden">
                             <div className="h-full bg-[#F5C842]" style={{ width: `${Math.min(100, stats.visits * 10)}%` }}></div>
                          </div>
                          <div className="flex justify-between mt-2 text-[10px] text-gray-600 font-bold uppercase">
                             <span>New Customer</span>
                             <span>Regular</span>
                             <span>VIP Champion</span>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === "wallet" && (
                    <div className="space-y-6">
                       <div className="card p-8 bg-gradient-to-br from-[#1E1E26] to-[#141418] border-[#F5C842]/20 flex flex-col items-center text-center">
                          <Wallet size={48} className="text-[#F5C842] mb-4 opacity-50" />
                          <div className="text-gray-400 text-sm mb-1 uppercase font-bold tracking-widest">Available Balance</div>
                          <div className="text-5xl font-bold font-display text-white mb-6">
                            {curr}{(selectedCustomer.total_spent * 0.05).toFixed(2)}
                            <span className="text-xs text-gray-500 ml-2">estimated</span>
                          </div>
                          <p className="text-xs text-gray-500 max-w-sm">
                             This customer has earned points and credits based on their purchase history. Wallet balances can be managed from the dedicated Wallet screen.
                          </p>
                       </div>
                       <div className="card bg-[#141418] p-4">
                          <h4 className="text-xs font-bold uppercase text-gray-600 mb-4">Debt & Outstanding</h4>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500"><CreditCard size={18}/></div>
                                <div>
                                   <div className="text-sm font-bold">Unpaid Invoices</div>
                                   <div className="text-xs text-gray-600">Total amount owed on credit sales</div>
                                </div>
                             </div>
                             <div className="text-lg font-bold text-red-500">{curr}0.00</div>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <div className="w-24 h-24 rounded-3xl bg-[#141418] flex items-center justify-center mb-4">
                   <Users size={40} className="opacity-20" />
                </div>
                <p className="text-base font-medium">Select a customer to view their profile</p>
                <p className="text-sm opacity-50 mt-1">Manage loyalty, addresses, and history here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Customer Form */}
        {showAddForm && (
          <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/80 backdrop-blur-sm p-4">
            <div className="card p-6 w-[600px] max-h-[90vh] overflow-y-auto fade-in shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-display">{newCustomer.id ? "Edit Customer" : "Add New Customer"}</h3>
                <button onClick={() => setShowAddForm(false)} className="btn-ghost p-1.5"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Full Name *</label>
                  <input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    autoFocus
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Phone Number *</label>
                  <input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Email Address</label>
                  <input
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Customer Group</label>
                  <select
                    value={newCustomer.group_name || 'retail'}
                    onChange={(e) => setNewCustomer({ ...newCustomer, group_name: e.target.value })}
                    className="w-full"
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="vip">VIP</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Loyalty Tier</label>
                  <select
                    value={newCustomer.loyalty_tier || 'bronze'}
                    onChange={(e) => setNewCustomer({ ...newCustomer, loyalty_tier: e.target.value })}
                    className="w-full"
                  >
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Price Tier</label>
                  <select
                    value={newCustomer.price_tier || 'standard'}
                    onChange={(e) => setNewCustomer({ ...newCustomer, price_tier: e.target.value })}
                    className="w-full"
                  >
                    <option value="standard">Standard</option>
                    <option value="discount">Discount (10% Off)</option>
                    <option value="premium">Premium (+10%)</option>
                    <option value="wholesale">Wholesale Pricing</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Credit Limit ({curr})</label>
                  <input
                    type="number"
                    value={newCustomer.credit_limit || 0}
                    onChange={(e) => setNewCustomer({ ...newCustomer, credit_limit: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Birthday</label>
                  <input
                    type="date"
                    value={newCustomer.birthday || ""}
                    onChange={(e) => setNewCustomer({ ...newCustomer, birthday: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Anniversary</label>
                  <input
                    type="date"
                    value={newCustomer.anniversary || ""}
                    onChange={(e) => setNewCustomer({ ...newCustomer, anniversary: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Private Notes</label>
                  <textarea
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                    placeholder="Preferences, allergy info, special handling..."
                    className="h-20"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={handleSaveCustomer} className="btn-accent flex-1 py-3 flex items-center justify-center gap-2">
                  <Save size={18} /> {newCustomer.id ? "Update Profile" : "Create Customer"}
                </button>
                <button onClick={() => setShowAddForm(false)} className="btn-ghost px-6 font-bold">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Address Form */}
        {showAddressForm && (
          <div className="fixed inset-0 flex items-center justify-center z-[70] bg-black/80 backdrop-blur-sm p-4">
            <div className="card p-6 w-[450px] shadow-2xl fade-in">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <MapPin size={20} className="text-[#F5C842]" />
                {newAddress.id ? "Edit Address" : "Add New Address"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Label</label>
                  <input
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    placeholder="e.g. Home, Office, Summer House"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Street Address *</label>
                  <input
                    value={newAddress.address}
                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                    placeholder="123 POS Lane"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">City</label>
                      <input
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      />
                   </div>
                   <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Zip / Postcode</label>
                      <input
                        value={newAddress.zip}
                        onChange={(e) => setNewAddress({ ...newAddress, zip: e.target.value })}
                      />
                   </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Phone for Delivery</label>
                  <input
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button onClick={handleSaveAddress} className="btn-accent flex-1 py-3 font-bold">Save Address</button>
                  <button onClick={() => setShowAddressForm(false)} className="btn-ghost px-6 font-bold">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
