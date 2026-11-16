import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  generatePixCopiaECola,
  getPixQrCodeImageUrl,
  getInfinitePayCheckoutUrl,
} from "@/lib/pix";

export async function POST(request: Request) {
  try {
    const { member_id, charge_ids } = await request.json();

    if (!Array.isArray(charge_ids) || charge_ids.length === 0) {
      return NextResponse.json(
        { error: "Parâmetros inválidos: informe pelo menos uma mensalidade para pagamento em lote." },
        { status: 400 }
      );
    }

    // Previne IDs duplicados na requisição
    const uniqueChargeIds = Array.from(new Set(charge_ids));
    if (uniqueChargeIds.length !== charge_ids.length) {
      return NextResponse.json(
        { error: "Mensalidades duplicadas detectadas na seleção." },
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

    // Autenticação
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

    // Consulta cobranças no banco de forma independente do payload do cliente
    const { data: charges, error: chargesErr } = await supabaseAdmin
      .from("member_charges")
      .select("id, member_id, description, amount, due_date, status")
      .in("id", uniqueChargeIds);

    if (chargesErr || !charges || charges.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma cobrança encontrada para os identificadores fornecidos." },
        { status: 404 }
      );
    }

    if (charges.length !== uniqueChargeIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais cobranças selecionadas não existem ou não foram localizadas." },
        { status: 400 }
      );
    }

    // Validação estrita de relação: todas as cobranças devem pertencer ao mesmo membro
    const memberIds = Array.from(new Set(charges.map((c) => c.member_id)));
    if (memberIds.length > 1) {
      return NextResponse.json(
        { error: "As mensalidades selecionadas pertencem a membros distintos e não podem ser consolidadas." },
        { status: 400 }
      );
    }

    const inferredMemberId = memberIds[0];

    // Se o cliente enviou member_id, valida consistência estrita com o banco
    if (member_id && member_id !== inferredMemberId) {
      return NextResponse.json(
        { error: "Inconsistência de integridade: as cobranças informadas não pertencem ao membro indicado." },
        { status: 400 }
      );
    }

    const effectiveMemberId = inferredMemberId;

    // Busca dados oficiais do membro no banco
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("members")
      .select("id, id_demolay, full_name, category, profile_id")
      .eq("id", effectiveMemberId)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: "Membro associado às cobranças não encontrado." }, { status: 404 });
    }

    // Permissão: Próprio membro ou Diretoria autorizada (Master, Escrivão, Tesoureiro)
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
        { error: "Permissão negada para solicitar pagamento deste membro." },
        { status: 403 }
      );
    }

    if (charges.length !== uniqueChargeIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais cobranças selecionadas não pertencem ao membro ou não existem." },
        { status: 400 }
      );
    }

    // Validação estrita: apenas cobranças pendentes podem ser incluídas
    const alreadyPaid = charges.filter((c) => c.status === "confirmado");
    if (alreadyPaid.length > 0) {
      return NextResponse.json(
        {
          error: `As seguintes mensalidades já foram pagas anteriormente e não podem ser cobradas: ${alreadyPaid.map((c) => c.description).join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // Recálculo seguro no backend (não confia em valores enviados pelo cliente)
    const totalAmount = charges.reduce((acc, c) => acc + Number(c.amount || 0), 0);
    const roundedTotal = Math.round(totalAmount * 100) / 100;

    // Gera identificador único para a transação em lote (txid no padrão Pix)
    const txid = `CN${Date.now().toString(36).toUpperCase()}${member.id_demolay || ""}`.substring(0, 25);
    const batchDescription =
      charges.length === 1
        ? charges[0].description
        : `${charges.length} Mensalidades CN500 (${member.id_demolay})`;

    const pixPayload = generatePixCopiaECola({
      amount: roundedTotal,
      txid,
      description: batchDescription,
    });

    const qrCodeUrl = getPixQrCodeImageUrl(pixPayload, 260);

    const infinitePayUrl = getInfinitePayCheckoutUrl({
      amount: roundedTotal,
      chargeId: uniqueChargeIds.join("_").substring(0, 50),
      description: batchDescription,
    });

    return NextResponse.json({
      success: true,
      member_id: member.id,
      member_name: member.full_name,
      total_amount: roundedTotal,
      total_count: charges.length,
      count: charges.length,
      charge_ids: uniqueChargeIds,
      descriptions: charges.map((c) => c.description),
      charges: charges.map((c) => ({
        id: c.id,
        description: c.description,
        amount: Number(c.amount),
        due_date: c.due_date,
        status: c.status,
      })),
      txid,
      pix_copia_cola: pixPayload,
      pix_copia_e_cola: pixPayload,
      pix_qrcode_url: qrCodeUrl,
      qr_code_url: qrCodeUrl,
      infinitepay_url: infinitePayUrl,
      infinitepay_checkout_url: infinitePayUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro na rota de pagamento em lote:", error);
    return NextResponse.json(
      { error: "Falha ao processar solicitação de pagamento: " + message },
      { status: 500 }
    );
  }
}
