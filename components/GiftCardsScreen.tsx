"use client";
import { useState, useEffect } from "react";
import { Plus, Search, Gift, QrCode } from "lucide-react";
import { dbCreateGiftCard, dbGetGiftCards, GiftCard } from "@/lib/db";
import { useSettingsStore } from "@/lib/stores";
import { QRCodeSVG } from "qrcode.react";

export default function GiftCardsScreen() {
  const { activeStoreId, settings } = useSettingsStore();
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);

  const curr = settings?.currency_symbol ?? "₹";

  useEffect(() => {
    loadGiftCards();
  }, [activeStoreId]);

  const loadGiftCards = async () => {
    setLoading(true);
    try {
      const cards = await dbGetGiftCards(activeStoreId);
      setGiftCards(cards);
    } catch (err) {
      console.error("Failed to load gift cards:", err);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    const amount = parseFloat(newAmount);
    if (!amount || amount <= 0) return;

    try {
      await dbCreateGiftCard(activeStoreId, amount);
      setNewAmount("");
      setShowCreate(false);
      loadGiftCards();
    } catch (err) {
      console.error("Failed to create gift card:", err);
    }
  };

  const filteredCards = giftCards.filter(card =>
    card.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-bold">Gift Cards</h1>
        <button onClick={() => setShowCreate(true)} className="btn-accent py-2 px-4">
          <Plus size={16} className="mr-2" />
          Create Gift Card
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4A4A5A" }} />
          <input
            placeholder="Search by code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5C842]"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredCards.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#4A4A5A" }}>
              <Gift size={48} className="mx-auto mb-4 opacity-50" />
              <p>No gift cards found</p>
            </div>
          ) : (
            filteredCards.map((card) => (
              <div key={card.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                    <Gift size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{card.code}</div>
                    <div className="text-sm" style={{ color: "#4A4A5A" }}>
                      Balance: {curr}{card.balance.toFixed(2)} / Initial: {curr}{card.initial_amount.toFixed(2)}
                    </div>
                    <div className="text-xs" style={{ color: "#4A4A5A" }}>
                      Created: {new Date(card.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCard(card)}
                  className="btn-ghost p-2"
                  title="Show QR Code"
                >
                  <QrCode size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="card p-6 w-full max-w-md">
            <h2 className="font-semibold text-base mb-4">Create Gift Card</h2>
            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Amount</label>
              <input
                type="number"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleCreate} className="btn-accent flex-1" disabled={!newAmount || parseFloat(newAmount) <= 0}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="card p-6 w-full max-w-md text-center">
            <h2 className="font-semibold text-base mb-4">Gift Card QR Code</h2>
            <div className="mb-4">
              <QRCodeSVG value={selectedCard.code} size={200} />
            </div>
            <div className="mb-4">
              <div className="font-mono text-lg">{selectedCard.code}</div>
              <div className="text-sm" style={{ color: "#4A4A5A" }}>
                Balance: {curr}{selectedCard.balance.toFixed(2)}
              </div>
            </div>
            <button onClick={() => setSelectedCard(null)} className="btn-accent w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}