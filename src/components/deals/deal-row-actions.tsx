"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-delete";
import { deleteDeal } from "@/app/(staff)/deals/actions";

export function DealRowActions({ id, linkedListing }: { id: string; linkedListing: string | null }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex justify-end gap-1">
      <Link href={`/deals/${id}/edit`} aria-label={`Edit ${id}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
        <Pencil />
      </Link>
      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${id}`} onClick={() => setOpen(true)}>
        <Trash2 className="text-destructive" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete deal ${id}?`}
        description={
          linkedListing
            ? `Listing ${linkedListing} will be set back to Available.`
            : "This deal isn't linked to a listing, so no listing is affected."
        }
        onConfirm={async () => {
          const res = await deleteDeal(id);
          if (!res.error) toast.success("Deal deleted");
          return res;
        }}
      />
    </div>
  );
}
