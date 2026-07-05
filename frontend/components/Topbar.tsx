import { Bell, HelpCircle } from "lucide-react";

export default function Topbar() {
  return (
    <header className="flex h-14 items-center justify-end gap-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-background)] px-6">
      <button
        aria-label="Help"
        className="text-[var(--color-on-surface-variant)] transition-colors hover:text-[var(--color-on-surface)]"
      >
        <HelpCircle size={18} />
      </button>
      <button
        aria-label="Notifications"
        className="text-[var(--color-on-surface-variant)] transition-colors hover:text-[var(--color-on-surface)]"
      >
        <Bell size={18} />
      </button>
      <div className="text-body-sm flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-container)] font-semibold text-[var(--color-on-surface)]">
        MR
      </div>
    </header>
  );
}