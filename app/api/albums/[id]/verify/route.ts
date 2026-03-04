import { NextRequest, NextResponse } from "next/server";
import { validateAlbumCode, getAlbum } from "@/app/lib/albums";

// POST /api/albums/[id]/verify — verify access code for a private album
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!album.privado) {
      return NextResponse.json({ valid: true, privado: false });
    }

    const body = await request.json();
    const { codigo } = body;

    if (!codigo || typeof codigo !== "string") {
      return NextResponse.json(
        { error: "Código de acesso é obrigatório" },
        { status: 400 }
      );
    }

    const isValid = await validateAlbumCode(albumId, codigo);

    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: "Código de acesso inválido" },
        { status: 403 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error(`POST /api/albums/[id]/verify error:`, error);
    return NextResponse.json(
      { error: "Erro ao verificar código" },
      { status: 500 }
    );
  }
}
