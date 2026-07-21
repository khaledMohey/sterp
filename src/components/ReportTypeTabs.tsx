"use client";

import Link from "next/link";

const types = [
  { id: "sales", label: "تقرير مبيعات" },
  { id: "expenses", label: "تقرير مصاريف" },
  { id: "purchases", label: "تقرير توريدات" },
  { id: "profits", label: "تقرير أرباح" },
] as const;

export type ReportTab = (typeof types)[number]["id"];

export function ReportTypeTabs({ current }: { current: ReportTab }) {
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => {
        const active = current === t.id;
        return (
          <Link
            key={t.id}
            href={`/reports?type=${t.id}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "border border-[var(--border)] bg-white text-[var(--ink)] hover:bg-[var(--bg)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
