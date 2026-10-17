"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "./utils";
import { getCdnFallbackUrl } from "../../utils/cdnUtils";

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  src,
  onError,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  // Mantém o CDN como origem principal; use o Firebase como fallback direto.
  const firebaseUrl = getCdnFallbackUrl(src);
  const primarySrc = src;
  const [imageSrc, setImageSrc] = React.useState(primarySrc);

  React.useEffect(() => {
    setImageSrc(primarySrc);
  }, [primarySrc]);

  return (
    <AvatarPrimitive.Image
      key={imageSrc}
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      src={imageSrc}
      onError={(event) => {
        if (firebaseUrl && imageSrc !== firebaseUrl) {
          setImageSrc(firebaseUrl);
        }
        onError?.(event);
      }}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
