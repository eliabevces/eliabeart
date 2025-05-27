import io
import os
from PIL import Image
import blurhash
from src.imagem import schemas as imagem_schemas
from src.imagem import crud as imagem_crud
from src.database.database import SessionLocal
from src.celery.celery import celery_app


@celery_app.task
def process_and_save_photo(album_id, foto_name, foto_bytes, album_path):
    session = SessionLocal()
    try:
        image_path = os.path.join(album_path, f"{foto_name}.jpg")
        with Image.open(io.BytesIO(foto_bytes)) as image:
            image.save(image_path)
            image_hash = blurhash.encode(image, x_components=4, y_components=3)
            imagem = imagem_schemas.ImagemCreate(
                nome=foto_name,
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
