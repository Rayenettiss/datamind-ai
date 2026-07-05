export default async function RunPage({
  params,
}: {
  params: Promise<{ job_id: string }>;
}) {
  const { job_id } = await params;

  return (
    <p className="text-body-sm text-[var(--color-on-surface-variant)]">
      Run {job_id} — live view built in the next phase.
    </p>
  );
}