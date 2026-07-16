import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getAlbum, validateAlbumCode } from "@/app/lib/albums";
import { getImagesByAlbum } from "@/app/lib/images";
import { getObject, imageKey } from "@/app/lib/s3";
import { s3Semaphore } from "@/app/lib/concurrency";

// GET /api/download/bulk?album_id=&code= — zip of every image marked "marcado" in the album.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const albumIdParam = searchParams.get("album_id");
  const code = searchParams.get("code");

  if (!albumIdParam) {
    return NextResponse.json({ error: "Missing album_id" }, { status: 400 });
  }

  const albumId = parseInt(albumIdParam, 10);
  if (isNaN(albumId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const album = await getAlbum(albumId);
    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    if (album.privado) {
      const isValid = await validateAlbumCode(album.id, code);
      if (!isValid) {
        return NextResponse.json(
          { error: "Código de acesso inválido" },
          { status: 403 }
        );
      }
    }

    const images = await getImagesByAlbum(albumId);
    const marked = images.filter((img) => img.marcado);

    if (marked.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem marcada" },
        { status: 400 }
      );
    }

    const zip = new JSZip();
    await Promise.all(
      marked.map(async (img) => {
        const buffer = await s3Semaphore.run(() =>
          getObject(imageKey(album.nome, img.nome))
        );
        zip.file(`${img.nome}.jpg`, buffer);
      })
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const fileName = `roll-${album.nome}-marcados.zip`;
    // ASCII fallback for `filename`; RFC 5987 `filename*` carries the real
    // UTF-8 name so accented album names (e.g. "não") aren't mojibake'd.
    const asciiName = fileName.replace(/[^\x20-\x7E]/g, "_");
    const encodedName = encodeURIComponent(fileName);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Bulk download error:", error);
    return NextResponse.json(
      { error: "Failed to download marked images" },
      { status: 500 }
    );
  }
}
