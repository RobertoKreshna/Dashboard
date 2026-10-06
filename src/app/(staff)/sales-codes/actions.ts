"use server";

import { count, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { deals, listings, salesCodes } from "@/db/schema";
import { changedKeys, logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth";

export type SalesCodeState = {
  ok?: boolean;
  errors?: Record<string, string>;
  message?: string;
};

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Sales code is required")
    .max(20, "Max 20 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, - or _ only")
    .transform((s) => s.toUpperCase()),
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().optional(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  isActive: z.boolean(),
});

export async function saveSalesCode(
  _prev: SalesCodeState,
  formData: FormData,
): Promise<SalesCodeState> {
  const user = await requireUser();
  const original = String(formData.get("originalCode") ?? "");
  const parsed = schema.safeParse({
    code: formData.get("code") ?? "",
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  const v = parsed.data;
  const values = {
    code: v.code,
    fullName: v.fullName,
    phone: v.phone || null,
    email: v.email || null,
    isActive: v.isActive,
  };
  try {
    if (original) {
      const [before] = await db.select().from(salesCodes).where(eq(salesCodes.code, original));
      await db.update(salesCodes).set(values).where(eq(salesCodes.code, original));
      const changed = before
        ? changedKeys(before, values, { code: "code", fullName: "name", phone: "phone", email: "email", isActive: "active status" })
        : [];
      await logActivity({
        actor: user.email, action: "updated", entity: "sales_code", entityId: v.code,
        summary: `${v.fullName}${changed.length ? ` · changed ${changed.join(", ")}` : ""}`,
      });
    } else {
      await db.insert(salesCodes).values(values);
      await logActivity({ actor: user.email, action: "created", entity: "sales_code", entityId: v.code, summary: v.fullName });
    }
  } catch (e) {
    if (String((e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code) === "23505") {
      return { errors: { code: "This sales code already exists" } };
    }
    throw e;
  }
  revalidatePath("/sales-codes");
  return { ok: true };
}

export async function deleteSalesCode(code: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const [[l], [d]] = await Promise.all([
    db.select({ n: count() }).from(listings).where(eq(listings.salesCode, code)),
    db.select({ n: count() }).from(deals).where(or(eq(deals.salesCode, code), eq(deals.listingSalesCode, code))),
  ]);
  if (l.n > 0 || d.n > 0) {
    return {
      error: `${code} is linked to ${l.n} listing(s) and ${d.n} deal(s) and can't be deleted. Set it to inactive instead.`,
    };
  }
  const [gone] = await db.delete(salesCodes).where(eq(salesCodes.code, code)).returning({ name: salesCodes.fullName });
  await logActivity({ actor: user.email, action: "deleted", entity: "sales_code", entityId: code, summary: gone?.name ?? code });
  revalidatePath("/sales-codes");
  return {};
}

export async function setSalesCodeActive(code: string, isActive: boolean) {
  const user = await requireUser();
  await db.update(salesCodes).set({ isActive }).where(eq(salesCodes.code, code));
  await logActivity({ actor: user.email, action: "updated", entity: "sales_code", entityId: code, summary: `Set ${isActive ? "active" : "inactive"}` });
  revalidatePath("/sales-codes");
}
