import { NextResponse } from "next/server.js";
import { meetingsRepo, type MeetingStatus } from "@/lib/repositories/meetings-repository";
import { verifyCalendarAccess } from "@/lib/master-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/meetings/[id]
 * Detalhes de uma reunião específica pelo ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const meeting = await meetingsRepo.getById(id);

    if (!meeting) {
      return NextResponse.json({ error: "Reunião capitular não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ item: meeting });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/meetings/[id]
 * Atualiza os dados de uma reunião capitular.
 * Restrito exclusivamente ao perfil Master / Administrador.
 */
export async function PUT(request: Request, context: RouteParams) {
  try {
    const auth = await verifyCalendarAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso restrito ao perfil Master ou Escrivão para editar o calendário." },
        { status: auth.statusCode || 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const existing = await meetingsRepo.getById(id);
    if (!existing) {
      return NextResponse.json({ error: "Reunião capitular não encontrada." }, { status: 404 });
    }

    // Validação de vínculo à gestão ativa: Modificação permitida estritamente na gestão vinculada (Gestão XXV • 2026.2)
    const existingManagement = existing.management;
    if (existingManagement && !existingManagement.includes("XXV") && !existingManagement.includes("2026.2")) {
      return NextResponse.json(
        { error: "Acesso restrito: Não é permitido modificar reuniões de gestões anteriores. O acesso administrativo é vinculado estritamente à gestão ativa (Gestão XXV • 2026.2)." },
        { status: 403 }
      );
    }
    if (body.management) {
      const targetMgmt = String(body.management);
      if (!targetMgmt.includes("XXV") && !targetMgmt.includes("2026.2")) {
        return NextResponse.json(
          { error: "Acesso restrito: Não é permitido mover reuniões para outras gestões administrativas." },
          { status: 403 }
        );
      }
    }

    if (body.starts_at && body.ends_at) {
      const s = new Date(body.starts_at).getTime();
      const e = new Date(body.ends_at).getTime();
      if (e < s) {
        return NextResponse.json(
          { error: "O horário de término não pode ser anterior ao horário de início." },
          { status: 400 }
        );
      }
    } else if (body.ends_at && existing.starts_at) {
      const s = new Date(existing.starts_at).getTime();
      const e = new Date(body.ends_at).getTime();
      if (e < s) {
        return NextResponse.json(
          { error: "O horário de término não pode ser anterior ao horário de início." },
          { status: 400 }
        );
      }
    }

    const updated = await meetingsRepo.update(id, {
      title: body.title !== undefined ? body.title : undefined,
      category: body.category !== undefined ? body.category : undefined,
      management: body.management !== undefined ? body.management : undefined,
      starts_at: body.starts_at !== undefined ? body.starts_at : undefined,
      ends_at: body.ends_at !== undefined ? body.ends_at : undefined,
      location: body.location !== undefined ? body.location : undefined,
      description: body.description !== undefined ? body.description : undefined,
      complementary_info: body.complementary_info !== undefined ? body.complementary_info : undefined,
      status: body.status !== undefined ? (body.status as MeetingStatus) : undefined,
    });

    return NextResponse.json({
      message: "Reunião capitular atualizada com sucesso no calendário oficial.",
      item: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/meetings/[id]
 * Cancela (preserva histórico) ou exclui reunião capitular.
 * Por padrão, realiza cancelamento lógico (status = 'cancelada', cancelled_at = now).
 * Restrito exclusivamente ao perfil Master / Administrador.
 */
export async function DELETE(request: Request, context: RouteParams) {
  try {
    const auth = await verifyCalendarAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso restrito ao perfil Master ou Escrivão para cancelar reuniões." },
        { status: auth.statusCode || 403 }
      );
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    const existing = await meetingsRepo.getById(id);
    if (!existing) {
      return NextResponse.json({ error: "Reunião capitular não encontrada." }, { status: 404 });
    }

    // Validação de vínculo à gestão ativa: Modificação permitida estritamente na gestão vinculada (Gestão XXV • 2026.2)
    const existingManagement = existing.management;
    if (existingManagement && !existingManagement.includes("XXV") && !existingManagement.includes("2026.2")) {
      return NextResponse.json(
        { error: "Acesso restrito: Não é permitido modificar reuniões de gestões anteriores. O acesso administrativo é vinculado estritamente à gestão ativa (Gestão XXV • 2026.2)." },
        { status: 403 }
      );
    }

    if (permanent) {
      await meetingsRepo.delete(id);
      return NextResponse.json({
        message: "Reunião capitular excluída permanentemente.",
        deleted_id: id,
      });
    }

    // Cancelamento com preservação de histórico litúrgico
    const cancelled = await meetingsRepo.cancel(id);
    return NextResponse.json({
      message: "Reunião capitular cancelada com sucesso no calendário oficial. Histórico preservado.",
      item: cancelled,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
