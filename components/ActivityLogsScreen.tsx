"use client";
import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Clock,
  User,
  RefreshCw,
  Search,
  X,
  Filter,
  Calendar,
} from "lucide-react";
import { getActivityLogs, ActivityLog as ActivityLogType } from "@/lib/db";
import { useSettingsStore } from "@/lib/stores";

export default function ActivityLogsScreen() {
  const { activeStoreId } = useSettingsStore();
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    load();
  }, [limit, activeStoreId]);

  // Get unique action types for filter dropdown
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((log) => log.action.toLowerCase()));
    return Array.from(actions).sort();
  }, [logs]);

  // Filter logs based on search query and filters
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Text search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchFields = [
          log.order_id,
          log.reason,
          log.user_name,
          log.action,
          log.previous_data,
          log.new_data,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchFields.includes(query)) {
          return false;
        }
      }

      // Action type filter
      if (actionFilter !== "all" && log.action.toLowerCase() !== actionFilter) {
        return false;
      }

      // Date range filter
      const logDate = new Date(log.created_at);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) return false;
      }

      return true;
    });
  }, [logs, searchQuery, actionFilter, startDate, endDate]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setActionFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters =
    searchQuery || actionFilter !== "all" || startDate || endDate;

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "refund":
      case "cancel":
        return {
          bg: "rgba(231,76,60,0.1)",
          color: "#E74C3C",
          border: "rgba(231,76,60,0.3)",
        };
      case "edit":
      case "modify":
        return {
          bg: "rgba(245,200,66,0.1)",
          color: "#F5C842",
          border: "rgba(245,200,66,0.3)",
        };
      case "create":
        return {
          bg: "rgba(46,204,113,0.1)",
          color: "#2ECC71",
          border: "rgba(46,204,113,0.3)",
        };
      default:
        return {
          bg: "rgba(52,152,219,0.1)",
          color: "#3498DB",
          border: "rgba(52,152,219,0.3)",
        };
    }
  };

  // Input styles
  const inputStyle =
    "px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-transparent";
  const labelStyle = "text-xs font-medium mb-1 block";

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-bold font-display flex items-center gap-2">
          <FileText size={20} style={{ color: "#F5C842" }} />
          Activity Logs
          {hasActiveFilters && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(245,200,66,0.2)", color: "#F5C842" }}
            >
              {filteredLogs.length}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost py-2 px-3 flex items-center gap-2 ${showFilters ? "active-filter" : ""}`}
            style={
              showFilters
                ? {
                    background: "rgba(245,200,66,0.1)",
                    border: "1px solid rgba(245,200,66,0.3)",
                  }
                : {}
            }
          >
            <Filter size={14} />
            Filters
            {hasActiveFilters && (
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "#F5C842" }}
              />
            )}
          </button>
          <button onClick={load} className="btn-ghost py-2 px-3">
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#4A4A5A",
            }}
          />
          <input
            type="text"
            placeholder="Search by order ID, reason, user, action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${inputStyle} w-full pl-10 pr-10`}
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#4A4A5A",
              }}
              className="hover:text-[#F5C842] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="card mb-4" style={{ padding: "16px" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Filter size={14} style={{ color: "#F5C842" }} />
              Filter Options
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-[#E74C3C] hover:underline flex items-center gap-1"
              >
                <X size={12} />
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action Type Filter */}
            <div>
              <label className={labelStyle} style={{ color: "#4A4A5A" }}>
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className={`${inputStyle} w-full`}
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                <option value="all">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className={labelStyle} style={{ color: "#4A4A5A" }}>
                <Calendar size={12} className="inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputStyle} w-full`}
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className={labelStyle} style={{ color: "#4A4A5A" }}>
                <Calendar size={12} className="inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputStyle} w-full`}
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="p-8 text-center" style={{ color: "#4A4A5A" }}>
            <RefreshCw className="spin" style={{ margin: "0 auto" }} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "#4A4A5A" }}>
            {logs.length === 0
              ? "No activity logs yet"
              : hasActiveFilters
                ? "No logs match the current filters"
                : "No logs found"}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="block mx-auto mt-2 text-sm text-[#F5C842] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filteredLogs.map((log) => {
              const colors = getActionColor(log.action);
              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-opacity-50"
                  style={{ transition: "background 0.15s" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-1 rounded text-xs font-semibold"
                        style={{
                          background: colors.bg,
                          color: colors.color,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {log.action.toUpperCase()}
                      </span>
                      <span
                        className="font-mono text-sm"
                        style={{ color: "var(--text)" }}
                      >
                        #{log.order_id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: "#4A4A5A" }}
                    >
                      <Clock size={12} />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="mb-2">
                    <span className="text-xs" style={{ color: "#4A4A5A" }}>
                      Reason:{" "}
                    </span>
                    <span className="text-sm" style={{ color: "var(--text)" }}>
                      {log.reason}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "#4A4A5A" }}
                  >
                    <User size={12} />
                    {log.user_name} ({log.userId})
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && logs.length >= limit && (
        <div className="text-center mt-4">
          <button
            onClick={() => setLimit((l) => l + 50)}
            className="btn-ghost text-sm"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
