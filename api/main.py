# api/main.py
import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agents.pipeline import run_pipeline
from api.store import create_job, set_running, set_done, set_failed, get_job

app = FastAPI(title="DataMind AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def execute_job(job_id: str, objective: str, file_path: str, filename: str) -> None:
    set_running(job_id)
    try:
        result = run_pipeline(objective, file_path=file_path, filename=filename)
        set_done(job_id, result)
    except Exception as e:
        set_failed(job_id, str(e))


@app.post("/analyse/")
async def analyse(
    background_tasks: BackgroundTasks,
    objective: str = Form(...),
    file: UploadFile = File(...),
):
    job_id = str(uuid.uuid4())

    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    file_path = job_dir / file.filename
    with file_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    create_job(job_id, objective, file.filename)
    background_tasks.add_task(
        execute_job, job_id, objective, str(file_path), file.filename
    )

    return {"job_id": job_id}


@app.get("/result/{job_id}")
async def result(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return {"job_id": job_id, **job}