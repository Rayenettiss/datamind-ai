# events.py
import json
import redis

redis_client = redis.Redis(host="localhost", port=6379, db=0)


def publish_event(job_id: str, event: dict) -> None:
    """Publie un événement en direct ET l'ajoute à l'historique persistant du job,
    pour qu'un rechargement de page en cours de route puisse retrouver ce qui
    s'est déjà passé avant de s'abonner aux événements à venir."""
    channel = f"job:{job_id}"
    history_key = f"job-history:{job_id}"

    payload = json.dumps(event)
    redis_client.publish(channel, payload)
    redis_client.rpush(history_key, payload)
    redis_client.expire(history_key, 3600)  # nettoyage auto après 1h