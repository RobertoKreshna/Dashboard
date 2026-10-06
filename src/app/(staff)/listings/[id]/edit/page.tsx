import { asc, eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { facilities, salesCodes } from "@/db/schema";
import { DEFAULT_FACILITIES } from "@/lib/constants";
import { getListingDetail } from "@/lib/listing-queries";
import { PageHeader } from "@/components/common/page-header";
import { ListingForm } from "@/components/listings/listing-form";
import { PhotoManager } from "@/components/listings/photo-manager";

export const metadata = { title: "Edit listing" };

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const detail = await getListingDetail("staff", id);
  if (!detail) notFound();
  const l = detail.listing;
  const [agents, facs] = await Promise.all([
    db
      .select()
      .from(salesCodes)
      .where(or(eq(salesCodes.isActive, true), eq(salesCodes.code, l.salesCode)))
      .orderBy(asc(salesCodes.code)),
    db.select({ name: facilities.name }).from(facilities).orderBy(asc(facilities.name)),
  ]);
  const options = [...new Set([...DEFAULT_FACILITIES, ...facs.map((f) => f.name)])];

  return (
    <>
      <PageHeader
        title={`Edit ${l.id}`}
        description={created ? "Listing created. Add photos below, or review the details." : l.title}
      />
      <div className="space-y-8">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Photos</h2>
          <PhotoManager
            listingId={l.id}
            initial={detail.photos.map((p) => ({ id: p.id, path: p.path, isCover: p.isCover }))}
          />
        </section>
        <ListingForm
          agents={agents}
          facilityOptions={options}
          listing={{
            id: l.id,
            title: l.title,
            listingType: l.listingType,
            price: l.price,
            rentalPeriod: l.rentalPeriod,
            propertyType: l.propertyType,
            address: l.address,
            village: l.village,
            district: l.district,
            city: l.city,
            province: l.province,
            postalCode: l.postalCode,
            landArea: l.landArea,
            buildingArea: l.buildingArea,
            bedrooms: l.bedrooms,
            bathrooms: l.bathrooms,
            facilities: l.facilities,
            electricityWatts: l.electricityWatts,
            latitude: l.latitude,
            longitude: l.longitude,
            salesCode: l.salesCode,
            status: l.status,
            notes: l.notes ?? null,
          }}
        />
      </div>
    </>
  );
}
