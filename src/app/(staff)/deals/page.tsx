import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { TypeBadge } from "@/components/common/badges";
import { DealFilterBar } from "@/components/deals/deal-filter-bar";
import { DealRowActions } from "@/components/deals/deal-row-actions";
import { getDealBanks, getDealCities, parseDealFilters, queryDeals } from "@/lib/deal-queries";
import { getSalesCodeOptions } from "@/lib/listing-queries";
import { dealSourceLabel, paymentLabel, propertyTypeLabel } from "@/lib/constants";
import { formatDate, formatIDR } from "@/lib/format";

export const metadata = { title: "Done Deals" };

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseDealFilters(sp);
  const [{ rows, totals, pages }, codes, cities, banks] = await Promise.all([
    queryDeals(filters),
    getSalesCodeOptions("staff"),
    getDealCities(),
    getDealBanks(),
  ]);

  return (
    <>
      <PageHeader
        title="Done Deals"
        actions={
          <Link href="/deals/new" className={buttonVariants({ size: "lg" })}>
            <Plus /> New deal
          </Link>
        }
      />
      <div className="space-y-4">
        <DealFilterBar salesCodes={codes.map((c) => ({ code: c.code, name: c.name ?? "" }))} cities={cities} banks={banks} />
        {/* Phones and tablets: cards. Wide screens: the full table. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {rows.length === 0 && (
            <p className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground sm:col-span-2">No deals match these filters.</p>
          )}
          {rows.map((d) => (
            <div key={d.id} className="space-y-2 rounded-xl border bg-card p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold tabular-nums">{d.id}</span>
                    <TypeBadge type={d.dealType} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(d.dealDate)} · {dealSourceLabel(d.source)}
                    {d.listingId && (
                      <>
                        {" · "}
                        <Link href={`/listings/${d.listingId}`} className="font-medium text-brand-ink hover:underline">{d.listingId}</Link>
                      </>
                    )}
                  </p>
                </div>
                <DealRowActions id={d.id} linkedListing={d.listingId} />
              </div>
              <div>
                <p className="font-medium">{propertyTypeLabel(d.propertyType)} · {d.city}</p>
                <p className="truncate text-xs text-muted-foreground">{d.address}</p>
              </div>
              <p className="text-sm">
                {d.buyerName}
                {d.buyerPhone && <span className="text-muted-foreground"> · {d.buyerPhone}</span>}
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-2 text-sm">
                <dt className="text-muted-foreground">Final price</dt>
                <dd className="text-right font-semibold tabular-nums">{formatIDR(d.finalPrice)}</dd>
                <dt className="text-muted-foreground">Commission</dt>
                <dd className="text-right tabular-nums">{d.commissionAmount !== null ? formatIDR(d.commissionAmount) : "-"}</dd>
                <dt className="text-muted-foreground">Payment</dt>
                <dd className="text-right">{paymentLabel(d.paymentType, d.bankName)}</dd>
                <dt className="text-muted-foreground">Sold by</dt>
                <dd className="text-right">{d.salesCode}</dd>
                {d.listingSalesCode && d.listingSalesCode !== d.salesCode && (
                  <>
                    <dt className="text-muted-foreground">Listed by</dt>
                    <dd className="text-right">{d.listingSalesCode}</dd>
                  </>
                )}
              </dl>
            </div>
          ))}
          <div className="rounded-xl border bg-brand-light/40 p-3.5 text-sm font-semibold sm:col-span-2">
            <p>Totals · {totals.count.toLocaleString("id-ID")} deal{totals.count === 1 ? "" : "s"} (all pages)</p>
            <p className="mt-1 flex justify-between font-normal"><span>Final price</span><span className="font-semibold tabular-nums">{formatIDR(totals.value)}</span></p>
            <p className="flex justify-between font-normal"><span>Commission</span><span className="font-semibold tabular-nums">{formatIDR(totals.commission)}</span></p>
          </div>
        </div>
        <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-sm lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Listing</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Buyer / tenant</TableHead>
                <TableHead>Sold by</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Final price</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="py-12 text-center text-muted-foreground">No deals match these filters.</TableCell>
                </TableRow>
              )}
              {rows.map((d) => (
                <TableRow key={d.id} className="hover:bg-brand-light/30">
                  <TableCell className="font-semibold tabular-nums">{d.id}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(d.dealDate)}</TableCell>
                  <TableCell><TypeBadge type={d.dealType} /></TableCell>
                  <TableCell>{dealSourceLabel(d.source)}</TableCell>
                  <TableCell>
                    {d.listingId ? (
                      <Link href={`/listings/${d.listingId}`} className="font-medium text-brand-ink hover:underline">{d.listingId}</Link>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal">
                    <div className="font-medium">{propertyTypeLabel(d.propertyType)} · {d.city}</div>
                    <div className="truncate text-xs text-muted-foreground">{d.address}</div>
                  </TableCell>
                  <TableCell>
                    <div>{d.buyerName}</div>
                    {d.buyerPhone && <div className="text-xs text-muted-foreground">{d.buyerPhone}</div>}
                  </TableCell>
                  <TableCell>
                    <div>{d.salesCode}</div>
                    {d.listingSalesCode && d.listingSalesCode !== d.salesCode && (
                      <div className="text-xs text-muted-foreground">listed {d.listingSalesCode}</div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={d.paymentType ? "" : "text-muted-foreground"}>{paymentLabel(d.paymentType, d.bankName)}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatIDR(d.finalPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.commissionAmount !== null ? formatIDR(d.commissionAmount) : "-"}</TableCell>
                  <TableCell><DealRowActions id={d.id} linkedListing={d.listingId} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-brand-light/40 font-semibold">
                <TableCell colSpan={9}>
                  Totals · {totals.count.toLocaleString("id-ID")} deal{totals.count === 1 ? "" : "s"} (all pages)
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatIDR(totals.value)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatIDR(totals.commission)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        <Pagination basePath="/deals" searchParams={sp} page={filters.page} pages={pages} total={totals.count} />
      </div>
    </>
  );
}
