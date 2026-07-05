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
    <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
      <div className="flex h-14 items-center gap-2 border-b border-[var(--color-outline-variant)] px-5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-secondary)] opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-secondary)]" />
        </span>
        <span className="text-body-md font-semibold tracking-tight text-[var(--color-on-surface)]">
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
              className={`text-body-sm relative rounded px-3 py-2 transition-colors ${
                active
                  ? "bg-[var(--color-surface-container)] text-[var(--color-on-surface)]"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-secondary)]" />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-outline-variant)] p-3">
        <Link
          href="/new"
          className="text-body-sm flex items-center justify-center gap-2 rounded px-3 py-2 font-semibold bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:opacity-90"
        >
          + New Analysis
        </Link>
      </div>
    </aside>
  );
}