import os
from typing import Annotated
from src.core.config import settings
from fastapi import FastAPI, Response, File, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from src.dependencies.redis import cache
from src.album import crud
from src.database import models
from src.database.database import SessionLocal, engine
from src.album import schemas
import json


# Create database tables on application startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Get public albums
@app.get("/publicos")
async def get_albuns_publicos(redis_cache: cache = Depends(cache)):
    try:
        cache_key = "public_albums"
        cached_albums = redis_cache.get(cache_key)

        if cached_albums:
            albuns = json.loads(cached_albums)
        else:
            albuns = crud.get_albuns_publicos(SessionLocal())
            albuns = [
                {
                    "id": album.id,
                    "nome": album.nome,
                    "publico": album.publico,
                    "cover": album.cover,
                }
                for album in albuns
            ]
            redis_cache.set(cache_key, json.dumps(albuns), ex=60)

        return {"albuns": albuns}
    except Exception as e:
        # Log the exception
        print(str(e))
        return Response(content="Erro ao buscar albuns", status_code=500)


# Get public photos for an album
@app.get("/publicos/{album_id}")
async def get_fotos_publicas(album_id: int):
    try:

        album = crud.get_album(SessionLocal(), album_id)
        if album is None or not album.publico:
            return Response(content="Album não encontrado", status_code=404)
        fotos = os.listdir(os.path.join(settings.IMAGES_BASE_PATH, album.nome))
        fotos = [foto.split(".")[0] for foto in fotos if foto.endswith(".jpg")]

        print(fotos)

        return {"fotos": fotos}
    except Exception as e:
        # Log the exception
        print(str(e))
        return Response(content="Erro ao buscar fotos", status_code=500)


# Get a public photo
@app.get("/publicos/{album_id}/{foto}")
async def get_foto_publica(
    album_id: int, foto: str, redis_cache: cache = Depends(cache)
):
    try:
        cache_key = f"album_{album_id}"
        cached_profile = redis_cache.hmget(cache_key, "id", "nome", "publico")
        print(cached_profile)

        if not cached_profile or not all(cached_profile):
            album = crud.get_album(SessionLocal(), album_id)
            if album:
                album_data = {
                    "id": album.id,
                    "nome": album.nome,
                    "publico": "true" if album.publico else "false",
                }
                redis_cache.hset(cache_key, mapping=album_data)
                redis_cache.expire(cache_key, 60)
        else:
            album = {
                "id": int(cached_profile[0]) if cached_profile[0] else None,
                "nome": (
                    cached_profile[1].decode("utf-8") if cached_profile[1] else None
                ),
                "publico": (
                    cached_profile[2].decode("utf-8") == "true"
                    if cached_profile[2]
                    else None
                ),
            }

        if album is None or not album["publico"]:
            return Response(content="Album não encontrado", status_code=404)

        original_image_path = os.path.join(
            settings.IMAGES_BASE_PATH, album["nome"], f"{foto}.jpg"
        )
        if not os.path.exists(original_image_path):
            return Response(content="Foto não encontrada", status_code=404)

        return FileResponse(original_image_path, media_type="image/jpg")
    except Exception as e:
        # Log the exception
        print(str(e))
        return Response(content="Erro ao buscar foto", status_code=500)


# @app.get("/album/{album_id}/{foto}")
# async def get_foto_full_quality(
#     album_id: int, foto: str, redis_cache: cache = Depends(cache)
# ):
#     try:
#         cache_key = f"album_{album_id}"
#         cached_profile = redis_cache.hget(cache_key, "id", "nome", "publico")

#         if not cached_profile or not all(cached_profile):
#             album = crud.get_album(SessionLocal(), album_id)
#             if album:
#                 album_data = {
#                     "id": album.id,
#                     "nome": album.nome,
#                     "publico": "true" if album.publico else "false",
#                 }
#                 redis_cache.hset(cache_key, mapping=album_data)
#                 redis_cache.expire(cache_key, 60)
#         else:
#             album = {
#                 "id": int(cached_profile[0]),
#                 "nome": cached_profile[1].decode("utf-8"),
#                 "publico": cached_profile[2].decode("utf-8") == "true",
#             }

#         if album is None:
#             return Response(content="Album não encontrado", status_code=404)

#         image_path = os.path.join(settings.IMAGES_BASE_PATH, album["nome"], f"{foto}.jpg")
#         if not os.path.exists(image_path):
#             return Response(content="Foto não encontrada", status_code=404)

#         return FileResponse(image_path, media_type="image/jpg")
#     except Exception as e:
#         # Log the exception
#         print(str(e))
#         return Response(content="Foto não encontrada", status_code=404)


# Create an album
@app.post("/album")
async def create_album(album: schemas.AlbumCreate):
    try:
        crud.create_album(SessionLocal(), album)
        if not os.path.exists(os.path.join(settings.IMAGES_BASE_PATH, album.nome)):
            os.makedirs(os.path.join(settings.IMAGES_BASE_PATH, album.nome))
        return Response(content="Album criado com sucesso", status_code=201)
    except Exception as e:
        # Log the exception
        print(str(e))
        return Response(content="Erro ao criar album", status_code=500)


# Create a photo for an album
@app.post("/album/{album_id}/{foto}")
async def create_foto(
    album_id: int,
    foto: str,
    foto_file: Annotated[bytes, File()],
    redis_cache: cache = Depends(cache),
):
    try:
        cache_key = f"album_{album_id}"
        cached_profile = redis_cache.hget(cache_key, "id", "nome", "publico")

        if not cached_profile or not all(cached_profile):
            album = crud.get_album(SessionLocal(), album_id)
            if album:
                album_data = {
                    "id": album.id,
                    "nome": album.nome,
                    "publico": "true" if album.publico else "false",
                }
                redis_cache.hset(cache_key, mapping=album_data)
                redis_cache.expire(cache_key, 60)
        else:
            album = {
                "id": int(cached_profile[0]),
                "nome": cached_profile[1].decode("utf-8"),
                "publico": cached_profile[2].decode("utf-8") == "true",
            }

        if album is None:
            return Response(content="Album não encontrado", status_code=404)

        if not os.path.exists(f"imagens/{album['nome']}"):
            os.makedirs(f"imagens/{album['nome']}")

        with open(
            os.path.join(settings.IMAGES_BASE_PATH, album["nome"], f"{foto}.jpg"), "wb"
        ) as f:
            f.write(foto_file)

        return Response(content="Foto criada com sucesso", status_code=201)
    except Exception as e:
        # Log the exception
        print(str(e))
        return Response(content="Erro ao criar foto", status_code=500)


@app.post("/album/{album_id}/cover/{foto}")
async def add_cover_image(album_id: int, foto: str):
    try:
        album = crud.add_cover_image(SessionLocal(), album_id, foto)
        if album is None:
            return Response(content="Album não encontrado", status_code=404)
        return Response(content="Capa adicionada com sucesso", status_code=200)
    except Exception as e:
        # Log the exception
        print(str(e))
        return Response(content="Erro ao adicionar capa", status_code=500)


# Delete an album
@app.delete("/album/{album_id}")
async def delete_album(album_id: int):
    try:
        album = crud.delete_album(SessionLocal(), album_id)
        if album is None:
            return Response(content="Album não encontrado", status_code=404)
        return Response(content="Album deletado com sucesso", status_code=200)
    except Exception as e:
        # Log the exception
        print(str(e))
        return Response(content="Erro ao deletar album", status_code=500)


# Delete a photo from an album
@app.delete("/album/{album_id}/{foto}")
async def delete_foto(album_id: int, foto: str, redis_cache: cache = Depends(cache)):
    try:
        cache_key = f"album_{album_id}"
        cached_profile = redis_cache.hmget(cache_key, "id", "nome", "publico")

        if not cached_profile or not all(cached_profile):
            album = crud.get_album(SessionLocal(), album_id)
            if album:
                album_data = {
                    "id": album.id,
                    "nome": album.nome,
                    "publico": "true" if album.publico else "false",
                }
                redis_cache.hset(cache_key, mapping=album_data)
                redis_cache.expire(cache_key, 60)
        else:
            album = {
                "id": int(cached_profile[0]),
                "nome": cached_profile[1].decode("utf-8"),
                "publico": cached_profile[2].decode("utf-8") == "true",
            }

        if album is None:
            return Response(content="Album não encontrado", status_code=404)

        image_path = os.path.join(
            settings.IMAGES_BASE_PATH, album["nome"], f"{foto}.jpg"
        )

        if os.path.exists(image_path):
            os.remove(image_path)

        return Response(content="Foto deletada com sucesso", status_code=200)
    except FileNotFoundError:
        return Response(content="Foto não encontrada", status_code=404)
    except Exception as e:
        # Log the exception
        print(str(e))
        return Response(content="Erro ao deletar foto", status_code=500)
