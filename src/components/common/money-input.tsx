"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

const fmt = new Intl.NumberFormat("id-ID");

function format(v: string | number | null | undefined) {
  const digits = String(v ?? "").replace(/\D/g, "");
  return digits ? fmt.format(Number(digits)) : "";
}

/** Text input that shows thousand separators (1.500.000) while posting a normal string. */
export function MoneyInput({
  defaultValue,
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type" | "value" | "defaultValue" | "onChange"> & {
  defaultValue?: number | string | null;
  value?: number | string | null;
  onValueChange?: (digits: string) => void;
}) {
  const [inner, setInner] = React.useState(format(defaultValue));
  const shown = value !== undefined ? format(value) : inner;
  return (
    <Input
      {...props}
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      onChange={(e) => {
        setInner(format(e.target.value));
        onValueChange?.(e.target.value.replace(/\D/g, ""));
      }}
    />
  );
}
