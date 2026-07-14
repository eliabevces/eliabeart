import { NextRequest, NextResponse } from "next/server";
import { deleteAlbum, getAlbum } from "@/app/lib/albums";
import { requireAuth, isAuthenticated } from "@/app/lib/auth";

// DELETE /api/albums/[id] — delete album (protected)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const albumId = parseInt(id, 10);
    if (isNaN(albumId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const deleted = await deleteAlbum(albumId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Album não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Album deletado com sucesso" });
  } catch (error) {
    console.error(`DELETE /api/albums error:`, error);
    return NextResponse.json(
      { error: "Erro ao deletar album" },
      { status: 500 }
    );
  }
}

// GET /api/albums/[id] — get album info (codigo hidden from unauthenticated users)
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

    // Only expose the access code to authenticated users
    const authenticated = await isAuthenticated();
    const { codigo, ...publicAlbum } = album;
    const response = authenticated ? album : publicAlbum;

    return NextResponse.json(response);
  } catch (error) {
    console.error(`GET /api/albums error:`, error);
    return NextResponse.json(
      { error: "Erro ao buscar album" },
      { status: 500 }
    );
  }
}
