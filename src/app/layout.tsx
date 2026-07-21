import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Tajawal } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { ensureTursoSchema } from "@/lib/ensure-schema";
import "./globals.css";

const display = Tajawal({
  variable: "--font-display",
  subsets: ["arabic"],
  weight: ["500", "700", "800"],
});

const body = IBM_Plex_Sans_Arabic({
  variable: "--font-body",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Standard ERP",
  description: "نظام إدارة المخزن والفواتير بالدفعات",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    await ensureTursoSchema();
  } catch (err) {
    console.error("[ensureTursoSchema]", err);
  }

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
