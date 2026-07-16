// src/components/secop/TrackedCtaLink.tsx
"use client";

/**
 * Link con tracking de clic (Fase 3 — métricas). Envuelve next/link para
 * mantener las páginas de licitaciones como server components; solo esta
 * hoja necesita "use client" para llamar track() en el clic.
 */

import Link from "next/link";
import { track } from "@vercel/analytics";
import type { ReactNode } from "react";

interface Props {
  href: string;
  event: string;
  className?: string;
  children: ReactNode;
}

export default function TrackedCtaLink({ href, event, className, children }: Props) {
  return (
    <Link href={href} className={className} onClick={() => track(event)}>
      {children}
    </Link>
  );
}
