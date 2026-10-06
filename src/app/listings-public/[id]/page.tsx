import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getListingDetail } from "@/lib/listing-queries";
import { photoUrl } from "@/lib/constants";
import { ListingInfo } from "@/components/listings/listing-info";
import { ShareButtons } from "@/components/listings/share-button";
import { formatIDR } from "@/lib/format";
import { PhotoGallery } from "@/components/listings/photo-gallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const detail = await getListingDetail("public", (await params).id);
  return { title: detail ? `${detail.listing.title} (${detail.listing.id})` : "Listing" };
}

export default async function PublicListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getListingDetail("public", id);
  if (!detail) notFound();
  const l = detail.listing;
  return (
    <div className="space-y-5">
      <Link href="/listings-public" className="inline-flex items-center gap-1 text-sm text-brand-ink hover:underline">
        <ArrowLeft className="size-4" /> All listings
      </Link>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <PhotoGallery photos={detail.photos.map((p) => photoUrl(p.path)!)} title={l.title} />
        <div className="space-y-5">
          <ListingInfo
            l={{
              ...l,
              agentName: "agentName" in l ? (l.agentName as string) : "",
            }}
          />
          <ShareButtons
            title={l.title}
            price={`${formatIDR(l.price)}${l.listingType === "rent" && l.rentalPeriod ? ` / ${l.rentalPeriod}` : ""}`}
            location={`${l.district}, ${l.city}`}
          />
        </div>
      </div>
    </div>
  );
}
