"use client";

import { useMemo, useState, useTransition } from "react";
import { createPurchaseInvoice } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Btn, Input, Select, Textarea } from "./ui";
import {
  PaymentSection,
  defaultPaymentState,
  paymentPayload,
} from "./PaymentSection";

type Supplier = { id: string; name: string; phone: string | null };
type Product = { id: string; name: string; unit: string };

type Line = {
  key: string;
  mode: "existing" | "new";
  productId: string;
  newProductName: string;
  quantity: string;
  purchasePrice: string;
  sellPrice: string;
};

function emptyLine(): Line {
  return {
    key: crypto.randomUUID(),
    mode: "existing",
    productId: "",
    newProductName: "",
    quantity: "1",
    purchasePrice: "",
    sellPrice: "",
  };
}

export function PurchaseForm({
  suppliers,
  products,
}: {
  suppliers: Supplier[];
  products: Product[];
}) {
  const router = useRouter();
  const [partyMode, setPartyMode] = useState<"existing" | "new">("existing");
  const [supplierId, setSupplierId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payment, setPayment] = useState(defaultPaymentState("cash"));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const total = useMemo(
    () =>
      lines.reduce((s, l) => {
        const q = Number(l.quantity) || 0;
        const p = Number(l.purchasePrice) || 0;
        return s + q * p;
      }, 0),
    [lines]
  );

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          try {
            const inv = await createPurchaseInvoice({
              supplierId: partyMode === "existing" ? supplierId : undefined,
              newSupplier:
                partyMode === "new"
                  ? { name: newName, phone: newPhone || undefined }
                  : undefined,
              date,
              notes: notes || undefined,
              payment: paymentPayload(payment, total),
              items: lines.map((l) => ({
                productId: l.mode === "existing" ? l.productId : undefined,
                newProductName:
                  l.mode === "new" ? l.newProductName : undefined,
                quantity: Number(l.quantity),
                purchasePrice: Number(l.purchasePrice),
                sellPrice: Number(l.sellPrice),
              })),
            });
            router.push(`/purchases/${inv.id}`);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "حدث خطأ");
          }
        });
      }}
    >
      <div className="rounded-xl border border-[var(--border)] bg-white p-5">
        <div className="mb-4 flex gap-2">
          <Btn
            type="button"
            variant={partyMode === "existing" ? "primary" : "secondary"}
            onClick={() => setPartyMode("existing")}
          >
            اختيار مورد
          </Btn>
          <Btn
            type="button"
            variant={partyMode === "new" ? "primary" : "secondary"}
            onClick={() => setPartyMode("new")}
          >
            إدخال مورد يدوي
          </Btn>
        </div>
        {partyMode === "existing" ? (
          <Select
            label="المورد"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
          >
            <option value="">— اختر مورد —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.phone ? ` · ${s.phone}` : ""}
              </option>
            ))}
          </Select>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="اسم المورد الجديد"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="يُسجَّل تلقائياً في الموردين"
            />
            <Input
              label="هاتف المورد"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>
        )}
        <div className="mt-4">
          <Input
            label="التاريخ"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <PaymentSection
          subtotal={total}
          date={date}
          value={payment}
          onChange={setPayment}
          cashLabel="المدفوع من الخزنة"
        />
        <Textarea
          className="mt-3"
          label="ملاحظات"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-[var(--ink)]">أصناف الفاتورة (دفعات)</h3>
          <Btn
            type="button"
            variant="secondary"
            onClick={() => setLines((p) => [...p, emptyLine()])}
          >
            + صنف
          </Btn>
        </div>
        <div className="space-y-4">
          {lines.map((line, idx) => (
            <div
              key={line.key}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">دفعة #{idx + 1}</span>
                {lines.length > 1 && (
                  <Btn
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setLines((p) => p.filter((l) => l.key !== line.key))
                    }
                  >
                    حذف
                  </Btn>
                )}
              </div>
              <div className="mb-3 flex gap-2">
                <Btn
                  type="button"
                  variant={line.mode === "existing" ? "primary" : "secondary"}
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => updateLine(line.key, { mode: "existing" })}
                >
                  صنف موجود
                </Btn>
                <Btn
                  type="button"
                  variant={line.mode === "new" ? "primary" : "secondary"}
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => updateLine(line.key, { mode: "new" })}
                >
                  صنف جديد
                </Btn>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {line.mode === "existing" ? (
                  <Select
                    label="الصنف"
                    className="lg:col-span-2"
                    value={line.productId}
                    onChange={(e) =>
                      updateLine(line.key, { productId: e.target.value })
                    }
                    required
                  >
                    <option value="">— اختر —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    label="اسم الصنف الجديد"
                    className="lg:col-span-2"
                    value={line.newProductName}
                    onChange={(e) =>
                      updateLine(line.key, { newProductName: e.target.value })
                    }
                    required
                  />
                )}
                <Input
                  label="الكمية"
                  type="number"
                  min="0.01"
                  step="any"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line.key, { quantity: e.target.value })
                  }
                  required
                />
                <Input
                  label="سعر الشراء"
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.purchasePrice}
                  onChange={(e) =>
                    updateLine(line.key, { purchasePrice: e.target.value })
                  }
                  required
                />
                <Input
                  label="سعر البيع"
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.sellPrice}
                  onChange={(e) =>
                    updateLine(line.key, { sellPrice: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <p className="text-sm text-[var(--muted)]">
            إجمالي الأصناف:{" "}
            <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
              {total.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
            </span>
          </p>
          <Btn type="submit" disabled={pending}>
            {pending ? "جاري الحفظ..." : "حفظ فاتورة الشراء"}
          </Btn>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
