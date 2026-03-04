import { NextRequest, NextResponse } from "next/server";
import { getAlbums, getAlbumsNeedingProcessing } from "@/app/lib/albums";
import { requireAuth } from "@/app/lib/auth";
import { processAlbumImages } from "@/app/lib/image-processing";
import { cache } from "@/app/lib/cache";

// GET /api/albums — list all public albums (auto-discovers from S3)
export async function GET() {
  try {
    // Process any new albums that need image processing
    const needsProcessing = await getAlbumsNeedingProcessing();
    for (const album of needsProcessing) {
      try {
        await processAlbumImages(album.id, album.nome);
      } catch (error) {
        console.error(`Error processing album ${album.nome}:`, error);
      }
    }

    const albums = await getAlbums();
    // Strip the codigo field before returning (never expose to public listing)
    const safeAlbums = albums.map(({ codigo, ...rest }) => rest);
    return NextResponse.json({ albuns: safeAlbums });
  } catch (error) {
    console.error("GET /api/albums error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar albuns" },
      { status: 500 }
    );
  }
}

// POST /api/albums — force re-sync albums from S3 (protected)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Clear cache to force a fresh sync with S3
    cache.delete("albuns");

    const albums = await getAlbums();
    return NextResponse.json(
      { message: "Albums sincronizados com S3", albuns: albums },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/albums error:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar albums" },
      { status: 500 }
    );
  }
}
