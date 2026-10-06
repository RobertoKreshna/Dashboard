"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Handshake, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-delete";
import { deleteListing } from "@/app/(staff)/listings/actions";

export function ListingActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const done = status === "sold" || status === "rented";
  return (
    <>
      {!done && (
        <Link href={`/deals/new?listingId=${id}`} className={buttonVariants({ size: "lg" })}>
          <Handshake /> Mark as Done Deal
        </Link>
      )}
      <Link href={`/listings/${id}/edit`} className={buttonVariants({ variant: "outline", size: "lg" })}>
        <Pencil /> Edit
      </Link>
      <Button variant="destructive" size="lg" onClick={() => setOpen(true)}>
        <Trash2 /> Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${id}?`}
        description="This removes the listing and its photos. Any deals linked to it are kept, but lose the link."
        onConfirm={async () => {
          const res = await deleteListing(id);
          if (!res.error) {
            toast.success("Listing deleted");
            router.replace("/listings");
          }
          return res;
        }}
      />
    </>
  );
}
