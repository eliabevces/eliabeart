import base64
import os
import time
from typing import Annotated
from src.core.config import settings
from fastapi import FastAPI, Response, File, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from src.dependencies.redis import cache
from src.album import crud as album_crud
from src.imagem import crud as imagem_crud
from src.database import models
from src.database.database import SessionLocal, engine
from src.album import schemas as album_schemas
from src.imagem import schemas as imagem_schemas
import json
from PIL import Image, ImageFilter
import io
import blurhash


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


@app.api_route("/", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def handle_any_method():
    return {"message": "This endpoint handles multiple methods"}


@app.get("/")
async def root():
    return "Hello World!"


# Get public albums
@app.get("/publicos")
async def get_albuns_publicos(redis_cache: cache = Depends(cache)):
    try:
        cache_key = "public_albums"
        cached_albums = redis_cache.get(cache_key)

        if cached_albums:
            albuns = json.loads(cached_albums)
        else:
            albuns = album_crud.get_albuns_publicos(SessionLocal())
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
        print("GET /publicos", str(e))
        return Response(content="Erro ao buscar albuns", status_code=500)


# Get public photos for an album
@app.get("/publicos/{album_id}")
async def get_fotos_publicas(album_id: int):
    try:

        album = album_crud.get_album(SessionLocal(), album_id)
        if album is None or not album.publico:
            return Response(content="Album não encontrado", status_code=404)

        fotos = imagem_crud.get_by_album_id(SessionLocal(), album_id)

        return {"fotos": fotos}
    except Exception as e:
        # Log the exception
        print(f"GET /publicos/{album_id}", str(e))
        return Response(content="Erro ao buscar fotos", status_code=500)


# Get a public photo
@app.get("/publicos/{album_id}/{foto}")
async def get_foto_publica(
    album_id: int,
    foto: str,
    redis_cache: cache = Depends(cache),
):
    try:
        cache_key = f"album_{album_id}"
        cached_profile = redis_cache.hgetall(cache_key)
        cached_profile = {
            k.decode("utf-8"): v.decode("utf-8") for k, v in cached_profile.items()
        }

        if not cached_profile or not all(cached_profile.values()):
            album = album_crud.get_album(SessionLocal(), album_id)
            if album:
                album_data = {
                    "id": album.id,
                    "nome": album.nome,
                    "publico": "true" if album.publico else "false",
                }
                redis_cache.hset(cache_key, mapping=album_data)
                redis_cache.expire(cache_key, 60)
                album = album_data
            else:
                album = None
        else:
            album = {
                "id": int(cached_profile.get("id")),
                "nome": cached_profile.get("nome"),
                "publico": cached_profile.get("publico") == "true",
            }

        if album is None or not album["publico"]:
            return Response(content="Album não encontrado", status_code=404)

        cache_key = f"imagens_{album_id}"
        cached_images = redis_cache.get(cache_key)
        if cached_images:
            fotos = json.loads(cached_images)
        else:
            fotos = imagem_crud.get_by_album_id(SessionLocal(), album_id)
            fotos = [
                {
                    "nome": foto.nome,
                }
                for foto in fotos
            ]
            redis_cache.set(cache_key, json.dumps(fotos), ex=60)

        image = next((img for img in fotos if img["nome"] == foto), None)

        if image is None:
            return Response(content="Foto não encontrada", status_code=404)

        image_path = os.path.join(
            settings.IMAGES_BASE_PATH, album["nome"], f"{foto}.jpg"
        )

        if not os.path.exists(image_path):
            return Response(content="Foto não encontrada", status_code=404)

        return FileResponse(image_path, media_type="image/jpg")
    except Exception as e:
        # Log the exception
        print(f"GET /publicos/{album_id}/{foto}", str(e))
        return Response(content="Erro ao buscar foto", status_code=500)


# Create an album
@app.post("/album")
async def create_album(album: album_schemas.AlbumCreate):
    try:
        album_crud.create_album(SessionLocal(), album)
        if not os.path.exists(os.path.join(settings.IMAGES_BASE_PATH, album.nome)):
            os.makedirs(os.path.join(settings.IMAGES_BASE_PATH, album.nome))
        return Response(content="Album criado com sucesso", status_code=201)
    except Exception as e:
        # Log the exception
        print("POST /album", str(e))
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
        cached_profile = redis_cache.hgetall(cache_key)
        cached_profile = {
            k.decode("utf-8"): v.decode("utf-8") for k, v in cached_profile.items()
        }
        if not cached_profile or not all(cached_profile):
            album = album_crud.get_album(SessionLocal(), album_id)
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
                "id": int(cached_profile.get("id")),
                "nome": cached_profile.get("nome"),
                "publico": cached_profile.get("publico") == "true",
            }

        if album is None:
            return Response(content="Album não encontrado", status_code=404)

        if not os.path.exists(f"imagens/{album['nome']}"):
            os.makedirs(f"imagens/{album['nome']}")

        image_path = os.path.join(
            settings.IMAGES_BASE_PATH, album["nome"], f"{foto}.jpg"
        )

        with Image.open(io.BytesIO(foto_file)) as image:
            image.save(image_path)
            image.thumbnail((32, 32))
            image_hash = blurhash.encode(image, x_components=4, y_components=3)

        imagem = imagem_schemas.ImagemCreate(
            nome=foto,
            descricao="",
            hash=image_hash,
            album_id=album_id,
        )
        imagem_crud.create_image(SessionLocal(), imagem)

        return Response(content="Foto criada com sucesso", status_code=201)
    except Exception as e:
        # Log the exception
        print(f"POST /album/{album_id}/{foto}", str(e))
        return Response(content="Erro ao criar foto", status_code=500)


@app.post("/album/{album_id}/cover/{foto}")
async def add_cover_image(album_id: int, foto: str):
    try:
        foto = imagem_crud.get_image_by_name_and_album_id(
            SessionLocal(), foto, album_id
        )
        if foto is None:
            return Response(content="Foto não encontrada", status_code=404)
        album = album_crud.add_cover_image(SessionLocal(), album_id, foto)
        if album is None:
            return Response(content="Album não encontrado", status_code=404)
        return Response(content="Capa adicionada com sucesso", status_code=200)
    except Exception as e:
        # Log the exception
        print(f"POST /album/{album_id}/cover/{foto}", str(e))
        return Response(content="Erro ao adicionar capa", status_code=500)


# Delete an album
@app.delete("/album/{album_id}")
async def delete_album(album_id: int):
    try:
        album = album_crud.delete_album(SessionLocal(), album_id)
        if album is None:
            return Response(content="Album não encontrado", status_code=404)
        return Response(content="Album deletado com sucesso", status_code=200)
    except Exception as e:
        # Log the exception
        print(f"DELETE /album/{album_id}", str(e))
        return Response(content="Erro ao deletar album", status_code=500)


# Delete a photo from an album
@app.delete("/album/{album_id}/{foto}")
async def delete_foto(album_id: int, foto: str, redis_cache: cache = Depends(cache)):
    try:
        cache_key = f"album_{album_id}"
        cached_profile = redis_cache.hmget(cache_key, "id", "nome", "publico")

        if not cached_profile or not all(cached_profile):
            album = album_crud.get_album(SessionLocal(), album_id)
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
        print(f"DELETE /album/{album_id}/{foto}", str(e))
        return Response(content="Erro ao deletar foto", status_code=500)


@app.get("/resetPhotos/{album_id}")
async def reset_photos(album_id: int):
    try:
        album = album_crud.get_album(SessionLocal(), album_id)
        fotos_in_db = imagem_crud.get_by_album_id(SessionLocal(), album_id)
        fotos_in_path = os.listdir(os.path.join(settings.IMAGES_BASE_PATH, album.nome))
        for foto in fotos_in_path:
            if foto not in [foto.nome for foto in fotos_in_db]:
                imagem_crud.create_image(
                    SessionLocal(),
                    imagem_schemas.ImagemCreate(
                        nome=foto,
                        descricao="",
                        hash="",
                        album_id=album_id,
                    ),
                )

        return Response(content="Fotos atualizadas com sucesso", status_code=200)
    except Exception as e:
        # Log the exception
        print(f"GET /resetPhotos/{album_id}", str(e))
        return Response(content="Erro ao atualizar fotos", status_code=500)
