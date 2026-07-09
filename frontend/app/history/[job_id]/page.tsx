// app/history/[job_id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Download,
  FileText,
  Code2,
  Clock,
  Database,
  Target,
  Users,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import StatusBadge, { type JobStatus } from "@/components/StatusBadge";

interface SandboxResult {
  stdout: string;
  stderr: string;
  returncode: number;
}

interface FinalResult {
  plan?: string;
  code?: string;
  sandbox_result?: SandboxResult;
  attempts?: number;
  summary?: string;
  error?: string;
}

interface RunRecord {
  job_id: string;
  source_file: string;
  objective: string;
  status: JobStatus;
  started_at: string;
  ended_at: string | null;
  total_tokens: number | null;
  final_result: FinalResult | null;
}

interface AgentLog {
  id: number;
  job_id: string;
  agent_name: string;
  message_type: string;
  content: string;
  tokens_used: number | null;
  created_at: string;
}

interface RunLogsResponse {
  run: RunRecord;
  logs: AgentLog[];
}

const AGENT_COLORS: Record<string, string> = {
  PLANNER: "var(--color-agent-planner)",
  EXECUTOR: "var(--color-agent-executor)",
  CRITIC: "var(--color-agent-critic)",
  REPORTER: "var(--color-agent-reporter)",
};

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const totalSec = Math.max(0, Math.round((end - start) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 text-[var(--color-on-surface-variant)]">{icon}</span>
      <div>
        <p className="text-label-caps text-[var(--color-on-surface-variant)]">{label}</p>
        <p className="text-body-sm mt-0.5 text-[var(--color-on-surface)]">{value}</p>
      </div>
    </div>
  );
}

export default function ReportPreviewPage() {
  const params = useParams<{ job_id: string }>();
  const jobId = params.job_id;

  const [data, setData] = useState<RunLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    async function fetchLogs() {
      try {
        const res = await fetch(`${API_BASE_URL}/runs/${jobId}/logs`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("No record found for this run.");
          } else {
            setError(`Server responded with ${res.status}`);
          }
          return;
        }
        const json: RunLogsResponse = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't reach the backend.");
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <Loader2 size={18} className="animate-spin text-[var(--color-secondary)]" />
        <p className="text-body-sm text-[var(--color-on-surface-variant)]">Loading report…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error-container)] bg-[var(--color-error-soft)] p-4">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-[var(--color-error)]" />
        <div>
          <p className="text-body-md font-semibold text-[var(--color-error)]">Couldn't load this report</p>
          <p className="text-body-sm mt-1 text-[var(--color-on-surface-variant)]">
            {error ?? "Unknown error."}
          </p>
        </div>
      </div>
    );
  }

  const { run, logs } = data;
  const objectiveTitle =
    run.objective.length > 60 ? run.objective.slice(0, 60) + "…" : run.objective;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-body-sm flex items-center gap-1 text-[var(--color-on-surface-variant)]">
        <span>History</span>
        <span>/</span>
        <span className="text-[var(--color-on-surface)]">{objectiveTitle}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-headline-md text-[var(--color-on-surface)]">Report</h1>
          <StatusBadge status={run.status} />
        </div>
        <button
          type="button"
          disabled
          title="PDF export isn't available yet"
          className="text-body-sm flex items-center gap-2 rounded bg-[var(--color-primary-container)] px-4 py-2 font-semibold text-[var(--color-on-primary-container)] opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Zone centrale : pas encore de PDF, on affiche le résumé du Reporter en attendant */}
        <div className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-outline-variant)] px-4 py-3">
            <FileText size={16} className="text-[var(--color-on-surface-variant)]" />
            <p className="text-body-sm font-semibold text-[var(--color-on-surface)]">
              Report preview
            </p>
          </div>
          <div className="p-5">
            {run.status === "DONE" && run.final_result?.summary ? (
              <p className="text-body-sm whitespace-pre-wrap text-[var(--color-on-surface)]">
                {run.final_result.summary}
              </p>
            ) : run.status === "FAILED" ? (
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--color-error)]" />
                <p className="text-body-sm text-[var(--color-on-surface-variant)]">
                  {run.final_result?.error ?? "This run failed before producing a report."}
                </p>
              </div>
            ) : (
              <p className="text-body-sm text-[var(--color-on-surface-variant)]">
                No summary available yet.
              </p>
            )}

            <p className="text-body-sm mt-6 text-[var(--color-on-surface-variant)]">
              PDF rendering isn't wired in yet — this is a text preview of the Reporter's
              summary in the meantime.
            </p>
          </div>
        </div>

        {/* Panneau droit : Analysis Details */}
        <div className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
          <div className="border-b border-[var(--color-outline-variant)] px-4 py-3">
            <p className="text-body-sm font-semibold text-[var(--color-on-surface)]">
              Analysis Details
            </p>
          </div>

          <div className="divide-y divide-[var(--color-outline-variant)] px-4">
            <DetailRow
              icon={<Database size={15} />}
              label="Source File"
              value={run.source_file}
            />
            <DetailRow
              icon={<Target size={15} />}
              label="Primary Goal"
              value={run.objective}
            />
            <DetailRow
              icon={<Clock size={15} />}
              label="Duration"
              value={formatDuration(run.started_at, run.ended_at)}
            />
            <DetailRow
              icon={<Code2 size={15} />}
              label="Total Tokens"
              value={run.total_tokens ?? "Not tracked yet"}
            />
            <DetailRow
              icon={<Code2 size={15} />}
              label="Compute Cost"
              value="Not tracked yet"
            />
          </div>

          <div className="border-t border-[var(--color-outline-variant)] px-4 py-3">
            <div className="mb-3 flex items-center gap-2">
              <Users size={15} className="text-[var(--color-on-surface-variant)]" />
              <p className="text-label-caps text-[var(--color-on-surface-variant)]">
                Agents Engaged
              </p>
            </div>

            {logs.length === 0 ? (
              <p className="text-body-sm text-[var(--color-on-surface-variant)]">
                No agent activity recorded for this run.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {logs.map((log) => {
                  const color = AGENT_COLORS[log.agent_name] ?? "var(--color-outline)";
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 py-2"
                    >
                      <span
                        className="text-label-caps rounded px-2 py-0.5"
                        style={{ backgroundColor: `${color}1A`, color }}
                      >
                        {log.agent_name}
                      </span>
                      <span className="text-body-sm text-[var(--color-on-surface-variant)]">
                        {log.message_type === "skipped" ? "Skipped" : formatTimestamp(log.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}