import os
from sqlalchemy.orm import Session
from src.core.config import settings

from src.database import models

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
    db_image = models.Imagem(**image.model_dump())
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image


def delete_image(db: Session, image_id: int):
    db.query(models.Imagem).filter(models.Imagem.id == image_id).delete()
    db.commit()
    return {"message": "Imagem deletada com sucesso!"}

def delete_images_by_names_and_album_id(db: Session, names: list[str], album_id: int):
    db.query(models.Imagem).filter(
        models.Imagem.nome.in_(names), models.Imagem.album_id == album_id
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Imagens deletadas com sucesso!"}


def get_by_album_id(db: Session, album_id: int) -> list[models.Imagem]:
    return db.query(models.Imagem).filter(models.Imagem.album_id == album_id).all()


def update_imagem(db: Session, image: schemas.Imagem):
    db_image = models.Imagem(**image.model_dump())
    db.query(models.Imagem).filter(models.Imagem.id == image.id).update(
        db_image.__dict__
    )
    db.commit()
    return db.query(models.Imagem).filter(models.Imagem.id == image.id).first()


def delete_all_images_by_album_id(db: Session, album_id: int):
    db.query(models.Imagem).filter(models.Imagem.album_id == album_id).delete()
    db.commit()
    return {"message": "Imagens deletadas com sucesso!"}
