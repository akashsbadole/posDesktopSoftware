"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, Truck, Phone, Mail, MapPin, Search } from "lucide-react";
import { getSuppliers, saveSupplier, deleteSupplier, Supplier } from "@/lib/db";
import { v4 as uuid } from "uuid";

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Supplier>({ id: "", name: "", phone: "", email: "", address: "" });

  const fetchSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      const supplier = { ...form, id: form.id || uuid() };
      await saveSupplier(supplier);
      setShowForm(false);
      setForm({ id: "", name: "", phone: "", email: "", address: "" });
      await fetchSuppliers();
    } catch (err) {
      console.error("Failed to save supplier:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await deleteSupplier(id);
      await fetchSuppliers();
    } catch (err) {
      console.error("Failed to delete supplier:", err);
    }
  };

  const handleEdit = (s: Supplier) => {
    setForm(s);
    setShowForm(true);
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: "#4A4A5A" }}>
        <RefreshCw size={24} className="spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Truck size={24} style={{ color: "#F5C842" }} />
          Suppliers
        </h1>
        <div className="flex gap-2">
          <button onClick={fetchSuppliers} className="btn-ghost py-2 px-3" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setForm({ id: "", name: "", phone: "", email: "", address: "" }); setShowForm(true); }} className="btn-accent py-2 px-4 flex items-center gap-2 text-sm">
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4A4A5A" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers..."
          className="pl-10"
        />
      </div>

       {/* Supplier Form Modal */}
       {showForm && (
         <div 
           className="fixed inset-0 z-50 flex items-center justify-center" 
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
           <div className="card p-6 w-full max-w-md fade-in">
             <h2 className="font-semibold text-lg mb-4">{form.id ? "Edit" : "Add"} Supplier</h2>
             <div className="space-y-3">
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Name *</label>
                 <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" />
               </div>
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Phone</label>
                 <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1234567890" />
               </div>
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Email</label>
                 <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" type="email" />
               </div>
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Address</label>
                 <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" rows={2} />
               </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleSave} className="btn-accent flex-1" disabled={!form.name.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: "#4A4A5A" }}>
          <Truck size={48} className="mb-4 opacity-50" />
          <p>{search ? "No suppliers match your search" : "No suppliers yet"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="card p-4 card-hover" onClick={() => handleEdit(s)} style={{ cursor: "pointer" }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{s.name}</h3>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="p-1 rounded hover:bg-red-500/10" style={{ color: "#E74C3C" }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="space-y-1 text-xs" style={{ color: "#9090A8" }}>
                {s.phone && <div className="flex items-center gap-1"><Phone size={12} /> {s.phone}</div>}
                {s.email && <div className="flex items-center gap-1"><Mail size={12} /> {s.email}</div>}
                {s.address && <div className="flex items-center gap-1"><MapPin size={12} /> {s.address}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
