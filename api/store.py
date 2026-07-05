# api/store.py
from typing import Any, Optional

JOBS: dict[str, dict[str, Any]] = {}


def create_job(job_id: str, objective: str, filename: Optional[str]) -> None:
    JOBS[job_id] = {
        "status": "PENDING",
        "objective": objective,
        "filename": filename,
        "result": None,
        "error": None,
    }


def set_running(job_id: str) -> None:
    JOBS[job_id]["status"] = "RUNNING"


def set_done(job_id: str, result: dict) -> None:
    JOBS[job_id]["status"] = "DONE"
    JOBS[job_id]["result"] = result


def set_failed(job_id: str, error: str) -> None:
    JOBS[job_id]["status"] = "FAILED"
    JOBS[job_id]["error"] = error


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    return JOBS.get(job_id)