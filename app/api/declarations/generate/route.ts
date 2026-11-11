import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { member_id, declaration_type, period_start, period_end } = await request.json();

    if (!member_id || !declaration_type) {
      return NextResponse.json(
        { error: "Parâmetros insuficientes para emissão da declaração." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Serviço Supabase não configurado." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";

    // 1. Busca membro
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("members")
      .select("id, id_demolay, full_name, category")
      .eq("id", member_id)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
    }

    // 2. Busca Gestão Ativa e Oficiais Vigentes (Tesoureiro e Escrivão)
    const { data: activeMgmt } = await supabaseAdmin
      .from("managements")
      .select("id, title, code")
      .eq("chapter_id", CHAPTER_ID)
      .eq("status", "ativa")
      .maybeSingle();

    let tesoureiroName = "Aloísio Oliveira Neto";
    let tesoureiroIdDemolay = "134104";
    let escrivaoName = "Waldecy Goncalves de Araujo Neto";
    let escrivaoIdDemolay = "148200";

    if (activeMgmt) {
      const { data: officers } = await supabaseAdmin
        .from("member_management_positions")
        .select(`
          management_positions (name),
          members (full_name, id_demolay)
        `)
        .eq("management_positions.management_id", activeMgmt.id);

      if (officers) {
        interface OfficerRecord {
          management_positions?: { name?: string } | null;
          members?: { full_name?: string; id_demolay?: string } | null;
        }
        for (const o of officers as unknown as OfficerRecord[]) {
          const pos = o.management_positions?.name;
          if (pos === "Tesoureiro" && o.members) {
            tesoureiroName = o.members.full_name || tesoureiroName;
            tesoureiroIdDemolay = o.members.id_demolay || tesoureiroIdDemolay;
          }
          if (pos === "Escrivão" && o.members) {
            escrivaoName = o.members.full_name || escrivaoName;
            escrivaoIdDemolay = o.members.id_demolay || escrivaoIdDemolay;
          }
        }
      }
    }

    // 3. Cálculos de datas e períodos
    const today = new Date();
    const formattedToday = today.toLocaleDateString("pt-BR");
    const pStart = period_start || "2026-07-01";
    const pEnd = period_end || "2026-12-31";
    const formattedPStart = new Date(pStart).toLocaleDateString("pt-BR");
    const formattedPEnd = new Date(pEnd).toLocaleDateString("pt-BR");

    // 4. Se for declaração de frequência, calcula %
    let attendanceRate = 100;
    if (declaration_type === "frequencia") {
      const { data: attList } = await supabaseAdmin
        .from("meeting_attendance")
        .select("status, meetings(starts_at)")
        .eq("member_id", member.id);

      if (attList && attList.length > 0) {
        interface AttendanceRecord {
          status: string;
          meetings?: { starts_at?: string } | null;
        }
        const typedAttList = attList as unknown as AttendanceRecord[];
        const inPeriod = typedAttList.filter((a) => {
          const d = a.meetings?.starts_at?.substring(0, 10);
          return d && d >= pStart && d <= pEnd;
        });
        if (inPeriod.length > 0) {
          const presentCount = inPeriod.filter((a) =>
            ["presente", "justificado"].includes(a.status)
          ).length;
          attendanceRate = Math.round((presentCount / inPeriod.length) * 100);
        }
      }
    }

    // 5. Gera código de autenticidade único
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const verificationCode = `CN-DECL-${randomHex}`;

    // 6. Monta o conteúdo oficial exato solicitado
    const contentData = {
      tipo: declaration_type,
      solicitante_nome: member.full_name,
      solicitante_id_demolay: member.id_demolay,
      periodo_inicio: formattedPStart,
      periodo_fim: formattedPEnd,
      data_emissao: formattedToday,
      codigo_verificacao: verificationCode,
      frequencia_porcentagem: attendanceRate,
      oficial_responsavel:
        declaration_type === "quitacao_tesouraria"
          ? {
              cargo: "Tesoureiro",
              nome: tesoureiroName,
              id_demolay: tesoureiroIdDemolay,
            }
          : {
              cargo: "Escrivão",
              nome: escrivaoName,
              id_demolay: escrivaoIdDemolay,
            },
    };

    // 7. Insere na tabela issued_declarations
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 90);

    const { data: newDecl, error: declErr } = await supabaseAdmin
      .from("issued_declarations")
      .insert({
        chapter_id: CHAPTER_ID,
        member_id: member.id,
        declaration_type,
        verification_code: verificationCode,
        period_start: pStart,
        period_end: pEnd,
        valid_until: validUntilDate.toISOString().substring(0, 10),
        content_data: contentData,
      })
      .select()
      .single();

    if (declErr) {
      console.error("Erro ao inserir declaração:", declErr);
      return NextResponse.json({ error: "Erro ao registrar declaração no banco." }, { status: 500 });
    }

    // 8. Registra também na pasta de requerimentos (member_requests) para controle administrativo
    await supabaseAdmin.from("member_requests").insert({
      chapter_id: CHAPTER_ID,
      requester_member_id: member.id,
      target_role: declaration_type === "quitacao_tesouraria" ? "tesoureiro" : "escrivao",
      status: "concluida",
      description:
        declaration_type === "quitacao_tesouraria"
          ? `Emissão automática de Declaração de Quitação Financeira (Código ${verificationCode}). Período: ${formattedPStart} a ${formattedPEnd}.`
          : `Emissão automática de Declaração de Frequência (Código ${verificationCode}). Frequência: ${attendanceRate}%. Período: ${formattedPStart} a ${formattedPEnd}.`,
    });

    return NextResponse.json({
      success: true,
      declaration: newDecl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro na rota de declaração:", error);
    return NextResponse.json(
      { error: "Falha ao emitir declaração: " + message },
      { status: 500 }
    );
  }
}
