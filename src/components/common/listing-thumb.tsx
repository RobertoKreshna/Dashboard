import { ImageIcon } from "lucide-react";
import { photoUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ListingThumb({
  path,
  alt,
  className,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const url = photoUrl(path);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} loading="lazy" className={cn("object-cover bg-muted", className)} />
  ) : (
    <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
      <ImageIcon className="size-5" aria-label="No photo" />
    </div>
  );
}
