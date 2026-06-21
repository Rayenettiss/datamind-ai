import { Bell, HelpCircle } from "lucide-react";

export default function Topbar() {
  return (
    <header className="flex h-14 items-center justify-end gap-4 border-b border-[var(--color-line)] bg-[var(--color-canvas)] px-6">
      <button
        aria-label="Help"
        className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
      >
        <HelpCircle size={18} />
      </button>
      <button
        aria-label="Notifications"
        className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
      >
        <Bell size={18} />
      </button>
      <div className="mono flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] text-[12px] text-[var(--color-ink)]">
        MR
      </div>
    </header>
  );
}