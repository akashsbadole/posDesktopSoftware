"use client";
import { useState, useEffect } from "react";
import { useSettingsStore } from "@/lib/stores";
import { Headphones, Mail, Phone, Globe, MessageCircle, FileText, ExternalLink, Copy, Check, Clock, MapPin, Shield, HelpCircle, ChevronDown } from "lucide-react";

export default function SupportScreen() {
  const { settings, fetchSettings } = useSettingsStore();
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { fetchSettings(); }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const supportInfo = {
    name: "POS Billing Support",
    email: settings.contact_email || "support@posbilling.com",
    phone: settings.phone || "+91 98765 43210",
    website: settings.contact_website || "https://posbilling.com",
    hours: "Mon - Sat, 9:00 AM - 9:00 PM",
    address: settings.address || "123 Main Street, City",
  };

  const faqs = [
    { q: "How do I add a new product?", a: "Go to Products → Add Product. Fill in name, price, category, and stock." },
    { q: "How do I process a refund?", a: "Go to Orders → Find the order → Click Refund. Stock is restored automatically." },
    { q: "How do I backup my data?", a: "Go to Backup (admin only) → Export Full Backup. Save the .gz.b64 file safely." },
    { q: "How do I change my PIN?", a: "Click your name in sidebar → Change PIN. Enter current PIN, then new PIN." },
    { q: "How do I apply a coupon?", a: "At POS checkout, enter the coupon code and click Apply before selecting payment method." },
    { q: "How do I track delivery orders?", a: "Go to Orders → Filter by delivery. Update delivery status from pending to delivered." },
  ];

  const shortcuts = [
    { key: "F1", desc: "POS Screen" },
    { key: "F2", desc: "Dashboard" },
    { key: "F3", desc: "Orders" },
    { key: "F4", desc: "Products" },
    { key: "F5", desc: "Kitchen Display" },
    { key: "F6", desc: "Reports" },
    { key: "C", desc: "Clear Cart" },
    { key: "P", desc: "Process Checkout" },
    { key: "?", desc: "Keyboard Shortcuts" },
  ];

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C842" }}>
            <Headphones size={20} color="#0D0D0F" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#fff" }}>Support & Help</h1>
            <p className="text-sm" style={{ color: "#9090A8" }}>Get help, contact us, and learn shortcuts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="rounded-xl p-5" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#F5C842" }}>
              <Phone size={16} /> Contact Us
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#16161A" }}>
                <div className="flex items-center gap-3">
                  <Mail size={16} style={{ color: "#3498DB" }} />
                  <div>
                    <div className="text-xs" style={{ color: "#9090A8" }}>Email</div>
                    <div className="text-sm font-medium" style={{ color: "#fff" }}>{supportInfo.email}</div>
                  </div>
                </div>
                <button onClick={() => copyToClipboard(supportInfo.email, "email")} className="p-1.5 rounded hover:bg-[#2A2A35]" style={{ color: "#9090A8" }}>
                  {copied === "email" ? <Check size={14} color="#2ECC71" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#16161A" }}>
                <div className="flex items-center gap-3">
                  <Phone size={16} style={{ color: "#2ECC71" }} />
                  <div>
                    <div className="text-xs" style={{ color: "#9090A8" }}>Phone</div>
                    <div className="text-sm font-medium" style={{ color: "#fff" }}>{supportInfo.phone}</div>
                  </div>
                </div>
                <button onClick={() => copyToClipboard(supportInfo.phone, "phone")} className="p-1.5 rounded hover:bg-[#2A2A35]" style={{ color: "#9090A8" }}>
                  {copied === "phone" ? <Check size={14} color="#2ECC71" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#16161A" }}>
                <div className="flex items-center gap-3">
                  <Globe size={16} style={{ color: "#F5C842" }} />
                  <div>
                    <div className="text-xs" style={{ color: "#9090A8" }}>Website</div>
                    <div className="text-sm font-medium" style={{ color: "#fff" }}>{supportInfo.website}</div>
                  </div>
                </div>
                <a href={supportInfo.website} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-[#2A2A35]" style={{ color: "#9090A8" }}>
                  <ExternalLink size={14} />
                </a>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#16161A" }}>
                <Clock size={16} style={{ color: "#9090A8" }} />
                <div>
                  <div className="text-xs" style={{ color: "#9090A8" }}>Support Hours</div>
                  <div className="text-sm font-medium" style={{ color: "#fff" }}>{supportInfo.hours}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#16161A" }}>
                <MapPin size={16} style={{ color: "#E74C3C" }} />
                <div>
                  <div className="text-xs" style={{ color: "#9090A8" }}>Address</div>
                  <div className="text-sm font-medium" style={{ color: "#fff" }}>{supportInfo.address}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 flex gap-2">
              <a href={`mailto:${supportInfo.email}`} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-2" style={{ background: "#3498DB", color: "#fff" }}>
                <Mail size={14} /> Send Email
              </a>
              <a href={`tel:${supportInfo.phone}`} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-2" style={{ background: "#2ECC71", color: "#0D0D0F" }}>
                <Phone size={14} /> Call Now
              </a>
              <a href={`https://wa.me/${supportInfo.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-2" style={{ background: "#25D366", color: "#fff" }}>
                <MessageCircle size={14} /> WhatsApp
              </a>
            </div>
          </div>

          {/* App Info + License */}
          <div className="space-y-6">
            <div className="rounded-xl p-5" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#F5C842" }}>
                <Shield size={16} /> App Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#9090A8" }}>App Name</span>
                  <span style={{ color: "#fff" }}>POS Billing</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#9090A8" }}>Version</span>
                  <span style={{ color: "#F5C842" }}>1.0.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#9090A8" }}>Store</span>
                  <span style={{ color: "#fff" }}>{settings.store_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#9090A8" }}>Store Type</span>
                  <span style={{ color: "#fff" }}>{settings.store_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#9090A8" }}>Country</span>
                  <span style={{ color: "#fff" }}>{settings.country}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#9090A8" }}>Currency</span>
                  <span style={{ color: "#fff" }}>{settings.currency} ({settings.currency_symbol})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#9090A8" }}>License</span>
                  <span style={{ color: "#2ECC71" }}>Active</span>
                </div>
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="rounded-xl p-5" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#F5C842" }}>
                <FileText size={16} /> Quick Shortcuts
              </h2>
              <div className="space-y-2">
                {shortcuts.map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "#9090A8" }}>{s.desc}</span>
                    <kbd className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: "#2A2A35", color: "#F5C842", border: "1px solid #3A3A45" }}>{s.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-6 rounded-xl p-5" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#F5C842" }}>
            <HelpCircle size={16} /> Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-[#16161A] transition-colors" style={{ color: "#fff" }}>
                  <span className="text-sm font-medium">{faq.q}</span>
                  <ChevronDown size={14} style={{ color: "#9090A8" }} className="group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-3 pb-3 text-sm" style={{ color: "#9090A8" }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs pb-4" style={{ color: "#4A4A5A" }}>
          {settings.footer_text || "Powered by POS Billing"} · Made with Tauri + Next.js + SQLite
        </div>
      </div>
    </div>
  );
}
