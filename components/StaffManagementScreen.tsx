"use client";
import { useState, useEffect } from "react";
import {
  Users,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Save,
  Calendar,
  CheckCircle2,
  X,
  RefreshCw,
  Search,
  ChevronRight,
  UserPlus,
  CreditCard,
  Wallet
} from "lucide-react";
import { useStaffStore, useSettingsStore, useAuthStore } from "@/lib/stores";
import { User, StaffSalary, StaffAttendance as StaffAttendanceType } from "@/lib/db";
import { v4 as uuid } from "uuid";
import StaffAttendance from "./StaffAttendance";

export default function StaffManagementScreen() {
  const {
    users,
    salaries,
    isLoading,
    fetchUsers,
    fetchSalaries,
    upsertUser,
    deleteUser,
    getAttendanceByRange,
    saveSalary
  } = useStaffStore();
  const { activeStoreId, settings } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<"staff" | "salary" | "history" | "attendance">("staff");
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<User>({
    id: "",
    organization_id: useAuthStore.getState().organization?.id || "",
    name: "",
    email: "",
    role: "cashier",
    hourly_rate: 0,
    store_id: activeStoreId,
  });

  const [salaryPeriod, setSalaryPeriod] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [calculatedSalaries, setCalculatedSalaries] = useState<any[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [salaryPaymentMethod, setSalaryPaymentMethod] = useState<string>("cash");

  useEffect(() => {
    fetchUsers();
    fetchSalaries();
  }, [activeStoreId]);

  const handleSaveUser = async () => {
    if (!userFormData.name) return;
    const orgId = useAuthStore.getState().organization?.id || "";
    const user = {
      ...userFormData,
      id: userFormData.id || uuid(),
      organization_id: orgId,
      store_id: activeStoreId
    };
    await upsertUser(user);
    setShowAddUser(false);
    setEditingUser(null);
    setUserFormData({
      id: "",
      organization_id: orgId,
      name: "",
      email: "",
      role: "cashier",
      hourly_rate: 0,
      store_id: activeStoreId
    });
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      await deleteUser(id);
    }
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData(user);
    setShowAddUser(true);
  };

  const calculateSalaries = async () => {
    setCalculating(true);
    try {
      const attendance: StaffAttendanceType[] = await getAttendanceByRange(salaryPeriod.start, salaryPeriod.end);

      const results = users.map(user => {
        const userAttendance = attendance.filter(a => a.user_id === user.id);
        let totalMinutes = 0;

        userAttendance.forEach(a => {
          if (a.clock_in && a.clock_out) {
            const start = new Date(a.clock_in).getTime();
            const end = new Date(a.clock_out).getTime();
            totalMinutes += (end - start) / (1000 * 60);
          }
        });

        const totalHours = totalMinutes / 60;
        const amount = totalHours * (user.hourly_rate || 0);

        return {
          staff_id: user.id,
          staff_name: user.name,
          total_hours: totalHours.toFixed(2),
          hourly_rate: user.hourly_rate,
          amount: amount.toFixed(2),
        };
      });

      setCalculatedSalaries(results.filter(r => parseFloat(r.total_hours) > 0 || r.hourly_rate > 0));
    } catch (err) {
      console.error("Failed to calculate salaries:", err);
    }
    setCalculating(false);
  };

  const handlePaySalary = async (item: any) => {
    const salary: StaffSalary = {
      id: uuid(),
      store_id: activeStoreId,
      staff_id: item.staff_id,
      staff_name: item.staff_name,
      amount: parseFloat(item.amount),
      total_hours: parseFloat(item.total_hours),
      period_start: salaryPeriod.start,
      period_end: salaryPeriod.end,
      status: "paid",
      created_at: new Date().toISOString(),
    };
    await saveSalary(salary);
    // Refresh history
    fetchSalaries();
    // Remove from calculated list
    setCalculatedSalaries(prev => prev.filter(s => s.staff_id !== item.staff_id));
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-bg text-text">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold font-display flex items-center gap-3">
          <Users className="w-6 h-6 text-accent" /> Staff & Salary Management
        </h1>
        <div className="flex gap-2">
          {activeTab === "staff" && (
            <button
              onClick={() => {
                const orgId = useAuthStore.getState().organization?.id || "";
                setEditingUser(null);
                setUserFormData({ id: "", organization_id: orgId, name: "", email: "", role: "cashier", hourly_rate: 0, store_id: activeStoreId });
                setShowAddUser(true);
              }}
              className="btn-accent flex items-center gap-2"
            >
              <UserPlus size={18} /> Add Staff
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("staff")}
          className={`pb-3 px-2 text-sm font-bold transition-all ${activeTab === "staff" ? "border-b-2 border-accent text-accent" : "text-gray-500 hover:text-gray-300"}`}
        >
          Staff Directory
        </button>
        <button
          onClick={() => setActiveTab("salary")}
          className={`pb-3 px-2 text-sm font-bold transition-all ${activeTab === "salary" ? "border-b-2 border-accent text-accent" : "text-gray-500 hover:text-gray-300"}`}
        >
          Calculate Salary
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 px-2 text-sm font-bold transition-all ${activeTab === "history" ? "border-b-2 border-accent text-accent" : "text-gray-500 hover:text-gray-300"}`}
        >
          Payment History
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`pb-3 px-2 text-sm font-bold transition-all ${activeTab === "attendance" ? "border-b-2 border-accent text-accent" : "text-gray-500 hover:text-gray-300"}`}
        >
          Attendance
        </button>
      </div>

      {activeTab === "staff" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.id} className="card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-surface-light flex items-center justify-center text-accent text-lg font-bold">
                    {u.name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold">{u.name}</h3>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{u.role}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Hourly Rate</span>
                    <span className="font-mono text-accent">{settings?.currency_symbol}{u.hourly_rate?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border mt-auto">
                <button onClick={() => openEditUser(u)} className="btn-ghost flex-1 text-xs py-1.5">Edit</button>
                {u.id !== 'admin' && (
                  <button onClick={() => handleDeleteUser(u.id)} className="btn-ghost flex-1 text-xs py-1.5 text-red-500 hover:bg-red-500/10">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "salary" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-accent" /> Select Pay Period
            </h2>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">From</label>
                <input
                  type="date"
                  value={salaryPeriod.start}
                  onChange={(e) => setSalaryPeriod(prev => ({ ...prev, start: e.target.value }))}
                  className="w-44"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-500">To</label>
                <input
                  type="date"
                  value={salaryPeriod.end}
                  onChange={(e) => setSalaryPeriod(prev => ({ ...prev, end: e.target.value }))}
                  className="w-44"
                />
              </div>
              <button
                onClick={calculateSalaries}
                disabled={calculating}
                className="btn-accent flex items-center gap-2"
              >
                {calculating ? <RefreshCw size={16} className="spin" /> : <Calculator size={16} />}
                Calculate Payouts
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Payment Method</label>
                <div className="flex gap-2">
                    {["cash", "upi", "card"].map(m => (
                        <button
                            key={m}
                            onClick={() => setSalaryPaymentMethod(m)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${salaryPaymentMethod === m ? "bg-accent text-black" : "bg-surface-light text-gray-400"}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          {calculatedSalaries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-400 px-2 uppercase tracking-wider">Generated Summaries</h3>
              <div className="space-y-2">
                {calculatedSalaries.map((s, idx) => (
                  <div key={idx} className="card p-4 flex items-center justify-between border-l-4 border-accent">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center font-bold text-accent">
                        {s.staff_name[0]}
                      </div>
                      <div>
                        <div className="font-bold">{s.staff_name}</div>
                        <div className="text-xs text-gray-500">
                          {s.total_hours} Hours @ {settings?.currency_symbol}{s.hourly_rate}/hr
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase font-bold">Total Pay</div>
                        <div className="text-lg font-mono font-bold text-accent">{settings?.currency_symbol}{s.amount}</div>
                      </div>
                      <button
                        onClick={() => handlePaySalary(s)}
                        className="btn-success flex items-center gap-2 py-2 px-4"
                      >
                        <CheckCircle2 size={16} /> Pay {salaryPaymentMethod}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="flex-1 overflow-hidden relative min-h-[500px]">
          <StaffAttendance isOpen={true} onClose={() => setActiveTab("staff")} />
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {salaries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign size={48} className="mx-auto mb-4 opacity-20" />
              <p>No salary payment records found</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-surface-light text-[10px] uppercase font-bold text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Staff Name</th>
                    <th className="px-6 py-3">Period</th>
                    <th className="px-6 py-3 text-right">Hours</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Date Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {salaries.map(s => (
                    <tr key={s.id} className="hover:bg-surface-light transition-colors">
                      <td className="px-6 py-4 font-bold">{s.staff_name}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {s.period_start} to {s.period_end}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm">{s.total_hours.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-accent">{settings?.currency_symbol}{s.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="badge-success text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-gray-500">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 fade-in border border-border shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {editingUser ? <Users size={20} className="text-accent" /> : <UserPlus size={20} className="text-accent" />}
                {editingUser ? "Edit Staff Member" : "Add New Staff"}
              </h2>
              <button onClick={() => setShowAddUser(false)} className="btn-ghost p-1"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Full Name</label>
                <input
                  autoFocus
                  placeholder="e.g. John Doe"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">PIN (4 digits)</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={userFormData.pin || ""}
                  onChange={(e) => setUserFormData({ ...userFormData, pin: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Role</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                >
                  <option value="cashier">Cashier</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Hourly Rate ({settings?.currency_symbol})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">{settings?.currency_symbol}</span>
                  <input
                    type="number"
                    className="pl-8 font-mono"
                    placeholder="0.00"
                    value={userFormData.hourly_rate || ""}
                    onChange={(e) => setUserFormData({ ...userFormData, hourly_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">This rate will be used to calculate salary based on clock-in hours.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button onClick={() => setShowAddUser(false)} className="btn-ghost flex-1">Cancel</button>
                <button
                  onClick={handleSaveUser}
                  className="btn-accent flex-1 flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Save Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Calculator(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  )
}
