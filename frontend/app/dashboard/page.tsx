// app/dashboard/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Square,
  RotateCcw,
  BarChart3,
  DollarSign,
  CheckCircle2,
  Clock,
} from "lucide-react";
import StatusBadge, { type JobStatus } from "@/components/StatusBadge";

interface RunRow {
  jobId: string;
  name: string;
  status: JobStatus;
  duration: string;
  tokenCost: string;
}

// Données fictives — à remplacer par un vrai fetch vers GET /runs une fois l'endpoint créé.
const FIXTURE_RUNS: RunRow[] = [
  { jobId: "b81bead4-eace-4555", name: "Analyse ventes Q2 par produit", status: "DONE", duration: "00:00:22", tokenCost: "$0.014" },
  { jobId: "cde2dc01-c0f1-4fc3", name: "Nettoyage fichier clients", status: "DONE", duration: "00:00:18", tokenCost: "$0.011" },
  { jobId: "590b8fd6-a898-40c3", name: "Détection anomalies prix", status: "RUNNING", duration: "00:00:09", tokenCost: "—" },
  { jobId: "42c539e0-bf00-47a5", name: "Rapport churn mensuel", status: "FAILED", duration: "00:00:31", tokenCost: "$0.019" },
  { jobId: "922f92f6-f2e1-4200", name: "Segmentation clients actifs", status: "DONE", duration: "00:00:26", tokenCost: "$0.016" },
  { jobId: "f838b4e4-e943-4e5a", name: "Total ventes par région", status: "DONE", duration: "00:00:15", tokenCost: "$0.009" },
  { jobId: "e02c55af-9799-4a1b", name: "Prévision stock semaine 3", status: "PENDING", duration: "—", tokenCost: "—" },
];

const PAGE_SIZE = 5;

function StatCard({
  label,
  value,
  icon,
  delta,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  delta?: { direction: "up" | "down"; text: string };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-label-caps text-[var(--color-on-surface-variant)]">{label}</p>
        <span className="text-[var(--color-on-surface-variant)]">{icon}</span>
      </div>
      <p className="text-display-lg text-[var(--color-on-surface)]">{value}</p>
      {delta && (
        <div
          className="flex items-center gap-1 text-body-sm"
          style={{
            color:
              delta.direction === "up"
                ? "var(--color-agent-executor)"
                : "var(--color-error)",
          }}
        >
          {delta.direction === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{delta.text}</span>
        </div>
      )}
    </div>
  );
}

function ActionButtons({ status }: { status: JobStatus }) {
  if (status === "DONE") {
    return (
      <button
        type="button"
        title="Download report"
        className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
      >
        <Download size={16} />
      </button>
    );
  }
  if (status === "RUNNING") {
    return (
      <button
        type="button"
        title="Stop run"
        className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)]"
      >
        <Square size={16} />
      </button>
    );
  }
  if (status === "FAILED") {
    return (
      <button
        type="button"
        title="Replay run"
        className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
      >
        <RotateCcw size={16} />
      </button>
    );
  }
  return <span className="text-body-sm text-[var(--color-on-surface-variant)]">—</span>;
}

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(FIXTURE_RUNS.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const visibleRuns = FIXTURE_RUNS.slice(start, start + PAGE_SIZE);

  const totalRuns = FIXTURE_RUNS.length;
  const doneRuns = FIXTURE_RUNS.filter((r) => r.status === "DONE").length;
  const successRate = totalRuns > 0 ? Math.round((doneRuns / totalRuns) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-md text-[var(--color-on-surface)]">Dashboard</h1>
        <p className="text-body-sm mt-1 text-[var(--color-on-surface-variant)]">
          Overview of your recent analyses. (Sample data — live stats coming soon.)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Runs"
          value={String(totalRuns)}
          icon={<BarChart3 size={16} />}
        />
        <StatCard
          label="Avg. Cost"
          value="$0.014"
          icon={<DollarSign size={16} />}
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={<CheckCircle2 size={16} />}
          delta={{ direction: "up", text: "+4% vs last week" }}
        />
        <StatCard
          label="Avg. Duration"
          value="00:00:22"
          icon={<Clock size={16} />}
        />
      </div>

      <div className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
        <div className="border-b border-[var(--color-outline-variant)] px-5 py-3">
          <p className="text-body-sm font-semibold text-[var(--color-on-surface)]">Recent Runs</p>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-outline-variant)]">
              <th className="text-label-caps px-5 py-3 text-left text-[var(--color-on-surface-variant)]">Name</th>
              <th className="text-label-caps px-5 py-3 text-left text-[var(--color-on-surface-variant)]">Status</th>
              <th className="text-label-caps px-5 py-3 text-left text-[var(--color-on-surface-variant)]">Duration</th>
              <th className="text-label-caps px-5 py-3 text-left text-[var(--color-on-surface-variant)]">Token Cost</th>
              <th className="text-label-caps px-5 py-3 text-left text-[var(--color-on-surface-variant)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRuns.map((run, i) => (
              <tr
                key={run.jobId}
                className={i % 2 === 1 ? "bg-[var(--color-surface-container-low)]" : ""}
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/run/${run.jobId}`}
                    className="text-body-sm text-[var(--color-on-surface)] hover:text-[var(--color-secondary)]"
                  >
                    {run.name}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-5 py-3">
                  <span className="text-code-md text-[var(--color-on-surface-variant)]">{run.duration}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-code-md text-[var(--color-on-surface-variant)]">{run.tokenCost}</span>
                </td>
                <td className="px-5 py-3">
                  <ActionButtons status={run.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-[var(--color-outline-variant)] px-5 py-3">
          <p className="text-body-sm text-[var(--color-on-surface-variant)]">
            Showing {start + 1} to {Math.min(start + PAGE_SIZE, totalRuns)} of {totalRuns} entries
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-body-sm rounded border border-[var(--color-outline-variant)] px-3 py-1 text-[var(--color-on-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-body-sm rounded border border-[var(--color-outline-variant)] px-3 py-1 text-[var(--color-on-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}