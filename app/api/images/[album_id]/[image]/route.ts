import { NextRequest, NextResponse } from "next/server";
import { getAlbum, validateAlbumCode } from "@/app/lib/albums";
import { getImagesByAlbum } from "@/app/lib/images";
import { getObjectStream, imageKey, thumbKey, S3ObjectStream } from "@/app/lib/s3";
import { isThumbWidth } from "@/app/lib/thumbs";
import { processAlbumImages } from "@/app/lib/image-processing";
import { cache } from "@/app/lib/cache";
import { s3Semaphore } from "@/app/lib/concurrency";

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

// GET /api/images/[album_id]/[image] — serve image file from S3.
// Optional ?w=480|1080|2048 serves the pre-generated WebP rendition,
// falling back to the original JPEG when the rendition doesn't exist.
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

    const wParam = request.nextUrl.searchParams.get("w");
    let thumbWidth: number | null = null;
    if (wParam !== null) {
      const w = parseInt(wParam, 10);
      if (!isThumbWidth(w)) {
        return NextResponse.json({ error: "Largura inválida" }, { status: 400 });
      }
      thumbWidth = w;
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

    const ifNoneMatch = request.headers.get("if-none-match");

    // The semaphore bounds concurrent S3 request initiations; the body keeps
    // streaming to the client after the slot is released.
    let result: S3ObjectStream | "not-modified" | null = null;
    let contentType = "image/jpeg";

    if (thumbWidth !== null) {
      const renditionKey = thumbKey(album.nome, image, thumbWidth);
      try {
        result = await s3Semaphore.run(() =>
          getObjectStream(renditionKey, ifNoneMatch)
        );
        contentType = "image/webp";
      } catch {
        // Rendition not generated yet (e.g. pending backfill) — fall back
        // to the original below.
        result = null;
      }
    }

    if (result === null) {
      try {
        result = await s3Semaphore.run(() =>
          getObjectStream(imageKey(album.nome, image), ifNoneMatch)
        );
        contentType = "image/jpeg";
      } catch {
        return NextResponse.json(
          { error: "Arquivo de imagem não encontrado no S3" },
          { status: 404 }
        );
      }
    }

    if (result === "not-modified") {
      return new NextResponse(null, {
        status: 304,
        headers: { "Cache-Control": IMMUTABLE_CACHE },
      });
    }

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": IMMUTABLE_CACHE,
    });
    if (result.etag) headers.set("ETag", result.etag);
    if (result.contentLength !== undefined) {
      headers.set("Content-Length", String(result.contentLength));
    }

    return new NextResponse(result.body, { headers });
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
