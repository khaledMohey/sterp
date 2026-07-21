"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const nav = [
  { href: "/", label: "الرئيسية", icon: "⌂" },
  { href: "/inventory", label: "المخزن", icon: "▣" },
  { href: "/purchases", label: "فواتير الشراء", icon: "↓" },
  { href: "/sales", label: "فواتير البيع", icon: "↑" },
  { href: "/customers", label: "العملاء", icon: "◉" },
  { href: "/suppliers", label: "الموردين", icon: "◎" },
  { href: "/cash", label: "الخزنة", icon: "◈" },
  { href: "/reports", label: "التقارير", icon: "▤" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-black/10 bg-[#0a0a0a]/95 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10"
        >
          {open ? (
            <span className="text-xl leading-none">×</span>
          ) : (
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded bg-white" />
              <span className="block h-0.5 w-5 rounded bg-white" />
              <span className="block h-0.5 w-5 rounded bg-white" />
            </span>
          )}
        </button>
        <div className="text-center">
          <p className="text-[10px] tracking-[0.2em] text-white/50">STANDARD</p>
          <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-white">
            ERP
          </p>
        </div>
        <span className="w-10" />
      </div>

      {/* Overlay */}
      <button
        type="button"
        aria-label="إغلاق"
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(18rem,85vw)] flex-col text-[var(--sidebar-fg)] shadow-2xl transition-transform duration-300 md:static md:z-auto md:w-60 md:shrink-0 md:translate-x-0 md:shadow-none ${
          open ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
        style={{
          background:
            "linear-gradient(165deg, #000000 0%, #0d0d0d 40%, #171717 70%, #0a0a0a 100%)",
        }}
      >
        <div className="border-b border-white/10 px-5 py-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs tracking-[0.2em] text-white/45">STANDARD</p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
                ERP
              </h1>
              <p className="mt-1 text-xs text-white/45">
                نظام إدارة المخزن والفواتير
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 md:hidden"
              aria-label="إغلاق القائمة"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/70 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="w-5 text-center text-white/50">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-xs text-white/35">
          دفعات FIFO · شراء وبيع
        </div>
      </aside>
    </>
  );
}
