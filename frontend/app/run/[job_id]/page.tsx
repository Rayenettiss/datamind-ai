// app/run/[job_id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  Loader2,
  XCircle,
  FileText,
  Code2,
  ClipboardList,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";
type AgentKey = "PLANNER" | "EXECUTOR" | "CRITIC" | "REPORTER";
type AgentState = "idle" | "running" | "done";

interface SandboxResult {
  stdout: string;
  stderr: string;
  returncode: number;
}

interface PipelineResult {
  plan: string;
  code: string;
  sandbox_result: SandboxResult;
  attempts: number;
  summary: string;
}

interface JobResponse {
  job_id: string;
  status: JobStatus;
  result: PipelineResult | null;
  error: string | null;
}

interface AgentActivity {
  state: AgentState;
  content?: string;
  attempts?: number;
}

const STEPS = ["PLANNING", "EXECUTING", "CRITIQUING", "REPORTING"] as const;

const AGENT_COLORS: Record<AgentKey, string> = {
  PLANNER: "var(--color-agent-planner)",
  EXECUTOR: "var(--color-agent-executor)",
  CRITIC: "var(--color-agent-critic)",
  REPORTER: "var(--color-agent-reporter)",
};

const AGENT_TO_STEP: Record<AgentKey, number> = {
  PLANNER: 0,
  EXECUTOR: 1,
  CRITIC: 2,
  REPORTER: 3,
};

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function StatusBadge({ status }: { status: JobStatus }) {
  const config: Record<JobStatus, { label: string; color: string; pulse?: boolean }> = {
    PENDING: { label: "PENDING", color: "var(--color-tertiary)" },
    RUNNING: { label: "RUNNING", color: "var(--color-secondary)", pulse: true },
    DONE: { label: "DONE", color: "var(--color-agent-executor)" },
    FAILED: { label: "FAILED", color: "var(--color-error)" },
  };
  const { label, color, pulse } = config[status];
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

function ProgressBar({
  status,
  agents,
}: {
  status: JobStatus;
  agents: Record<AgentKey, AgentActivity>;
}) {
  const stepStates = STEPS.map((_, i) => {
    const agent = (Object.keys(AGENT_TO_STEP) as AgentKey[]).find(
      (a) => AGENT_TO_STEP[a] === i
    )!;
    return agents[agent].state;
  });

  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] p-6">
      <div className="flex flex-1 items-center">
        {STEPS.map((step, i) => {
          const state = stepStates[i];
          const isDone = state === "done" || (status === "DONE" && i < STEPS.length);
          const isActive = state === "running";
          const isFailed = status === "FAILED" && !isDone && !isActive;

          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                    isDone
                      ? "border-[var(--color-agent-executor)] bg-[var(--color-agent-executor)] text-[var(--color-on-primary)]"
                      : isActive
                        ? "border-[var(--color-secondary)] text-[var(--color-secondary)]"
                        : isFailed
                          ? "border-[var(--color-error)] text-[var(--color-error)]"
                          : "border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]"
                  }`}
                >
                  {isDone ? <Check size={16} /> : isActive ? <Loader2 size={16} className="animate-spin" /> : i + 1}
                </div>
                <p
                  className={`text-label-caps ${
                    isDone || isActive ? "text-[var(--color-on-surface)]" : "text-[var(--color-on-surface-variant)]"
                  }`}
                >
                  {step}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 ${
                    isDone ? "bg-[var(--color-agent-executor)]" : "bg-[var(--color-outline-variant)]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentActivityStream({
  agents,
  selected,
  onSelect,
}: {
  agents: Record<AgentKey, AgentActivity>;
  selected: AgentKey | null;
  onSelect: (agent: AgentKey) => void;
}) {
  const visibleAgents = (Object.keys(agents) as AgentKey[])
    .filter((a) => agents[a].state !== "idle")
    .sort((a, b) => AGENT_TO_STEP[a] - AGENT_TO_STEP[b]);

  return (
    <div className="flex flex-col rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-outline-variant)] px-4 py-3">
        <ClipboardList size={16} className="text-[var(--color-on-surface-variant)]" />
        <p className="text-body-sm font-semibold text-[var(--color-on-surface)]">
          Agent Activity Stream
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {visibleAgents.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 size={16} className="animate-spin text-[var(--color-secondary)]" />
            <p className="text-body-sm text-[var(--color-on-surface-variant)]">
              Waiting for agents to report in…
            </p>
          </div>
        )}

        {visibleAgents.map((agent) => {
          const activity = agents[agent];
          const color = AGENT_COLORS[agent];
          const isSelected = selected === agent;
          const preview =
            activity.state === "running"
              ? "Working…"
              : activity.content
                ? activity.content.length > 160
                  ? activity.content.slice(0, 160) + "…"
                  : activity.content
                : "Done.";

          return (
            <button
              key={agent}
              type="button"
              onClick={() => onSelect(agent)}
              className={`rounded border p-3 text-left transition-colors ${
                isSelected
                  ? "border-[var(--color-outline)] bg-[var(--color-surface-container-high)]"
                  : "border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-outline)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-label-caps inline-block rounded px-2 py-0.5"
                  style={{ backgroundColor: `${color}1A`, color }}
                >
                  {agent}
                </span>
                {activity.state === "running" && (
                  <Loader2 size={12} className="animate-spin" style={{ color }} />
                )}
              </div>
              <p className="text-body-sm mt-2 line-clamp-2 text-[var(--color-on-surface)]">
                {preview}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailPanel({
  selected,
  agents,
}: {
  selected: AgentKey | null;
  agents: Record<AgentKey, AgentActivity>;
}) {
  if (!selected || agents[selected].state === "idle") {
    return (
      <div className="flex h-full min-h-[300px] flex-col rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-outline-variant)] px-4 py-3">
          <Code2 size={16} className="text-[var(--color-on-surface-variant)]" />
          <p className="text-code-md text-[var(--color-on-surface-variant)]">details</p>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-body-sm text-[var(--color-on-surface-variant)]">
            Select an agent on the left to see its work.
          </p>
        </div>
      </div>
    );
  }

  const activity = agents[selected];
  const color = AGENT_COLORS[selected];
  const labels: Record<AgentKey, { label: string; icon: React.ReactNode }> = {
    PLANNER: { label: "plan.md", icon: <FileText size={16} /> },
    EXECUTOR: { label: "script.py", icon: <Code2 size={16} /> },
    CRITIC: { label: "review.md", icon: <FileText size={16} /> },
    REPORTER: { label: "summary.md", icon: <FileText size={16} /> },
  };
  const { label, icon } = labels[selected];

  return (
    <div className="flex flex-col rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-outline-variant)] px-4 py-3" style={{ color }}>
        {icon}
        <p className="text-code-md">{label}</p>
      </div>
      <div className="max-h-[520px] overflow-auto p-4">
        {activity.state === "running" && !activity.content ? (
          <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)]">
            <Loader2 size={14} className="animate-spin" />
            <p className="text-body-sm">Working…</p>
          </div>
        ) : selected === "EXECUTOR" ? (
          <pre className="text-code-md whitespace-pre-wrap text-[var(--color-on-surface)]">
            {activity.content}
          </pre>
        ) : (
          <p className="text-body-sm whitespace-pre-wrap text-[var(--color-on-surface)]">
            {activity.content}
          </p>
        )}
      </div>
    </div>
  );
}

const initialAgents: Record<AgentKey, AgentActivity> = {
  PLANNER: { state: "idle" },
  EXECUTOR: { state: "idle" },
  CRITIC: { state: "idle" },
  REPORTER: { state: "idle" },
};

export default function RunPage() {
  const params = useParams<{ job_id: string }>();
  const jobId = params.job_id;

  const [status, setStatus] = useState<JobStatus>("PENDING");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Record<AgentKey, AgentActivity>>(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<AgentKey | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startRef = useRef<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Vérification initiale : le job est peut-être déjà terminé (page rechargée après coup)
  useEffect(() => {
    if (!jobId) return;

    async function checkExisting() {
      try {
        const res = await fetch(`${API_BASE_URL}/result/${jobId}`);
        if (!res.ok) return;
        const data: JobResponse = await res.json();
        setStatus(data.status);

        if (data.status === "DONE" && data.result) {
          setAgents({
            PLANNER: { state: "done", content: data.result.plan },
            EXECUTOR: {
              state: "done",
              content: data.result.code,
              attempts: data.result.attempts,
            },
            CRITIC:
              data.result.attempts > 0
                ? { state: "done", content: `Reviewed ${data.result.attempts} failed attempt(s).` }
                : { state: "idle" },
            REPORTER: { state: "done", content: data.result.summary },
          });
          setSelectedAgent("PLANNER");
        } else if (data.status === "FAILED") {
          setErrorMsg(data.error);
        }
      } catch {
        // silencieux — le WebSocket prendra le relais si le job est encore en cours
      }
    }

    checkExisting();
  }, [jobId]);

  // 2. Connexion WebSocket pour les mises à jour en direct
  useEffect(() => {
    if (!jobId) return;

    const wsUrl = API_BASE_URL.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/stream/${jobId}`);
    wsRef.current = ws;

    ws.onopen = () => setWsError(null);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.event === "PIPELINE_DONE") {
        setStatus("DONE");
        return;
      }

      if (data.agent) {
        const agent: AgentKey = data.agent;
        setStatus("RUNNING");
        setAgents((prev) => ({
          ...prev,
          [agent]:
            data.status === "running"
              ? { state: "running" }
              : { state: "done", content: data.content, attempts: data.attempts },
        }));
        setSelectedAgent((prev) => prev ?? agent);
      }
    };

    ws.onerror = () => setWsError("Live connection lost — showing the last known state.");

    return () => {
      ws.close();
    };
  }, [jobId]);

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-headline-md text-[var(--color-on-surface)]">
            Run:{" "}
            <span className="text-code-md text-[var(--color-on-surface-variant)]">
              {jobId}
            </span>
          </h1>
          <StatusBadge status={status} />
        </div>
        <div className="text-body-sm flex items-center gap-2 text-[var(--color-on-surface-variant)]">
          <span>Elapsed Time</span>
          <span className="text-code-md text-[var(--color-on-surface)]">
            {formatElapsed(elapsedSec)}
          </span>
        </div>
      </div>

      {wsError && (
        <div className="flex items-center gap-2 rounded border border-[var(--color-error-container)] bg-[var(--color-error-soft)] px-3 py-2">
          <XCircle size={16} className="shrink-0 text-[var(--color-error)]" />
          <p className="text-body-sm text-[var(--color-error)]">{wsError}</p>
        </div>
      )}

      <ProgressBar status={status} agents={agents} />

      {status === "FAILED" && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error-container)] bg-[var(--color-error-soft)] p-4">
          <XCircle size={18} className="mt-0.5 shrink-0 text-[var(--color-error)]" />
          <div>
            <p className="text-body-md font-semibold text-[var(--color-error)]">The run failed</p>
            <p className="text-body-sm mt-1 text-[var(--color-on-surface-variant)]">
              {errorMsg ?? "No error details were returned."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgentActivityStream agents={agents} selected={selectedAgent} onSelect={setSelectedAgent} />
        <DetailPanel selected={selectedAgent} agents={agents} />
      </div>
    </div>
  );
}