import { NextRequest, NextResponse } from "next/server";
import { getAlbum, updateCover } from "@/app/lib/albums";
import { getImagesByAlbum, deleteImagesByNames } from "@/app/lib/images";
import { processAlbumImages } from "@/app/lib/image-processing";
import { requireAuth } from "@/app/lib/auth";
import { listAlbumImages } from "@/app/lib/s3";
import { cache } from "@/app/lib/cache";

// POST /api/albums/[id]/update — sync album with S3 bucket (protected)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
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

    // List images from S3 bucket
    const s3Images = await listAlbumImages(album.nome);

    if (s3Images.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem encontrada no bucket S3" },
        { status: 400 }
      );
    }

    // Find deleted images (in DB but not in S3)
    const dbImages = await getImagesByAlbum(albumId);
    const dbNames = new Set(dbImages.map((img) => img.nome));
    const deletedImages = Array.from(dbNames).filter((n) => !s3Images.includes(n));

    if (deletedImages.length > 0) {
      await deleteImagesByNames(deletedImages, albumId);
    }

    // Process new images from S3
    await processAlbumImages(albumId, album.nome);

    // Update cover
    await updateCover(albumId, s3Images[0]);

    cache.delete(`album_${albumId}_images`);

    return NextResponse.json({ message: "Album atualizado com sucesso" });
  } catch (error) {
    console.error(`POST /api/albums/update error:`, error);
    return NextResponse.json(
      { error: "Erro ao atualizar album" },
      { status: 500 }
    );
  }
}
