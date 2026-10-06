"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/field";
import { NativeSelect } from "@/components/common/native-select";

const OTHER = "__other__";

/**
 * One level of the Province → City → District → Village cascade.
 * Pick from the official list, or choose "Other" to type a name that isn't listed. When no list exists
 * (boundary data not installed) it simply becomes a text box. Posts its value under `name`.
 */
export function PlacePicker({
  label,
  name,
  value,
  onChange,
  options,
  disabled,
  loading,
  required,
  error,
  hint,
  id,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  id: string;
}) {
  const [typing, setTyping] = React.useState(false);
  const inList = options.includes(value);
  const manual = typing || (!!value && !inList && options.length > 0);
  const noList = !loading && options.length === 0 && !disabled; // locked levels still look like dropdowns

  return (
    <Field label={label} required={required} error={error} hint={hint} htmlFor={id}>
      <input type="hidden" name={name} value={value} />
      {noList || manual ? (
        <div className="space-y-2">
          {!noList && (
            <NativeSelect
              id={id}
              aria-label={label}
              value={OTHER}
              disabled={disabled}
              onChange={(e) => {
                if (e.target.value !== OTHER) {
                  setTyping(false);
                  onChange(e.target.value);
                }
              }}
            >
              <option value={OTHER}>Other (type manually)</option>
              {options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </NativeSelect>
          )}
          <Input
            id={noList ? id : undefined}
            aria-label={`${label} (typed)`}
            placeholder={`Type ${label.toLowerCase()}`}
            value={value}
            disabled={disabled}
            aria-invalid={!!error}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      ) : (
        <NativeSelect
          id={id}
          value={value}
          disabled={disabled || loading}
          aria-invalid={!!error}
          onChange={(e) => {
            if (e.target.value === OTHER) {
              setTyping(true);
              onChange("");
            } else onChange(e.target.value);
          }}
        >
          <option value="" disabled>{loading ? "Loading…" : "Select…"}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          <option value={OTHER}>Other (type manually)</option>
        </NativeSelect>
      )}
    </Field>
  );
}
