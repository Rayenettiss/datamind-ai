from typing import Any, Optional

JOBS: dict[ str, dict[str, Any] ] = {}

def create_job(job_id: str, objective: str, filename: Optional[str]) -> None:
    JOBS[job_id] = {
        "status": "pending",
        "objective": objective,
        "filename": filename,
        "result": None,
        "error": None,
    }

def set_running(job_id: str) -> None:
    if job_id in JOBS:
        JOBS[job_id]["status"] = "running"

def set_done(job_id: str, result: Any) -> None:
    if job_id in JOBS:
        JOBS[job_id]["status"] = "done"
        JOBS[job_id]["result"] = result

def set_error(job_id: str, error: str) -> None:
    if job_id in JOBS:
        JOBS[job_id]["status"] = "error"
        JOBS[job_id]["error"] = error

def get_job(job_id: str) -> Optional[dict[str, Any]]:
    return JOBS.get(job_id)

