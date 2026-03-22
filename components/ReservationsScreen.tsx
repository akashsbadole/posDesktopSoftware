"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, Calendar, Clock, Users, Phone } from "lucide-react";
import { getReservations, saveReservation, deleteReservation, dbGetTables, Reservation, Table } from "@/lib/db";
import { v4 as uuid } from "uuid";

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState<{
    table_id: string; customer_name: string; phone: string;
    date: string; time: string; party_size: number; notes: string;
  }>({
    table_id: "", customer_name: "", phone: "",
    date: new Date().toISOString().split("T")[0],
    time: "19:00", party_size: 2, notes: ""
  });

  const fetchData = async () => {
    try {
      const [resData, tableData] = await Promise.all([
        getReservations(selectedDate),
        dbGetTables(),
      ]);
      setReservations(resData);
      setTables(tableData);
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedDate]);

  const handleSave = async () => {
    if (!form.table_id || !form.customer_name || !form.date || !form.time) return;
    try {
      const reservation: Reservation = {
        id: uuid(),
        table_id: form.table_id,
        table_name: tables.find(t => t.id === form.table_id)?.name || "",
        customer_name: form.customer_name,
        phone: form.phone,
        date: form.date,
        time: form.time,
        party_size: form.party_size,
        status: "confirmed",
        notes: form.notes,
      };
      await saveReservation(reservation);
      setShowForm(false);
      setForm({
        table_id: "", customer_name: "", phone: "",
        date: new Date().toISOString().split("T")[0],
        time: "19:00", party_size: 2, notes: ""
      });
      await fetchData();
    } catch (err) {
      console.error("Failed to save reservation:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reservation?")) return;
    try {
      await deleteReservation(id);
      await fetchData();
    } catch (err) {
      console.error("Failed to delete reservation:", err);
    }
  };

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

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
          <Calendar size={24} style={{ color: "#F5C842" }} />
          Reservations
        </h1>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-ghost py-2 px-3" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowForm(true)} className="btn-accent py-2 px-4 flex items-center gap-2 text-sm">
            <Plus size={16} /> New Reservation
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={prevDay} className="btn-ghost py-2 px-3 text-sm">&larr; Prev</button>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: 160, textAlign: "center" }} />
        <button onClick={nextDay} className="btn-ghost py-2 px-3 text-sm">Next &rarr;</button>
      </div>

       {/* Create Reservation Modal */}
       {showForm && (
         <div 
           className="fixed inset-0 z-50 flex items-center justify-center" 
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
           <div className="card p-6 w-full max-w-md fade-in">
             <h2 className="font-semibold text-lg mb-4">New Reservation</h2>
             <div className="space-y-3">
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Table *</label>
                 <select value={form.table_id} onChange={(e) => setForm({ ...form, table_id: e.target.value })} style={{ padding: "10px" }}>
                   <option value="">Select table...</option>
                   {tables.map(t => <option key={t.id} value={t.id}>{t.name} (capacity: {t.capacity})</option>)}
                 </select>
               </div>
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Customer Name *</label>
                 <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Customer name" />
               </div>
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Phone</label>
                 <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1234567890" />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Date *</label>
                   <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                 </div>
                 <div>
                   <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Time *</label>
                   <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                 </div>
               </div>
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Party Size</label>
                 <input type="number" value={form.party_size} onChange={(e) => setForm({ ...form, party_size: parseInt(e.target.value) || 1 })} min={1} max={50} />
               </div>
               <div>
                 <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Notes</label>
                 <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Special requests" rows={2} />
               </div>
             </div>
             <div className="flex gap-2 mt-4">
               <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
               <button onClick={handleSave} className="btn-accent flex-1" disabled={!form.table_id || !form.customer_name}>Save</button>
             </div>
           </div>
         </div>
       )}

      {/* Reservations List */}
      {reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: "#4A4A5A" }}>
          <Calendar size={48} className="mb-4 opacity-50" />
          <p>No reservations for {selectedDate}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{r.customer_name}</div>
                  <div className="text-xs space-y-0.5 mt-1" style={{ color: "#9090A8" }}>
                    <div className="flex items-center gap-1"><Clock size={12} /> {r.time}</div>
                    <div className="flex items-center gap-1"><Users size={12} /> Party of {r.party_size} • Table {r.table_name}</div>
                    {r.phone && <div className="flex items-center gap-1"><Phone size={12} /> {r.phone}</div>}
                    {r.notes && <div className="italic mt-1">{r.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                    background: r.status === "confirmed" ? "rgba(46,204,113,0.15)" : r.status === "cancelled" ? "rgba(231,76,60,0.15)" : "rgba(52,152,219,0.15)",
                    color: r.status === "confirmed" ? "#2ECC71" : r.status === "cancelled" ? "#E74C3C" : "#3498DB",
                  }}>
                    {r.status}
                  </span>
                  <button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-red-500/10" style={{ color: "#E74C3C" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
