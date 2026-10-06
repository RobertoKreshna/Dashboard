import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { facilities, salesCodes } from "@/db/schema";
import { DEFAULT_FACILITIES } from "@/lib/constants";
import { PageHeader } from "@/components/common/page-header";
import { ListingForm } from "@/components/listings/listing-form";

export const metadata = { title: "New listing" };

export default async function NewListingPage() {
  const [agents, facs] = await Promise.all([
    db.select().from(salesCodes).where(eq(salesCodes.isActive, true)).orderBy(asc(salesCodes.code)),
    db.select({ name: facilities.name }).from(facilities).orderBy(asc(facilities.name)),
  ]);
  const options = [...new Set([...DEFAULT_FACILITIES, ...facs.map((f) => f.name)])];
  return (
    <>
      <PageHeader title="New listing" />
      <ListingForm agents={agents} facilityOptions={options} />
    </>
  );
}
