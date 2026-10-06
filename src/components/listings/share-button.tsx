"use client";

import * as React from "react";
import { Check, Link2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WA_PATH =
  "M12.04 2a9.9 9.9 0 0 0-8.5 14.93L2 22l5.2-1.36A9.9 9.9 0 1 0 12.04 2Zm5.8 14c-.25.7-1.45 1.34-2 1.4-.5.07-1.14.1-1.84-.12-.42-.14-.96-.31-1.65-.6-2.9-1.25-4.8-4.17-4.94-4.37-.15-.2-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.3.58-.37.78-.37h.56c.18 0 .42-.07.65.5.25.58.84 2.02.9 2.17.08.15.12.32.02.5-.1.2-.15.32-.3.5-.15.17-.31.38-.44.5-.15.15-.3.3-.13.6.17.3.77 1.27 1.65 2.05 1.13 1 2.08 1.32 2.38 1.47.3.15.47.12.65-.07.17-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.7.8 2 .95.3.15.5.22.57.35.07.12.07.72-.18 1.42Z";

/** Share a listing: WhatsApp text (title, price, link) plus copy-link. Shares the page's own URL, or `publicPath` when used on a staff page. */
export function ShareButtons({ title, price, location, publicPath }: { title: string; price: string; location: string; publicPath?: string }) {
  const [copied, setCopied] = React.useState(false);
  const url = () => (publicPath ? `${window.location.origin}${publicPath}` : window.location.href.split("#")[0]);

  const whatsapp = () => {
    const text = `${title}\n${price} · ${location}\n${url()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url());
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={whatsapp} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
        <svg viewBox="0 0 24 24" className="size-4 fill-[#25D366]" aria-hidden><path d={WA_PATH} /></svg>
        Share on WhatsApp
      </button>
      <button type="button" onClick={copy} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
        {copied ? <Check className="size-4 text-emerald-600" /> : <Link2 className="size-4" />}
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
