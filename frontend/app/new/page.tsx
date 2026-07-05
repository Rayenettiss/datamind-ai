'use client';

import {useState, useCallback} from 'react';
import {useDropzone, type FileRejection} from 'react-dropzone';
import {useRouter} from 'next/navigation';
import {UploadCloud, FileText, X, Loader2, AlertCircle} from 'lucide-react';
import { startAnalysis } from '@/lib/api';

export default function NewAnalysisPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [objective, setObjective] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const code = fileRejections[0].errors[0]?.code;
      if (code === "file-too-large") {
        setError("File is too large. Maximum size is 50MB.");
      } else if (code === "file-invalid-type") {
        setError("Invalid file type. Please upload a PDF or DOCX file.");
      } else {
        setError("File upload error. Please try again.");
      }
  }
  setError(null);
  setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/xlsx": [".xlsx"],
      "application/json": [".json"],
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  const isReady = Boolean(file) && objective.trim().length > 0;

  async function handleSubmit() {
    if (!file ||!isReady) return;
    setIsSubmitting(true);
    setError(null);

    try{
      const {job_id} = await startAnalysis(objective, file);
      router.push(`/run/${job_id}`);
    } catch (err) {
      setError(
        err instanceof Error
         ? err.message
          : "Couldn't start the analysis. Check that the backend is running."
        );
    } finally {
      setIsSubmitting(false);
    }
  }

   return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="text-body-sm flex items-center gap-1 text-[var(--color-on-surface-variant)]">
        <span>Data Workspace</span>
        <span>/</span>
        <span className="text-[var(--color-on-surface)]">New Task</span>
      </div>

      <h1 className="text-headline-md text-[var(--color-on-surface)]">
        New analysis
      </h1>

      <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] p-6">
        <div>
          <p className="text-label-caps mb-2 text-[var(--color-on-surface-variant)]">
            Source file
          </p>

          {!file ? (
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
                isDragActive
                  ? "border-[var(--color-secondary)] bg-[var(--color-surface-container-high)]"
                  : "border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-outline)]"
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud size={28} className="text-[var(--color-on-surface-variant)]" />
              <p className="text-body-sm text-[var(--color-on-surface)]">
                Drag a file here, or click to browse
              </p>
              <p className="text-body-sm text-[var(--color-on-surface-variant)]">
                CSV or JSON, up to 50MB
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-[var(--color-on-surface-variant)]" />
                <div>
                  <p className="text-body-sm text-[var(--color-on-surface)]">{file.name}</p>
                  <p className="text-body-sm text-[var(--color-on-surface-variant)]">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => setFile(null)}
                className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div>
          <p className="text-label-caps mb-2 text-[var(--color-on-surface-variant)]">
            Objective
          </p>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={4}
            placeholder="e.g. Analyse les ventes par produit et identifie les anomalies de prix."
            className="text-code-md w-full resize-none rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:border-[var(--color-secondary)] focus:outline-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded border border-[var(--color-error-container)] bg-[var(--color-error-soft)] px-3 py-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--color-error)]" />
            <p className="text-body-sm text-[var(--color-error)]">{error}</p>
          </div>
        )}

        <button
          type="button"
          disabled={!isReady || isSubmitting}
          onClick={handleSubmit}
          className="text-body-sm flex items-center justify-center gap-2 rounded bg-[var(--color-primary-container)] px-4 py-2 font-semibold text-[var(--color-on-primary-container)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Starting…" : "Run analysis"}
        </button>
      </div>
    </div>
  );
}