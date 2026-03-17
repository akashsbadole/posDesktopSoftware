"use client";
import { useEffect, useState } from "react";
import { CheckCircle, DollarSign, CreditCard, Smartphone, TrendingUp, TrendingDown, Save, X, Calculator } from "lucide-react";
import { getDayEndReconciliation, saveDayEndReconciliation, dbGetDailySummary, getExpenses, dbGetSettings } from "@/lib/db";
import { v4 as uuid } from "uuid";

interface DayEndReconciliation {
  id: string;
  date: string;
  opening_cash: number;
  expected_cash: number;
  actual_cash: number;
  difference: number;
  cash_sales: number;
  upi_sales: number;
  card_sales: number;
  total_expenses: number;
  notes: string;
  created_by: string;
  created_at: string;
}

export default function DayEndReconciliationScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [reconciliation, setReconciliation] = useState<DayEndReconciliation | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    opening_cash: 0,
    actual_cash: 0,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    const [rec, sum, exp, set] = await Promise.all([
      getDayEndReconciliation(selectedDate),
      dbGetDailySummary(),
      getExpenses(selectedDate),
      dbGetSettings(),
    ]);
    setReconciliation(rec);
    setSummary(sum);
    setExpenses(exp);
    setSettings(set);
    if (rec) {
      setFormData({
        opening_cash: rec.opening_cash,
        actual_cash: rec.actual_cash,
        notes: rec.notes,
      });
    } else {
      setFormData({ opening_cash: 0, actual_cash: 0, notes: "" });
    }
  };

  const calculateExpected = () => {
    if (!summary) return 0;
    return formData.opening_cash + summary.revenue;
  };

  const calculateDifference = () => {
    return formData.actual_cash - calculateExpected() + (expenses.reduce((s, e) => s + e.amount, 0));
  };

  const handleSave = async () => {
    setSaving(true);
    const expected = calculateExpected();
    const difference = calculateDifference();
    const rec: DayEndReconciliation = {
      id: reconciliation?.id || uuid(),
      date: selectedDate,
      opening_cash: formData.opening_cash,
      expected_cash: expected - expenses.reduce((s, e) => s + e.amount, 0),
      actual_cash: formData.actual_cash,
      difference,
      cash_sales: summary?.revenue || 0,
      upi_sales: 0,
      card_sales: 0,
      total_expenses: expenses.reduce((s, e) => s + e.amount, 0),
      notes: formData.notes,
      created_by: "admin",
      created_at: new Date().toISOString(),
    };
    await saveDayEndReconciliation(rec);
    setSaving(false);
    loadData();
  };

  const difference = calculateDifference();
  const isBalanced = Math.abs(difference) < 1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6" /> Day-End Reconciliation
        </h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-[#1E1E26] rounded-lg px-4 py-2"
        />
      </div>

      {reconciliation && (
        <div className="mb-6 flex items-center gap-2">
          <CheckCircle className="text-green-400" size={20} />
          <span className="text-green-400 font-medium">Reconciliation completed for {selectedDate}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-gray-400 text-sm">Total Revenue</div>
          <div className="text-2xl font-bold">₹{summary?.revenue?.toFixed(2) || "0.00"}</div>
        </div>
        <div className="card p-4">
          <div className="text-gray-400 text-sm">Transactions</div>
          <div className="text-2xl font-bold">{summary?.transactions || 0}</div>
        </div>
        <div className="card p-4">
          <div className="text-gray-400 text-sm">Avg Order</div>
          <div className="text-2xl font-bold">₹{summary?.avg_order?.toFixed(2) || "0.00"}</div>
        </div>
        <div className="card p-4">
          <div className="text-gray-400 text-sm">Total Expenses</div>
          <div className="text-2xl font-bold text-red-400">₹{expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold mb-4">Cash Count</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Opening Cash</label>
              <input
                type="number"
                value={formData.opening_cash}
                onChange={(e) => setFormData({ ...formData, opening_cash: parseFloat(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Actual Cash in Drawer</label>
              <input
                type="number"
                value={formData.actual_cash}
                onChange={(e) => setFormData({ ...formData, actual_cash: parseFloat(e.target.value) || 0 })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full"
                rows={2}
                placeholder="Any observations..."
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold mb-4">Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-[#1E1E26]">
              <span className="text-gray-400">Opening Cash</span>
              <span>₹{formData.opening_cash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#1E1E26]">
              <span className="text-gray-400">+ Total Sales</span>
              <span className="text-green-400">₹{(summary?.revenue || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#1E1E26]">
              <span className="text-gray-400">- Expenses</span>
              <span className="text-red-400">-₹{expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#1E1E26]">
              <span className="text-gray-400">Expected Cash</span>
              <span className="font-bold">₹{calculateExpected().toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#1E1E26]">
              <span className="text-gray-400">Actual Cash</span>
              <span>₹{formData.actual_cash.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between py-3 text-lg font-bold ${isBalanced ? "text-green-400" : "text-red-400"}`}>
              <span className="flex items-center gap-2">
                {isBalanced ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                Difference
              </span>
              <span>₹{difference.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`btn-accent w-full mt-4 flex items-center justify-center gap-2 ${isBalanced ? "" : "bg-red-400 hover:bg-red-500"}`}
          >
            {saving ? "Saving..." : <><Save size={18} /> {isBalanced ? "Save Reconciliation" : "Save with Difference"}</>}
          </button>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h3 className="font-bold mb-4">Quick Stats</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-[#1E1E26] rounded-lg">
            <div className="text-gray-400 text-sm">Avg Order Value</div>
            <div className="text-xl font-bold">₹{(summary?.avg_order || 0).toFixed(2)}</div>
          </div>
          <div className="p-4 bg-[#1E1E26] rounded-lg">
            <div className="text-gray-400 text-sm">Items Sold</div>
            <div className="text-xl font-bold">{summary?.items_sold || 0}</div>
          </div>
          <div className="p-4 bg-[#1E1E26] rounded-lg">
            <div className="text-gray-400 text-sm">Expense Count</div>
            <div className="text-xl font-bold">{expenses.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
