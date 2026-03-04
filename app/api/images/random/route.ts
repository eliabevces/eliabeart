import { NextResponse } from "next/server";
import { getRandomImage } from "@/app/lib/images";

// GET /api/images/random — get a random image info
export async function GET() {
  try {
    const image = await getRandomImage();
    if (!image) {
      return NextResponse.json(
        { error: "Nenhuma imagem encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(image);
  } catch (error) {
    console.error("GET /api/images/random error:", error);
    return NextResponse.json(
      { error: "Erro ao obter imagem aleatória" },
      { status: 500 }
    );
  }
}
