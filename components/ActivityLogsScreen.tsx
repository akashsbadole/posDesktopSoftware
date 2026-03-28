"use client";
import { useState, useEffect } from "react";
import { FileText, Clock, User, RefreshCw } from "lucide-react";
import { getActivityLogs, ActivityLog as ActivityLogType } from "@/lib/db";
import { useSettingsStore } from "@/lib/stores";

export default function ActivityLogsScreen() {
  const { activeStoreId } = useSettingsStore();
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getActivityLogs(activeStoreId, limit);
      setLogs(data);
    } catch (e) {
      console.error("Failed to load logs", e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [limit, activeStoreId]);

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "refund":
      case "cancel":
        return { bg: "rgba(231,76,60,0.1)", color: "#E74C3C", border: "rgba(231,76,60,0.3)" };
      case "edit":
      case "modify":
        return { bg: "rgba(245,200,66,0.1)", color: "#F5C842", border: "rgba(245,200,66,0.3)" };
      case "create":
        return { bg: "rgba(46,204,113,0.1)", color: "#2ECC71", border: "rgba(46,204,113,0.3)" };
      default:
        return { bg: "rgba(52,152,219,0.1)", color: "#3498DB", border: "rgba(52,152,219,0.3)" };
    }
  };

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-bold font-display flex items-center gap-2">
          <FileText size={20} style={{ color: "#F5C842" }} />
          Activity Logs
        </h1>
        <button onClick={load} className="btn-ghost py-2 px-3">
          <RefreshCw size={14} className={loading ? "spin" : ""} />
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "#4A4A5A" }}>
            All order modifications, refunds, and cancellations are logged here with timestamps and reasons.
            These logs cannot be deleted and are maintained for audit purposes.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center" style={{ color: "#4A4A5A" }}>
            <RefreshCw className="spin" style={{ margin: "0 auto" }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "#4A4A5A" }}>
            No activity logs yet
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {logs.map((log) => {
              const colors = getActionColor(log.action);
              return (
                <div key={log.id} className="p-4 hover:bg-opacity-50" style={{ transition: "background 0.15s" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-2 py-1 rounded text-xs font-semibold"
                        style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
                      >
                        {log.action.toUpperCase()}
                      </span>
                      <span className="font-mono text-sm" style={{ color: "var(--text)" }}>
                        #{log.order_id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: "#4A4A5A" }}>
                      <Clock size={12} />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <span className="text-xs" style={{ color: "#4A4A5A" }}>Reason: </span>
                    <span className="text-sm" style={{ color: "var(--text)" }}>{log.reason}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs" style={{ color: "#4A4A5A" }}>
                    <User size={12} />
                    {log.user_name} ({log.user_id})
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && logs.length >= limit && (
        <div className="text-center mt-4">
          <button onClick={() => setLimit(l => l + 50)} className="btn-ghost text-sm">
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
