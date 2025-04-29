import os
import logging
from fastapi import Response, APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from src.core.config import settings
from src.album import crud as album_crud
from src.imagem import crud as imagem_crud
from src.database.database import get_db
from src.album import schemas as album_schemas
from src.lib.lib import get_all_albums, delete_cache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/publicos")
async def get_albuns_publicos(db: Session = Depends(get_db)):
    try:
        albuns = get_all_albums(db)
        if not albuns:
            raise HTTPException(status_code=404, detail="Nenhum album encontrado")
        return {"albuns": albuns}
    except Exception as e:
        logger.error("GET /albums/publicos - %s", str(e))
        raise HTTPException(status_code=500, detail="Erro ao buscar albuns")


@router.post("")
async def create_album(album: album_schemas.AlbumCreate, db: Session = Depends(get_db)):
    try:
        album_crud.create_album(db, album)
        album_path = os.path.join(settings.IMAGES_BASE_PATH, album.nome)
        if not os.path.exists(album_path):
            os.makedirs(album_path)
        delete_cache("public_albums")
        return Response(content="Album criado com sucesso", status_code=201)
    except Exception as e:
        logger.error("POST /albums - %s", str(e))
        raise HTTPException(status_code=500, detail="Erro ao criar album")


@router.post("/{album_id}/cover/{foto}")
async def add_cover_image(album_id: int, foto: str, db: Session = Depends(get_db)):
    try:
        image = imagem_crud.get_image_by_name_and_album_id(db, foto, album_id)
        if not image:
            raise HTTPException(status_code=404, detail="Foto não encontrada")
        album = album_crud.add_cover_image(db, album_id, image)
        if not album:
            raise HTTPException(status_code=404, detail="Album não encontrado")
        return Response(content="Capa adicionada com sucesso", status_code=200)
    except Exception as e:
        logger.error("POST /albums/%d/cover/%s - %s", album_id, foto, str(e))
        raise HTTPException(status_code=500, detail="Erro ao adicionar capa")


@router.delete("/{album_id}")
async def delete_album(album_id: int, db: Session = Depends(get_db)):
    try:
        album = album_crud.delete_album(db, album_id)
        if not album:
            raise HTTPException(status_code=404, detail="Album não encontrado")
        return Response(content="Album deletado com sucesso", status_code=200)
    except Exception as e:
        logger.error("DELETE /albums/%d - %s", album_id, str(e))
        raise HTTPException(status_code=500, detail="Erro ao deletar album")
