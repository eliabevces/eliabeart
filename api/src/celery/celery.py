from celery import Celery
from src.core.config import settings

celery_app = Celery(
    "eliabeart",
    broker=f"redis://{settings.redis_server}:{settings.redis_port}/0",
    backend=f"redis://{settings.redis_server}:{settings.redis_port}/0",
)
