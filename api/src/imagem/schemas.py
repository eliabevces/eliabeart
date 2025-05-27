from pydantic import BaseModel
from typing import Optional


class ImagemBase(BaseModel):
    nome: str
    descricao: str
    width: int
    height: int


class ImagemCreate(ImagemBase):
    hash: str
    album_id: int


class Imagem(ImagemBase):
    id: int
    hash: str
    album_id: int

    class Config:
        from_attributes = True
