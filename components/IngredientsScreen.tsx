"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, Wheat, AlertTriangle } from "lucide-react";
import { getIngredients, saveIngredient, deleteIngredient, getRecipes, saveRecipe, dbGetProducts, Ingredient, Recipe, Product } from "@/lib/db";
import { useSettingsStore } from "@/lib/stores";
import { v4 as uuid } from "uuid";

export default function IngredientsScreen() {
  const { activeStoreId } = useSettingsStore();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ingredients" | "recipes">("ingredients");
  const [showIngForm, setShowIngForm] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [ingForm, setIngForm] = useState<Ingredient>({ id: "", store_id: activeStoreId, name: "", stock: 0, unit: "kg", reorder_level: 0 });
  const [recipeForm, setRecipeForm] = useState<Recipe>({ id: "", store_id: activeStoreId, product_id: "", ingredient_id: "", quantity: 0 });

  const fetchData = async () => {
    try {
      const [ingData, recipeData, prodData] = await Promise.all([
        getIngredients(activeStoreId),
        getRecipes(activeStoreId),
        dbGetProducts(activeStoreId),
      ]);
      setIngredients(ingData);
      setRecipes(recipeData);
      setProducts(prodData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeStoreId]);

  const handleSaveIngredient = async () => {
    if (!ingForm.name.trim()) return;
    try {
      const ing = { ...ingForm, id: ingForm.id || uuid(), store_id: activeStoreId };
      await saveIngredient(ing, activeStoreId);
      setShowIngForm(false);
      setIngForm({ id: "", store_id: activeStoreId, name: "", stock: 0, unit: "kg", reorder_level: 0 });
      await fetchData();
    } catch (err) {
      console.error("Failed to save ingredient:", err);
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm("Delete this ingredient?")) return;
    try {
      await deleteIngredient(id, activeStoreId);
      await fetchData();
    } catch (err) {
      console.error("Failed to delete ingredient:", err);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipeForm.product_id || !recipeForm.ingredient_id || recipeForm.quantity <= 0) return;
    try {
      const recipe = { ...recipeForm, id: recipeForm.id || uuid(), store_id: activeStoreId };
      await saveRecipe(recipe, activeStoreId);
      setShowRecipeForm(false);
      setRecipeForm({ id: "", store_id: activeStoreId, product_id: "", ingredient_id: "", quantity: 0 });
      await fetchData();
    } catch (err) {
      console.error("Failed to save recipe:", err);
    }
  };

  const getIngredientName = (id: string) => ingredients.find(i => i.id === id)?.name || "Unknown";
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || "Unknown";

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
        <h1 className="font-display text-xl font-bold font-display flex items-center gap-2">
          <Wheat size={24} style={{ color: "#F5C842" }} />
          Ingredients & Recipes
        </h1>
        <button onClick={fetchData} className="btn-ghost py-2 px-3" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6" style={{ background: "#141418", borderRadius: 10, padding: 4 }}>
        <button
          onClick={() => setActiveTab("ingredients")}
          className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all"
          style={{ background: activeTab === "ingredients" ? "rgba(245,200,66,0.15)" : "transparent", color: activeTab === "ingredients" ? "#F5C842" : "#4A4A5A" }}
        >
          Ingredients ({ingredients.length})
        </button>
        <button
          onClick={() => setActiveTab("recipes")}
          className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all"
          style={{ background: activeTab === "recipes" ? "rgba(245,200,66,0.15)" : "transparent", color: activeTab === "recipes" ? "#F5C842" : "#4A4A5A" }}
        >
          Recipes ({recipes.length})
        </button>
      </div>

      {/* Ingredients Tab */}
      {activeTab === "ingredients" && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setIngForm({ id: "", store_id: activeStoreId, name: "", stock: 0, unit: "kg", reorder_level: 0 }); setShowIngForm(true); }} className="btn-accent py-2 px-4 flex items-center gap-2 text-sm">
              <Plus size={16} /> Add Ingredient
            </button>
          </div>

           {showIngForm && (
             <div 
               className="fixed inset-0 z-50 flex items-center justify-center" 
               style={{ background: "rgba(0,0,0,0.6)" }}
               onClick={(e) => e.target === e.currentTarget && setShowIngForm(false)}
             >
               <div className="card p-6 w-full max-w-md fade-in">
                 <h2 className="font-semibold text-base mb-4">{ingForm.id ? "Edit" : "Add"} Ingredient</h2>
                 <div className="space-y-3">
                   <div>
                     <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Name *</label>
                     <input value={ingForm.name} onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })} placeholder="Ingredient name" />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Stock</label>
                       <input type="number" value={ingForm.stock} onChange={(e) => setIngForm({ ...ingForm, stock: parseFloat(e.target.value) || 0 })} min={0} />
                     </div>
                     <div>
                       <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Unit</label>
                       <select value={ingForm.unit} onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })} style={{ padding: "10px" }}>
                         <option value="kg">kg</option>
                         <option value="g">g</option>
                         <option value="L">L</option>
                         <option value="ml">ml</option>
                         <option value="pcs">pcs</option>
                         <option value="dozen">dozen</option>
                       </select>
                     </div>
                   </div>
                   <div>
                     <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Reorder Level</label>
                     <input type="number" value={ingForm.reorder_level} onChange={(e) => setIngForm({ ...ingForm, reorder_level: parseFloat(e.target.value) || 0 })} min={0} />
                   </div>
                 </div>
                 <div className="flex gap-2 mt-4">
                   <button onClick={() => setShowIngForm(false)} className="btn-ghost flex-1">Cancel</button>
                   <button onClick={handleSaveIngredient} className="btn-accent flex-1" disabled={!ingForm.name.trim()}>Save</button>
                 </div>
               </div>
             </div>
           )}

          {ingredients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: "#4A4A5A" }}>
              <Wheat size={48} className="mb-4 opacity-50" />
              <p>No ingredients yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ingredients.map((ing) => {
                const low = ing.stock <= ing.reorder_level;
                return (
                  <div key={ing.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {low && <AlertTriangle size={16} style={{ color: "#E74C3C" }} />}
                      <div>
                        <div className="font-medium">{ing.name}</div>
                        <div className="text-xs" style={{ color: "#9090A8" }}>
                          Stock: {ing.stock} {ing.unit} • Reorder at: {ing.reorder_level} {ing.unit}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded text-xs font-medium" style={{
                        background: low ? "rgba(231,76,60,0.15)" : "rgba(46,204,113,0.15)",
                        color: low ? "#E74C3C" : "#2ECC71",
                      }}>
                        {ing.stock} {ing.unit}
                      </span>
                      <button onClick={() => { setIngForm(ing); setShowIngForm(true); }} className="btn-ghost py-1 px-2 text-xs">Edit</button>
                      <button onClick={() => handleDeleteIngredient(ing.id)} className="p-1 rounded hover:bg-red-500/10" style={{ color: "#E74C3C" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Recipes Tab */}
      {activeTab === "recipes" && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setRecipeForm({ id: "", store_id: activeStoreId, product_id: "", ingredient_id: "", quantity: 0 }); setShowRecipeForm(true); }} className="btn-accent py-2 px-4 flex items-center gap-2 text-sm">
              <Plus size={16} /> Add Recipe Link
            </button>
          </div>

          {showRecipeForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
              <div className="card p-6 w-full max-w-md fade-in">
                <h2 className="font-semibold text-base mb-4">Link Product to Ingredient</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Product *</label>
                    <select value={recipeForm.product_id} onChange={(e) => setRecipeForm({ ...recipeForm, product_id: e.target.value })} style={{ padding: "10px" }}>
                      <option value="">Select product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Ingredient *</label>
                    <select value={recipeForm.ingredient_id} onChange={(e) => setRecipeForm({ ...recipeForm, ingredient_id: e.target.value })} style={{ padding: "10px" }}>
                      <option value="">Select ingredient...</option>
                      {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Quantity Used *</label>
                    <input type="number" value={recipeForm.quantity} onChange={(e) => setRecipeForm({ ...recipeForm, quantity: parseFloat(e.target.value) || 0 })} min={0} step={0.01} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowRecipeForm(false)} className="btn-ghost flex-1">Cancel</button>
                  <button onClick={handleSaveRecipe} className="btn-accent flex-1" disabled={!recipeForm.product_id || !recipeForm.ingredient_id}>Save</button>
                </div>
              </div>
            </div>
          )}

          {recipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: "#4A4A5A" }}>
              <Wheat size={48} className="mb-4 opacity-50" />
              <p>No recipe links yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recipes.map((r) => (
                <div key={r.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{getProductName(r.product_id)}</div>
                    <div className="text-xs" style={{ color: "#9090A8" }}>
                      Uses {r.quantity} {ingredients.find(i => i.id === r.ingredient_id)?.unit || ""} of {getIngredientName(r.ingredient_id)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
