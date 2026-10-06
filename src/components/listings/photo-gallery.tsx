"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** photos: full public URLs, cover first. */
export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [i, setI] = React.useState(0);
  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground">
        <ImageIcon className="size-10" />
        <span className="text-sm">No photos yet</span>
      </div>
    );
  }
  const go = (d: number) => setI((x) => (x + d + photos.length) % photos.length);
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[i]} alt={`${title} – photo ${i + 1}`} className="aspect-[16/10] w-full object-cover" />
        {photos.length > 1 && (
          <>
            <button
              aria-label="Previous photo"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              aria-label="Next photo"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium">
              {i + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((src, idx) => (
            <button
              key={src}
              aria-label={`Show photo ${idx + 1}`}
              aria-current={idx === i}
              onClick={() => setI(idx)}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-lg border-2 sm:size-20",
                idx === i ? "border-primary" : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
