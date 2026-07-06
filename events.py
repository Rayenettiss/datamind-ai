# events.py
import json
import redis

redis_client = redis.Redis(host="localhost", port=6379, db=0)


def publish_event(job_id: str, event: dict) -> None:
    """Publie un événement sur le canal Redis dédié à ce job.
    Le WebSocket /stream/{job_id} est abonné à ce même canal et relaie
    l'événement en temps réel au frontend."""
    channel = f"job:{job_id}"
    redis_client.publish(channel, json.dumps(event))