import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { 
  title: "POS Billing", 
  description: "POS Billing with SQLite + Neon",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
