import { NextRequest, NextResponse } from "next/server";
import { toggleAlbumPrivacy, regenerateAlbumCode, getAlbum } from "@/app/lib/albums";
import { requireAuth } from "@/app/lib/auth";

// POST /api/albums/[id]/privacy — toggle privacy or regenerate code (protected)
export async function POST(
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
    const { privado, regenerate } = body;

    // Regenerate code for existing private album
    if (regenerate) {
      const result = await regenerateAlbumCode(albumId);
      if (!result.success) {
        return NextResponse.json(
          { error: "Album não encontrado ou não é privado" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        message: "Código regenerado com sucesso",
        codigo: result.codigo,
      });
    }

    // Toggle privacy
    if (typeof privado !== "boolean") {
      return NextResponse.json(
        { error: "Campo 'privado' (boolean) é obrigatório" },
        { status: 400 }
      );
    }

    const result = await toggleAlbumPrivacy(albumId, privado);
    if (!result.success) {
      return NextResponse.json(
        { error: "Album não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: privado
        ? "Album definido como privado"
        : "Album definido como público",
      privado,
      codigo: result.codigo ?? null,
    });
  } catch (error) {
    console.error(`POST /api/albums/[id]/privacy error:`, error);
    return NextResponse.json(
      { error: "Erro ao atualizar privacidade do album" },
      { status: 500 }
    );
  }
}

// GET /api/albums/[id]/privacy — check if album is private (public endpoint)
export async function GET(
  _request: NextRequest,
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

    return NextResponse.json({ privado: album.privado });
  } catch (error) {
    console.error(`GET /api/albums/[id]/privacy error:`, error);
    return NextResponse.json(
      { error: "Erro ao verificar privacidade" },
      { status: 500 }
    );
  }
}
