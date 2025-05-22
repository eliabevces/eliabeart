import os
from sqlalchemy.orm import Session
from src.core.config import settings

from src.database import models

from . import schemas


def get_albuns(db: Session, skip: int = 0, limit: int = 100) -> list:
    return db.query(models.Album).offset(skip).limit(limit).all()


def get_album(db: Session, album_id: int) -> models.Album:
    return db.query(models.Album).filter(models.Album.id == album_id).first()


def get_album_by_name(db: Session, album_name: str) -> models.Album:
    return db.query(models.Album).filter(models.Album.nome == album_name).first()


def get_albuns_publicos(db: Session, skip: int = 0, limit: int = 100) -> list:
    return (
        db.query(models.Album)
        .filter(models.Album.publico == True)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_album(db: Session, album: schemas.AlbumCreate) -> models.Album:
    album_data = album.dict()
    db_album = models.Album(**album_data)
    db.add(db_album)
    db.commit()
    db.refresh(db_album)
    return db_album


def delete_album(db: Session, album_id: int) -> models.Album:
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    db.delete(album)
    db.commit()
    return album


def add_cover_image(db: Session, album_id: int, image_name: int) -> models.Album:
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    list_of_images = os.listdir(os.path.join(settings.IMAGES_BASE_PATH, album.nome))
    if f"{image_name}.jpg" not in list_of_images:
        print(f"Image {image_name} not found in album {album.nome}")
        return None
    album.cover = image_name
    db.commit()
    db.refresh(album)
    return album


def remove_cover_image(db: Session, album_id: int) -> models.Album:
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    album.cover_image = None
    db.commit()
    db.refresh(album)
    return album
