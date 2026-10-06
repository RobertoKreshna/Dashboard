"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterModal } from "@/components/common/filter-modal";
import { TopSalesPeriod, type Period } from "@/components/dashboard/top-sales-period";

type Props = { period: Period; month: number; year: number; years: number[]; label: string };

/**
 * Month / Year / All time picker. Inline on wide screens; on phones one button (showing the current period)
 * opens it in a bottom sheet, like the Filters sheets on Listings and Done Deals.
 */
export function PeriodFilter({ label, ...picker }: Props) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Back to the default: the current month.
  const reset = () => {
    const next = new URLSearchParams(params.toString());
    for (const k of ["period", "m", "y"]) next.delete(k);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return (
    <>
      <div className="hidden sm:block">
        <TopSalesPeriod {...picker} />
      </div>
      <Button type="button" variant="outline" className="sm:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal /> {label}
      </Button>
      {open && (
        <FilterModal title="Period" onClose={() => setOpen(false)} onApply={() => setOpen(false)} onReset={reset}>
          <TopSalesPeriod {...picker} />
        </FilterModal>
      )}
    </>
  );
}
