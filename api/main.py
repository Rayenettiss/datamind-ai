# api/main.py
import shutil
import uuid
from pathlib import Path

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from celery.result import AsyncResult
import redis.asyncio as aioredis

from celery_app import celery_app
from tasks import run_analysis_task

app = FastAPI(title="DataMind AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.post("/analyse/")
async def analyse(
    objective: str = Form(...),
    file: UploadFile = File(...),
):
    # On sauvegarde le fichier sous un nom temporaire unique avant de connaître le job_id,
    # puisque le job_id n'existe qu'une fois la tâche Celery créée.
    temp_id = str(uuid.uuid4())
    job_dir = UPLOAD_DIR / temp_id
    job_dir.mkdir(parents=True, exist_ok=True)
    file_path = job_dir / file.filename
    with file_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    task = run_analysis_task.delay(objective, str(file_path), file.filename)

    return {"job_id": task.id}


@app.get("/result/{job_id}")
async def result(job_id: str):
    task_result = AsyncResult(job_id, app=celery_app)

    if not task_result.state:
        raise HTTPException(status_code=404, detail="job not found")

    status_map = {
        "PENDING": "PENDING",
        "STARTED": "RUNNING",
        "SUCCESS": "DONE",
        "FAILURE": "FAILED",
        "RETRY": "RUNNING",
    }
    status = status_map.get(task_result.state, task_result.state)

    response = {"job_id": job_id, "status": status}

    if task_result.state == "SUCCESS":
        response["result"] = task_result.result
        response["error"] = None
    elif task_result.state == "FAILURE":
        response["result"] = None
        response["error"] = str(task_result.result)
    else:
        response["result"] = None
        response["error"] = None

    return response


@app.websocket("/stream/{job_id}")
async def stream(websocket: WebSocket, job_id: str):
    await websocket.accept()
    r = aioredis.Redis(host="localhost", port=6379, db=0)
    pubsub = r.pubsub()
    channel = f"job:{job_id}"
    await pubsub.subscribe(channel)

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"].decode())
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(channel)
        await r.close()