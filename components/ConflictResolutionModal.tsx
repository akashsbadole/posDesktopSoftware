"use client";
import { useState, useRef, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";
import { useSyncStore } from "@/lib/stores/syncStore";

interface Conflict {
  id: string;
  table: string;
  localData: any;
  cloudData: any;
}

interface ConflictResolutionModalProps {
  onClose: () => void;
}

export default function ConflictResolutionModal({ onClose }: ConflictResolutionModalProps) {
  const { conflicts, resolveConflict } = useSyncStore();
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleResolve = (conflictId: string, choice: 'local' | 'cloud') => {
    resolveConflict(conflictId, choice);
    // If no more conflicts, close
    if (conflicts.length <= 1) onClose();
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-modal-title"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 id="conflict-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
            Resolve Sync Conflicts
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Conflicts detected during sync. Choose which version to keep for each item.
        </p>

        {conflicts.map((conflict: Conflict) => (
          <div key={conflict.id} className="border border-gray-200 dark:border-gray-700 rounded p-4 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {conflict.table} Conflict
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-green-600 dark:text-green-400">Local Version</h5>
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                  {JSON.stringify(conflict.localData, null, 2)}
                </pre>
                <button
                  onClick={() => handleResolve(conflict.id, 'local')}
                  className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                  Keep Local
                </button>
              </div>
              <div>
                <h5 className="font-medium text-blue-600 dark:text-blue-400">Cloud Version</h5>
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                  {JSON.stringify(conflict.cloudData, null, 2)}
                </pre>
                <button
                  onClick={() => handleResolve(conflict.id, 'cloud')}
                  className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Keep Cloud
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}