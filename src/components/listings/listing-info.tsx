import { Bath, BedDouble, Maximize, Ruler } from "lucide-react";
import { StatusBadge, TypeBadge } from "@/components/common/badges";
import { formatIDR, formatNumber } from "@/lib/format";
import { propertyTypeLabel, rentalPeriodLabel } from "@/lib/constants";

type Info = {
  id: string;
  title: string;
  listingType: string;
  price: number;
  rentalPeriod: string | null;
  propertyType: string;
  address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode: string | null;
  landArea: number | null;
  buildingArea: number | null;
  bedrooms: number;
  bathrooms: number;
  facilities: string[];
  electricityWatts: number | null;
  salesCode: string;
  agentName: string;
  status: string;
};

export function PriceText({ price, listingType, rentalPeriod }: { price: number; listingType: string; rentalPeriod: string | null }) {
  return (
    <>
      {formatIDR(price)}
      {listingType === "rent" && rentalPeriod && (
        <span className="text-sm font-normal text-muted-foreground"> / {rentalPeriod === "month" ? "month" : "year"}</span>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children || "-"}</dd>
    </div>
  );
}

export function ListingInfo({ l }: { l: Info }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{l.id}</span>
          <TypeBadge type={l.listingType} />
          <StatusBadge status={l.status} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{l.title}</h1>
        <p className="text-2xl font-bold text-brand-ink">
          <PriceText price={l.price} listingType={l.listingType} rentalPeriod={l.rentalPeriod} />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: BedDouble, label: "Bedrooms", v: l.bedrooms },
          { icon: Bath, label: "Bathrooms", v: l.bathrooms },
          { icon: Maximize, label: "Land", v: l.landArea !== null ? `${formatNumber(l.landArea)} m²` : "-" },
          { icon: Ruler, label: "Building", v: l.buildingArea !== null ? `${formatNumber(l.buildingArea)} m²` : "-" },
        ].map(({ icon: Icon, label, v }) => (
          <div key={label} className="rounded-xl border bg-card p-3 text-center shadow-sm">
            <Icon className="mx-auto mb-1 size-5 text-brand-ink" />
            <div className="text-base font-bold">{v}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Property</h2>
          <dl>
            <Row label="Property type">{propertyTypeLabel(l.propertyType)}</Row>
            <Row label="Listing type">{l.listingType === "sell" ? "For sale" : `For rent${l.rentalPeriod ? ` (${rentalPeriodLabel(l.rentalPeriod)})` : ""}`}</Row>
            <Row label="Electricity">{l.electricityWatts ? `${formatNumber(l.electricityWatts)} W` : null}</Row>
            <Row label="Sales code">{l.salesCode}</Row>
            <Row label="Agent">{l.agentName}</Row>
          </dl>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Location</h2>
          <dl>
            <Row label="Address">{l.address}</Row>
            <Row label="Village">{l.village}</Row>
            <Row label="District">{l.district}</Row>
            <Row label="City / regency">{l.city}</Row>
            <Row label="Province">{l.province}</Row>
            <Row label="Postal code">{l.postalCode}</Row>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Facilities</h2>
        {l.facilities.length || l.electricityWatts ? (
          <ul className="flex flex-wrap gap-2">
            {l.facilities.map((f) => (
              <li key={f} className="rounded-full bg-brand-light/60 px-3 py-1 text-sm font-medium">{f}</li>
            ))}
            {l.electricityWatts ? (
              <li className="rounded-full bg-brand-light/60 px-3 py-1 text-sm font-medium">
                Electricity {formatNumber(l.electricityWatts)} W
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No facilities listed.</p>
        )}
      </div>
    </div>
  );
}
