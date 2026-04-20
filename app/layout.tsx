import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
export const metadata: Metadata = {
  title: "Appixen - POS Billing",
  description: "Appixen - POS Billing",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body>
        <I18nProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
