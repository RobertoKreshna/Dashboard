import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { getListingDetail } from "@/lib/listing-queries";
import { photoUrl } from "@/lib/constants";
import { formatDate, formatIDR } from "@/lib/format";
import { ListingActions } from "@/components/listings/listing-actions";
import { ListingInfo } from "@/components/listings/listing-info";
import { PhotoGallery } from "@/components/listings/photo-gallery";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: (await params).id };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getListingDetail("staff", id);
  if (!detail) notFound();
  const l = detail.listing;
  const linkedDeals = await db
    .select({ id: deals.id, dealDate: deals.dealDate, finalPrice: deals.finalPrice, buyerName: deals.buyerName })
    .from(deals)
    .where(eq(deals.listingId, id))
    .orderBy(desc(deals.dealDate));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/listings" className="inline-flex items-center gap-1 text-sm text-brand-ink hover:underline">
          <ArrowLeft className="size-4" /> All listings
        </Link>
        <div className="flex flex-wrap gap-2">
          <ListingActions id={l.id} status={l.status} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <PhotoGallery photos={detail.photos.map((p) => photoUrl(p.path)!)} title={l.title} />
        <ListingInfo l={l} />
      </div>

      {l.notes && (
        <div className="rounded-xl border border-brand-yellow/60 bg-brand-yellow/10 p-4">
          <h2 className="mb-1 text-sm font-semibold">Internal notes (staff only)</h2>
          <p className="whitespace-pre-wrap text-sm">{l.notes}</p>
        </div>
      )}

      {linkedDeals.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Linked deals</h2>
          <ul className="divide-y text-sm">
            {linkedDeals.map((d) => (
              <li key={d.id} className="flex flex-wrap justify-between gap-2 py-2">
                <Link href={`/deals/${d.id}/edit`} className="font-medium text-brand-ink hover:underline">{d.id}</Link>
                <span>{d.buyerName}</span>
                <span>{formatDate(d.dealDate)}</span>
                <span className="font-medium">{formatIDR(d.finalPrice)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
