# tasks.py
from celery_app import celery_app
from agents.pipeline import run_pipeline


@celery_app.task(bind=True, name="run_analysis_task")
def run_analysis_task(self, objective: str, file_path: str, filename: str):
    job_id = self.request.id
    return run_pipeline(objective, file_path=file_path, filename=filename, job_id=job_id)