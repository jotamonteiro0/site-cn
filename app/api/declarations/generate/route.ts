import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";
import { formatCivilDate, formatCivilIso } from "@/lib/gestao-vigencia";

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

    // 0. Autenticação e Autorização Estrita
    const authHeader = request.headers.get("authorization");
    let callerUser = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      callerUser = userData?.user || null;
    } else {
      try {
        const cookieStore = await cookies();
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        const ssrClient = createServerClient(supabaseUrl, anonKey, {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll() {},
          },
        });
        const { data: userData } = await ssrClient.auth.getUser();
        callerUser = userData?.user || null;
      } catch {
        callerUser = null;
      }
    }

    if (!callerUser) {
      return NextResponse.json(
        { error: "Acesso não autorizado: autenticação obrigatória." },
        { status: 401 }
      );
    }

    // 1. Busca membro
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("members")
      .select("id, id_demolay, full_name, category, profile_id")
      .eq("id", member_id)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
    }

    // Permissão: O próprio membro OU Diretoria (Master, Escrivão, Tesoureiro)
    const isOwner = member.profile_id && member.profile_id === callerUser.id;
    let isAuthorized = isOwner;

    if (!isAuthorized) {
      const isPermanentMaster =
        callerUser.user_metadata?.id_demolay === "127738" ||
        callerUser.user_metadata?.id_demolay === "102836" ||
        callerUser.email === "joaomonteiro0@icloud.com" ||
        callerUser.email === "airton@carvalhoneves500.org.br";

      if (isPermanentMaster) {
        isAuthorized = true;
      } else {
        const { data: membership } = await supabaseAdmin
          .from("chapter_memberships")
          .select("role_code")
          .eq("chapter_id", CHAPTER_ID)
          .eq("user_id", callerUser.id)
          .eq("is_active", true)
          .maybeSingle();

        if (membership && ["master", "escrivao", "tesoureiro"].includes(membership.role_code)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Permissão negada para emitir declaração deste membro." },
        { status: 403 }
      );
    }

    // 2. Busca Gestão Ativa e Oficiais Vigentes (Tesoureiro e Escrivão)
    const { data: activeMgmt } = await supabaseAdmin
      .from("managements")
      .select("id, title, code, starts_on, ends_on")
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

    // 3. Vigência Institucional da Gestão Vigente (sem datas fixas arbitrárias)
    const today = new Date();
    const formattedToday = today.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    const todayIso = formatCivilIso(today);

    // Registro oficial de instalação da gestão informado pelo Mestre Conselheiro
    const officialStartsOn = activeMgmt?.starts_on || "2026-08-08";
    // Data efetiva de encerramento da gestão (se já encerrada formalmente por Assembleia)
    const officialEndsOn = activeMgmt?.ends_on || null;

    // Se a gestão estiver ativa, ela permanece ativa até encerramento formal.
    // O período de cobertura da declaração usa os parâmetros passados pelo solicitante
    // ou abrange da data oficial de posse até a data de encerramento efetivo (se encerrada)
    // ou até o término do exercício fiscal/presente data (se ativa).
    const pStart = period_start || officialStartsOn;
    const pEnd =
      period_end ||
      officialEndsOn ||
      (declaration_type === "quitacao_tesouraria" ? "2026-12-31" : todayIso);

    // Formatação canônica sem deslocamento por conversão UTC em fuso horário
    const formattedPStart = formatCivilDate(pStart);
    const formattedPEnd = formatCivilDate(pEnd);

    // 4. Validação Rigorosa de Quitação Financeira (Snapshot Real no Instante da Emissão)
    let paidChargesList: Array<{
      id: string;
      description: string;
      amount: number;
      due_date: string;
      status: string;
      paid_at: string | null;
    }> = [];
    let totalPaidInPeriod = 0;

    if (declaration_type === "quitacao_tesouraria") {
      const { data: periodCharges } = await supabaseAdmin
        .from("member_charges")
        .select("id, description, amount, due_date, status, paid_at")
        .eq("member_id", member.id)
        .gte("due_date", pStart)
        .lte("due_date", pEnd);

      const allCharges = periodCharges || [];
      const pendingCharges = allCharges.filter((c) => c.status !== "confirmado");

      const isExempt =
        member.id_demolay === "102836" ||
        member.full_name?.toLowerCase().includes("airton") ||
        member.category === "senior_demolay" ||
        (member.category === "macom" &&
          !member.full_name?.toLowerCase().includes("ericles") &&
          !member.full_name?.toLowerCase().includes("epaminondas"));

      // TRAVA DE SEGURANÇA: Quitação somente pode ser emitida se NÃO houver débitos pendentes (membros isentos são automaticamente regulares)!
      if (!isExempt && pendingCharges.length > 0) {
        return NextResponse.json(
          {
            error: `Não é possível emitir Certidão de Quitação: o membro possui ${pendingCharges.length} mensalidade(s) pendente(s) no período de vigência (${formattedPStart} a ${formattedPEnd}).`,
            pending_charges: pendingCharges.map((c) => ({
              id: c.id,
              description: c.description,
              amount: Number(c.amount),
              due_date: c.due_date,
              status: c.status,
            })),
          },
          { status: 400 }
        );
      }

      paidChargesList = allCharges.filter((c) => c.status === "confirmado").map((c) => ({
        id: c.id,
        description: c.description,
        amount: Number(c.amount),
        due_date: c.due_date,
        status: c.status,
        paid_at: c.paid_at,
      }));

      totalPaidInPeriod = paidChargesList.reduce((acc, c) => acc + c.amount, 0);
    }

    // 5. Se for declaração de frequência, calcula %
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

    // 6. Gera código de autenticidade único com CSPRNG
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const verificationCode = `CN-DECL-${randomHex}`;

    // 7. Monta o Snapshot Histórico Imutável dos dados que fundamentaram a emissão
    const contentData = {
      tipo: declaration_type,
      solicitante_nome: member.full_name,
      solicitante_id_demolay: member.id_demolay,
      solicitante_categoria: member.category,
      gestao_codigo: activeMgmt?.code || "2026.2",
      gestao_titulo: activeMgmt?.title || "Gestão XXV",
      periodo_inicio: formattedPStart,
      periodo_fim: formattedPEnd,
      data_emissao: formattedToday,
      data_hora_emissao_iso: today.toISOString(),
      codigo_verificacao: verificationCode,
      frequencia_porcentagem: declaration_type === "frequencia" ? attendanceRate : undefined,
      situacao_financeira: declaration_type === "quitacao_tesouraria" ? "QUITADO" : undefined,
      saldo_devedor: declaration_type === "quitacao_tesouraria" ? 0 : undefined,
      total_pago: declaration_type === "quitacao_tesouraria" ? totalPaidInPeriod : undefined,
      competencias_abrangidas: declaration_type === "quitacao_tesouraria" ? paidChargesList : undefined,
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
      snapshot_imutavel: true,
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
