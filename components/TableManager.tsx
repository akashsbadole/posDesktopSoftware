"use client";
import { useEffect, useState } from "react";
import { Table } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { Plus, Trash2, Users, X, Check, GripVertical } from "lucide-react";
import { useTablesStore } from "@/lib/stores";

interface TableManagerProps {
  onClose: () => void;
}

export default function TableManager({ onClose }: TableManagerProps) {
  const { tables, isLoading, fetchTables, addTable, deleteTable, setTableStatus, updateTable } = useTablesStore();
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const handleSave = async () => {
    if (!editingTable) return;
    if (tables.find(t => t.id === editingTable.id)) {
      await updateTable(editingTable);
    } else {
      await addTable(editingTable);
    }
    setEditingTable(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this table?")) return;
    await deleteTable(id);
  };

  const handleStatusChange = async (id: string, status: Table['status']) => {
    await setTableStatus(id, status);
  };

  const addNewTable = () => {
    const newTable: Table = {
      id: uuid(),
      name: `Table ${tables.length + 1}`,
      capacity: 4,
      status: "available",
      position_x: tables.length % 3,
      position_y: Math.floor(tables.length / 3),
    };
    setEditingTable(newTable);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "occupied": return "bg-red-500";
      case "reserved": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "available": return "rgba(46,204,113,0.1)";
      case "occupied": return "rgba(231,76,60,0.1)";
      case "reserved": return "rgba(245,200,66,0.1)";
      default: return "rgba(144,144,168,0.1)";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available": return "#2ECC71";
      case "occupied": return "#E74C3C";
      case "reserved": return "#F5C842";
      default: return "#9090A8";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="card w-[700px] max-h-[80vh] overflow-hidden flex flex-col fade-in" role="dialog" aria-modal="true" aria-labelledby="table-manager-title">
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 id="table-manager-title" className="font-display text-lg font-bold flex items-center gap-2">
            <Users size={20} style={{ color: "#F5C842" }} /> Table Manager
          </h2>
          <button onClick={onClose} className="btn-ghost py-1 px-3"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32" style={{ color: "#4A4A5A" }}>Loading...</div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {tables.map((table) => (
                <div key={table.id} className="card p-3 text-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{table.name}</span>
                    <span className="w-2 h-2 rounded-full" style={{ background: getStatusText(table.status) }} />
                  </div>
                  <div className="text-xs mb-2" style={{ color: "#9090A8" }}>Capacity: {table.capacity}</div>
                  <div className="text-xs px-2 py-1 rounded mb-2" style={{ background: getStatusBg(table.status), color: getStatusText(table.status) }}>
                    {table.status}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingTable({ ...table })} className="btn-ghost text-xs py-1 px-2 flex-1">Edit</button>
                    <button onClick={() => handleDelete(table.id)} className="btn-ghost text-xs py-1 px-2" style={{ color: "#E74C3C" }}><Trash2 size={12} /></button>
                  </div>
                  {table.status === "available" && (
                    <button onClick={() => handleStatusChange(table.id, "occupied")} className="mt-2 w-full btn-ghost text-xs py-1" style={{ color: "#E74C3C" }}>Mark Occupied</button>
                  )}
                  {table.status === "occupied" && (
                    <button onClick={() => handleStatusChange(table.id, "available")} className="mt-2 w-full btn-ghost text-xs py-1" style={{ color: "#2ECC71" }}>Mark Available</button>
                  )}
                </div>
              ))}
              <button onClick={addNewTable} className="card p-3 border-dashed flex flex-col items-center justify-center" style={{ borderColor: "var(--border)" }}>
                <Plus size={24} style={{ color: "#4A4A5A" }} />
                <span className="text-xs mt-1" style={{ color: "#4A4A5A" }}>Add Table</span>
              </button>
            </div>
          )}
        </div>

        {editingTable && (
          <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold mb-3">{tables.find(t => t.id === editingTable.id) ? "Edit" : "Add"} Table</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Name</label>
                <input value={editingTable.name} onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Capacity</label>
                <input type="number" value={editingTable.capacity} onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) || 1 })} min={1} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Status</label>
                <select value={editingTable.status} onChange={(e) => setEditingTable({ ...editingTable, status: e.target.value as Table['status'] })}>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSave} className="btn-accent flex items-center gap-2 py-2 px-4 text-sm">
                <Check size={14} /> Save
              </button>
              <button onClick={() => setEditingTable(null)} className="btn-ghost py-2 px-4 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
