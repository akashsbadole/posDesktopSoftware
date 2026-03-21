"use client";
import { useState, useEffect, useRef } from "react";
import { Printer, X, Check, Clock, Trash2, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";

interface PrintJob {
  id: string;
  content: string;
  label: string;
  status: "pending" | "printing" | "done" | "error";
  timestamp: number;
  error?: string;
}

export function usePrintQueue() {
  const [queue, setQueue] = useState<PrintJob[]>([]);

  const addToQueue = (content: string, label: string = "Receipt") => {
    const job: PrintJob = {
      id: `print_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content,
      label,
      status: "pending",
      timestamp: Date.now(),
    };
    setQueue((prev) => [...prev, job]);
  };

  const processJob = async (job: PrintJob) => {
    setQueue((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "printing" } : j)));
    try {
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (printWindow) {
        printWindow.document.write(`<pre style="font-family:monospace;font-size:12px;padding:20px">${job.content}</pre>`);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
      setQueue((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "done" } : j)));
    } catch (e: any) {
      setQueue((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "error", error: String(e) } : j)));
    }
  };

  const removeJob = (id: string) => {
    setQueue((prev) => prev.filter((j) => j.id !== id));
  };

  const clearDone = () => {
    setQueue((prev) => prev.filter((j) => j.status !== "done"));
  };

  return { queue, addToQueue, processJob, removeJob, clearDone };
}

interface PrintQueuePanelProps {
  queue: PrintJob[];
  onProcess: (job: PrintJob) => void;
  onRemove: (id: string) => void;
  onClearDone: () => void;
}

export default function PrintQueuePanel({ queue, onProcess, onRemove, onClearDone }: PrintQueuePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pendingCount = queue.filter((j) => j.status === "pending").length;

  if (queue.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg"
        style={{ background: "#1E1E26", border: "1px solid #2A2A35", color: pendingCount > 0 ? "#F5C842" : "#9090A8" }}
      >
        <Printer size={16} />
        <span className="text-xs font-semibold">Print Queue</span>
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#F5C842", color: "#0D0D0F" }}>
            {pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 rounded-xl shadow-xl overflow-hidden" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
          <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "#2A2A35" }}>
            <span className="text-sm font-semibold" style={{ color: "#fff" }}>Print Queue</span>
            <div className="flex gap-1">
              <button onClick={onClearDone} className="p-1 rounded hover:bg-[#2A2A35]" style={{ color: "#9090A8" }} title="Clear done">
                <Trash2 size={14} />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-[#2A2A35]" style={{ color: "#9090A8" }}>
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {queue.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3" style={{ borderTop: "1px solid #2A2A35" }}>
                <div className="flex items-center gap-2">
                  {job.status === "pending" && <Clock size={14} style={{ color: "#F5C842" }} />}
                  {job.status === "printing" && <RefreshCw size={14} className="spin" style={{ color: "#3498DB" }} />}
                  {job.status === "done" && <Check size={14} style={{ color: "#2ECC71" }} />}
                  {job.status === "error" && <X size={14} style={{ color: "#E74C3C" }} />}
                  <div>
                    <div className="text-xs font-medium" style={{ color: "#fff" }}>{job.label}</div>
                    <div className="text-xs" style={{ color: "#4A4A5A" }}>{new Date(job.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {job.status === "pending" && (
                    <button onClick={() => onProcess(job)} className="text-xs px-2 py-1 rounded" style={{ background: "#F5C842", color: "#0D0D0F" }}>Print</button>
                  )}
                  <button onClick={() => onRemove(job.id)} className="p-1 rounded hover:bg-[#2A2A35]" style={{ color: "#4A4A5A" }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
