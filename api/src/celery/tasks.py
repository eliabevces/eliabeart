import io
import os
from PIL import Image
import blurhash
from src.imagem import schemas as imagem_schemas
from src.imagem import crud as imagem_crud
from src.database.database import SessionLocal
from src.celery.celery import celery_app


@celery_app.task
def process_and_save_image(album_id, image_name, album_path):
    session = SessionLocal()
    try:
        image_path = os.path.join(album_path, f"{image_name}.jpg")
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Imagem {image_name} não encontrada no álbum {album_id}")
        with Image.open(image_path) as image:
            image_hash = blurhash.encode(image, x_components=4, y_components=3)
            imagem = imagem_schemas.ImagemCreate(
                nome=image_name,
                descricao="",
                hash=image_hash,
                album_id=album_id,
                width=image.width,
                height=image.height,
            )
            imagem_crud.create_image(session, imagem)
            session.commit()
    finally:
        session.close()
