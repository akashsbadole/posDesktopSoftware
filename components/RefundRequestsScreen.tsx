"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Check, X, Shield, Clock } from "lucide-react";
import { dbGetRefundRequests, dbApproveRefund, dbRejectRefund, RefundRequest } from "@/lib/db";
import { useAuthStore } from "@/lib/stores";

export default function RefundRequestsScreen() {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const { user } = useAuthStore();

  const fetchRequests = async () => {
    try {
      const data = await dbGetRefundRequests();
      setRequests(data);
    } catch (err) {
      console.error("Failed to fetch refund requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await dbApproveRefund(id, user?.id || "admin", user?.name || "Admin");
      await fetchRequests();
    } catch (err) {
      console.error("Failed to approve refund:", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await dbRejectRefund(id);
      await fetchRequests();
    } catch (err) {
      console.error("Failed to reject refund:", err);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  const statusColors: Record<string, { bg: string; color: string }> = {
    pending: { bg: "rgba(243,156,18,0.15)", color: "#F39C12" },
    approved: { bg: "rgba(46,204,113,0.15)", color: "#2ECC71" },
    rejected: { bg: "rgba(231,76,60,0.15)", color: "#E74C3C" },
  };

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
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Shield size={24} style={{ color: "#F5C842" }} />
          Refund Requests
        </h1>
        <button onClick={fetchRequests} className="btn-ghost py-2 px-3" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6" style={{ background: "#141418", borderRadius: 10, padding: 4 }}>
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all"
            style={{
              background: filter === f ? "rgba(245,200,66,0.15)" : "transparent",
              color: filter === f ? "#F5C842" : "#4A4A5A",
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && ` (${requests.filter(r => r.status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: "#4A4A5A" }}>
          <Shield size={48} className="mb-4 opacity-50" />
          <p>No refund requests{filter !== "all" ? ` with status "${filter}"` : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const sc = statusColors[req.status] || statusColors.pending;
            return (
              <div key={req.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold">
                      Order #{req.order_id.slice(-6).toUpperCase()}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#9090A8" }}>
                      <Clock size={12} className="inline mr-1" />
                      {new Date(req.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>
                    {req.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs" style={{ color: "#9090A8" }}>Amount</div>
                    <div className="text-lg font-bold" style={{ color: "#F5C842" }}>₹{req.amount.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs" style={{ color: "#9090A8" }}>Reason</div>
                    <div className="text-sm">{req.reason || "No reason provided"}</div>
                  </div>
                </div>

                {req.status === "pending" && (
                  <div className="flex gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={processing === req.id}
                      className="btn-success flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                      {processing === req.id ? <RefreshCw size={14} className="spin" /> : <><Check size={14} /> Approve</>}
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={processing === req.id}
                      className="btn-danger flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                      {processing === req.id ? <RefreshCw size={14} className="spin" /> : <><X size={14} /> Reject</>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
