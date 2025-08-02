import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import random
from src.core.config import settings
from src.database.database import get_db
from src.lib.lib import get_album, get_all_images, get_all_albuns

router = APIRouter()
logger = logging.getLogger(__name__)


def validate_album(album_id: int, db: Session = Depends(get_db)) -> dict:
    album = get_album(db, album_id)
    if album is None:
        raise HTTPException(status_code=404, detail="Album não encontrado")
    return album

@router.get("/random")
async def get_random_image(db: Session = Depends(get_db)):
    try:
        albuns = get_all_albuns(db)
        if not albuns:
            raise HTTPException(status_code=404, detail="Nenhum álbum encontrado")
        album = random.choice(albuns)
        images = get_all_images(db, album["id"])
        image = random.choice(images)
        return image
    except Exception as e:
        logger.error(f"Error getting random image: {e}")
        raise HTTPException(status_code=500, detail="Erro ao obter imagem aleatória")

@router.get("/{album_id}", response_model=dict)
async def get_images(album_id: int, db: Session = Depends(get_db)):
    try:
        album = validate_album(album_id, db)
        images = get_all_images(db, album_id)
        if not images:
            raise HTTPException(status_code=404, detail="Nenhuma imagem encontrada")
        return {"images": images}
    except Exception as e:
        logger.error(f"Error getting images for album {album_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao obter imagens do álbum")


@router.get("/{album_id}/{image}")
async def get_image(album_id: int, image: str, db: Session = Depends(get_db)):
    try:
        album = validate_album(album_id, db)
        images = get_all_images(db, album_id)
        images_nomes = [img["nome"] for img in images]
        if image not in images_nomes:
            raise HTTPException(status_code=404, detail="Imagem não encontrada")

        image_path = os.path.join(settings.IMAGES_BASE_PATH, album["nome"], f"{image}.jpg")
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="Imagem não encontrada")

        return FileResponse(image_path, media_type="image/jpg")
    except Exception as e:
        logger.error(f"Error getting image {image} from album {album_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao obter imagem do álbum")

