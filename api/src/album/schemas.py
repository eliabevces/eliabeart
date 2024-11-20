from pydantic import BaseModel
from typing import Optional


class AlbumBase(BaseModel):
    nome: str
    descricao: str


class AlbumCreate(AlbumBase):
    publico: bool
    passcode: str


class Album(AlbumBase):
    id: int
    publico: bool
    passcode: str
    cover: str

    class Config:
        from_attributes = True
