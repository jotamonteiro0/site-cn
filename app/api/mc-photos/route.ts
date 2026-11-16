import { NextResponse } from "next/server";
import { getAllMCPhotos } from "@/lib/mc-photos-store";

export async function GET() {
  try {
    const photos = await getAllMCPhotos();
    return NextResponse.json({
      items: photos,
      total: photos.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
