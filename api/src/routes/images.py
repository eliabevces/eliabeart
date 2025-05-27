import os
import logging
from fastapi import Response, File, APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated
import random
from datetime import datetime
from src.core.config import settings
from src.album import crud as album_crud
from src.imagem import crud as imagem_crud
from src.database.database import get_db
from src.celery.tasks import process_and_save_photo
from src.lib.lib import get_album, get_all_images, delete_cache, get_all_albums

router = APIRouter()
logger = logging.getLogger(__name__)


def validate_album(album_id: int, db: Session = Depends(get_db)) -> dict:
    album = get_album(db, album_id)
    if album is None or not album.get("publico", False):
        raise HTTPException(status_code=404, detail="Album não encontrado")
    return album


@router.get("/publicos/{album_id}", response_model=dict)
async def get_fotos_publicas(album_id: int, db: Session = Depends(get_db)):
    album = validate_album(album_id, db)
    fotos = get_all_images(db, album_id)
    if not fotos:
        raise HTTPException(status_code=404, detail="Nenhuma foto encontrada")
    return {"fotos": fotos}


@router.get("/publicos/{album_id}/{foto}")
async def get_foto_publica(album_id: int, foto: str, db: Session = Depends(get_db)):
    album = validate_album(album_id, db)
    fotos = get_all_images(db, album_id)
    image = next((img for img in fotos if img["nome"] == foto), None)
    if not image:
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    image_path = os.path.join(settings.IMAGES_BASE_PATH, album["nome"], f"{foto}.jpg")
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    return FileResponse(image_path, media_type="image/jpg")


@router.post("/{album_id}/{foto}")
async def add_foto(
    album_id: int,
    foto: str,
    foto_file: Annotated[bytes, File()],
    db: Session = Depends(get_db),
):
    album = validate_album(album_id, db)
    album_path = os.path.join(settings.IMAGES_BASE_PATH, album["nome"])
    os.makedirs(album_path, exist_ok=True)

    foto_name = foto.split(".")[0]

    if imagem_crud.get_image_by_name_and_album_id(db, foto_name, album_id):
        raise HTTPException(status_code=409, detail="Foto já existe")

    # Queue the task
    process_and_save_photo.delay(album_id, foto_name, foto_file, album_path)
    delete_cache(f"album_{album_id}_images")
    return Response(content="Foto enviada para processamento", status_code=202)


@router.delete("/{album_id}/{foto}")
async def delete_foto(album_id: int, foto: str, db: Session = Depends(get_db)):
    album = validate_album(album_id, db)
    image_path = os.path.join(settings.IMAGES_BASE_PATH, album["nome"], f"{foto}.jpg")

    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    image = imagem_crud.get_image_by_name_and_album_id(db, foto, album_id)
    if not image:
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    try:
        imagem_crud.delete_image(db, image.id)
        os.remove(image_path)
        delete_cache(f"album_{album_id}_images")
        return Response(content="Foto deletada com sucesso", status_code=200)
    except Exception as e:
        logger.error(f"Error deleting photo: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar foto")


@router.patch("/resetPhotos/{album_id}")
async def reset_photos(album_id: int, db: Session = Depends(get_db)):
    try:
        imagem_crud.delete_all_images_by_album_id(db, album_id)
        album = album_crud.get_album(db, album_id)
        album_path = os.path.join(settings.IMAGES_BASE_PATH, album.nome)
        fotos_in_path = os.listdir(album_path)

        for foto in fotos_in_path:
            foto_path = os.path.join(album_path, foto)
            if not os.path.isfile(foto_path):
                continue
            nome = foto.split(".")[0]
            with open(foto_path, "rb") as f:
                foto_bytes = f.read()
            # Queue the Celery task for each photo
            process_and_save_photo.delay(album_id, nome, foto_bytes, album_path)

        # Optionally, you can return the list of files queued for processing
        return {"queued_photos": fotos_in_path}
    except Exception as e:
        logger.error(f"Error resetting photos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar fotos")


@router.get("/random")
async def get_random_photo(db: Session = Depends(get_db)):
    try:
        albums = get_all_albums(db)
        if not albums:
            raise HTTPException(status_code=404, detail="Nenhum álbum encontrado")
        album = random.choice(albums)
        fotos = get_all_images(db, album["id"])
        foto = random.choice(fotos)
        return foto
    except Exception as e:
        logger.error(f"Error getting random photo: {e}")
        raise HTTPException(status_code=500, detail="Erro ao obter foto aleatória")
