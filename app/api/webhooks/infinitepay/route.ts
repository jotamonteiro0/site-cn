import { NextRequest, NextResponse } from "next/server.js";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

/**
 * Validação segura de assinatura e token do Webhook (prevenção contra Timing Attacks)
 */
function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  authHeader: string | null,
  configuredSecret: string
): boolean {
  if (!configuredSecret) return false;

  // 1. Verificação via Bearer Token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.length === configuredSecret.length) {
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(configuredSecret))) {
        return true;
      }
    }
  }

  if (!signatureHeader) return false;

  // 2. Verificação direta de Secret Header
  if (signatureHeader.length === configuredSecret.length) {
    if (crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(configuredSecret))) {
      return true;
    }
  }

  // 3. Verificação de Assinatura HMAC-SHA256
  const computedHmac = crypto.createHmac("sha256", configuredSecret).update(rawBody).digest("hex");
  if (signatureHeader.length === computedHmac.length) {
    if (crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(computedHmac))) {
      return true;
    }
  }

  return false;
}

interface InfinitePayWebhookPayload {
  event?: string;
  type?: string;
  status?: string;
  id?: string | number;
  transaction_id?: string;
  data?: {
    id?: string;
    transaction_id?: string;
    status?: string;
    external_reference?: string;
    order_nfe_id?: string;
    amount?: number;
    metadata?: {
      charge_id?: string;
      member_cid?: string;
    };
  };
  transaction?: {
    id?: string;
    transaction_id?: string;
    status?: string;
    external_reference?: string;
    order_nfe_id?: string;
    amount?: number;
    metadata?: {
      charge_id?: string;
      member_cid?: string;
    };
  };
  external_reference?: string;
  order_nfe_id?: string;
  metadata?: {
    charge_id?: string;
    member_cid?: string;
  };
}

// Webhook para conciliação automática de pagamentos da InfinitePay
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      return NextResponse.json({ error: "Payload do webhook vazio" }, { status: 400 });
    }

    let payload: InfinitePayWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as InfinitePayWebhookPayload;
    } catch {
      return NextResponse.json({ error: "JSON inválido no corpo da requisição" }, { status: 400 });
    }

    const signature =
      req.headers.get("x-infinitepay-signature") ||
      req.headers.get("x-signature") ||
      req.headers.get("x-webhook-signature");
    const authHeader = req.headers.get("authorization");
    const configuredSecret = process.env.INFINITEPAY_WEBHOOK_SECRET;

    // Verificação estrita de segurança
    if (configuredSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature, authHeader, configuredSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: "Assinatura ou token do webhook inválido" },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      // Em produção, a chave de assinatura é mandatória para impedir injeção de pagamentos falsos
      console.error("ALERTA CRÍTICO: INFINITEPAY_WEBHOOK_SECRET não configurado em ambiente de produção.");
      return NextResponse.json(
        { error: "Configuração de segurança do webhook pendente no servidor" },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Identificação dos dados do evento da InfinitePay
    const eventType = String(payload.event || payload.type || payload.status || "").toLowerCase();
    const transaction = payload.data || payload.transaction || payload;
    const txStatus = String(transaction.status || payload.status || "").toLowerCase();

    const transactionId = String(transaction.id || transaction.transaction_id || payload.id || "").trim();
    const chargeId = transaction.external_reference || transaction.metadata?.charge_id || transaction.order_nfe_id;
    const payerCid = transaction.metadata?.member_cid;

    // 1. CHECAGEM DE IDEMPOTÊNCIA POR ID DA TRANSAÇÃO
    if (transactionId) {
      const { data: alreadyProcessed } = await supabase
        .from("member_charges")
        .select("id, status, paid_at")
        .eq("infinitepay_transaction_id", transactionId)
        .maybeSingle();

      if (alreadyProcessed) {
        return NextResponse.json({
          success: true,
          message: "Transação já processada anteriormente (idempotência)",
          charge_id: alreadyProcessed.id,
          idempotent: true,
        });
      }
    }

    // 2. TRATAMENTO DE FALHA OU CANCELAMENTO
    const isFailed =
      eventType.includes("fail") ||
      eventType.includes("cancel") ||
      eventType.includes("denied") ||
      txStatus.includes("fail") ||
      txStatus.includes("cancel") ||
      txStatus.includes("denied");

    if (isFailed) {
      return NextResponse.json({
        success: true,
        message: "Evento de falha/cancelamento recebido e registrado sem confirmação financeira",
        event: eventType,
      });
    }

    // 3. TRATAMENTO DE PAGAMENTO CONFIRMADO
    const isPaid =
      eventType === "transaction_paid" ||
      eventType === "paid" ||
      eventType === "invoice.paid" ||
      txStatus === "paid" ||
      txStatus === "approved";

    if (isPaid) {
      let targetCharge: { id: string; chapter_id: string; amount: number; status: string } | null = null;

      if (chargeId) {
        const { data: charge } = await supabase
          .from("member_charges")
          .select("id, chapter_id, amount, status")
          .eq("id", chargeId)
          .maybeSingle();

        targetCharge = charge;
      } else if (payerCid) {
        const { data: member } = await supabase
          .from("members")
          .select("id")
          .eq("cid", payerCid)
          .maybeSingle();

        if (member) {
          const { data: pendingCharge } = await supabase
            .from("member_charges")
            .select("id, chapter_id, amount, status")
            .eq("member_id", member.id)
            .eq("status", "pendente")
            .order("due_date", { ascending: true })
            .limit(1)
            .maybeSingle();

          targetCharge = pendingCharge;
        }
      }

      if (!targetCharge) {
        return NextResponse.json(
          { error: "Cobrança correspondente não localizada para conciliação" },
          { status: 404 }
        );
      }

      // IDEMPOTÊNCIA: Se a cobrança já constar confirmada, não reprocessa
      if (targetCharge.status === "confirmado") {
        return NextResponse.json({
          success: true,
          message: "Cobrança já se encontra confirmada",
          charge_id: targetCharge.id,
          idempotent: true,
        });
      }

      const now = new Date().toISOString();

      // Atualiza a cobrança para confirmada
      const { error: updateError } = await supabase
        .from("member_charges")
        .update({
          status: "confirmado",
          paid_at: now,
          infinitepay_transaction_id: transactionId || null,
          payment_method: "infinitepay",
        })
        .eq("id", targetCharge.id);

      if (updateError) {
        console.error("Erro ao atualizar cobrança via webhook:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      // Registra a entrada na tabela de pagamentos institucionais para auditoria contábil
      try {
        await supabase.from("payments").insert({
          chapter_id: targetCharge.chapter_id,
          charge_id: targetCharge.id,
          amount: targetCharge.amount,
          status: "confirmado",
          external_reference: transactionId || null,
          paid_at: now,
          confirmed_at: now,
        });
      } catch (payErr) {
        // Log de aviso se falhar insert em payments, mas não quebra o webhook
        console.warn("Aviso ao registrar payment record:", payErr);
      }

      return NextResponse.json({
        success: true,
        message: "Cobrança conciliada com sucesso via InfinitePay",
        charge_id: targetCharge.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Evento recebido sem ação necessária",
      event: eventType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Erro interno no webhook InfinitePay:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
