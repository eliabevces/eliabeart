import { NextRequest, NextResponse } from "next/server";
import { getAlbum } from "@/app/lib/albums";
import { requireAuth } from "@/app/lib/auth";
import { putObject, deleteObject, imageKey } from "@/app/lib/s3";
import { processImage } from "@/app/lib/image-processing";
import {
  readImagesJson,
  writeImagesJson,
  imagesLockKey,
  ImageData,
} from "@/app/lib/images";
import { jsonMutex, processingSemaphore } from "@/app/lib/concurrency";
import { cache } from "@/app/lib/cache";
import { UploadResult } from "@/app/types/AdminUpload";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg"];

function sanitizeImageName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const sanitized = withoutExtension.replace(/[^a-zA-Z0-9_-]+/g, "_");
  return sanitized || `image-${Date.now()}`;
}

// POST /api/albums/[id]/images — upload one or more images to an album (protected)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const albumId = parseInt(id, 10);
    if (isNaN(albumId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const album = await getAlbum(albumId);
    if (!album) {
      return NextResponse.json(
        { error: "Album não encontrado" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    const results = await jsonMutex.runExclusive(
      imagesLockKey(album.nome),
      async (): Promise<UploadResult[]> => {
        const existingImages = await readImagesJson(album.nome);
        const existingNames = new Set(existingImages.map((img) => img.nome));
        const newEntries: ImageData[] = [];
        const perFileResults: UploadResult[] = [];

        for (const file of files) {
          const lowerName = file.name.toLowerCase();
          const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
            lowerName.endsWith(ext)
          );
          if (!hasValidExtension) {
            perFileResults.push({
              fileName: file.name,
              status: "error",
              error: "Formato não suportado (apenas .jpg/.jpeg)",
            });
            continue;
          }

          let imageName = sanitizeImageName(file.name);
          if (
            existingNames.has(imageName) ||
            newEntries.some((entry) => entry.nome === imageName)
          ) {
            imageName = `${imageName}-${Date.now()}`;
          }

          try {
            const buffer = Buffer.from(await file.arrayBuffer());
            await putObject(imageKey(album.nome, imageName), buffer, "image/jpeg");

            const entry = await processingSemaphore.run(() =>
              processImage(albumId, imageName, album.nome)
            );
            newEntries.push(entry);
            perFileResults.push({
              fileName: file.name,
              status: "success",
              image: entry,
            });
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            perFileResults.push({
              fileName: file.name,
              status: "error",
              error: "Falha ao processar o arquivo",
            });
          }
        }

        if (newEntries.length > 0) {
          const allImages = [...existingImages, ...newEntries];
          await writeImagesJson(album.nome, allImages);
          cache.delete(`album_${albumId}_images`);
        }

        return perFileResults;
      }
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("POST /api/albums/[id]/images error:", error);
    return NextResponse.json(
      { error: "Erro ao enviar imagens" },
      { status: 500 }
    );
  }
}

// DELETE /api/albums/[id]/images — remove a single image (metadata + S3 object) (protected)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const albumId = parseInt(id, 10);
    if (isNaN(albumId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const album = await getAlbum(albumId);
    if (!album) {
      return NextResponse.json(
        { error: "Album não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { imageName } = body;
    if (!imageName) {
      return NextResponse.json(
        { error: "Nome da imagem é obrigatório" },
        { status: 400 }
      );
    }

    const deleted = await jsonMutex.runExclusive(
      imagesLockKey(album.nome),
      async () => {
        const images = await readImagesJson(album.nome);
        const exists = images.some((img) => img.nome === imageName);
        if (!exists) return false;

        const remaining = images.filter((img) => img.nome !== imageName);
        await writeImagesJson(album.nome, remaining);
        await deleteObject(imageKey(album.nome, imageName));
        return true;
      }
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Imagem não encontrada" },
        { status: 404 }
      );
    }

    cache.delete(`album_${albumId}_images`);
    return NextResponse.json({ message: "Imagem excluída com sucesso" });
  } catch (error) {
    console.error("DELETE /api/albums/[id]/images error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir imagem" },
      { status: 500 }
    );
  }
}
