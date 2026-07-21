"use client";

import { useState, useTransition } from "react";
import { createCashAccount, createManualCashTransaction } from "@/lib/actions";
import { Btn, Input, Select } from "./ui";

export function CashAccountForm() {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await createCashAccount(name);
          setName("");
        });
      }}
    >
      <Input
        label="خزنة جديدة"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="مثال: خزنة الفرع"
      />
      <Btn type="submit" disabled={pending}>
        إضافة
      </Btn>
    </form>
  );
}

export function CashTxForm({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            await createManualCashTransaction({
              accountId: String(fd.get("accountId")),
              type: String(fd.get("type")) as "in" | "out",
              amount: Number(fd.get("amount")),
              notes: String(fd.get("notes") || "") || undefined,
              date: String(fd.get("date") || "") || undefined,
            });
            e.currentTarget.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "حدث خطأ");
          }
        });
      }}
    >
      <Select name="accountId" label="الخزنة" required defaultValue={accounts[0]?.id}>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
      <Select name="type" label="النوع" required defaultValue="in">
        <option value="in">وارد</option>
        <option value="out">منصرف</option>
      </Select>
      <Input name="amount" label="المبلغ" type="number" min="0.01" step="0.01" required />
      <Input
        name="date"
        label="التاريخ"
        type="date"
        defaultValue={new Date().toISOString().slice(0, 10)}
      />
      <Input name="notes" label="البيان" placeholder="وصف الحركة" />
      <div className="sm:col-span-2 lg:col-span-5">
        <Btn type="submit" disabled={pending}>
          {pending ? "..." : "تسجيل حركة"}
        </Btn>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </form>
  );
}
