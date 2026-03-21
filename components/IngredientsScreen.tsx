"use client";
import { useState, useEffect } from "react";
import { getIngredients, saveIngredient, deleteIngredient, getRecipes, saveRecipe, dbGetProducts, Ingredient, Recipe, Product } from "@/lib/db";
import { Plus, Trash2, Package, Save, X, AlertTriangle, RefreshCw, Beaker } from "lucide-react";
import { v4 as uuid } from "uuid";

export default function IngredientsScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ingredients" | "recipes">("ingredients");
  const [showIngForm, setShowIngForm] = useState(false);
  const [showRecForm, setShowRecForm] = useState(false);
  const [editIng, setEditIng] = useState<Ingredient | null>(null);
  const [ingForm, setIngForm] = useState({ name: "", stock: 0, unit: "g", reorder_level: 10 });
  const [recForm, setRecForm] = useState({ product_id: "", ingredient_id: "", quantity: 1 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ings, recs, prods] = await Promise.all([getIngredients(), getRecipes(), dbGetProducts()]);
      setIngredients(ings);
      setRecipes(recs);
      setProducts(prods);
    } catch { }
    setLoading(false);
  };

  const handleSaveIng = async () => {
    const ing: Ingredient = {
      id: editIng?.id || uuid(),
      name: ingForm.name,
      stock: ingForm.stock,
      unit: ingForm.unit,
      reorder_level: ingForm.reorder_level,
    };
    await saveIngredient(ing);
    setShowIngForm(false);
    setEditIng(null);
    setIngForm({ name: "", stock: 0, unit: "g", reorder_level: 10 });
    await loadData();
  };

  const handleDeleteIng = async (id: string) => {
    if (!confirm("Delete this ingredient?")) return;
    await deleteIngredient(id);
    await loadData();
  };

  const handleSaveRec = async () => {
    const rec: Recipe = { id: uuid(), product_id: recForm.product_id, ingredient_id: recForm.ingredient_id, quantity: recForm.quantity };
    await saveRecipe(rec);
    setShowRecForm(false);
    setRecForm({ product_id: "", ingredient_id: "", quantity: 1 });
    await loadData();
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || id;
  const getIngredientName = (id: string) => ingredients.find(i => i.id === id)?.name || id;

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C842" }}>
              <Beaker size={20} color="#0D0D0F" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#fff" }}>Ingredients & Recipes</h1>
              <p className="text-sm" style={{ color: "#9090A8" }}>Manage inventory ingredients and product recipes</p>
            </div>
          </div>
          <button onClick={loadData} className="p-2 rounded-lg hover:bg-[#2A2A35]" style={{ color: "#9090A8" }}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab("ingredients")} className="px-4 py-2 rounded-lg text-sm font-medium" style={{
            background: activeTab === "ingredients" ? "#F5C842" : "#2A2A35",
            color: activeTab === "ingredients" ? "#0D0D0F" : "#9090A8",
          }}>Ingredients ({ingredients.length})</button>
          <button onClick={() => setActiveTab("recipes")} className="px-4 py-2 rounded-lg text-sm font-medium" style={{
            background: activeTab === "recipes" ? "#F5C842" : "#2A2A35",
            color: activeTab === "recipes" ? "#0D0D0F" : "#9090A8",
          }}>Recipes ({recipes.length})</button>
        </div>

        {activeTab === "ingredients" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowIngForm(true); setEditIng(null); setIngForm({ name: "", stock: 0, unit: "g", reorder_level: 10 }); }}
                className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#F5C842", color: "#0D0D0F" }}>
                <Plus size={14} /> Add Ingredient
              </button>
            </div>

            {showIngForm && (
              <div className="rounded-xl p-4 mb-4" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5C842" }}>{editIng ? "Edit" : "New"} Ingredient</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input value={ingForm.name} onChange={e => setIngForm({ ...ingForm, name: e.target.value })} placeholder="Name"
                    className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                  <input type="number" value={ingForm.stock} onChange={e => setIngForm({ ...ingForm, stock: Number(e.target.value) })} placeholder="Stock"
                    className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                  <input value={ingForm.unit} onChange={e => setIngForm({ ...ingForm, unit: e.target.value })} placeholder="Unit (g/ml/pcs)"
                    className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                  <input type="number" value={ingForm.reorder_level} onChange={e => setIngForm({ ...ingForm, reorder_level: Number(e.target.value) })} placeholder="Reorder Level"
                    className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveIng} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                    <Save size={14} /> Save
                  </button>
                  <button onClick={() => setShowIngForm(false)} className="px-4 py-2 rounded-lg text-sm flex items-center gap-1" style={{ background: "#2A2A35", color: "#9090A8" }}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ingredients.map(ing => (
                <div key={ing.id} className="rounded-xl p-4" style={{ background: "#1E1E26", border: `1px solid ${ing.stock <= ing.reorder_level ? "rgba(231,76,60,0.3)" : "#2A2A35"}` }}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm" style={{ color: "#fff" }}>{ing.name}</h3>
                    {ing.stock <= ing.reorder_level && <AlertTriangle size={14} color="#E74C3C" />}
                  </div>
                  <div className="text-lg font-bold mb-1" style={{ color: ing.stock <= ing.reorder_level ? "#E74C3C" : "#F5C842" }}>{ing.stock} {ing.unit}</div>
                  <div className="text-xs mb-3" style={{ color: "#4A4A5A" }}>Reorder at: {ing.reorder_level} {ing.unit}</div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditIng(ing); setIngForm({ name: ing.name, stock: ing.stock, unit: ing.unit, reorder_level: ing.reorder_level }); setShowIngForm(true); }}
                      className="text-xs px-2 py-1 rounded" style={{ color: "#3498DB", background: "rgba(52,152,219,0.1)" }}>Edit</button>
                    <button onClick={() => handleDeleteIng(ing.id)} className="text-xs px-2 py-1 rounded" style={{ color: "#E74C3C", background: "rgba(231,76,60,0.1)" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "recipes" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowRecForm(true)} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#F5C842", color: "#0D0D0F" }}>
                <Plus size={14} /> Add Recipe
              </button>
            </div>

            {showRecForm && (
              <div className="rounded-xl p-4 mb-4" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#F5C842" }}>New Recipe Link</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <select value={recForm.product_id} onChange={e => setRecForm({ ...recForm, product_id: e.target.value })}
                    className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }}>
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={recForm.ingredient_id} onChange={e => setRecForm({ ...recForm, ingredient_id: e.target.value })}
                    className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }}>
                    <option value="">Select Ingredient</option>
                    {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                  </select>
                  <input type="number" value={recForm.quantity} onChange={e => setRecForm({ ...recForm, quantity: Number(e.target.value) })} placeholder="Qty"
                    className="px-3 py-2 rounded-lg text-sm" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveRec} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                    <Save size={14} /> Save
                  </button>
                  <button onClick={() => setShowRecForm(false)} className="px-4 py-2 rounded-lg text-sm flex items-center gap-1" style={{ background: "#2A2A35", color: "#9090A8" }}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {recipes.map(rec => (
                <div key={rec.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium" style={{ color: "#F5C842" }}>{getProductName(rec.product_id)}</span>
                    <span style={{ color: "#4A4A5A" }}>→</span>
                    <span className="text-sm" style={{ color: "#fff" }}>{getIngredientName(rec.ingredient_id)}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#2A2A35", color: "#9090A8" }}>{rec.quantity}</span>
                  </div>
                </div>
              ))}
              {recipes.length === 0 && <div className="text-center py-12" style={{ color: "#4A4A5A" }}>No recipes defined</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
