"use client";
import { useState } from "react";
import { exportProductsCsv, exportOrdersCsv, importProductsCsv, getSalesReport, exportBackup, exportToTally, exportToQuickbooks } from "@/lib/db";
import EnhancedReports from "@/components/EnhancedReports";

interface SalesReport {
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_orders: number;
  avg_order: number;
}

export default function ReportsScreen() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showEnhanced, setShowEnhanced] = useState(false);

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const r = await getSalesReport(startDate, endDate);
      setReport(r);
    } catch (e) {
      setMessage("Error generating report");
    }
    setLoading(false);
  };

  const handleExportProducts = async () => {
    try {
      const csv = await exportProductsCsv();
      downloadFile(csv, "products.csv", "text/csv");
      setMessage("Products exported successfully");
    } catch (e) {
      setMessage("Error exporting products");
    }
  };

  const handleExportOrders = async () => {
    try {
      const csv = await exportOrdersCsv();
      downloadFile(csv, "orders.csv", "text/csv");
      setMessage("Orders exported successfully");
    } catch (e) {
      setMessage("Error exporting orders");
    }
  };

  const handleImportProducts = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const csv = evt.target?.result as string;
        try {
          const result = await importProductsCsv(csv);
          setMessage(`Imported ${result.imported} products, ${result.errors} errors`);
        } catch (err) {
          setMessage("Error importing products");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportBackup = async () => {
    try {
      const backup = await exportBackup();
      const timestamp = new Date().toISOString().split("T")[0];
      downloadFile(backup, `pos-backup-${timestamp}.json`, "application/json");
      setMessage("Backup exported successfully");
    } catch (e) {
      setMessage("Error exporting backup");
    }
  };

  const handleExportTally = async () => {
    try {
      const xml = await exportToTally(startDate, endDate);
      downloadFile(xml, `tally-export-${startDate}-to-${endDate}.xml`, "application/xml");
      setMessage("Tally export completed successfully");
    } catch (e) {
      setMessage("Error exporting to Tally");
    }
  };

  const handleExportQuickbooks = async () => {
    try {
      const json = await exportToQuickbooks(startDate, endDate);
      downloadFile(json, `quickbooks-export-${startDate}-to-${endDate}.json`, "application/json");
      setMessage("QuickBooks export completed successfully");
    } catch (e) {
      setMessage("Error exporting to QuickBooks");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="font-display text-xl font-bold">Reports & Data</h1>
        <button onClick={() => setShowEnhanced(true)} className="btn-accent py-2 px-4 text-sm">
          Enhanced Reports
        </button>
      </div>
      
      {showEnhanced && <EnhancedReports onClose={() => setShowEnhanced(false)} />}
      
      {message && (
        <div style={{ padding: 12, marginBottom: 16, background: "#e8f5e9", borderRadius: 8, color: "#2e7d32" }}>
          {message}
          <button onClick={() => setMessage("")} style={{ marginLeft: 8, border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ padding: 20, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Sales Report</h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)" }} />
            </div>
          </div>
          <button onClick={handleGenerateReport} disabled={loading}
            style={{ padding: "10px 20px", background: "#F5C842", color: "#0D0D0F", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
          
          {report && (
            <div style={{ marginTop: 20, padding: 16, background: "var(--bg)", borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#666" }}>Period</div>
                <div style={{ fontSize: 14 }}>{report.start_date} to {report.end_date}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#666" }}>Total Revenue</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#2e7d32" }}>₹{report.total_revenue.toFixed(2)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Total Orders</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{report.total_orders}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Avg Order Value</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>₹{report.avg_order.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: 20, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Data Management</h3>
          
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Products</h4>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleExportProducts}
                style={{ padding: "8px 16px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}>
                Export CSV
              </button>
              <button onClick={handleImportProducts}
                style={{ padding: "8px 16px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}>
                Import CSV
              </button>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Orders</h4>
            <button onClick={handleExportOrders}
              style={{ padding: "8px 16px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}>
              Export CSV
            </button>
          </div>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Full Backup</h4>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Export all data as JSON (products, orders, settings)</p>
            <button onClick={handleExportBackup}
              style={{ padding: "8px 16px", background: "#2ECC71", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
              Export Backup
            </button>
          </div>
        </div>
        <div style={{ padding: 20, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Accounting Export</h3>
          <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>Export transactions for accounting software. Uses the date range from the Sales Report above.</p>
          
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleExportTally}
              style={{ padding: "10px 20px", background: "#3498DB", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", flex: 1 }}>
              Export to Tally (XML)
            </button>
            <button onClick={handleExportQuickbooks}
              style={{ padding: "10px 20px", background: "#2ECC71", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", flex: 1 }}>
              Export to QuickBooks (JSON)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
