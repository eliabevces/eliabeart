import os
from sqlalchemy.orm import Session
from ..core.config import settings

from ..database import models

from . import schemas


def get_all_images(db: Session, skip: int = 0):
    return db.query(models.Imagem).offset(skip).all()


def get_image_by_name_and_album_id(db: Session, nome: str, album_id: int):
    return (
        db.query(models.Imagem)
        .filter(models.Imagem.nome == nome, models.Imagem.album_id == album_id)
        .first()
    )


def create_image(db: Session, image: schemas.ImagemCreate):
    db_image = models.Imagem(**image.dict())
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image


def delete_image(db: Session, image_id: int):
    db.query(models.Imagem).filter(models.Imagem.id == image_id).delete()
    db.commit()
    return {"message": "Imagem deletada com sucesso!"}


def get_by_album_id(db: Session, album_id: int):
    return db.query(models.Imagem).filter(models.Imagem.album_id == album_id).all()


def update_imagem(db: Session, image: schemas.Imagem):
    db.query(models.Imagem).filter(models.Imagem.id == image.id).update(
        {
            "nome": image.nome,
            "descricao": image.descricao,
            "hash": image.hash,
            "album_id": image.album_id,
        }
    )
    db.commit()
    return db.query(models.Imagem).filter(models.Imagem.id == image.id).first()


def delete_all_images_by_album_id(db: Session, album_id: int):
    db.query(models.Imagem).filter(models.Imagem.album_id == album_id).delete()
    db.commit()
    return {"message": "Imagens deletadas com sucesso!"}
