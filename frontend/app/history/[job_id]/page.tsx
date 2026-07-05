export default async function ReportPage({
  params,
}: {
  params: Promise<{ job_id: string }>;
}) {
  const { job_id } = await params;
  return (
    <p className="text-body-sm text-[var(--color-on-surface-variant)]">
      Report {job_id} — built in a later phase.
    </p>
  );
}