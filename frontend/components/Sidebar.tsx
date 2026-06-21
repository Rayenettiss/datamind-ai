"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/new", label: "New Analysis" },
  { href: "/history", label: "History" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="flex h-14 items-center gap-2 border-b border-[var(--color-line)] px-5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
        </span>
        <span className="mono text-[13px] font-medium tracking-tight">
          DataMind AI
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mono relative rounded-md px-3 py-2 text-[13px] transition-colors ${
                active
                  ? "bg-[var(--color-canvas)] text-[var(--color-ink)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-accent)]" />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-line)] p-3">
        <Link
          href="/new"
          className="mono flex items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 py-2 text-[13px] font-medium text-[var(--color-canvas)] hover:opacity-90"
        >
          + New Analysis
        </Link>
      </div>
    </aside>
  );
}