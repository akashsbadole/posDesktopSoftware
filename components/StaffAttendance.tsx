"use client";
import { useEffect, useState } from "react";
import type { User } from "@/lib/db";
import type { StaffAttendance } from "@/lib/db";
import { X, Clock, LogIn, LogOut } from "lucide-react";
import { useStaffStore, useAuthStore } from "@/lib/stores";

interface StaffAttendanceProps {
  onClose?: () => void;
}

export default function StaffAttendance({ onClose }: StaffAttendanceProps) {
  const { todayAttendance, isLoading, fetchTodayAttendance, clockIn, clockOut, currentUserClockedIn, checkClockedIn } = useStaffStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchTodayAttendance();
    if (user) {
      checkClockedIn(user.id);
    }
  }, []);

  const handleClockIn = async () => {
    if (!user) return;
    await clockIn(user.id, user.name);
  };

  const handleClockOut = async () => {
    if (!user) return;
    await clockOut(user.id);
  };

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const getDuration = (clockIn: string, clockOut: string | null) => {
    const start = new Date(clockIn).getTime();
    const end = clockOut ? new Date(clockOut).getTime() : Date.now();
    const hours = Math.floor((end - start) / 3600000);
    const minutes = Math.floor(((end - start) % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="card p-6 w-[500px] max-h-[80vh] overflow-y-auto fade-in" role="dialog" aria-modal="true" aria-labelledby="attendance-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="attendance-title" className="font-display text-lg" style={{ color: "#F5C842" }}>Staff Attendance</h2>
          <button onClick={onClose} className="btn-ghost py-1 px-3" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: "#1E1E26" }}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${currentUserClockedIn ? "bg-green-500" : "bg-gray-500"}`} />
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-xs" style={{ color: "#4A4A5A" }}>
                  {currentUserClockedIn ? "Currently on shift" : "Not on shift"}
                </div>
              </div>
            </div>
            {currentUserClockedIn ? (
              <button onClick={handleClockOut} className="btn-danger flex items-center gap-2 py-2 px-4 text-sm">
                <LogOut size={14} /> Clock Out
              </button>
            ) : (
              <button onClick={handleClockIn} className="btn-accent flex items-center gap-2 py-2 px-4 text-sm">
                <LogIn size={14} /> Clock In
              </button>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#9090A8" }}>Today's Attendance</h3>
          {isLoading ? (
            <div className="text-center py-4" style={{ color: "#4A4A5A" }}>Loading...</div>
          ) : todayAttendance.length === 0 ? (
            <div className="text-center py-4" style={{ color: "#4A4A5A" }}>No attendance records today</div>
          ) : (
            <div className="space-y-2">
              {todayAttendance.map((record) => (
                <div key={record.id} className="p-3 rounded-lg" style={{ background: "#1E1E26" }}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{record.user_name}</div>
                    <div className="text-xs" style={{ color: record.clock_out ? "#9090A8" : "#2ECC71" }}>
                      {record.clock_out ? "Completed" : "On Shift"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "#4A4A5A" }}>
                    <Clock size={12} />
                    {formatTime(record.clock_in)}
                    {record.clock_out && (
                      <> → {formatTime(record.clock_out)} <span className="ml-1" style={{ color: "#F5C842" }}>({getDuration(record.clock_in, record.clock_out)})</span></>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
