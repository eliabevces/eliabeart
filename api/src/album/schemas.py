from pydantic import BaseModel

class AlbumBase(BaseModel):
  nome: str
  descricao: str
  
class AlbumCreate(AlbumBase):
  nome: str
  descricao: str
  publico: bool
  passcode: str
  
class Album(AlbumBase):
  id: int
  publico: bool
  passcode: str
  class Config:
    from_attributes = True
  
  