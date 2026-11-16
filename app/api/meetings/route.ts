import { NextResponse } from "next/server.js";
import { meetingsRepo, type MeetingStatus } from "@/lib/repositories/meetings-repository";
import { verifyCalendarAccess } from "@/lib/master-auth";

/**
 * GET /api/meetings
 * Consulta a lista oficial de reuniões e eventos cadastrados no PostgreSQL.
 * Suporta filtros por mês, ano, categoria, gestão, status e termo de busca.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Próxima reunião estritamente futura
    const nextOnly = searchParams.get("next_only") === "true";
    if (nextOnly) {
      const refTimeParam = searchParams.get("ref_time");
      const refTime = refTimeParam ? parseInt(refTimeParam, 10) : undefined;
      const nextMeeting = await meetingsRepo.getNextMeeting(refTime);
      return NextResponse.json({ next_meeting: nextMeeting });
    }

    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const category = searchParams.get("category");
    const management = searchParams.get("management");
    const status = searchParams.get("status") as MeetingStatus | null;
    const search = searchParams.get("search");

    const filters = {
      month: monthParam ? parseInt(monthParam, 10) : undefined,
      year: yearParam ? parseInt(yearParam, 10) : undefined,
      category: category || undefined,
      management: management || undefined,
      status: status || undefined,
      search: search || undefined,
    };

    const items = await meetingsRepo.getAll(filters);

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: "Erro ao consultar reuniões oficiais: " + message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meetings
 * Criação de nova reunião ou evento no calendário oficial.
 * Restrito exclusivamente ao perfil Master / Administrador.
 */
export async function POST(request: Request) {
  try {
    const auth = await verifyCalendarAccess(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Acesso restrito ao perfil Master ou Escrivão para gerenciar o calendário." },
        { status: auth.statusCode || 403 }
      );
    }

    const body = await request.json();

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "O título da reunião ou evento é obrigatório." },
        { status: 400 }
      );
    }

    if (!body.starts_at) {
      return NextResponse.json(
        { error: "A data e horário de início da sessão são obrigatórios." },
        { status: 400 }
      );
    }

    const startsDate = new Date(body.starts_at);
    if (isNaN(startsDate.getTime())) {
      return NextResponse.json(
        { error: "Data de início inválida." },
        { status: 400 }
      );
    }

    if (body.ends_at) {
      const endsDate = new Date(body.ends_at);
      if (isNaN(endsDate.getTime())) {
        return NextResponse.json(
          { error: "Data de término inválida." },
          { status: 400 }
        );
      }
      if (endsDate.getTime() < startsDate.getTime()) {
        return NextResponse.json(
          { error: "O horário de término não pode ser anterior ao horário de início." },
          { status: 400 }
        );
      }
    }

    // Validação de vínculo à gestão ativa: Modificação permitida estritamente na gestão vinculada (Gestão XXV • 2026.2)
    const { deriveManagementFromDate } = await import("@/lib/repositories/meetings-repository");
    const targetManagement = body.management?.trim() || deriveManagementFromDate(body.starts_at);
    if (targetManagement && !targetManagement.includes("XXV") && !targetManagement.includes("2026.2")) {
      return NextResponse.json(
        { error: "Acesso restrito: O gerenciamento de reuniões é limitado exclusivamente à gestão vinculada administrativamente (Gestão XXV • 2026.2)." },
        { status: 403 }
      );
    }

    const created = await meetingsRepo.create({
      title: body.title.trim(),
      category: body.category?.trim(),
      management: body.management?.trim(),
      starts_at: body.starts_at,
      ends_at: body.ends_at || null,
      location: body.location?.trim(),
      description: body.description?.trim(),
      complementary_info: body.complementary_info?.trim() || null,
      created_by: auth.userId,
    });

    return NextResponse.json(
      { message: "Reunião capitular cadastrada com sucesso no calendário oficial.", item: created },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    const status = message.includes("Já existe uma reunião") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
