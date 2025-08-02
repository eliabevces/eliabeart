from pydantic import BaseModel


class AlbumBase(BaseModel):
    nome: str
    descricao: str

class AlbumCreate(AlbumBase):
    pass

class Album(AlbumBase):
    id: int
    cover: str

    class Config:
        from_attributes = True
