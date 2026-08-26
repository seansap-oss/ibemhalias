"use client";

import Image from "next/image";
import Link from "next/link";

export function IbemhalLogo({
  href = "/",
  className = "",
  imageClassName = "h-[56px] w-auto sm:h-[62px]",
  priority = false,
  ariaLabel = "Ibemhal IAS home",
}: {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 items-center ${className}`}
    >
      <Image
        src="/brand/ibemhal-ias-logo-final.png"
        alt="Ibemhal IAS - A low-fee Institute"
        width={498}
        height={132}
        priority={priority}
        className={`object-contain object-left ${imageClassName}`}
      />
    </Link>
  );
}
