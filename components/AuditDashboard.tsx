"use client";
import { useState, useEffect } from "react";
import { getActivityLogs, ActivityLog } from "@/lib/db";
import { Shield, RefreshCw, Eye, Filter } from "lucide-react";

export default function AuditDashboard() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(100);

  useEffect(() => { loadLogs(); }, [limit]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const l = await getActivityLogs(limit);
      setLogs(l);
    } catch { }
    setLoading(false);
  };

  const actions = Array.from(new Set(logs.map(l => l.action)));
  const filtered = filter === "all" ? logs : logs.filter(l => l.action === filter);

  const actionColor = (action: string) => {
    if (action.includes("refund") || action.includes("cancel")) return "#E74C3C";
    if (action.includes("create") || action.includes("save") || action.includes("add")) return "#2ECC71";
    if (action.includes("update") || action.includes("edit")) return "#3498DB";
    if (action.includes("delete")) return "#E67E22";
    return "#F5C842";
  };

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C842" }}>
              <Shield size={20} color="#0D0D0F" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#fff" }}>Audit Dashboard</h1>
              <p className="text-sm" style={{ color: "#9090A8" }}>Complete activity trail — {logs.length} entries</p>
            </div>
          </div>
          <button onClick={loadLogs} className="p-2 rounded-lg hover:bg-[#2A2A35]" style={{ color: "#9090A8" }}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {actions.slice(0, 4).map(action => (
            <div key={action} className="rounded-xl p-3" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
              <div className="text-xs capitalize" style={{ color: "#9090A8" }}>{action.replace(/_/g, " ")}</div>
              <div className="text-lg font-bold" style={{ color: actionColor(action) }}>{logs.filter(l => l.action === action).length}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFilter("all")} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{
            background: filter === "all" ? "#F5C842" : "#2A2A35",
            color: filter === "all" ? "#0D0D0F" : "#9090A8",
          }}>All ({logs.length})</button>
          {actions.map(a => (
            <button key={a} onClick={() => setFilter(a)} className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize" style={{
              background: filter === a ? actionColor(a) : "#2A2A35",
              color: filter === a ? "#fff" : "#9090A8",
            }}>{a.replace(/_/g, " ")} ({logs.filter(l => l.action === a).length})</button>
          ))}
        </div>

        {/* Log entries */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A35" }}>
          {filtered.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#4A4A5A" }}>No activity logs</div>
          ) : (
            filtered.map((log, i) => (
              <div key={log.id} className="p-3" style={{ borderTop: i > 0 ? "1px solid #2A2A35" : undefined, background: i % 2 === 0 ? "transparent" : "#16161A" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize" style={{ background: `${actionColor(log.action)}20`, color: actionColor(log.action) }}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                      {log.order_id && <span className="text-xs" style={{ color: "#4A4A5A" }}>#{log.order_id.slice(-6)}</span>}
                    </div>
                    <div className="text-sm" style={{ color: "#E8E8F0" }}>
                      {log.reason || "No reason provided"}
                    </div>
                    {(log.previous_data || log.new_data) && (
                      <div className="text-xs mt-1 font-mono" style={{ color: "#4A4A5A" }}>
                        {log.previous_data && <span style={{ color: "#E74C3C" }}>was: {log.previous_data.slice(0, 50)}</span>}
                        {log.previous_data && log.new_data && " → "}
                        {log.new_data && <span style={{ color: "#2ECC71" }}>now: {log.new_data.slice(0, 50)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs" style={{ color: "#9090A8" }}>{log.user_name}</div>
                    <div className="text-xs" style={{ color: "#4A4A5A" }}>{new Date(log.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-center mt-4">
          <button onClick={() => setLimit(l => l + 100)} className="text-sm px-4 py-2 rounded-lg" style={{ background: "#2A2A35", color: "#9090A8" }}>
            Load More
          </button>
        </div>
      </div>
    </div>
  );
}
