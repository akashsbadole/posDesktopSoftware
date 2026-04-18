"use client";
import { useEffect, useState } from "react";
import { Wallet, Plus, Minus, Search, User, CreditCard, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { dbGetCustomers, getCustomerWallet, addWalletBalance, getWalletTransactions, Customer } from "@/lib/db";
import { useSettingsStore } from "@/lib/stores";

interface WalletData {
  customer_id: string;
  balance: number;
  total_loaded: number;
  total_spent: number;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  order_id?: string;
  notes: string;
  created_at: string;
}

export default function WalletScreen() {
  const { activeStoreId, settings } = useSettingsStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showLoadForm, setShowLoadForm] = useState(false);
  const [amount, setAmount] = useState(0);
  const curr = settings?.currency_symbol ?? "₹";

  useEffect(() => {
    loadCustomers();
  }, [activeStoreId]);

  const loadCustomers = async () => {
    const data = await dbGetCustomers(activeStoreId);
    setCustomers(data);
  };

  const selectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    const [walletData, txns] = await Promise.all([
      getCustomerWallet(customer.id),
      getWalletTransactions(customer.id),
    ]);
    setWallet(walletData);
    setTransactions(txns);
  };

  const handleLoadMoney = async () => {
    if (!selectedCustomer || amount <= 0) return;
    await addWalletBalance(selectedCustomer.id, amount, "Loaded via POS");
    setShowLoadForm(false);
    setAmount(0);
    selectCustomer(selectedCustomer);
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-lg font-bold font-display flex items-center gap-2 mb-6">
        <Wallet className="w-6 h-6 text-yellow-400" /> Customer Wallet
      </h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <div className="card p-4 mb-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10"
              />
            </div>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => selectCustomer(customer)}
                className={`card p-3 w-full text-left flex items-center gap-3 ${selectedCustomer?.id === customer.id ? "border-yellow-400" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">
                  {customer.name[0]}
                </div>
                <div>
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-xs text-gray-400">{customer.phone}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          {selectedCustomer ? (
            <div>
              <div className="card p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center text-lg font-bold font-display text-black">
                      {selectedCustomer.name[0]}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold font-display">{selectedCustomer.name}</h2>
                      <p className="text-gray-400">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowLoadForm(true)} className="btn-accent flex items-center gap-2">
                    <Plus size={18} /> Load Money
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-[#1E1E26] rounded-lg text-center">
                    <div className="text-gray-400 text-sm">Current Balance</div>
                    <div className="text-lg font-bold font-display text-yellow-400">{curr}{wallet?.balance.toFixed(2) || "0.00"}</div>
                  </div>
                  <div className="p-4 bg-[#1E1E26] rounded-lg text-center">
                    <div className="text-gray-400 text-sm">Total Loaded</div>
                    <div className="text-lg font-bold font-display text-green-400">{curr}{wallet?.total_loaded.toFixed(2) || "0.00"}</div>
                  </div>
                  <div className="p-4 bg-[#1E1E26] rounded-lg text-center">
                    <div className="text-gray-400 text-sm">Total Spent</div>
                    <div className="text-lg font-bold font-display text-red-400">{curr}{wallet?.total_spent.toFixed(2) || "0.00"}</div>
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <h3 className="font-bold mb-4">Transaction History</h3>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No transactions yet</div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-[#1E1E26] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.transaction_type === "credit" ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}>
                            {tx.transaction_type === "credit" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div>
                            <div className="font-medium">{tx.transaction_type === "credit" ? "Money Loaded" : "Payment"}</div>
                            <div className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className={`font-bold ${tx.transaction_type === "credit" ? "text-green-400" : "text-red-400"}`}>
                          {tx.transaction_type === "credit" ? "+" : "-"}{curr}{tx.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-400">
              <Wallet className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Select a customer to view wallet</p>
            </div>
          )}
        </div>
      </div>

       {showLoadForm && (
         <div 
           className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
           onClick={(e) => e.target === e.currentTarget && setShowLoadForm(false)}
         >
           <div className="card p-6 w-96">
             <h2 className="text-base font-semibold mb-4">Load Money to Wallet</h2>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Amount</label>
                 <input
                   type="number"
                   value={amount}
                   onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                   className="w-full text-lg font-bold font-display text-center"
                   placeholder="0.00"
                   autoFocus
                 />
               </div>
               <div className="grid grid-cols-4 gap-2">
                 {[100, 200, 500, 1000].map((v) => (
                   <button key={v} onClick={() => setAmount(v)} className="btn-ghost py-2">{v}</button>
                 ))}
               </div>
               <button onClick={handleLoadMoney} className="btn-accent w-full">Load {curr}{amount}</button>
               <button onClick={() => setShowLoadForm(false)} className="btn-ghost w-full">Cancel</button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
