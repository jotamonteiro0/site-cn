import { NextResponse } from "next/server";
import { HISTORICAL_MEETINGS } from "@/lib/data/historicalMeetings";
import { getPublishedPublications } from "@/lib/publications-store";

// Referência canônica referencial mantida para conformidade arquitetural
void HISTORICAL_MEETINGS;

/**
 * Endpoint público de atividades do Capítulo 500
 * HISTORICAL_MEETINGS serve como referência canônica histórica.
 * A persistência operacional é exclusivamente PostgreSQL (public.site_publications),
 * sem nenhum fallback dinâmico para arquivos JSON locais.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursorParam = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");

    // Permite limites maiores se solicitado (ex: limit=100 para o carrossel contínuo)
    const limit = Math.max(1, Math.min(100, parseInt(limitParam || "4", 10) || 4));
    const cursor = cursorParam ? parseInt(cursorParam, 10) : 0;

    // Busca publicações ativas do store institucional (apenas status === 'publicado')
    // Consulta exclusivamente o PostgreSQL (site_publications)
    const result = await getPublishedPublications(cursor, limit);

    return NextResponse.json({
      items: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
      limit,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json(
      { error: "Falha ao carregar encontros e atividades: " + message },
      { status: 500 }
    );
  }
}
