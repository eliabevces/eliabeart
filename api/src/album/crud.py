from sqlalchemy.orm import Session

from ..database import models

from . import schemas

def get_album(db: Session, album_id: int):
    return db.query(models.Album).filter(models.Album.id == album_id).first()

def get_albuns_publicos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Album).filter(models.Album.publico == True).offset(skip).limit(limit).all()


def create_album(db: Session, album: schemas.AlbumCreate):
    db_album = models.Album(nome=album.nome, descricao=album.descricao, publico=album.publico, passcode=album.passcode)
    db.add(db_album)
    db.commit()
    db.refresh(db_album)
    return db_album

def delete_album(db: Session, album_id: int):
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
    db.delete(album)
    db.commit()
    return album