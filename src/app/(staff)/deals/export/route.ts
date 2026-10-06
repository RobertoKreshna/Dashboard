import * as XLSX from "xlsx";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";
import { parseDealFilters, queryDeals } from "@/lib/deal-queries";
import { dealSourceLabel, dealTypeLabel, propertyTypeLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";

/**
 * Spreadsheet apps run cells that start with = + - @ as formulas ("CSV injection"). Buyer names, notes and
 * addresses are typed by people, so neutralise those with a leading apostrophe.
 */
const safeCell = (v: unknown) => (typeof v === "string" && v !== "-" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export async function GET(req: Request) {
  const user = await requireUser();
  const rl = rateLimit(`export:${user.id}`, 15, 60_000);
  if (!rl.ok) return new Response("Too many exports. Try again shortly.", { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams);
  const { rows, totals } = await queryDeals(parseDealFilters(sp), { all: true });

  const data = rows.map((d) => ({
    "Deal ID": d.id,
    "Deal date": formatDate(d.dealDate),
    "Deal type": dealTypeLabel(d.dealType),
    Source: dealSourceLabel(d.source),
    "Listing ID": d.listingId ?? "",
    "Property type": propertyTypeLabel(d.propertyType),
    Address: d.address,
    Village: d.village ?? "",
    District: d.district ?? "",
    "City / regency": d.city,
    Province: d.province ?? "",
    "Listing price (IDR)": d.listingPrice ?? "",
    "Final price (IDR)": d.finalPrice,
    "Buyer / tenant": d.buyerName,
    "Buyer phone": d.buyerPhone ?? "",
    "Contract start": formatDate(d.contractStart),
    "Contract end": formatDate(d.contractEnd),
    "Sales code": d.salesCode,
    "Payment type": d.paymentType === "cash" ? "Cash" : d.paymentType === "bank" ? "Bank" : "",
    Bank: d.bankName ?? "",
    "Commission %": d.commissionPercent ?? "",
    "Commission (IDR)": d.commissionAmount ?? "",
    Notes: d.notes ?? "",
  }));
  data.push({ "Deal ID": `TOTAL (${totals.count} deals)`, "Final price (IDR)": totals.value, "Commission (IDR)": totals.commission } as never);

  const ws = XLSX.utils.json_to_sheet(data.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, safeCell(v)]))));
  const stamp = new Date().toISOString().slice(0, 10);
  if (url.searchParams.get("format") === "csv") {
    // BOM so Excel opens UTF-8 correctly.
    const csv = "﻿" + XLSX.utils.sheet_to_csv(ws);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vpro-deals-${stamp}.csv"`,
      },
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Deals");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vpro-deals-${stamp}.xlsx"`,
    },
  });
}
