import { NextRequest, NextResponse } from "next/server";
import { getImagesByAlbum } from "@/app/lib/images";
import { getAlbum, validateAlbumCode } from "@/app/lib/albums";
import { processAlbumImages } from "@/app/lib/image-processing";
import { cache } from "@/app/lib/cache";

// GET /api/images/[album_id] — list images for an album
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ album_id: string }> }
) {
  try {
    const { album_id } = await params;
    const albumId = parseInt(album_id, 10);
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

    // Check private album access
    if (album.privado) {
      const code = request.nextUrl.searchParams.get("code");
      const isValid = await validateAlbumCode(albumId, code);
      if (!isValid) {
        return NextResponse.json(
          { error: "Código de acesso inválido", privado: true },
          { status: 403 }
        );
      }
    }

    let images = await getImagesByAlbum(albumId);

    // Lazy processing: if no images metadata yet, process from S3
    if (!images || images.length === 0) {
      await processAlbumImages(albumId, album.nome);
      cache.delete(`album_${albumId}_images`);
      images = await getImagesByAlbum(albumId);
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error(`GET /api/images error:`, error);
    return NextResponse.json(
      { error: "Erro ao obter imagens do álbum" },
      { status: 500 }
    );
  }
}
