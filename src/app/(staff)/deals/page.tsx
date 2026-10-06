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
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
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
                <TableHead>Sales</TableHead>
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
                  <TableCell>{d.salesCode}</TableCell>
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
