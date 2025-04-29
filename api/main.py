from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import models
from src.database.database import engine
from src.routes import albums, images

app = FastAPI(
    title="Eliabeart API",
    description="API for managing albums and images",
    version="1.0.0",
)

models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(albums.router, prefix="/albums", tags=["Albums"])
app.include_router(images.router, prefix="/images", tags=["Images"])


@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Eliabeart API!"}
