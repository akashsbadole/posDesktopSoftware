"use client";
import { useState, useEffect } from "react";
import { dbGetRefundRequests, dbApproveRefund, dbRejectRefund, dbCreateRefundRequest, RefundRequest } from "@/lib/db";
import { useAuthStore } from "@/lib/stores";
import { CheckCircle, XCircle, Clock, RotateCcw, AlertTriangle, RefreshCw } from "lucide-react";

export default function RefundApprovalScreen() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [status, setStatus] = useState<{ type: string; msg: string } | null>(null);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await dbGetRefundRequests();
      setRequests(data);
    } catch { }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const userId = user?.id || "admin";
    const userName = user?.name || "Admin";
    await dbApproveRefund(id, userId, userName);
    setStatus({ type: "success", msg: "Refund approved" });
    await loadRequests();
  };

  const handleReject = async (id: string) => {
    await dbRejectRefund(id);
    setStatus({ type: "error", msg: "Refund rejected" });
    await loadRequests();
  };

  const filtered = requests.filter(r => filter === "all" || r.status === filter);

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return { bg: "rgba(245,200,66,0.1)", color: "#F5C842" };
      case "approved": return { bg: "rgba(46,204,113,0.1)", color: "#2ECC71" };
      case "rejected": return { bg: "rgba(231,76,60,0.1)", color: "#E74C3C" };
      default: return { bg: "#2A2A35", color: "#9090A8" };
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "pending": return <Clock size={14} />;
      case "approved": return <CheckCircle size={14} />;
      case "rejected": return <XCircle size={14} />;
      default: return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C842" }}>
              <RotateCcw size={20} color="#0D0D0F" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#fff" }}>Refund Approvals</h1>
              <p className="text-sm" style={{ color: "#9090A8" }}>Review and process refund requests</p>
            </div>
          </div>
          <button onClick={loadRequests} className="p-2 rounded-lg hover:bg-[#2A2A35]" style={{ color: "#9090A8" }}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>

        {status && (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{
            background: status.type === "success" ? "rgba(46,204,113,0.1)" : "rgba(231,76,60,0.1)",
            border: `1px solid ${status.type === "success" ? "rgba(46,204,113,0.3)" : "rgba(231,76,60,0.3)"}`,
            color: status.type === "success" ? "#2ECC71" : "#E74C3C",
          }}>
            {status.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span className="text-sm">{status.msg}</span>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {["all", "pending", "approved", "rejected"].map(s => (
            <button key={s} onClick={() => setFilter(s)} className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize" style={{
              background: filter === s ? "#F5C842" : "#2A2A35",
              color: filter === s ? "#0D0D0F" : "#9090A8",
            }}>{s}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12" style={{ color: "#4A4A5A" }}><RefreshCw size={24} className="spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12" style={{ color: "#4A4A5A" }}><p>No {filter !== "all" ? filter : ""} refund requests</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="rounded-xl p-4" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm" style={{ color: "#9090A8" }}>#{r.id.slice(-8).toUpperCase()}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1" style={statusColor(r.status)}>
                      {statusIcon(r.status)} {r.status}
                    </span>
                  </div>
                  <span className="text-lg font-bold" style={{ color: "#E74C3C" }}>${r.amount.toFixed(2)}</span>
                </div>
                <div className="text-sm mb-1" style={{ color: "#9090A8" }}>
                  Order: <span style={{ color: "#fff" }}>#{r.order_id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="text-sm mb-2" style={{ color: "#9090A8" }}>
                  Reason: <span style={{ color: "#fff" }}>{r.reason}</span>
                </div>
                <div className="text-xs mb-3" style={{ color: "#4A4A5A" }}>{new Date(r.created_at).toLocaleString()}</div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(r.id)} className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1" style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                      <CheckCircle size={14} /> Approve Refund
                    </button>
                    <button onClick={() => handleReject(r.id)} className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1" style={{ background: "#E74C3C", color: "#fff" }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
