"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createSalesInvoice,
  getProductSellPrice,
  getProductStock,
} from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Btn, Input, Select, Textarea } from "./ui";
import {
  PaymentSection,
  defaultPaymentState,
  paymentPayload,
} from "./PaymentSection";

type Customer = { id: string; name: string; phone: string | null };
type Product = {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
};

type Line = {
  key: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  stock: number;
};

function emptyLine(): Line {
  return {
    key: crypto.randomUUID(),
    productId: "",
    quantity: "1",
    unitPrice: "",
    stock: 0,
  };
}

export function SalesForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const router = useRouter();
  const [partyMode, setPartyMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState("");
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
        const p = Number(l.unitPrice) || 0;
        return s + q * p;
      }, 0),
    [lines]
  );

  async function onProductChange(key: string, productId: string) {
    if (!productId) {
      setLines((prev) =>
        prev.map((l) =>
          l.key === key ? { ...l, productId: "", unitPrice: "", stock: 0 } : l
        )
      );
      return;
    }
    const [price, stock] = await Promise.all([
      getProductSellPrice(productId),
      getProductStock(productId),
    ]);
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              productId,
              unitPrice: String(price),
              stock,
            }
          : l
      )
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          try {
            const inv = await createSalesInvoice({
              customerId: partyMode === "existing" ? customerId : undefined,
              newCustomer:
                partyMode === "new"
                  ? { name: newName, phone: newPhone || undefined }
                  : undefined,
              date,
              notes: notes || undefined,
              payment: paymentPayload(payment, total),
              items: lines.map((l) => ({
                productId: l.productId,
                quantity: Number(l.quantity),
                unitPrice: Number(l.unitPrice),
              })),
            });
            router.push(`/sales/${inv.id}`);
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
            اختيار عميل
          </Btn>
          <Btn
            type="button"
            variant={partyMode === "new" ? "primary" : "secondary"}
            onClick={() => setPartyMode("new")}
          >
            إدخال عميل يدوي
          </Btn>
        </div>
        {partyMode === "existing" ? (
          <Select
            label="العميل"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">— اختر عميل —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` · ${c.phone}` : ""}
              </option>
            ))}
          </Select>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="اسم العميل الجديد"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="يُسجَّل تلقائياً في العملاء"
            />
            <Input
              label="هاتف العميل"
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
          cashLabel="المحصّل للخزنة"
        />
        <Textarea
          className="mt-3"
          label="ملاحظات"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-[var(--ink)]">أصناف الفاتورة</h3>
            <p className="text-xs text-[var(--muted)]">
              السحب من المخزن بنظام FIFO (الأقدم أولاً)
            </p>
          </div>
          <Btn
            type="button"
            variant="secondary"
            onClick={() => setLines((p) => [...p, emptyLine()])}
          >
            + صنف
          </Btn>
        </div>
        <div className="mt-4 space-y-4">
          {lines.map((line) => (
            <div
              key={line.key}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
            >
              <div className="mb-3 flex justify-end">
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="الصنف"
                  className="lg:col-span-2"
                  value={line.productId}
                  onChange={(e) => onProductChange(line.key, e.target.value)}
                  required
                >
                  <option value="">— اختر —</option>
                  {products
                    .filter((p) => p.stockQty > 0)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (متاح: {p.stockQty})
                      </option>
                    ))}
                </Select>
                <Input
                  label={`الكمية${line.stock ? ` / متاح ${line.stock}` : ""}`}
                  type="number"
                  min="0.01"
                  max={line.stock || undefined}
                  step="any"
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key
                          ? { ...l, quantity: e.target.value }
                          : l
                      )
                    )
                  }
                  required
                />
                <Input
                  label="سعر البيع"
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key
                          ? { ...l, unitPrice: e.target.value }
                          : l
                      )
                    )
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
            {pending ? "جاري الحفظ..." : "حفظ فاتورة البيع"}
          </Btn>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
