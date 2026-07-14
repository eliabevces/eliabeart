import { NextRequest, NextResponse } from "next/server";
import { getAlbum, validateAlbumCode } from "@/app/lib/albums";
import { getObjectStream, imageKey } from "@/app/lib/s3";
import { s3Semaphore } from "@/app/lib/concurrency";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const albumId = searchParams.get("album_id");
  const imageName = searchParams.get("image_name");
  const code = searchParams.get("code");

  if (!albumId || !imageName) {
    return NextResponse.json(
      { error: "Missing album_id or image_name" },
      { status: 400 }
    );
  }

  try {
    const album = await getAlbum(parseInt(albumId, 10));
    if (!album) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
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

    const key = imageKey(album.nome, imageName);
    let result;
    try {
      result = await s3Semaphore.run(() => getObjectStream(key));
    } catch {
      return NextResponse.json(
        { error: "Image not found in S3" },
        { status: 404 }
      );
    }
    if (result === "not-modified") {
      return new NextResponse(null, { status: 304 });
    }

    const fileName = `${imageName}.jpg`;

    const headers = new Headers({
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-cache",
    });
    if (result.contentLength !== undefined) {
      headers.set("Content-Length", String(result.contentLength));
    }

    return new NextResponse(result.body, { headers });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download image" },
      { status: 500 }
    );
  }
}
