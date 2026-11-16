import { NextResponse } from "next/server";
import {
  getPublicationById,
  updatePublication,
  deletePublication,
  cleanupOrphanPhoto,
  type PublicationStatus,
} from "@/lib/publications-store";
import { verifyMasterAccess } from "@/lib/master-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteParams) {
  try {
    const auth = await verifyMasterAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso negado." },
        { status: auth.statusCode || 403 }
      );
    }

    const { id } = await context.params;
    const item = await getPublicationById(id);
    if (!item) {
      return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteParams) {
  try {
    const auth = await verifyMasterAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso negado: perfil Master obrigatório." },
        { status: auth.statusCode || 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const existing = await getPublicationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });
    }

    if (
      body.photo_url !== undefined &&
      existing.photo_url &&
      body.photo_url !== existing.photo_url
    ) {
      cleanupOrphanPhoto(existing.photo_url).catch((err) => {
        console.warn("Aviso ao limpar foto substituída:", err);
      });
    }

    // Validação de original_post_url se fornecido
    let originalPostUrl: string | null | undefined = existing.original_post_url;
    if (body.original_post_url !== undefined) {
      if (typeof body.original_post_url === "string" && body.original_post_url.trim().length > 0) {
        const trimmed = body.original_post_url.trim();
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
      } else {
        originalPostUrl = null;
      }
    }

    const updated = await updatePublication(id, {
      title: body.title !== undefined ? body.title.trim() : existing.title,
      description: body.description !== undefined ? body.description.trim() : existing.description,
      starts_at: body.starts_at !== undefined ? body.starts_at : existing.starts_at,
      location: body.location !== undefined ? body.location.trim() : existing.location,
      photo_url: body.photo_url !== undefined ? (body.photo_url?.trim() || null) : existing.photo_url,
      status: body.status !== undefined ? (body.status as PublicationStatus) : existing.status,
      mc_name: body.mc_name !== undefined ? body.mc_name.trim() : existing.mc_name,
      management: body.management !== undefined ? body.management.trim() : existing.management,
      ata_num: body.ata_num !== undefined ? body.ata_num.trim() : existing.ata_num,
      original_post_url: originalPostUrl,
      demolays_present_count:
        body.demolays_present_count !== undefined
          ? Number(body.demolays_present_count)
          : existing.demolays_present_count,
      masons_present_count:
        body.masons_present_count !== undefined
          ? Number(body.masons_present_count)
          : existing.masons_present_count,
      total_quorum:
        body.total_quorum !== undefined
          ? Number(body.total_quorum)
          : existing.total_quorum,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const auth = await verifyMasterAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso negado: perfil Master obrigatório." },
        { status: auth.statusCode || 403 }
      );
    }

    const { id } = await context.params;
    const success = await deletePublication(id);
    if (!success) {
      return NextResponse.json({ error: "Publicação não encontrada para exclusão." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Publicação excluída com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
