from pydantic import BaseModel


class AlbumBase(BaseModel):
    nome: str
    descricao: str


class AlbumCreate(AlbumBase):
    publico: bool
    passcode: str
    owner_id: int


class Album(AlbumBase):
    id: int
    publico: bool
    passcode: str
    owner_id: int
    cover: str

    class Config:
        from_attributes = True
