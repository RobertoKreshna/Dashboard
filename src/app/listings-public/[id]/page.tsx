import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getListingDetail } from "@/lib/listing-queries";
import { photoUrl } from "@/lib/constants";
import { ListingInfo } from "@/components/listings/listing-info";
import { ShareButtons } from "@/components/listings/share-button";
import { formatIDR } from "@/lib/format";
import { propertyTypeLabel } from "@/lib/constants";
import { PhotoGallery } from "@/components/listings/photo-gallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const detail = await getListingDetail("public", (await params).id);
  if (!detail) return { title: "Listing", robots: { index: false } };
  const l = detail.listing;
  const price = `${formatIDR(l.price)}${l.listingType === "rent" && l.rentalPeriod ? ` / ${l.rentalPeriod}` : ""}`;
  const facts = [
    `${propertyTypeLabel(l.propertyType)} for ${l.listingType === "rent" ? "rent" : "sale"}`,
    l.bedrooms ? `${l.bedrooms} bed` : null,
    l.bathrooms ? `${l.bathrooms} bath` : null,
    l.buildingArea ? `${l.buildingArea} m² building` : null,
    l.landArea ? `${l.landArea} m² land` : null,
  ].filter(Boolean);
  const title = `${l.title} (${l.id})`;
  const description = `${price} · ${l.district}, ${l.city}. ${facts.join(" · ")}.`;
  const cover = photoUrl(detail.photos[0]?.path);
  const open = l.status === "available" || l.status === "reserved";
  return {
    title,
    description,
    alternates: { canonical: `/listings-public/${l.id}` },
    // Sold / rented listings stay reachable by link but shouldn't rank.
    robots: open ? undefined : { index: false },
    openGraph: {
      title: `${l.title} · ${price}`,
      description,
      type: "website",
      url: `/listings-public/${l.id}`,
      images: cover ? [{ url: cover, alt: l.title }] : undefined,
    },
    twitter: { card: cover ? "summary_large_image" : "summary", title: `${l.title} · ${price}`, description, images: cover ? [cover] : undefined },
  };
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
