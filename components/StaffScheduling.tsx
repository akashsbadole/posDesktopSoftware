"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Calendar, Clock, User, Save, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getShifts, saveShift, deleteShift, getUsers as getStaff } from "@/lib/db";
import { v4 as uuid } from "uuid";

interface Shift {
  id: string;
  staff_id: string;
  staff_name: string;
  date: string;
  start_time: string;
  end_time: string;
  role: string;
  notes: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

export default function StaffScheduling() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    staff_id: "",
    start_time: "09:00",
    end_time: "17:00",
    role: "cashier",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    const [shiftsData, staffData] = await Promise.all([
      getShifts(selectedDate),
      getStaff(),
    ]);
    setShifts(shiftsData);
    setStaff(staffData.filter((s: Staff) => s.role !== "admin"));
  };

  const handleSave = async () => {
    const shift: Shift = {
      id: editingShift?.id || uuid(),
      staff_id: formData.staff_id,
      staff_name: staff.find((s) => s.id === formData.staff_id)?.name || "",
      date: selectedDate,
      start_time: formData.start_time,
      end_time: formData.end_time,
      role: formData.role,
      notes: formData.notes,
    };
    await saveShift(shift);
    setShowForm(false);
    setEditingShift(null);
    setFormData({ staff_id: "", start_time: "09:00", end_time: "17:00", role: "cashier", notes: "" });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this shift?")) {
      await deleteShift(id);
      loadData();
    }
  };

  const openEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      staff_id: shift.staff_id,
      start_time: shift.start_time,
      end_time: shift.end_time,
      role: shift.role,
      notes: shift.notes,
    });
    setShowForm(true);
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" /> Staff Scheduling
        </h1>
        <button onClick={() => setShowForm(true)} className="btn-accent flex items-center gap-2">
          <Plus size={18} /> Add Shift
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => changeDate(-1)} className="btn-ghost p-2"><ChevronLeft size={20} /></button>
        <div className="text-lg font-medium">{new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
        <button onClick={() => changeDate(1)} className="btn-ghost p-2"><ChevronRight size={20} /></button>
        <button onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])} className="btn-ghost text-sm">Today</button>
      </div>

      {shifts.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No shifts scheduled for this day</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => (
            <div key={shift.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">
                  {shift.staff_name[0]}
                </div>
                <div>
                  <div className="font-medium">{shift.staff_name}</div>
                  <div className="text-sm text-gray-400 flex items-center gap-2">
                    <Clock size={14} /> {shift.start_time} - {shift.end_time}
                  </div>
                  {shift.notes && <div className="text-xs text-gray-500">{shift.notes}</div>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(shift)} className="btn-ghost p-2">Edit</button>
                <button onClick={() => handleDelete(shift.id)} className="btn-ghost p-2 text-red-400"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

       {showForm && (
         <div 
           className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
           onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
         >
           <div className="card p-6 w-96">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-bold">{editingShift ? "Edit Shift" : "Add Shift"}</h2>
               <button onClick={() => { setShowForm(false); setEditingShift(null); }} className="btn-ghost p-1"><X size={20} /></button>
             </div>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Staff Member</label>
                 <select value={formData.staff_id} onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })} className="w-full">
                   <option value="">Select Staff</option>
                   {staff.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                   <input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="w-full" />
                 </div>
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">End Time</label>
                   <input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} className="w-full" />
                 </div>
               </div>
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Role</label>
                 <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full">
                   <option value="cashier">Cashier</option>
                   <option value="waiter">Waiter</option>
                   <option value="kitchen">Kitchen</option>
                   <option value="manager">Manager</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Notes</label>
                 <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full" rows={2} />
               </div>
               <button onClick={handleSave} className="btn-accent w-full flex items-center justify-center gap-2">
                 <Save size={18} /> Save Shift
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
