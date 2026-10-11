"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/colecao", label: "Caderneta" },
  { href: "/procurar", label: "Procurar" },
  { href: "/perfil", label: "Perfil" },
] as const;

/** Navegação horizontal desktop (estilo Stitch: link activo sublinhado a primário). */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-5 md:flex" aria-label="Navegação">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "pb-1 text-xs font-semibold uppercase tracking-wider transition-colors",
              active
                ? "border-b-2 border-primary-700 text-primary-700"
                : "text-muted-foreground hover:text-primary-700",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
