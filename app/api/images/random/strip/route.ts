import { NextRequest, NextResponse } from "next/server";
import { getRandomStrip } from "@/app/lib/images";

const MAX_RADIUS = 6;

// GET /api/images/random/strip?radius=2 — a random public frame plus the frames
// adjacent to it on the same roll, for the home hero's contact strip.
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("radius");
    const parsed = raw === null ? 2 : parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > MAX_RADIUS) {
      return NextResponse.json({ error: "Raio inválido" }, { status: 400 });
    }

    const strip = await getRandomStrip(parsed);
    if (!strip) {
      return NextResponse.json(
        { error: "Nenhuma imagem encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(strip);
  } catch (error) {
    console.error("GET /api/images/random/strip error:", error);
    return NextResponse.json(
      { error: "Erro ao obter tira aleatória" },
      { status: 500 }
    );
  }
}
