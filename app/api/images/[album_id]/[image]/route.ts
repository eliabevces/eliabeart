import { NextRequest, NextResponse } from "next/server";
import { getAlbum, validateAlbumCode } from "@/app/lib/albums";
import { getImagesByAlbum } from "@/app/lib/images";
import { getObject, imageKey } from "@/app/lib/s3";
import { processAlbumImages } from "@/app/lib/image-processing";
import { cache } from "@/app/lib/cache";
import { s3Semaphore } from "@/app/lib/concurrency";

// GET /api/images/[album_id]/[image] — serve image file from S3
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ album_id: string; image: string }> }
) {
  try {
    const { album_id, image } = await params;
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

    // Private albums only expose the cover (used as a public teaser on the
    // home listing); every other image requires a valid access code.
    if (album.privado && image !== album.cover) {
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

    const imageNames = images.map((img) => img.nome);
    if (!imageNames.includes(image)) {
      return NextResponse.json(
        { error: "Imagem não encontrada" },
        { status: 404 }
      );
    }

    const key = imageKey(album.nome, image);
    let imageBuffer: Buffer;
    try {
      imageBuffer = await s3Semaphore.run(() => getObject(key));
    } catch {
      return NextResponse.json(
        { error: "Arquivo de imagem não encontrado no S3" },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(
      `GET /api/images error:`,
      error
    );
    return NextResponse.json(
      { error: "Erro ao obter imagem" },
      { status: 500 }
    );
  }
}
