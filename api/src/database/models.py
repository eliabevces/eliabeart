from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class Album(Base):
    __tablename__ = "albuns"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True)
    descricao = Column(String)
    publico = Column(Boolean)
    passcode = Column(String)
    cover = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="albuns")
    imagens = relationship("Imagem", back_populates="album")


class Imagem(Base):
    __tablename__ = "imagens"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    descricao = Column(String)
    hash = Column(String)
    album_id = Column(Integer, ForeignKey("albuns.id"))
    album = relationship("Album", back_populates="imagens")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    albuns = relationship("Album", back_populates="owner")
