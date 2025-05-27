from src.album import crud as album_crud
from src.imagem import crud as imagem_crud
from src.dependencies.redis import cache
from sqlalchemy.orm import Session
import json
from typing import List, Optional, Dict, Any

CACHE_EXPIRATION = 60

redis_cache = cache()


def delete_cache(cache_key: str) -> None:
    redis_cache.delete(cache_key)


def get_cached_data(cache_key: str) -> Optional[Any]:
    cached_data = redis_cache.get(cache_key)
    return json.loads(cached_data) if cached_data else None


def set_cached_data(
    cache_key: str, data: Any, expiration: int = CACHE_EXPIRATION
) -> None:
    redis_cache.set(cache_key, json.dumps(data), ex=expiration)


def get_all_albums(db: Session) -> List[Dict[str, Any]]:
    cache_key = "public_albums"
    albums = get_cached_data(cache_key)

    if not albums:
        albums = album_crud.get_albuns_publicos(db)
        albums = [
            {col: getattr(album, col) for col in album.__table__.columns.keys()}
            for album in albums
        ]
        set_cached_data(cache_key, albums)

    return albums


def get_album(db: Session, album_id: int) -> Optional[Dict[str, Any]]:
    cache_key = f"album_{album_id}"
    cached_album = redis_cache.hgetall(cache_key)
    cached_album = {
        k.decode("utf-8"): v.decode("utf-8") for k, v in cached_album.items()
    }

    if not cached_album or not all(cached_album.values()):
        album = album_crud.get_album(db, album_id)
        if album:
            album_data = {
                "id": album.id,
                "nome": album.nome,
                "publico": "true" if album.publico else "false",
            }
            redis_cache.hset(cache_key, mapping=album_data)
            redis_cache.expire(cache_key, CACHE_EXPIRATION)
            return album_data
        return None

    return {
        "id": int(cached_album.get("id")),
        "nome": cached_album.get("nome"),
        "publico": cached_album.get("publico") == "true",
    }


def get_all_images(db: Session, album_id: int) -> List[Dict[str, Any]]:
    cache_key = f"album_{album_id}_images"
    images = get_cached_data(cache_key)

    if not images:
        images = imagem_crud.get_by_album_id(db, album_id)
        images = [
            {
                col: getattr(image, col)
                for col in image.__table__.columns.keys()
                if col != "id"
            }
            for image in images
        ]
        set_cached_data(cache_key, images)

    return images
