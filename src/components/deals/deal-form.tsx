"use client";

import * as React from "react";
import Link from "next/link";
import { Link2, Loader2, Search, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/field";
import { DateField } from "@/components/common/range-calendar";
import { PlacePicker } from "@/components/listings/place-picker";
import { usePlaceOptions } from "@/lib/use-place-options";
import { MoneyInput } from "@/components/common/money-input";
import { NativeSelect } from "@/components/common/native-select";
import { BANKS, PAYMENT_TYPES, PROPERTY_TYPES } from "@/lib/constants";
import { formatIDR } from "@/lib/format";
import { commissionSplit } from "@/lib/commission";
import { cn } from "@/lib/utils";
import {
  getListingForDeal,
  saveDeal,
  searchListingsForDeal,
  type DealFormState,
} from "@/app/(staff)/deals/actions";

export type DealFormValues = {
  id?: string;
  listingId: string | null;
  dealType: "sale" | "rent";
  propertyType: string;
  address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  listingPrice: number | null;
  finalPrice: number | null;
  dealDate: string;
  buyerName: string;
  buyerPhone: string;
  contractStart: string;
  contractEnd: string;
  salesCode: string;
  /** Agent who held the listing; "" = same as salesCode. */
  listingSalesCode: string;
  paymentType: "cash" | "bank" | "";
  bankName: string;
  commissionMode: "amount" | "percent";
  commissionValue: number | null;
  notes: string;
};

type Agent = { code: string; fullName: string; isActive: boolean };
type Hit = { id: string; title: string; city: string; listingType: string; price: number };

export function DealForm({ initial, agents }: { initial: DealFormValues; agents: Agent[] }) {
  const [state, action, pending] = React.useActionState<DealFormState, FormData>(saveDeal, {});
  const err = state.errors ?? {};
  const [v, setV] = React.useState(initial);
  const set = <K extends keyof DealFormValues>(k: K, val: DealFormValues[K]) => setV((x) => ({ ...x, [k]: val }));
  const linked = !!v.listingId;
  const place = usePlaceOptions({ province: v.province, city: v.city, district: v.district });
  // Bank picker: a listed bank, or "Other" with free text.
  const knownBank = BANKS.includes(v.bankName) && v.bankName !== "Other";
  const [bankChoice, setBankChoice] = React.useState<string>(v.bankName ? (knownBank ? v.bankName : "Other") : "");
  const [bankOther, setBankOther] = React.useState(v.bankName && !knownBank ? v.bankName : "");
  const bankValue = v.paymentType === "bank" ? (bankChoice === "Other" ? bankOther.trim() : bankChoice) : "";

  React.useEffect(() => {
    if (state.message) toast.error(state.message);
  }, [state]);

  async function link(id: string) {
    const l = await getListingForDeal(id);
    if (!l) return toast.error("Listing not found");
    setV((x) => ({
      ...x,
      listingId: l.id,
      dealType: l.listingType === "sell" ? "sale" : "rent",
      propertyType: l.propertyType,
      address: l.address,
      village: l.village,
      district: l.district,
      city: l.city,
      province: l.province,
      listingPrice: l.price,
      finalPrice: x.finalPrice ?? l.price,
      salesCode: x.salesCode || l.salesCode,
      listingSalesCode: l.salesCode,
    }));
  }

  const ro = linked ? { readOnly: true, className: "bg-muted" } : {};
  const agentLabel = (code: string) => {
    const a = agents.find((x) => x.code === code);
    return a ? `${a.code} · ${a.fullName}` : code;
  };
  const commissionTotal =
    v.commissionValue === null
      ? 0
      : v.commissionMode === "percent"
        ? Math.round(((v.finalPrice ?? 0) * v.commissionValue) / 100)
        : Math.round(v.commissionValue);
  const split = v.salesCode && commissionTotal > 0 ? commissionSplit(commissionTotal, v.listingSalesCode, v.salesCode) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        React.startTransition(() => action(fd));
      }}
      className="space-y-5"
      noValidate
    >
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <input type="hidden" name="listingId" value={v.listingId ?? ""} />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold">Linked listing</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Optional. Link a listing to copy its details and update its status automatically.
        </p>
        {linked ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-light/40 p-3">
            <div className="flex min-w-0 items-start gap-2 text-sm font-medium">
              <Link2 className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <Link href={`/listings/${v.listingId}`} className="whitespace-nowrap text-brand-ink hover:underline">{v.listingId}</Link>
                <span className="block break-words text-muted-foreground sm:inline"><span className="hidden sm:inline"> · </span>{v.address}</span>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => set("listingId", null)}>
              <Unlink /> Unlink (enter manually)
            </Button>
          </div>
        ) : (
          <ListingPicker onPick={link} />
        )}
        {err.listingId && <p role="alert" className="mt-2 text-xs font-medium text-destructive">{err.listingId}</p>}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Property</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Deal type" required error={err.dealType} htmlFor="dealType">
            <NativeSelect id="dealType" name="dealType" value={v.dealType} onChange={(e) => set("dealType", e.target.value as "sale" | "rent")}>
              <option value="sale">Sale</option>
              <option value="rent">Rent</option>
            </NativeSelect>
          </Field>
          <Field label="Property type" required error={err.propertyType} htmlFor="propertyType">
            <NativeSelect id="propertyType" name="propertyType" value={v.propertyType} onChange={(e) => set("propertyType", e.target.value)} disabled={linked} aria-invalid={!!err.propertyType}>
              <option value="" disabled>Select…</option>
              {PROPERTY_TYPES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </NativeSelect>
            {linked && <input type="hidden" name="propertyType" value={v.propertyType} />}
          </Field>
          <Field label="Address" required error={err.address} htmlFor="address" className="sm:col-span-2 lg:col-span-3">
            <Input id="address" name="address" value={v.address} onChange={(e) => set("address", e.target.value)} {...ro} aria-invalid={!!err.address} />
          </Field>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
            {linked ? (
              <>
                <Field label="Province" htmlFor="province"><Input id="province" name="province" value={v.province} readOnly className="bg-muted" /></Field>
                <Field label="City / regency" htmlFor="city"><Input id="city" name="city" value={v.city} readOnly className="bg-muted" /></Field>
                <Field label="District" htmlFor="district"><Input id="district" name="district" value={v.district} readOnly className="bg-muted" /></Field>
                <Field label="Village" htmlFor="village"><Input id="village" name="village" value={v.village} readOnly className="bg-muted" /></Field>
              </>
            ) : (
              <>
                <PlacePicker
                  id="province" name="province" label="Province" required error={err.province}
                  value={v.province} options={place.provinceOptions} loading={place.provinceLoading}
                  onChange={(x) => setV((o) => ({ ...o, province: x, city: "", district: "", village: "" }))}
                />
                <PlacePicker
                  key={`c|${v.province}`}
                  id="city" name="city" label="City / regency" required error={err.city}
                  value={v.city} options={place.cityOptions} loading={place.cityLoading} disabled={!v.province}
                  onChange={(x) => setV((o) => ({ ...o, city: x, district: "", village: "" }))}
                />
                <PlacePicker
                  key={`d|${v.province}|${v.city}`}
                  id="district" name="district" label="District" error={err.district}
                  value={v.district} options={place.districtOptions} loading={place.districtLoading} disabled={!v.city}
                  onChange={(x) => setV((o) => ({ ...o, district: x, village: "" }))}
                />
                <PlacePicker
                  key={`v|${v.province}|${v.city}|${v.district}`}
                  id="village" name="village" label="Village" error={err.village}
                  value={v.village} options={place.villageOptions} loading={place.villageLoading} disabled={!v.district}
                  onChange={(x) => set("village", x)}
                />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Deal</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Listing price (IDR)" error={err.listingPrice} htmlFor="listingPrice" hint={linked ? undefined : "Optional for manual deals"}>
            <MoneyInput id="listingPrice" name="listingPrice" value={v.listingPrice} onValueChange={(d) => set("listingPrice", d ? Number(d) : null)} readOnly={linked} className={cn(linked && "bg-muted")} />
          </Field>
          <Field label="Final agreed price (IDR)" required error={err.finalPrice} htmlFor="finalPrice">
            <MoneyInput id="finalPrice" name="finalPrice" value={v.finalPrice} onValueChange={(d) => set("finalPrice", d ? Number(d) : null)} aria-invalid={!!err.finalPrice} />
          </Field>
          <Field label="Deal date" required error={err.dealDate} htmlFor="dealDate">
            <DateField id="dealDate" name="dealDate" value={v.dealDate} onChange={(d) => set("dealDate", d)} invalid={!!err.dealDate} />
          </Field>
          <Field label="Buyer / tenant name" required error={err.buyerName} htmlFor="buyerName">
            <Input id="buyerName" name="buyerName" value={v.buyerName} onChange={(e) => set("buyerName", e.target.value)} aria-invalid={!!err.buyerName} />
          </Field>
          <Field label="Buyer / tenant phone" error={err.buyerPhone} htmlFor="buyerPhone">
            <Input id="buyerPhone" name="buyerPhone" type="tel" value={v.buyerPhone} onChange={(e) => set("buyerPhone", e.target.value)} />
          </Field>
          <Field label="Sold by (sales code)" required error={err.salesCode} htmlFor="salesCode" hint="The agent who closed the deal.">
            <NativeSelect id="salesCode" name="salesCode" value={v.salesCode} onChange={(e) => set("salesCode", e.target.value)} aria-invalid={!!err.salesCode}>
              <option value="" disabled>Select agent…</option>
              {agents.map((a) => (
                <option key={a.code} value={a.code}>{a.code} · {a.fullName}{a.isActive ? "" : " (inactive)"}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Listed by (sales code)"
            error={err.listingSalesCode}
            htmlFor="listingSalesCode"
            hint={linked ? "From the linked listing." : "The agent who held the listing."}
          >
            {linked ? (
              <Input id="listingSalesCode" value={agentLabel(v.listingSalesCode)} readOnly className="bg-muted" />
            ) : (
              <NativeSelect id="listingSalesCode" name="listingSalesCode" value={v.listingSalesCode} onChange={(e) => set("listingSalesCode", e.target.value)}>
                <option value="">Same as sold by</option>
                {agents.map((a) => (
                  <option key={a.code} value={a.code}>{a.code} · {a.fullName}{a.isActive ? "" : " (inactive)"}</option>
                ))}
              </NativeSelect>
            )}
          </Field>
          {v.dealType === "rent" && (
            <>
              <Field label="Contract start" required error={err.contractStart} htmlFor="contractStart">
                <DateField id="contractStart" name="contractStart" value={v.contractStart} onChange={(d) => set("contractStart", d)} invalid={!!err.contractStart} />
              </Field>
              <Field label="Contract end" required error={err.contractEnd} htmlFor="contractEnd">
                <DateField id="contractEnd" name="contractEnd" value={v.contractEnd} onChange={(d) => set("contractEnd", d)} invalid={!!err.contractEnd} />
              </Field>
            </>
          )}
          <Field label="Commission" error={err.commissionValue} htmlFor="commissionValue" className="sm:col-span-2 lg:col-span-1">
            <div className="flex gap-2">
              <div className="w-28 shrink-0">
                <NativeSelect aria-label="Commission type" name="commissionMode" value={v.commissionMode} onChange={(e) => setV((x) => ({ ...x, commissionMode: e.target.value as "amount" | "percent", commissionValue: null }))}>
                  <option value="amount">Rp</option>
                  <option value="percent">%</option>
                </NativeSelect>
              </div>
              {v.commissionMode === "amount" ? (
                <MoneyInput id="commissionValue" name="commissionValue" value={v.commissionValue} onValueChange={(d) => set("commissionValue", d ? Number(d) : null)} />
              ) : (
                <Input id="commissionValue" name="commissionValue" inputMode="decimal" placeholder="2.5" value={v.commissionValue ?? ""} onChange={(e) => set("commissionValue", e.target.value === "" ? null : Number(e.target.value.replace(",", ".")) || 0)} />
              )}
            </div>
            {v.commissionMode === "percent" && v.finalPrice && v.commissionValue ? (
              <p className="text-xs text-muted-foreground">= {formatIDR(Math.round((v.finalPrice * v.commissionValue) / 100))}</p>
            ) : null}
          </Field>
          <Field label="Payment type" required error={err.paymentType} className="sm:col-span-2 lg:col-span-1">
            <div role="radiogroup" aria-label="Payment type" className="grid grid-cols-2 gap-1 rounded-lg border bg-muted p-1">
              {PAYMENT_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-semibold transition",
                    v.paymentType === t.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value={t.value}
                    checked={v.paymentType === t.value}
                    onChange={() => set("paymentType", t.value)}
                    className="sr-only"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Bank" required={v.paymentType === "bank"} error={err.bankName} htmlFor="bankChoice">
            <input type="hidden" name="bankName" value={bankValue} />
            <NativeSelect
              id="bankChoice"
              value={v.paymentType === "bank" ? bankChoice : ""}
              onChange={(e) => setBankChoice(e.target.value)}
              disabled={v.paymentType !== "bank"}
              aria-invalid={!!err.bankName}
            >
              <option value="" disabled>{v.paymentType === "cash" ? "Not needed for cash" : "Select bank…"}</option>
              {BANKS.map((b) => (
                <option key={b} value={b}>{b === "Other" ? "Other bank…" : b}</option>
              ))}
            </NativeSelect>
            {v.paymentType === "bank" && bankChoice === "Other" && (
              <Input aria-label="Bank name" placeholder="Bank name" className="mt-2" value={bankOther} onChange={(e) => setBankOther(e.target.value)} />
            )}
          </Field>
          {split && (
            <div className="rounded-lg border bg-brand-light/30 p-3 text-sm sm:col-span-2 lg:col-span-3" aria-live="polite">
              <p className="mb-2 font-medium">
                Commission split · {formatIDR(commissionTotal)}
                <span className="font-normal text-muted-foreground">
                  {split.same ? " · same agent listed and sold" : " · different agents listed and sold"}
                </span>
              </p>
              <div className="space-y-1.5">
                <SplitRow name={split.same ? `${agentLabel(v.salesCode)} (listed & sold)` : `${agentLabel(v.salesCode)} (sold)`} rate={split.rate} amount={split.sold} />
                {!split.same && <SplitRow name={`${agentLabel(v.listingSalesCode)} (listed)`} rate={split.rate} amount={split.listed} />}
              </div>
            </div>
          )}
          <Field label="Notes" htmlFor="notes" className="sm:col-span-2 lg:col-span-3">
            <Textarea id="notes" name="notes" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/deals" className={buttonVariants({ variant: "outline", size: "lg" })}>Cancel</Link>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} {v.id ? "Save changes" : "Save deal"}
        </Button>
      </div>
    </form>
  );
}

function SplitRow({ name, rate, amount }: { name: string; rate: number; amount: number }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <span className="min-w-0">{name}</span>
      <span className="whitespace-nowrap">
        <span className="mr-3 text-muted-foreground">{Math.round(rate * 100)}%</span>
        <span className="font-semibold tabular-nums">{formatIDR(amount)}</span>
      </span>
    </div>
  );
}

function ListingPicker({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [settledQ, setSettledQ] = React.useState<string | null>(null);
  const loading = settledQ !== q;
  const box = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await searchListingsForDeal(q);
      if (!cancelled) {
        setHits(res);
        setSettledQ(q);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open]);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={box} className="relative max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
      <Input
        role="combobox"
        aria-expanded={open}
        aria-label="Search listing to link"
        placeholder="Search listing by ID, title or address…"
        className="pl-9"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-lg">
          {loading && <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>}
          {!loading && hits.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">No unlinked listings found.</li>
          )}
          {hits.map((h) => (
            <li key={h.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-light/50"
                onClick={() => {
                  setOpen(false);
                  onPick(h.id);
                }}
              >
                <span className="font-medium">{h.id} · {h.title}</span>
                <span className="text-xs text-muted-foreground">
                  {h.city} · {h.listingType === "sell" ? "Sell" : "Rent"} · {formatIDR(h.price)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
