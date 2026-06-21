import shutil
import uuid 
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agents.pipeline import run_planner
from api.store import create_job, set_running, set_done, set_error, get_job

app = FastAPI(title=" DataMind AI - API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

def execute_job(job_id: str, objective: str) -> None:
    set_running(job_id)
    try:
        result = run_planner(objective)
        set_done(job_id, result)
    except Exception as e:
        set_error(job_id, str(e))

@app.post("/analyse/")
async def analyse(
    background_tasks: BackgroundTasks,
    objective: str = Form(...),
    file: UploadFile = File(None)
):
    job_id = str(uuid.uuid4())

    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    file_path = job_dir / file.filename
    with file_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    
    create_job(job_id, objective, file.filename)
    background_tasks.add_task(execute_job, job_id, objective)

    return {"job_id": job_id}

@app.get("/result/{job_id}")
async def get_result(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, **job}
