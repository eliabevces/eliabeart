import { NextRequest, NextResponse } from "next/server";
import { getAlbum } from "@/app/lib/albums";
import { getObject, imageKey } from "@/app/lib/s3";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const albumId = searchParams.get("album_id");
  const imageName = searchParams.get("image_name");

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

    const key = imageKey(album.nome, imageName);
    let imageBuffer: Buffer;
    try {
      imageBuffer = await getObject(key);
    } catch {
      return NextResponse.json(
        { error: "Image not found in S3" },
        { status: 404 }
      );
    }

    const fileName = `${imageName}.jpg`;

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download image" },
      { status: 500 }
    );
  }
}
