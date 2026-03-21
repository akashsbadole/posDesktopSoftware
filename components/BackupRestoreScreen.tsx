"use client";
import { useState, useEffect, useRef } from "react";
import {
  exportBackup,
  importFullBackup,
  getBackupMetadata,
  getTableCounts,
  exportProductsCsv,
  exportOrdersCsv,
  importProductsCsv,
  FullImportResult,
  BackupMetadata,
} from "@/lib/db";
import {
  Download,
  Upload,
  Database,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

interface TableCount {
  name: string;
  count: number;
}

export default function BackupRestoreScreen() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [tableCounts, setTableCounts] = useState<TableCount[]>([]);
  const [importMode, setImportMode] = useState<"merge" | "wipe">("merge");
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [importPreview, setImportPreview] = useState<BackupMetadata | null>(
    null
  );
  const [importResult, setImportResult] = useState<FullImportResult | null>(
    null
  );
  const [importData, setImportData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTableCounts();
  }, []);

  const loadTableCounts = async () => {
    try {
      const raw = await getTableCounts();
      const counts =
        typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, number>);
      const items: TableCount[] = Object.entries(counts).map(([name, count]) => ({
        name,
        count: count as number,
      }));
      setTableCounts(items);
    } catch {
      setTableCounts([]);
    }
  };

  const handleExportBackup = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const data = await exportBackup();
      const blob = new Blob(
        [atob(data)].map((c) => c.charCodeAt(0)) as any,
        { type: "application/octet-stream" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `pos-backup-${ts}.gz.b64`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({
        type: "success",
        message: "Full backup exported successfully!",
      });
    } catch (err: any) {
      setStatus({ type: "error", message: `Export failed: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus(null);
    setImportPreview(null);
    setImportResult(null);
    setImportData(null);

    try {
      const text = await file.text();
      setImportData(text);
      const meta = await getBackupMetadata(text);
      const parsed =
        typeof meta === "string"
          ? JSON.parse(meta)
          : (meta as BackupMetadata);
      setImportPreview(parsed);
      setStatus({
        type: "info",
        message: "Backup file loaded. Review details below and choose import mode.",
      });
    } catch (err: any) {
      setStatus({ type: "error", message: `Invalid backup file: ${err}` });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImportBackup = async () => {
    if (!importData) return;

    setLoading(true);
    setStatus(null);
    setImportResult(null);

    try {
      const result = await importFullBackup(importData, importMode);
      setImportResult(result);
      setStatus({
        type: "success",
        message: `Import complete! ${result.total_tables_restored} records restored via ${importMode} mode.`,
      });
      await loadTableCounts();
    } catch (err: any) {
      setStatus({ type: "error", message: `Import failed: ${err}` });
    } finally {
      setLoading(false);
      setImportData(null);
      setImportPreview(null);
    }
  };

  const handleExportProductsCsv = async () => {
    setLoading(true);
    try {
      const csv = await exportProductsCsv();
      downloadText(csv, "products.csv", "text/csv");
      setStatus({ type: "success", message: "Products CSV exported!" });
    } catch (err: any) {
      setStatus({ type: "error", message: `CSV export failed: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  const handleExportOrdersCsv = async () => {
    setLoading(true);
    try {
      const csv = await exportOrdersCsv();
      downloadText(csv, "orders.csv", "text/csv");
      setStatus({ type: "success", message: "Orders CSV exported!" });
    } catch (err: any) {
      setStatus({ type: "error", message: `CSV export failed: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  const handleImportProductsCsv = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const csv = await file.text();
      const result = await importProductsCsv(csv);
      setStatus({
        type: "success",
        message: `Imported ${result.imported} products (${result.errors} errors)`,
      });
      await loadTableCounts();
    } catch (err: any) {
      setStatus({ type: "error", message: `CSV import failed: ${err}` });
    } finally {
      setLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  const downloadText = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTableName = (name: string) =>
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#F5C842" }}
          >
            <Database size={20} color="#0D0D0F" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#fff" }}>
              Backup & Restore
            </h1>
            <p className="text-sm" style={{ color: "#9090A8" }}>
              Export, import, and manage your database
            </p>
          </div>
        </div>

        {/* Status Banner */}
        {status && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl mb-6"
            style={{
              background:
                status.type === "success"
                  ? "rgba(46,204,113,0.1)"
                  : status.type === "error"
                  ? "rgba(231,76,60,0.1)"
                  : "rgba(52,152,219,0.1)",
              border: `1px solid ${
                status.type === "success"
                  ? "rgba(46,204,113,0.3)"
                  : status.type === "error"
                  ? "rgba(231,76,60,0.3)"
                  : "rgba(52,152,219,0.3)"
              }`,
            }}
          >
            {status.type === "success" && <CheckCircle size={18} color="#2ecc71" />}
            {status.type === "error" && <AlertTriangle size={18} color="#e74c3c" />}
            {status.type === "info" && <Clock size={18} color="#3498db" />}
            <span
              style={{
                color:
                  status.type === "success"
                    ? "#2ecc71"
                    : status.type === "error"
                    ? "#e74c3c"
                    : "#3498db",
                fontSize: 14,
              }}
            >
              {status.message}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Backup Actions */}
          <div className="space-y-6">
            {/* Full Backup Export */}
            <div
              className="rounded-xl p-5"
              style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}
            >
              <h2
                className="text-base font-semibold mb-4 flex items-center gap-2"
                style={{ color: "#F5C842" }}
              >
                <Download size={16} />
                Export Full Backup
              </h2>
              <p className="text-sm mb-4" style={{ color: "#9090A8" }}>
                Exports all 25 tables including products, orders, customers,
                tables, ingredients, recipes, suppliers, expenses, and more as a
                compressed backup file.
              </p>
              <button
                onClick={handleExportBackup}
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                style={{ background: "#F5C842", color: "#0D0D0F" }}
              >
                {loading ? "Exporting..." : "Export Full Backup (.gz.b64)"}
              </button>
            </div>

            {/* Full Backup Import */}
            <div
              className="rounded-xl p-5"
              style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}
            >
              <h2
                className="text-base font-semibold mb-4 flex items-center gap-2"
                style={{ color: "#3498db" }}
              >
                <Upload size={16} />
                Import Full Backup
              </h2>
              <p className="text-sm mb-4" style={{ color: "#9090A8" }}>
                Restore from a full backup file. Choose <b>Merge</b> to
                add/update data or <b>Wipe & Restore</b> to clear everything
                first. A safety backup is created automatically before import.
              </p>

              {/* Import Mode Selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setImportMode("merge")}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background:
                      importMode === "merge" ? "#3498db" : "#2A2A35",
                    color: importMode === "merge" ? "#fff" : "#9090A8",
                  }}
                >
                  Merge
                </button>
                <button
                  onClick={() => setImportMode("wipe")}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background:
                      importMode === "wipe" ? "#e74c3c" : "#2A2A35",
                    color: importMode === "wipe" ? "#fff" : "#9090A8",
                  }}
                >
                  Wipe & Restore
                </button>
              </div>

              {importMode === "wipe" && (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg mb-4"
                  style={{
                    background: "rgba(231,76,60,0.1)",
                    border: "1px solid rgba(231,76,60,0.3)",
                  }}
                >
                  <AlertTriangle size={16} color="#e74c3c" />
                  <span className="text-xs" style={{ color: "#e74c3c" }}>
                    This will delete all existing data before restoring. A
                    safety backup is auto-saved.
                  </span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".gz.b64,.b64,.json,.gz"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 mb-4"
                style={{ background: "#3498db", color: "#fff" }}
              >
                {loading ? "Loading..." : "Select Backup File"}
              </button>

              {/* Import Preview */}
              {importPreview && (
                <div
                  className="rounded-lg p-4 mb-4"
                  style={{
                    background: "#16161A",
                    border: "1px solid #2A2A35",
                  }}
                >
                  <h3
                    className="text-sm font-semibold mb-3"
                    style={{ color: "#fff" }}
                  >
                    Backup Preview
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div style={{ color: "#9090A8" }}>Exported:</div>
                    <div style={{ color: "#fff" }}>
                      {new Date(importPreview.exported_at).toLocaleString()}
                    </div>
                    <div style={{ color: "#9090A8" }}>Version:</div>
                    <div style={{ color: "#fff" }}>
                      {importPreview.app_version}
                    </div>
                  </div>
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid #2A2A35" }}>
                    <h4
                      className="text-xs font-semibold mb-2"
                      style={{ color: "#F5C842" }}
                    >
                      Data in backup:
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(importPreview.counts)
                        .filter(([_, v]) => v > 0)
                        .map(([key, val]) => (
                          <div
                            key={key}
                            className="flex justify-between text-xs px-2 py-0.5 rounded"
                            style={{ background: "#1E1E26" }}
                          >
                            <span style={{ color: "#9090A8" }}>
                              {formatTableName(key)}
                            </span>
                            <span style={{ color: "#F5C842" }}>{val}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <button
                    onClick={handleImportBackup}
                    disabled={loading}
                    className="w-full mt-4 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                    style={{
                      background:
                        importMode === "wipe" ? "#e74c3c" : "#2ecc71",
                      color: "#fff",
                    }}
                  >
                    {loading
                      ? "Importing..."
                      : `Confirm ${
                          importMode === "wipe" ? "Wipe & Restore" : "Merge"
                        } Import`}
                  </button>
                </div>
              )}
            </div>

            {/* Import Result */}
            {importResult && (
              <div
                className="rounded-xl p-5"
                style={{
                  background: "#1E1E26",
                  border: "1px solid #2A2A35",
                }}
              >
                <h2
                  className="text-base font-semibold mb-3 flex items-center gap-2"
                  style={{ color: "#2ecc71" }}
                >
                  <CheckCircle size={16} />
                  Import Results
                </h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Products", importResult.products_imported],
                    ["Orders", importResult.orders_imported],
                    ["Customers", importResult.customers_imported],
                    ["Tables", importResult.tables_imported],
                    ["Ingredients", importResult.ingredients_imported],
                    ["Recipes", importResult.recipes_imported],
                    ["Suppliers", importResult.suppliers_imported],
                    ["Coupons", importResult.coupons_imported],
                    ["Reservations", importResult.reservations_imported],
                    ["Shifts", importResult.shifts_imported],
                    ["Expenses", importResult.expenses_imported],
                    ["Expense Categories", importResult.expense_categories_imported],
                  ].map(([label, count]) =>
                    (count as number) > 0 ? (
                      <div
                        key={label as string}
                        className="flex justify-between px-3 py-1.5 rounded-lg"
                        style={{ background: "#16161A" }}
                      >
                        <span style={{ color: "#9090A8" }}>{label}</span>
                        <span style={{ color: "#2ecc71" }}>{count as number}</span>
                      </div>
                    ) : null
                  )}
                </div>
                <div
                  className="mt-3 pt-3 flex justify-between font-semibold"
                  style={{ borderTop: "1px solid #2A2A35", color: "#F5C842" }}
                >
                  <span>Total Records Restored</span>
                  <span>{importResult.total_tables_restored}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - CSV + Database Stats */}
          <div className="space-y-6">
            {/* CSV Export/Import */}
            <div
              className="rounded-xl p-5"
              style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}
            >
              <h2
                className="text-base font-semibold mb-4 flex items-center gap-2"
                style={{ color: "#F5C842" }}
              >
                <FileText size={16} />
                CSV Export / Import
              </h2>
              <p className="text-sm mb-4" style={{ color: "#9090A8" }}>
                Export or import individual tables as CSV files for use in
                spreadsheets.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleExportProductsCsv}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: "#2A2A35", color: "#fff" }}
                >
                  Export Products CSV
                </button>
                <button
                  onClick={handleExportOrdersCsv}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: "#2A2A35", color: "#fff" }}
                >
                  Export Orders CSV
                </button>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImportProductsCsv}
                  className="hidden"
                />
                <button
                  onClick={() => csvInputRef.current?.click()}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: "#2ecc71", color: "#0D0D0F" }}
                >
                  Import Products CSV
                </button>
              </div>
            </div>

            {/* Database Stats */}
            <div
              className="rounded-xl p-5"
              style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-base font-semibold flex items-center gap-2"
                  style={{ color: "#F5C842" }}
                >
                  <HardDrive size={16} />
                  Database Overview
                </h2>
                <button
                  onClick={loadTableCounts}
                  className="p-1.5 rounded-lg transition-colors hover:bg-[#2A2A35]"
                  style={{ color: "#9090A8" }}
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {tableCounts.map((tc) => (
                  <div
                    key={tc.name}
                    className="flex justify-between items-center px-3 py-2 rounded-lg"
                    style={{
                      background: tc.count > 0 ? "#16161A" : "transparent",
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: tc.count > 0 ? "#fff" : "#4A4A5A" }}
                    >
                      {formatTableName(tc.name)}
                    </span>
                    <span
                      className="text-sm font-mono font-semibold"
                      style={{
                        color:
                          tc.count > 0
                            ? "#F5C842"
                            : "#4A4A5A",
                      }}
                    >
                      {tc.count}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="mt-3 pt-3 flex justify-between font-semibold"
                style={{ borderTop: "1px solid #2A2A35" }}
              >
                <span style={{ color: "#9090A8" }}>Total Records</span>
                <span style={{ color: "#F5C842" }}>
                  {tableCounts.reduce((sum, tc) => sum + tc.count, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
