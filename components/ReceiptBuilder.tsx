"use client";
import { useState, useEffect } from "react";
import { getReceiptTemplates, saveReceiptTemplate, deleteReceiptTemplate, ReceiptTemplate } from "@/lib/db";
import { useNotificationStore } from "@/lib/stores";
import { Printer, Save, Trash2, Plus, ToggleLeft, ToggleRight, Eye } from "lucide-react";
import { v4 as uuid } from "uuid";

export default function ReceiptBuilder() {
  const { addNotification } = useNotificationStore();
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [editing, setEditing] = useState<ReceiptTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const t = await getReceiptTemplates();
      setTemplates(t);
      if (t.length > 0 && !editing) setEditing(t[0]);
    } catch { }
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      await saveReceiptTemplate(editing);
      addNotification({ type: "success", title: "Saved", message: "Receipt template saved" });
      await loadTemplates();
    } catch (e: any) {
      addNotification({ type: "error", title: "Error", message: String(e) });
    }
  };

  const handleNew = () => {
    const t: ReceiptTemplate = {
      id: uuid(), name: "New Template", show_logo: 0, show_store_name: 1,
      show_address: 1, show_phone: 1, show_tax_id: 1, show_items: 1,
      show_subtotal: 1, show_tax: 1, show_discount: 1, show_total: 1,
      show_payment_method: 1, show_change: 1, show_footer: 1,
      footer_text: "Thank you! Visit again.", header_text: "",
      font_size: "normal", active: 1,
    };
    setTemplates([...templates, t]);
    setEditing(t);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await deleteReceiptTemplate(id);
    await loadTemplates();
    setEditing(null);
  };

  const toggle = (field: keyof ReceiptTemplate) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: editing[field] === 1 ? 0 : 1 });
  };

  const toggleFields: { key: keyof ReceiptTemplate; label: string }[] = [
    { key: "show_logo", label: "Logo" },
    { key: "show_store_name", label: "Store Name" },
    { key: "show_address", label: "Address" },
    { key: "show_phone", label: "Phone" },
    { key: "show_tax_id", label: "Tax ID" },
    { key: "show_items", label: "Items List" },
    { key: "show_subtotal", label: "Subtotal" },
    { key: "show_tax", label: "Tax" },
    { key: "show_discount", label: "Discount" },
    { key: "show_total", label: "Total" },
    { key: "show_payment_method", label: "Payment Method" },
    { key: "show_change", label: "Change Amount" },
    { key: "show_footer", label: "Footer Text" },
  ];

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C842" }}>
              <Printer size={20} color="#0D0D0F" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#fff" }}>Receipt Builder</h1>
              <p className="text-sm" style={{ color: "#9090A8" }}>Customize receipt layout and content</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleNew} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#2A2A35", color: "#F5C842" }}>
              <Plus size={14} /> New
            </button>
            <button onClick={() => setShowPreview(!showPreview)} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#2A2A35", color: "#3498DB" }}>
              <Eye size={14} /> Preview
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-4">
            {/* Template selector */}
            <div className="flex gap-2 flex-wrap mb-4">
              {templates.map(t => (
                <button key={t.id} onClick={() => setEditing(t)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{
                  background: editing?.id === t.id ? "#F5C842" : "#2A2A35",
                  color: editing?.id === t.id ? "#0D0D0F" : "#9090A8",
                }}>{t.name}</button>
              ))}
            </div>

            {editing && (
              <div className="rounded-xl p-5" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "#F5C842" }}>Template Settings</h3>

                <div className="mb-4">
                  <label className="text-xs block mb-1" style={{ color: "#9090A8" }}>Template Name</label>
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs block mb-1" style={{ color: "#9090A8" }}>Header Text</label>
                  <input value={editing.header_text} onChange={e => setEditing({ ...editing, header_text: e.target.value })} placeholder="Optional header" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs block mb-1" style={{ color: "#9090A8" }}>Footer Text</label>
                  <input value={editing.footer_text} onChange={e => setEditing({ ...editing, footer_text: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs block mb-1" style={{ color: "#9090A8" }}>Font Size</label>
                  <select value={editing.font_size} onChange={e => setEditing({ ...editing, font_size: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }}>
                    <option value="small">Small</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs block mb-2" style={{ color: "#9090A8" }}>Show/Hide Sections</label>
                  {toggleFields.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-1.5">
                      <span className="text-sm" style={{ color: "#E8E8F0" }}>{label}</span>
                      <button onClick={() => toggle(key)} style={{ color: editing[key] === 1 ? "#2ECC71" : "#4A4A5A" }}>
                        {editing[key] === 1 ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1" style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                    <Save size={14} /> Save Template
                  </button>
                  {editing.id !== "default" && (
                    <button onClick={() => handleDelete(editing.id)} className="px-3 py-2.5 rounded-lg text-sm" style={{ background: "#E74C3C", color: "#fff" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          {showPreview && editing && (
            <div className="rounded-xl p-5" style={{ background: "#fff", color: "#000", fontFamily: "'JetBrains Mono', monospace", fontSize: editing.font_size === "small" ? 11 : editing.font_size === "large" ? 15 : 13 }}>
              <div className="text-center mb-4">
                {editing.header_text && <div className="mb-2 font-bold">{editing.header_text}</div>}
                {editing.show_store_name === 1 && <div className="text-lg font-bold">Your Store Name</div>}
                {editing.show_address === 1 && <div className="text-xs text-gray-500">123 Main Street, City</div>}
                {editing.show_phone === 1 && <div className="text-xs text-gray-500">+91 98765 43210</div>}
                {editing.show_tax_id === 1 && <div className="text-xs text-gray-500">GST: 12ABCDE1234F1Z5</div>}
              </div>
              <hr className="border-dashed border-gray-300 my-3" />
              <div className="text-center text-xs text-gray-500 mb-2">Receipt #123456 | {new Date().toLocaleString()}</div>
              <hr className="border-dashed border-gray-300 my-3" />
              {editing.show_items === 1 && (
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between"><span>Coffee x2</span><span>$4.80</span></div>
                  <div className="flex justify-between"><span>Burger x1</span><span>$8.50</span></div>
                  <div className="flex justify-between"><span>Fries x1</span><span>$3.00</span></div>
                </div>
              )}
              <hr className="border-dashed border-gray-300 my-3" />
              {editing.show_subtotal === 1 && <div className="flex justify-between text-sm"><span>Subtotal</span><span>$16.30</span></div>}
              {editing.show_discount === 1 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-$1.63</span></div>}
              {editing.show_tax === 1 && <div className="flex justify-between text-sm"><span>Tax (18%)</span><span>+$2.64</span></div>}
              {editing.show_total === 1 && <div className="flex justify-between text-lg font-bold mt-2 border-t border-dashed pt-2"><span>TOTAL</span><span>$17.31</span></div>}
              {editing.show_payment_method === 1 && <div className="flex justify-between text-sm mt-2"><span>Payment</span><span>Cash</span></div>}
              {editing.show_change === 1 && <div className="flex justify-between text-sm"><span>Change</span><span>$2.69</span></div>}
              {editing.show_footer === 1 && <div className="text-center text-xs mt-4 text-gray-500">{editing.footer_text}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
