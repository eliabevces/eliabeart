import os
import logging
from fastapi import Response, APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from src.core.config import settings
from src.album import crud as album_crud
from src.imagem import crud as imagem_crud
from src.database.database import get_db
from src.album import schemas as album_schemas
from src.lib.lib import get_all_albuns, delete_cache
from src.celery.tasks import process_and_save_image
from src.auth.auth import get_current_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def get_albuns(db: Session = Depends(get_db)):
    try:
        albuns = get_all_albuns(db)
        return {"albuns": albuns}
    except Exception as e:
        logger.error("GET /albuns - %s", str(e))
        raise HTTPException(status_code=500, detail="Erro ao buscar albuns")


@router.post("/")
async def create_album(album: album_schemas.AlbumBase, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        album_folder = os.path.join(settings.IMAGES_BASE_PATH, album.nome)
        if not os.path.exists(album_folder):
            raise HTTPException(status_code=400, detail="Album não existe")
        new_album = album_crud.create_album(db, album)
        if not new_album:
            raise HTTPException(status_code=400, detail="Erro ao criar album")
        files = os.listdir(album_folder)
        images = [f.split('.jpg')[0] for f in files if f.endswith(".jpg")]
        if not images:
            raise HTTPException(status_code=400, detail="Nenhuma imagem encontrada no album")
        for image in images:
            process_and_save_image.delay(new_album.id, image, album_folder)
        album_crud.update_cover_image(db, new_album.id, images[0])
        return {"message": "Album criado com sucesso", "album": new_album}
    except Exception as e:
        logger.error("POST /albuns - %s", str(e))
        raise HTTPException(status_code=500, detail="Erro ao criar album")


@router.patch("/{album_id}/cover/{image}")
async def update_cover_image(album_id: int, image: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        image_db = imagem_crud.get_image_by_name_and_album_id(db, image, album_id)
        if not image_db:
            raise HTTPException(status_code=404, detail="Imagem não encontrada")
        album = album_crud.update_cover_image(db, album_id, image_db.nome)
        if not album:
            raise HTTPException(status_code=404, detail="Album não encontrado")
        return Response(content="Capa adicionada com sucesso", status_code=200)
    except Exception as e:
        logger.error("POST /albuns/%d/cover/%s - %s", album_id, image, str(e))
        raise HTTPException(status_code=500, detail="Erro ao adicionar capa")


@router.delete("/{album_id}")
async def delete_album(album_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        imagem_crud.delete_all_images_by_album_id(db, album_id)
        album = album_crud.delete_album(db, album_id)
        if not album:
            raise HTTPException(status_code=404, detail="Album não encontrado")
        delete_cache(f"album_{album_id}_images")
        delete_cache("albuns")
        return Response(content="Album deletado com sucesso", status_code=200)
    except Exception as e:
        logger.error("DELETE /albuns/%d - %s", album_id, str(e))
        raise HTTPException(status_code=500, detail="Erro ao deletar album")

@router.get("/update/{album_id}")
async def update_album(album_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        album = album_crud.get_album(db, album_id)
        if not album:
            raise HTTPException(status_code=404, detail="Album não encontrado")
        
        album_folder = os.path.join(settings.IMAGES_BASE_PATH, album.nome)
        if not os.path.exists(album_folder):
            raise HTTPException(status_code=400, detail="Album não existe")
        
        images = os.listdir(album_folder)
        images = [f.split('.jpg')[0] for f in images if f.endswith(".jpg")]
        if not images:
            raise HTTPException(status_code=400, detail="Nenhuma imagem encontrada no album")
        old_images = imagem_crud.get_by_album_id(db, album_id)
        old_image_names = {image.nome for image in old_images}
        new_images = [image for image in images if image not in old_image_names]
        deleted_images = [image for image in old_image_names if image not in images]
        if deleted_images:
            imagem_crud.delete_images_by_names_and_album_id(db, deleted_images, album_id)
        for image in new_images:
            process_and_save_image.delay(album.id, image, album_folder)
        cache_key = f"album_{album_id}_images"
        cover_name = images[0] 
        album.cover = cover_name
        album_crud.update_cover_image(db, album_id, cover_name)
        delete_cache(cache_key)
        return {"message": "Album atualizado com sucesso"}
    except Exception as e:
        logger.error("GET /albuns/update/%d - %s", album_id, str(e))
        raise HTTPException(status_code=500, detail="Erro ao atualizar album")