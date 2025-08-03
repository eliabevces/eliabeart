from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import models
from src.database.database import engine
from src.routes import albuns, images
from src.core.config import settings


app = FastAPI(
    title=settings.title,
    description=settings.description,
    version=settings.version,
)

models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(albuns.router, prefix="/albuns", tags=["albuns"])
app.include_router(images.router, prefix="/images", tags=["Images"])


@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Eliabeart API!"}
