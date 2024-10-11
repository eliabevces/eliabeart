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