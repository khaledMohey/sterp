import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Tajawal } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const display = Tajawal({
  variable: "--font-display",
  subsets: ["arabic"],
  weight: ["700"],
  display: "swap",
  preload: true,
});

const body = IBM_Plex_Sans_Arabic({
  variable: "--font-body",
  subsets: ["arabic"],
  weight: ["400", "600"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Standard ERP",
  description: "نظام إدارة المخزن والفواتير بالدفعات",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto px-4 pb-8 pt-20 md:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
