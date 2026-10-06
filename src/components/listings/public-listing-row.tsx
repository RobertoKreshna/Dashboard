import Link from "next/link";
import { Bath, BedDouble, MapPin, Maximize } from "lucide-react";
import { StatusBadge, TypeBadge } from "@/components/common/badges";
import { ListingThumb } from "@/components/common/listing-thumb";
import { PriceText } from "@/components/listings/listing-info";
import { propertyTypeLabel } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { HoverCard } from "@/components/listings/map-hover";
import type { ListingRow } from "@/lib/listing-queries";

/** Compact horizontal card for the side panel next to the map. */
export function PublicListingRow({ l }: { l: ListingRow }) {
  return (
    <HoverCard id={l.id} city={l.city} province={l.province} district={l.district} village={l.village}>
    <article className="flex gap-3 rounded-xl border bg-card p-2.5 shadow-sm transition hover:shadow-md sm:p-3">
      <Link href={`/listings-public/${l.id}`} className="shrink-0" aria-label={`${l.title} – ${l.id}`}>
        <ListingThumb path={l.coverPath} alt={l.title} className="size-24 rounded-lg sm:h-28 sm:w-32" />
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={l.listingType} />
          <StatusBadge status={l.status} />
          <span className="text-xs text-muted-foreground">{l.id} · {propertyTypeLabel(l.propertyType)}</span>
        </div>
        <h3 className="line-clamp-1 font-semibold leading-snug">
          <Link href={`/listings-public/${l.id}`} className="hover:underline">{l.title}</Link>
        </h3>
        <p className="font-bold text-brand-ink">
          <PriceText price={l.price} listingType={l.listingType} rentalPeriod={l.rentalPeriod} />
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{l.district}, {l.city}</span>
        </p>
        <ul className="flex flex-wrap gap-x-3 text-xs">
          <li className="flex items-center gap-1" title="Bedrooms"><BedDouble className="size-3.5" />{l.bedrooms}</li>
          <li className="flex items-center gap-1" title="Bathrooms"><Bath className="size-3.5" />{l.bathrooms}</li>
          <li className="flex items-center gap-1" title="Land area"><Maximize className="size-3.5" />{l.landArea !== null ? `${formatNumber(l.landArea)} m²` : "-"}</li>
        </ul>
      </div>
    </article>
    </HoverCard>
  );
}
