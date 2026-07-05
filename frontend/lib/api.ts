export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function startAnalysis(objective: string, file: File) {
  const formData = new FormData();
  formData.append("objective", objective);
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/analyse`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<{ job_id: string }>;
}
