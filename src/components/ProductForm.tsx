"use client";

import { useState, useTransition } from "react";
import { createProduct } from "@/lib/actions";
import { Btn, Input } from "./ui";

export function ProductForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Btn type="button" onClick={() => setOpen(true)}>
        + صنف جديد
      </Btn>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border)] bg-white p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            await createProduct({
              name: String(fd.get("name") || ""),
              sku: String(fd.get("sku") || "") || undefined,
              unit: String(fd.get("unit") || "") || undefined,
            });
            setOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "حدث خطأ");
          }
        });
      }}
    >
      <Input name="name" label="اسم الصنف" required placeholder="مثال: سكر" />
      <Input name="sku" label="كود" placeholder="اختياري" />
      <Input name="unit" label="الوحدة" defaultValue="قطعة" />
      <Btn type="submit" disabled={pending}>
        {pending ? "..." : "حفظ"}
      </Btn>
      <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>
        إلغاء
      </Btn>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
