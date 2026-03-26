"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, DollarSign, Calendar, Filter, Download, TrendingDown, Settings } from "lucide-react";
import { getExpenses, getExpensesByRange, saveExpense, deleteExpense, getExpenseCategories, saveExpenseCategory } from "@/lib/db";
import { v4 as uuid } from "uuid";

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  payment_method: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
}

const defaultCategories = [
  { id: "1", name: "Rent", icon: "🏠" },
  { id: "2", name: "Utilities", icon: "💡" },
  { id: "3", name: "Supplies", icon: "📦" },
  { id: "4", name: "Wages", icon: "💰" },
  { id: "5", name: "Maintenance", icon: "🔧" },
  { id: "6", name: "Marketing", icon: "📢" },
  { id: "7", name: "Transport", icon: "🚚" },
  { id: "8", name: "Miscellaneous", icon: "📝" },
];

export default function ExpenseScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories] = useState<ExpenseCategory[]>(defaultCategories);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: "Miscellaneous",
    amount: 0,
    description: "",
    payment_method: "cash",
  });
  const [viewMode, setViewMode] = useState<"day" | "range">("day");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", icon: "📝" });

  useEffect(() => {
    loadExpenses();
  }, [selectedDate, viewMode, dateRange]);

  const loadExpenses = async () => {
    let data: Expense[];
    if (viewMode === "day") {
      data = await getExpenses(selectedDate);
    } else {
      data = await getExpensesByRange(dateRange.start, dateRange.end);
    }
    setExpenses(data);
    setTotalExpenses(data.reduce((sum, e) => sum + e.amount, 0));
  };

  const handleSave = async () => {
    const expense: Expense = {
      id: uuid(),
      category: formData.category,
      amount: formData.amount,
      description: formData.description,
      date: viewMode === "day" ? selectedDate : new Date().toISOString().split("T")[0],
      payment_method: formData.payment_method,
    };
    await saveExpense(expense);
    setShowForm(false);
    setFormData({ category: "Miscellaneous", amount: 0, description: "", payment_method: "cash" });
    loadExpenses();
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) return;
    await saveExpenseCategory({ id: uuid(), name: catForm.name.trim(), icon: catForm.icon });
    setShowCatForm(false);
    setCatForm({ name: "", icon: "📝" });
    loadExpenses();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this expense?")) {
      await deleteExpense(id);
      loadExpenses();
    }
  };

  const exportCSV = () => {
    const headers = ["Date", "Category", "Description", "Amount", "Payment Method"];
    const rows = expenses.map((e) => [e.date, e.category, e.description, e.amount.toString(), e.payment_method]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${selectedDate}.csv`;
    a.click();
  };

  const categoryIcon = (cat: string) => categories.find((c) => c.name === cat)?.icon || "📝";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold font-display flex items-center gap-2">
          <TrendingDown className="w-6 h-6 text-red-400" /> Expense Tracking
        </h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-2">
            <Download size={18} /> Export
          </button>
          <button onClick={() => setShowCatForm(true)} className="btn-ghost flex items-center gap-2">
            <Settings size={18} /> Categories
          </button>
          <button onClick={() => setShowForm(true)} className="btn-accent flex items-center gap-2">
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-gray-400 text-sm">Total Expenses</div>
          <div className="text-lg font-bold font-display text-red-400">₹{totalExpenses.toFixed(2)}</div>
        </div>
        <div className="card p-4">
          <div className="text-gray-400 text-sm">Transactions</div>
          <div className="text-lg font-bold font-display">{expenses.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-gray-400 text-sm">Avg per Transaction</div>
          <div className="text-lg font-bold font-display">₹{expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : "0.00"}</div>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex gap-2">
          <button onClick={() => setViewMode("day")} className={`px-4 py-2 rounded-lg ${viewMode === "day" ? "bg-yellow-400 text-black" : "bg-[#1E1E26]"}`}>Daily</button>
          <button onClick={() => setViewMode("range")} className={`px-4 py-2 rounded-lg ${viewMode === "range" ? "bg-yellow-400 text-black" : "bg-[#1E1E26]"}`}>Range</button>
        </div>
        {viewMode === "day" ? (
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-[#1E1E26] rounded-lg px-4 py-2" />
        ) : (
          <div className="flex gap-2">
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="bg-[#1E1E26] rounded-lg px-4 py-2" />
            <span className="self-center">to</span>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="bg-[#1E1E26] rounded-lg px-4 py-2" />
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No expenses recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <div key={expense.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-xl">{categoryIcon(expense.category)}</div>
                <div>
                  <div className="font-medium">{expense.category}</div>
                  <div className="text-sm text-gray-400">{expense.description || "No description"}</div>
                  <div className="text-xs text-gray-500">{expense.date} • {expense.payment_method}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="font-bold text-red-400">₹{expense.amount.toFixed(2)}</div>
                <button onClick={() => handleDelete(expense.id)} className="btn-ghost p-2 text-red-400"><Trash2 size={18} /></button>
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
             <h2 className="text-base font-semibold mb-4">Add Expense</h2>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Category</label>
                 <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full">
                   {categories.map((c) => (<option key={c.id} value={c.name}>{c.icon} {c.name}</option>))}
                 </select>
               </div>
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Amount</label>
                 <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="w-full" placeholder="0.00" />
               </div>
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Description</label>
                 <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full" placeholder="Optional" />
               </div>
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Payment Method</label>
                 <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="w-full">
                   <option value="cash">Cash</option>
                   <option value="upi">UPI</option>
                   <option value="card">Card</option>
                   <option value="bank">Bank Transfer</option>
                 </select>
               </div>
               <button onClick={handleSave} className="btn-accent w-full">Save Expense</button>
             </div>
             <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 btn-ghost p-1"><Trash2 size={20} /></button>
           </div>
         </div>
       )}

       {/* Category Management Modal */}
       {showCatForm && (
         <div 
           className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
           onClick={(e) => e.target === e.currentTarget && setShowCatForm(false)}
         >
           <div className="card p-6 w-96 fade-in">
             <h2 className="text-base font-semibold mb-4">Manage Categories</h2>
             <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
               {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "#1E1E26" }}>
                  <span>{cat.icon}</span>
                  <span className="text-sm">{cat.name}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold mb-2">Add New Category</h3>
              <div className="flex gap-2">
                <input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} style={{ width: 48, textAlign: "center" }} placeholder="📝" />
                <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="flex-1" placeholder="Category name" onKeyDown={(e) => { if (e.key === "Enter") handleSaveCategory(); }} />
                <button onClick={handleSaveCategory} className="btn-accent py-2 px-3 text-sm" disabled={!catForm.name.trim()}>Add</button>
              </div>
            </div>
            <button onClick={() => setShowCatForm(false)} className="btn-ghost w-full mt-4">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
