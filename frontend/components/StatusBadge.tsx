// components/StatusBadge.tsx
export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; pulse?: boolean }> = {
  PENDING: { label: "PENDING", color: "var(--color-tertiary)" },
  RUNNING: { label: "RUNNING", color: "var(--color-secondary)", pulse: true },
  DONE: { label: "DONE", color: "var(--color-agent-executor)" },
  FAILED: { label: "FAILED", color: "var(--color-error)" },
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const { label, color, pulse } = STATUS_CONFIG[status];
  return (
    <span
      className="text-label-caps inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      </span>
      {label}
    </span>
  );
}