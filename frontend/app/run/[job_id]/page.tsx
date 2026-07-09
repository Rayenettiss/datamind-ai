// app/run/[job_id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  Loader2,
  RotateCw,
  XCircle,
  FileText,
  Code2,
  ClipboardList,
  Monitor,
  ListChecks,
  ScrollText,
  Brain,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import StatusBadge, { type JobStatus } from "@/components/StatusBadge";

type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";
type AgentKey = "PLANNER" | "EXECUTOR" | "CRITIC" | "REPORTER";
type AgentState = "idle" | "running" | "done" | "skipped";
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
  receivedAt?: number; // timestamp du navigateur au moment de la réception de l'événement
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

function formatClock(ts: number) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8); // HH:MM:SS
}

const STEP_ICONS = [Brain, Monitor, ListChecks, ScrollText];

function ProgressBar({
  status,
  agents,
  elapsedSec,
}: {
  status: JobStatus;
  agents: Record<AgentKey, AgentActivity>;
  elapsedSec: number;
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
          const isSkipped = state === "skipped";
          const isDone = state === "done" || (status === "DONE" && !isSkipped && i < STEPS.length);
          const isResolvedSkip = isSkipped && status === "DONE";
          const isActive = state === "running";
          const isFailed = status === "FAILED" && !isDone && !isActive && !isSkipped;
          const StepIcon = STEP_ICONS[i];

          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                    isDone
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : isResolvedSkip
                        ? "border-[var(--color-outline)] bg-[var(--color-surface-container-high)] text-[var(--color-outline)]"
                        : isActive
                          ? "border-[var(--color-secondary)] text-[var(--color-secondary)]"
                          : isFailed
                            ? "border-[var(--color-error)] text-[var(--color-error)]"
                            : "border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]"
                  }`}

                  style={
                  isActive
                    ? {
                        animation: "pulse-glow 1.8s ease-in-out infinite",
                      }
                    : undefined
                }
                >
                  {isDone ? (
                    <Check size={16} />
                  ) : StepIcon ? (
                    <StepIcon size={16} />
                  ) : (
                    i + 1
                  )}
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
                    isDone || isResolvedSkip ? "bg-[var(--color-primary)]" : "bg-[var(--color-outline-variant)]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="ml-6 flex items-center gap-6 border-l border-[var(--color-outline-variant)] pl-6">
        <div className="text-right">
          <p className="text-body-sm text-[var(--color-on-surface-variant)]">Elapsed Time</p>
          <p className="text-code-md text-[var(--color-on-surface)]">
            {formatElapsed(elapsedSec)}
          </p>
        </div>
      </div>
    </div>
  );
}

function AgentActivityStream({
  agents,
  status,
  selected,
  onSelect,
}: {
  agents: Record<AgentKey, AgentActivity>;
  status: JobStatus;
  selected: AgentKey | null;
  onSelect: (agent: AgentKey) => void;
}) {
  const visibleAgents = (Object.keys(agents) as AgentKey[])
    .filter((a) => agents[a].state !== "idle")
    .sort((a, b) => AGENT_TO_STEP[a] - AGENT_TO_STEP[b]);

  const stillWorking = status === "RUNNING" || status === "PENDING";

  return (
    <div className="flex flex-col rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-outline-variant)] px-4 py-3">
        <ClipboardList size={16} className="text-[var(--color-on-surface-variant)]" />
        <p className="text-body-sm font-semibold text-[var(--color-on-surface)]">
          Agent Activity Stream
        </p>
      </div>

      <div className="relative flex flex-col gap-4 p-4">
        {visibleAgents.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 size={16} className="animate-spin text-[var(--color-secondary)]" />
            <p className="text-body-sm text-[var(--color-on-surface-variant)]">
              Waiting for agents to report in…
            </p>
          </div>
        )}

        {visibleAgents.map((agent, i) => {
          const activity = agents[agent];
          const color = AGENT_COLORS[agent];
          const isSelected = selected === agent;
          const isRunning = activity.state === "running";
          const isLast = i === visibleAgents.length - 1;

          const preview =
          activity.state === "running"
            ? "Working…"
            : activity.state === "skipped"
              ? "Not needed — the script succeeded on the first try."
              : activity.content
                ? activity.content.length > 160
                  ? activity.content.slice(0, 160) + "…"
                  : activity.content
                : "Done.";

          return (
            <div key={agent} className="flex gap-3">
              {/* Timeline: dot + connecting line */}
              <div className="flex flex-col items-center">
                <span
                  className="mt-1.5 block h-2 w-2 shrink-0 rotate-45"
                  style={{ backgroundColor: isRunning ? color : "var(--color-outline)" }}
                />
                {!isLast && (
                  <span className="mt-1 w-px flex-1 bg-[var(--color-outline-variant)]" />
                )}
              </div>

              <div className="flex-1 pb-1">
                {activity.receivedAt && (
                  <p className="text-code-md mb-1.5 text-[var(--color-on-surface-variant)]">
                    {formatClock(activity.receivedAt)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onSelect(agent)}
                  className={`w-full rounded border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-[var(--color-outline)] bg-[var(--color-surface-container-high)]"
                      : "border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-outline)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-label-caps inline-block rounded px-2 py-0.5"
                      style={{ backgroundColor: `${color}1A`, color }}
                    >
                      {agent}
                    </span>
                    {isRunning && (
                      <RotateCw size={13} className="animate-spin" style={{ color }} />
                    )}
                  </div>
                  <p className="text-body-sm mt-2 line-clamp-3 text-[var(--color-on-surface)]">
                    {preview}
                  </p>
                </button>
              </div>
            </div>
          );
        })}

        {stillWorking && visibleAgents.length > 0 && (
          <div className="flex justify-center gap-1 pt-1 pb-2">
            <span className="h-1 w-1 rounded-full bg-[var(--color-outline)] motion-safe:animate-pulse" />
            <span className="h-1 w-1 rounded-full bg-[var(--color-outline)] motion-safe:animate-pulse [animation-delay:150ms]" />
            <span className="h-1 w-1 rounded-full bg-[var(--color-outline)] motion-safe:animate-pulse [animation-delay:300ms]" />
          </div>
        )}
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
        ) : activity.state === "skipped" ? (
          <p className="text-body-sm text-[var(--color-on-surface-variant)]">
            The Critic wasn't invoked — the Executor's script succeeded on the first attempt,
            so there was nothing to review.
          </p>
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
        const now = Date.now();
        setAgents({
          PLANNER: { state: "done", content: data.result.plan, receivedAt: now },
          EXECUTOR: {
            state: "done",
            content: data.result.code,
            attempts: data.result.attempts,
            receivedAt: now,
          },
          CRITIC:
            data.result.attempts > 0
              ? {
                  state: "done",
                  content: `Reviewed ${data.result.attempts} failed attempt(s).`,
                  receivedAt: now,
                }
              : { state: "skipped", receivedAt: now },
          REPORTER: { state: "done", content: data.result.summary, receivedAt: now },
        });
        setSelectedAgent("PLANNER");
        return;
      }

      if (data.status === "FAILED") {
        setErrorMsg(data.error);
        return;
      }

      // Job encore en cours : on rejoue l'historique des événements déjà survenus
      const histRes = await fetch(`${API_BASE_URL}/events/${jobId}`);
      if (!histRes.ok) return;
      const { events } = await histRes.json();

      const replayed: Record<AgentKey, AgentActivity> = { ...initialAgents };
      const now = Date.now();
      for (const evt of events) {
        if (evt.agent) {
          replayed[evt.agent as AgentKey] =
            evt.status === "running"
              ? { state: "running", receivedAt: now }
              : { state: "done", content: evt.content, attempts: evt.attempts, receivedAt: now };
        }
      }
      setAgents(replayed);
      const firstDone = (Object.keys(replayed) as AgentKey[]).find(
        (a) => replayed[a].state !== "idle"
      );
      if (firstDone) setSelectedAgent(firstDone);
    } catch {
      // silencieux — le WebSocket prendra le relais
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
          ? { state: "running", receivedAt: Date.now() }
          : data.status === "skipped"
            ? { state: "skipped", receivedAt: Date.now() }
            : {
                state: "done",
                content: data.content,
                attempts: data.attempts,
                receivedAt: Date.now(),
              },
    }));
    setSelectedAgent((prev) => prev ?? agent);
  }
  };

  ws.onerror = () => {
    // Ignore les erreurs qui surviennent avant que la connexion soit établie
    // (comportement normal du Strict Mode de React en développement)
    if (ws.readyState === WebSocket.OPEN) {
      setWsError("Live connection lost — showing the last known state.");
    }
  };

  return () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
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
      </div>

      {wsError && (
        <div className="flex items-center gap-2 rounded border border-[var(--color-error-container)] bg-[var(--color-error-soft)] px-3 py-2">
          <XCircle size={16} className="shrink-0 text-[var(--color-error)]" />
          <p className="text-body-sm text-[var(--color-error)]">{wsError}</p>
        </div>
      )}

      <ProgressBar status={status} agents={agents} elapsedSec={elapsedSec} />

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
        <AgentActivityStream
          agents={agents}
          status={status}
          selected={selectedAgent}
          onSelect={setSelectedAgent}
        />
        <DetailPanel selected={selectedAgent} agents={agents} />
      </div>
    </div>
  );
}