"use client";

import { useState, useTransition } from "react";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/actions";
import { Btn, Input, Textarea } from "./ui";

type Party = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

export function PartyForm({
  type,
  party,
  onDone,
}: {
  type: "customer" | "supplier";
  party?: Party;
  onDone?: () => void;
}) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const isEdit = !!party;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const fd = new FormData(e.currentTarget);
        const data = {
          name: String(fd.get("name") || ""),
          phone: String(fd.get("phone") || "") || undefined,
          address: String(fd.get("address") || "") || undefined,
          notes: String(fd.get("notes") || "") || undefined,
        };
        start(async () => {
          try {
            if (type === "customer") {
              if (isEdit) await updateCustomer(party.id, data);
              else await createCustomer(data);
            } else {
              if (isEdit) await updateSupplier(party.id, data);
              else await createSupplier(data);
            }
            onDone?.();
            if (!isEdit) e.currentTarget.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "حدث خطأ");
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          name="name"
          label="الاسم"
          required
          defaultValue={party?.name}
          placeholder={type === "customer" ? "اسم العميل" : "اسم المورد"}
        />
        <Input
          name="phone"
          label="الهاتف"
          defaultValue={party?.phone ?? ""}
          placeholder="01xxxxxxxxx"
        />
      </div>
      <Input
        name="address"
        label="العنوان"
        defaultValue={party?.address ?? ""}
      />
      <Textarea name="notes" label="ملاحظات" defaultValue={party?.notes ?? ""} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Btn type="submit" disabled={pending}>
        {pending ? "..." : isEdit ? "تحديث" : "إضافة"}
      </Btn>
    </form>
  );
}

export function DeletePartyButton({
  type,
  id,
}: {
  type: "customer" | "supplier";
  id: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Btn
      type="button"
      variant="ghost"
      className="text-red-600!"
      disabled={pending}
      onClick={() => {
        if (!confirm("تأكيد الحذف؟")) return;
        start(async () => {
          try {
            if (type === "customer") await deleteCustomer(id);
            else await deleteSupplier(id);
          } catch (err) {
            alert(err instanceof Error ? err.message : "تعذر الحذف");
          }
        });
      }}
    >
      حذف
    </Btn>
  );
}
