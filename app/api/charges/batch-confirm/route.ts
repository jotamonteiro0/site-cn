import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getCallerUser(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const authHeader = request.headers.get("authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const admin = getAdminClient();
    const { data } = await admin.auth.getUser(token);
    if (data?.user) return data.user;
  }

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
    const { data } = await ssrClient.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

/**
 * POST /api/charges/batch-confirm
 * Confirmação manual em lote de mensalidades recebidas pelo Tesoureiro ou Master.
 */
export async function POST(request: Request) {
  try {
    const user = await getCallerUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Acesso não autorizado: autenticação obrigatória." },
        { status: 401 }
      );
    }

    const admin = getAdminClient();

    // Verificação de permissões RBAC: Tesoureiro, Master ou Mantenedores Permanentes
    const isPermanentMaster =
      user.user_metadata?.id_demolay === "127738" ||
      user.user_metadata?.id_demolay === "102836" ||
      user.email === "joaomonteiro0@icloud.com" ||
      user.email === "airton@carvalhoneves500.org.br";

    let hasPermission = isPermanentMaster;

    if (!hasPermission) {
      const { data: membership } = await admin
        .from("chapter_memberships")
        .select("role_code")
        .eq("chapter_id", CHAPTER_ID)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (membership && ["master", "tesoureiro"].includes(membership.role_code)) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Permissão restrita: Apenas o Tesoureiro e o Mestre Conselheiro podem dar baixa em pagamentos." },
        { status: 403 }
      );
    }

    const { charge_ids, payment_method, notes } = await request.json();

    if (!Array.isArray(charge_ids) || charge_ids.length === 0) {
      return NextResponse.json(
        { error: "Selecione pelo menos uma mensalidade para confirmar a baixa." },
        { status: 400 }
      );
    }

    const uniqueChargeIds = Array.from(new Set(charge_ids));

    // Busca as cobranças diretamente no PostgreSQL para recálculo seguro e validação de estado
    const { data: charges, error: fetchErr } = await admin
      .from("member_charges")
      .select("id, chapter_id, member_id, payer_name, payer_type, description, amount, status, due_date")
      .in("id", uniqueChargeIds);

    if (fetchErr || !charges || charges.length === 0) {
      return NextResponse.json({ error: "Cobranças não localizadas." }, { status: 404 });
    }

    if (charges.length !== uniqueChargeIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais cobranças selecionadas não foram encontradas no sistema." },
        { status: 400 }
      );
    }

    // Regra anti-duplicidade: Verifica se alguma cobrança já está quitada
    const alreadyConfirmed = charges.filter((c) => c.status === "confirmado");
    if (alreadyConfirmed.length > 0) {
      return NextResponse.json(
        {
          error: `As seguintes mensalidades já constam como baixadas anteriormente: ${alreadyConfirmed
            .map((c) => `${c.payer_name} (${c.description})`)
            .join("; ")}. Nenhuma baixa duplicada foi realizada.`,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const effectiveMethod = payment_method || "baixa_manual";
    const totalAmount = charges.reduce((acc, c) => acc + Number(c.amount || 0), 0);
    const roundedTotal = Math.round(totalAmount * 100) / 100;
    const batchTxId = `TX-BATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Atualiza as cobranças em lote de forma atômica
    const { error: updateErr } = await admin
      .from("member_charges")
      .update({
        status: "confirmado",
        paid_at: now,
        payment_method: effectiveMethod,
        infinitepay_transaction_id: batchTxId,
      })
      .in("id", uniqueChargeIds);

    if (updateErr) {
      console.error("Erro ao atualizar cobranças em lote:", updateErr);
      return NextResponse.json(
        { error: "Falha ao gravar confirmação das cobranças: " + updateErr.message },
        { status: 500 }
      );
    }

    // Registra auditoria contábil na tabela payments para cada mensalidade confirmada
    const paymentInserts = charges.map((c) => ({
      chapter_id: c.chapter_id || CHAPTER_ID,
      charge_id: c.id,
      amount: c.amount,
      status: "confirmado",
      payment_method: effectiveMethod,
      external_reference: batchTxId,
      notes: notes || `Baixa em lote realizada por ${user.email || user.id}`,
      paid_at: now,
      confirmed_at: now,
    }));

    try {
      await admin.from("payments").insert(paymentInserts);
    } catch (payErr) {
      console.warn("Aviso ao registrar auditoria em payments:", payErr);
    }

    return NextResponse.json({
      success: true,
      message: `${charges.length} mensalidade(s) baixada(s) com sucesso! Total consolidado: R$ ${roundedTotal
        .toFixed(2)
        .replace(".", ",")}`,
      count: charges.length,
      total_amount: roundedTotal,
      batch_txid: batchTxId,
      confirmed_ids: uniqueChargeIds,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro em POST /api/charges/batch-confirm:", error);
    return NextResponse.json(
      { error: "Falha ao processar confirmação em lote: " + message },
      { status: 500 }
    );
  }
}
