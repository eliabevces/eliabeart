import { NextRequest, NextResponse } from "next/server";
import { getAlbum, updateCover } from "@/app/lib/albums";
import { getImageByNameAndAlbum } from "@/app/lib/images";
import { requireAuth } from "@/app/lib/auth";

// PATCH /api/albums/[id]/cover — update album cover (protected)
export async function PATCH(
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

    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: "Nome da imagem é obrigatório" },
        { status: 400 }
      );
    }

    const imageDb = await getImageByNameAndAlbum(image, albumId);
    if (!imageDb) {
      return NextResponse.json(
        { error: "Imagem não encontrada" },
        { status: 404 }
      );
    }

    const updated = await updateCover(albumId, imageDb.nome);
    if (!updated) {
      return NextResponse.json(
        { error: "Album não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Capa atualizada com sucesso" });
  } catch (error) {
    console.error(`PATCH /api/albums/cover error:`, error);
    return NextResponse.json(
      { error: "Erro ao atualizar capa" },
      { status: 500 }
    );
  }
}
