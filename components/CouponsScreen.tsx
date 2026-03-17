"use client";
import { useEffect, useState } from "react";
import { Tag, Plus, Trash2, Edit, Copy, Check, X, Percent, Calendar } from "lucide-react";
import { getCoupons, saveCoupon, deleteCoupon } from "@/lib/db";
import { v4 as uuid } from "uuid";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  active: boolean;
}

export default function CouponsScreen() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: 0,
    max_uses: 100,
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0],
    active: true,
  });
  const [copied, setCopied] = useState("");

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    const data = await getCoupons();
    setCoupons(data);
  };

  const handleSave = async () => {
    const coupon: Coupon = {
      id: editingCoupon?.id || uuid(),
      code: formData.code.toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      min_order_amount: formData.min_order_amount,
      max_uses: formData.max_uses,
      used_count: editingCoupon?.used_count || 0,
      valid_from: formData.valid_from,
      valid_until: formData.valid_until,
      active: formData.active,
    };
    await saveCoupon(coupon);
    setShowForm(false);
    setEditingCoupon(null);
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: 10,
      min_order_amount: 0,
      max_uses: 100,
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0],
      active: true,
    });
    loadCoupons();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this coupon?")) {
      await deleteCoupon(id);
      loadCoupons();
    }
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_uses: coupon.max_uses,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      active: coupon.active,
    });
    setShowForm(true);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tag className="w-6 h-6 text-yellow-400" /> Discount Coupons
        </h1>
        <button onClick={() => setShowForm(true)} className="btn-accent flex items-center gap-2">
          <Plus size={18} /> Create Coupon
        </button>
      </div>

      {coupons.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No coupons created yet</p>
          <p className="text-sm mt-2">Create coupons to offer discounts to your customers</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => {
            const expired = isExpired(coupon.valid_until);
            return (
              <div key={coupon.id} className={`card p-4 ${!coupon.active || expired ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <code className="bg-[#1E1E26] px-3 py-1 rounded font-mono font-bold text-yellow-400">
                      {coupon.code}
                    </code>
                    <button onClick={() => copyCode(coupon.code)} className="btn-ghost p-1">
                      {copied === coupon.code ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${coupon.active && !expired ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}>
                    {expired ? "Expired" : coupon.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-2xl font-bold mb-3">
                  {coupon.discount_type === "percentage" ? (
                    <span className="text-green-400">{coupon.discount_value}% OFF</span>
                  ) : (
                    <span className="text-green-400">₹{coupon.discount_value} OFF</span>
                  )}
                </div>
                <div className="space-y-1 text-sm text-gray-400 mb-3">
                  <div className="flex justify-between">
                    <span>Min Order:</span>
                    <span>₹{coupon.min_order_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span>{coupon.used_count} / {coupon.max_uses}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1"><Calendar size={12} /> Valid:</span>
                    <span>{coupon.valid_from} to {coupon.valid_until}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(coupon)} className="btn-ghost flex-1 flex items-center justify-center gap-1 py-2">
                    <Edit size={14} /> Edit
                  </button>
                  <button onClick={() => handleDelete(coupon.id)} className="btn-ghost flex-1 flex items-center justify-center gap-1 py-2 text-red-400">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card p-6 w-[450px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingCoupon ? "Edit Coupon" : "Create Coupon"}</h2>
              <button onClick={() => { setShowForm(false); setEditingCoupon(null); }} className="btn-ghost p-1"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Coupon Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full font-mono uppercase"
                  placeholder="e.g., SAVE20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 1 })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valid From</label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <label htmlFor="active">Active</label>
              </div>
              <button onClick={handleSave} className="btn-accent w-full">
                {editingCoupon ? "Update Coupon" : "Create Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
