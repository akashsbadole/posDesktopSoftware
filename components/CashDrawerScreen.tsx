"use client";
import { useState, useEffect } from "react";
import { getCashDrawerSession, openCashDrawerSession, closeCashDrawerSession, CashDrawerSession } from "@/lib/db";
import { useAuthStore, useNotificationStore } from "@/lib/stores";
import { Lock, Unlock, DollarSign, Calculator, Save } from "lucide-react";

export default function CashDrawerScreen() {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const today = new Date().toISOString().split("T")[0];
  const [session, setSession] = useState<CashDrawerSession | null>(null);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadSession(); }, []);

  const loadSession = async () => {
    try {
      const s = await getCashDrawerSession(today);
      setSession(s);
    } catch { }
  };

  const handleOpen = async () => {
    setLoading(true);
    try {
      await openCashDrawerSession(today, openingBalance, user?.name || "System");
      addNotification({ type: "success", title: "Cash Drawer Opened", message: `Opening balance: $${openingBalance.toFixed(2)}` });
      await loadSession();
    } catch (e: any) {
      addNotification({ type: "error", title: "Error", message: String(e) });
    }
    setLoading(false);
  };

  const handleClose = async () => {
    setLoading(true);
    try {
      await closeCashDrawerSession(today, closingBalance, notes, user?.name || "System");
      addNotification({ type: "success", title: "Cash Drawer Closed", message: `Closing balance: $${closingBalance.toFixed(2)}` });
      await loadSession();
    } catch (e: any) {
      addNotification({ type: "error", title: "Error", message: String(e) });
    }
    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C842" }}>
            <DollarSign size={20} color="#0D0D0F" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#fff" }}>Cash Drawer</h1>
            <p className="text-sm" style={{ color: "#9090A8" }}>{today}</p>
          </div>
        </div>

        {!session ? (
          <div className="rounded-xl p-6 text-center" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
            <Lock size={48} style={{ color: "#F5C842", margin: "0 auto 16px" }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#fff" }}>Open Cash Drawer</h2>
            <p className="text-sm mb-4" style={{ color: "#9090A8" }}>Enter the opening cash balance to start the day</p>
            <div className="max-w-xs mx-auto">
              <input type="number" value={openingBalance} onChange={e => setOpeningBalance(Number(e.target.value))} placeholder="Opening Balance"
                className="w-full px-4 py-3 rounded-lg text-center text-lg font-bold mb-4" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#F5C842" }} />
              <button onClick={handleOpen} disabled={loading} className="w-full py-3 rounded-lg font-semibold disabled:opacity-50" style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                <Unlock size={16} className="inline mr-2" /> Open Drawer
              </button>
            </div>
          </div>
        ) : session.status === "open" ? (
          <div className="space-y-4">
            <div className="rounded-xl p-5" style={{ background: "#1E1E26", border: "1px solid rgba(46,204,113,0.3)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#2ECC71" }} />
                <span className="text-sm font-semibold" style={{ color: "#2ECC71" }}>Drawer Open</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg" style={{ background: "#16161A" }}>
                  <div className="text-xs" style={{ color: "#9090A8" }}>Opening Balance</div>
                  <div className="text-lg font-bold" style={{ color: "#F5C842" }}>${session.opening_balance.toFixed(2)}</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "#16161A" }}>
                  <div className="text-xs" style={{ color: "#9090A8" }}>Opened By</div>
                  <div className="text-sm font-medium" style={{ color: "#fff" }}>{session.opened_by}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#E74C3C" }}>
                <Lock size={14} /> Close Drawer
              </h3>
              <input type="number" value={closingBalance} onChange={e => setClosingBalance(Number(e.target.value))} placeholder="Actual Cash Count"
                className="w-full px-4 py-3 rounded-lg text-lg font-bold mb-3" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#F5C842" }} />
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
                className="w-full px-4 py-2 rounded-lg text-sm mb-3" style={{ background: "#16161A", border: "1px solid #2A2A35", color: "#fff" }} />
              <button onClick={handleClose} disabled={loading} className="w-full py-3 rounded-lg font-semibold disabled:opacity-50" style={{ background: "#E74C3C", color: "#fff" }}>
                <Save size={16} className="inline mr-2" /> Close & Balance
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-6" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "#9090A8" }}>
              <Lock size={18} /> Drawer Closed
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: "#16161A" }}>
                <div className="text-xs" style={{ color: "#9090A8" }}>Opening</div>
                <div className="text-base font-bold" style={{ color: "#F5C842" }}>${session.opening_balance.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "#16161A" }}>
                <div className="text-xs" style={{ color: "#9090A8" }}>Closing</div>
                <div className="text-base font-bold" style={{ color: "#F5C842" }}>${session.closing_balance.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "#16161A" }}>
                <div className="text-xs" style={{ color: "#9090A8" }}>Expected</div>
                <div className="text-base font-bold" style={{ color: "#3498DB" }}>${session.expected_balance.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "#16161A" }}>
                <div className="text-xs" style={{ color: "#9090A8" }}>Difference</div>
                <div className="text-base font-bold" style={{ color: session.closing_balance - session.expected_balance >= 0 ? "#2ECC71" : "#E74C3C" }}>
                  {session.closing_balance - session.expected_balance >= 0 ? "+" : ""}${(session.closing_balance - session.expected_balance).toFixed(2)}
                </div>
              </div>
            </div>
            {session.notes && <div className="mt-3 text-xs" style={{ color: "#9090A8" }}>Notes: {session.notes}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
