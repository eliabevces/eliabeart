import { NextResponse } from "next/server";
import { getAlbums, getAlbumsNeedingProcessing } from "@/app/lib/albums";
import { requireAuth } from "@/app/lib/auth";
import {
  processAlbumImages,
  ensureAlbumThumbnails,
} from "@/app/lib/image-processing";
import { cache } from "@/app/lib/cache";

// GET /api/albums — list all public albums (auto-discovers from S3, cached)
export async function GET() {
  try {
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

// POST /api/albums — force re-sync albums from S3 and process new images (protected)
export async function POST() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Clear cache to force a fresh sync with S3
    cache.delete("albuns");

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

    // Backfill WebP renditions for albums processed before thumbnails
    // existed. Cheap when nothing is missing (one S3 listing per album).
    const thumbsBackfilled: string[] = [];
    for (const album of albums) {
      try {
        const generated = await ensureAlbumThumbnails(album.nome);
        thumbsBackfilled.push(...generated.map((n) => `${album.nome}/${n}`));
      } catch (error) {
        console.error(`Error backfilling thumbnails for ${album.nome}:`, error);
      }
    }

    return NextResponse.json(
      {
        message: "Albums sincronizados com S3",
        albuns: albums,
        thumbsBackfilled,
      },
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
