import { NextResponse } from "next/server";
import {
  getAllPublications,
  createPublication,
  type PublicationStatus,
} from "@/lib/publications-store";
import { verifyMasterAccess } from "@/lib/master-auth";

export async function GET(request: Request) {
  try {
    const auth = await verifyMasterAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso negado: perfil Master obrigatório." },
        { status: auth.statusCode || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PublicationStatus | null;
    const management = searchParams.get("management");
    const search = searchParams.get("search")?.toLowerCase().trim();

    const items = await getAllPublications({ status, management, search });

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json(
      { error: "Erro ao consultar publicações administrativas: " + message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyMasterAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso negado: perfil Master obrigatório." },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await request.json();

    if (!body.title || !body.description || !body.starts_at) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes: título, descrição e data da atividade são mandatórios." },
        { status: 400 }
      );
    }

    // Validação estrita da URL da publicação original, se fornecida
    let originalPostUrl: string | null = null;
    if (body.original_post_url && typeof body.original_post_url === "string") {
      const trimmed = body.original_post_url.trim();
      if (trimmed.length > 0) {
        try {
          const parsed = new URL(trimmed);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return NextResponse.json(
              { error: "Endereço da publicação original inválido. Deve iniciar com http:// ou https://" },
              { status: 400 }
            );
          }
          originalPostUrl = trimmed;
        } catch {
          return NextResponse.json(
            { error: "Endereço da publicação original inválido. Forneça uma URL válida." },
            { status: 400 }
          );
        }
      }
    }

    const newPublication = await createPublication({
      title: body.title.trim(),
      description: body.description.trim(),
      starts_at: body.starts_at,
      location: body.location?.trim() || undefined,
      photo_url: body.photo_url?.trim() || null,
      status: (body.status as PublicationStatus) || "publicado",
      mc_name: body.mc_name?.trim() || undefined,
      management: body.management?.trim() || undefined,
      ata_num: body.ata_num?.trim() || undefined,
      original_post_url: originalPostUrl,
      demolays_present_count: Number(body.demolays_present_count) || 0,
      masons_present_count: Number(body.masons_present_count) || 0,
      total_quorum:
        Number(body.total_quorum) ||
        (Number(body.demolays_present_count) || 0) + (Number(body.masons_present_count) || 0),
      created_by: auth.userId,
    });

    return NextResponse.json(
      { success: true, item: newPublication },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json(
      { error: "Erro ao cadastrar publicação: " + message },
      { status: 500 }
    );
  }
}
