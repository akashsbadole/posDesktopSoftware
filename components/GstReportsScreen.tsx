"use client";
import { useEffect, useState } from "react";
import { FileText, Download, Calendar, Receipt, Calculator, Percent } from "lucide-react";
import { getGstr1Report, getGstr3bReport, dbGetSettings } from "@/lib/db";
import { useSettingsStore } from "@/lib/stores";

interface GstReport {
  invoice_no: string;
  date: string;
  customer_name: string;
  customer_gstin?: string;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  place_of_supply: string;
}

export default function GstReportsScreen() {
  const { settings, activeStoreId } = useSettingsStore();
  const [gstr1Data, setGstr1Data] = useState<GstReport[]>([]);
  const [gstr3bData, setGstr3bData] = useState<[number, number, number, number, number, number]>([0, 0, 0, 0, 0, 0]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [activeTab, setActiveTab] = useState<"gstr1" | "gstr3b">("gstr1");
  const [loading, setLoading] = useState(false);

  const curr = settings?.currency_symbol ?? "₹";

  useEffect(() => {
    loadReports();
  }, [dateRange, activeStoreId]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [gstr1, gstr3b] = await Promise.all([
        getGstr1Report(dateRange.start, dateRange.end, activeStoreId),
        getGstr3bReport(dateRange.start, dateRange.end, activeStoreId),
      ]);
      setGstr1Data(Array.isArray(gstr1) ? gstr1 : []);
      setGstr3bData(Array.isArray(gstr3b) ? gstr3b : [0, 0, 0, 0, 0, 0]);
    } catch (e) {
      console.error("Failed to load GST reports:", e);
      setGstr1Data([]);
      setGstr3bData([0, 0, 0, 0, 0, 0]);
    }
    setLoading(false);
  };

  const exportGstr1CSV = () => {
    const headers = ["Invoice No", "Date", "Customer", "GSTIN", "Taxable Value", "CGST", "SGST", "IGST", "Total", "Place of Supply"];
    const rows = gstr1Data.map((r) => [
      r.invoice_no, r.date, r.customer_name, r.customer_gstin || "",
      r.taxable_value.toString(), r.cgst.toString(), r.sgst.toString(),
      r.igst.toString(), r.total.toString(), r.place_of_supply
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_${dateRange.start}_${dateRange.end}.csv`;
    a.click();
  };

  const [taxable, cgst, sgst, igst, liability, itc] = gstr3bData;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold font-display flex items-center gap-2">
          <FileText className="w-6 h-6" /> GST Reports
        </h1>
        {activeTab === "gstr1" && (
          <button onClick={exportGstr1CSV} className="btn-ghost flex items-center gap-2">
            <Download size={18} /> Export GSTR-1
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex gap-2">
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="bg-[#1E1E26] rounded-lg px-4 py-2" />
          <span className="self-center text-gray-400">to</span>
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="bg-[#1E1E26] rounded-lg px-4 py-2" />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab("gstr1")} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === "gstr1" ? "bg-yellow-400 text-black" : "bg-[#1E1E26]"}`}>
          <Receipt size={18} /> GSTR-1 (Sales)
        </button>
        <button onClick={() => setActiveTab("gstr3b")} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === "gstr3b" ? "bg-yellow-400 text-black" : "bg-[#1E1E26]"}`}>
          <Calculator size={18} /> GSTR-3B (Summary)
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : activeTab === "gstr1" ? (
        <div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1E1E26]">
                <tr>
                  <th className="p-3 text-left">Invoice</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">CGST</th>
                  <th className="p-3 text-right">SGST</th>
                  <th className="p-3 text-right">IGST</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {gstr1Data.map((row, i) => (
                  <tr key={i} className="border-t border-[#1E1E26]">
                    <td className="p-3 font-mono text-sm">{row.invoice_no.slice(0, 8)}</td>
                    <td className="p-3 text-sm">{row.date}</td>
                    <td className="p-3">{row.customer_name || "-"}</td>
                    <td className="p-3 text-right">{curr}{row.taxable_value.toFixed(2)}</td>
                    <td className="p-3 text-right">{curr}{row.cgst.toFixed(2)}</td>
                    <td className="p-3 text-right">{curr}{row.sgst.toFixed(2)}</td>
                    <td className="p-3 text-right">{curr}{row.igst.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold">{curr}{row.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gstr1Data.length === 0 && <div className="text-center py-8 text-gray-400">No transactions in this period</div>}
        </div>
      ) : (
        <div>
          <div className="card p-6 mb-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><Calculator size={20} /> GSTR-3B Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#1E1E26] rounded-lg">
                <div className="text-gray-400 text-sm">Total Taxable Value</div>
                <div className="text-lg font-bold font-display">{curr}{taxable.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-[#1E1E26] rounded-lg">
                <div className="text-gray-400 text-sm">CGST</div>
                <div className="text-lg font-bold font-display text-blue-400">{curr}{cgst.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-[#1E1E26] rounded-lg">
                <div className="text-gray-400 text-sm">SGST</div>
                <div className="text-lg font-bold font-display text-green-400">{curr}{sgst.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-[#1E1E26] rounded-lg">
                <div className="text-gray-400 text-sm">IGST</div>
                <div className="text-lg font-bold font-display text-purple-400">{curr}{igst.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-[#1E1E26] rounded-lg">
                <div className="text-gray-400 text-sm">Total Tax Liability</div>
                <div className="text-lg font-bold font-display text-red-400">{curr}{liability.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-[#1E1E26] rounded-lg">
                <div className="text-gray-400 text-sm">ITC Claimed</div>
                <div className="text-lg font-bold font-display text-yellow-400">{curr}{itc.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-base font-semibold mb-4">Tax Computation</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-[#1E1E26]">
                <span className="text-gray-400">Total Output Tax (CGST + SGST + IGST)</span>
                <span className="font-bold">{curr}{liability.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#1E1E26]">
                <span className="text-gray-400">Less: ITC Available (CGST)</span>
                <span className="text-green-400">-{curr}{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#1E1E26]">
                <span className="text-gray-400">Less: ITC Available (SGST)</span>
                <span className="text-green-400">-{curr}{sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#1E1E26]">
                <span className="text-gray-400">Less: ITC Available (IGST)</span>
                <span className="text-green-400">-{curr}{igst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-base font-semibold">
                <span>Net Tax Payable</span>
                <span className="text-red-400">{curr}{(liability - itc).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="card p-6 mt-6">
            <h3 className="text-base font-semibold mb-4">Business Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Business Name:</span> {settings?.business_name || "Not set"}</div>
              <div><span className="text-gray-400">GSTIN:</span> {settings?.tax_id || "Not set"}</div>
              <div><span className="text-gray-400">Period:</span> {dateRange.start} to {dateRange.end}</div>
              <div><span className="text-gray-400">GST Type:</span> {settings?.tax_system === 'gst' ? 'Regular' : 'Non-GST'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
