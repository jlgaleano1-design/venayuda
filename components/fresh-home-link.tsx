"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function FreshHomeLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const href = "/#campanas";

  return (
    <Link
      className={className}
      href={href}
      prefetch={false}
      onClick={(event) => {
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      {children}
    </Link>
  );
}
