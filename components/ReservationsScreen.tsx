"use client";
import { useState, useEffect } from "react";
import { getReservations, saveReservation, deleteReservation, dbGetTables, Reservation, Table } from "@/lib/db";
import { Plus, Trash2, Calendar, Clock, Users, Phone, Save, X, RefreshCw } from "lucide-react";
import { v4 as uuid } from "uuid";

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ table_id: "", customer_name: "", phone: "", time: "19:00", party_size: 2, notes: "" });

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, tbls] = await Promise.all([getReservations(selectedDate), dbGetTables()]);
      setReservations(res);
      setTables(tbls);
    } catch { }
    setLoading(false);
  };

  const handleSave = async () => {
    const res: Reservation = {
      id: uuid(),
      table_id: form.table_id,
      table_name: tables.find(t => t.id === form.table_id)?.name || "",
      customer_name: form.customer_name,
      phone: form.phone,
      date: selectedDate,
      time: form.time,
      party_size: form.party_size,
      status: "confirmed",
      notes: form.notes,
      created_at: new Date().toISOString(),
    };
    await saveReservation(res);
    setShowForm(false);
    setForm({ table_id: "", customer_name: "", phone: "", time: "19:00", party_size: 2, notes: "" });
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Cancel this reservation?")) return;
    await deleteReservation(id);
    await loadData();
  };

  const handleStatusChange = async (res: Reservation, status: string) => {
    const updated = { ...res, status };
    await saveReservation(updated);
    await loadData();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "confirmed": return { bg: "rgba(52,152,219,0.1)", color: "#3498DB" };
      case "seated": return { bg: "rgba(46,204,113,0.1)", color: "#2ECC71" };
      case "cancelled": return { bg: "rgba(231,76,60,0.1)", color: "#E74C3C" };
      default: return { bg: "#2A2A35", color: "#9090A8" };
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C842" }}>
              <Calendar size={20} color="#0D0D0F" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#fff" }}>Table Reservations</h1>
              <p className="text-sm" style={{ color: "#9090A8" }}>Manage upcoming reservations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm" style={{ background: "#1E1E26", border: "1px solid #2A2A35", color: "#fff" }} />
            <button onClick={loadData} className="p-2 rounded-lg hover:bg-[#2A2A35]" style={{ color: "#9090A8" }}>
              <RefreshCw size={16} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#F5C842", color: "#0D0D0F" }}>
            <Plus size={14} /> New Reservation
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl p-4 mb-4" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5C842" }}>New Reservation</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Customer Name"
                className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone"
                className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
              <select value={form.table_id} onChange={e => setForm({ ...form, table_id: e.target.value })}
                className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }}>
                <option value="">Select Table</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name} (cap: {t.capacity})</option>)}
              </select>
              <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
              <input type="number" value={form.party_size} onChange={e => setForm({ ...form, party_size: Number(e.target.value) })} placeholder="Party Size" min={1}
                className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)"
                className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={!form.customer_name || !form.table_id} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50" style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                <Save size={14} /> Save
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm flex items-center gap-1" style={{ background: "#2A2A35", color: "#9090A8" }}>
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12" style={{ color: "#4A4A5A" }}><RefreshCw size={24} className="spin mx-auto" /></div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-12" style={{ color: "#4A4A5A" }}><p>No reservations for {selectedDate}</p></div>
        ) : (
          <div className="space-y-3">
            {reservations.map(res => (
              <div key={res.id} className="rounded-xl p-4" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold" style={{ color: "#fff" }}>{res.customer_name}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={statusColor(res.status)}>{res.status}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm" style={{ color: "#F5C842" }}>
                    <Clock size={14} /> {res.time}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs mb-2" style={{ color: "#9090A8" }}>
                  <span className="flex items-center gap-1"><Users size={12} /> {res.party_size} guests</span>
                  <span>Table: {res.table_name}</span>
                  {res.phone && <span className="flex items-center gap-1"><Phone size={12} /> {res.phone}</span>}
                </div>
                {res.notes && <div className="text-xs mb-2" style={{ color: "#4A4A5A" }}>{res.notes}</div>}
                {res.status === "confirmed" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleStatusChange(res, "seated")} className="text-xs px-2 py-1 rounded" style={{ color: "#2ECC71", background: "rgba(46,204,113,0.1)" }}>Mark Seated</button>
                    <button onClick={() => handleStatusChange(res, "cancelled")} className="text-xs px-2 py-1 rounded" style={{ color: "#E74C3C", background: "rgba(231,76,60,0.1)" }}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
