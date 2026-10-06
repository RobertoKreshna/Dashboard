"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Field } from "@/components/common/field";
import { ConfirmDialog } from "@/components/common/confirm-delete";
import { formatDate } from "@/lib/format";
import {
  deleteSalesCode,
  saveSalesCode,
  setSalesCodeActive,
  type SalesCodeState,
} from "@/app/(staff)/sales-codes/actions";

type Row = {
  code: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  updatedAt: string;
  listingCount: number;
  dealCount: number;
};

export function SalesCodeManager({
  rows,
  initialQuery,
}: {
  rows: Row[];
  initialQuery: string;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQuery);
  const [editing, setEditing] = React.useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<Row | null>(null);
  const [, startToggle] = React.useTransition();

  React.useEffect(() => {
    if (q === initialQuery) return;
    const t = setTimeout(
      () =>
        router.replace(
          q ? `/sales-codes?q=${encodeURIComponent(q)}` : "/sales-codes",
        ),
      350,
    );
    return () => clearTimeout(t);
  }, [q, initialQuery, router]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Search sales codes"
            placeholder="Search code, name, email, phone…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus /> New sales
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Listings</TableHead>
              <TableHead className="text-right">Deals</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-10 text-center text-muted-foreground"
                >
                  No sales codes found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.code} className="hover:bg-brand-light/30">
                <TableCell className="font-semibold">{r.code}</TableCell>
                <TableCell>{r.fullName}</TableCell>
                <TableCell>{r.phone || "-"}</TableCell>
                <TableCell>{r.email || "-"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.listingCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.dealCount}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                      (r.isActive
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-slate-200 text-slate-700")
                    }
                  >
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>{formatDate(r.updatedAt)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${r.code}`}
                      onClick={() => setEditing(r)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={
                        r.isActive
                          ? `Set ${r.code} inactive`
                          : `Set ${r.code} active`
                      }
                      title={r.isActive ? "Set inactive" : "Set active"}
                      onClick={() =>
                        startToggle(async () => {
                          await setSalesCodeActive(r.code, !r.isActive);
                          toast.success(
                            `${r.code} is now ${r.isActive ? "inactive" : "active"}`,
                          );
                        })
                      }
                    >
                      <Power />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${r.code}`}
                      onClick={() => setDeleting(r)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <SalesCodeDialog
          key={editing === "new" ? "new" : editing.code}
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.code}?`}
        description={
          deleting && (deleting.listingCount > 0 || deleting.dealCount > 0)
            ? `${deleting.code} is linked to ${deleting.listingCount} listing(s) and ${deleting.dealCount} deal(s), so it can't be deleted. Set it to inactive instead to keep the history.`
            : "This permanently removes the sales code."
        }
        onConfirm={async () => {
          const res = await deleteSalesCode(deleting!.code);
          if (!res.error) toast.success("Sales code deleted");
          return res;
        }}
      />
    </div>
  );
}

function SalesCodeDialog({
  row,
  onClose,
}: {
  row: Row | null;
  onClose: () => void;
}) {
  const [state, action, pending] = React.useActionState<
    SalesCodeState,
    FormData
  >(saveSalesCode, {});
  React.useEffect(() => {
    if (state.ok) {
      toast.success(row ? "Sales code updated" : "Sales code created");
      onClose();
    }
  }, [state.ok]); // eslint-disable-line react-hooks/exhaustive-deps
  const err = state.errors ?? {};
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row ? `Edit ${row.code}` : "New sales"}</DialogTitle>
          <DialogDescription>
            Inactive agents can&apos;t be assigned to new listings; their
            history stays.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            React.startTransition(() => action(fd));
          }}
          className="space-y-4"
          noValidate
        >
          <input type="hidden" name="originalCode" value={row?.code ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sales code" htmlFor="code" required error={err.code}>
              <Input
                id="code"
                name="code"
                placeholder="S001"
                defaultValue={row?.code}
                aria-invalid={!!err.code}
              />
            </Field>
            <Field
              label="Full name"
              htmlFor="fullName"
              required
              error={err.fullName}
            >
              <Input
                id="fullName"
                name="fullName"
                defaultValue={row?.fullName}
                aria-invalid={!!err.fullName}
              />
            </Field>
            <Field label="Phone" htmlFor="phone" error={err.phone}>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={row?.phone ?? ""}
              />
            </Field>
            <Field label="Email" htmlFor="email" error={err.email}>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={row?.email ?? ""}
                aria-invalid={!!err.email}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={row?.isActive ?? true}
              className="size-4 accent-[#4AA8DE]"
            />{" "}
            Active
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
