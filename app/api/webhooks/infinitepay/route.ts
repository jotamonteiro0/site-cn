import { NextRequest, NextResponse } from "next/server.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

/**
 * Validação segura de assinatura e token do Webhook (prevenção contra Timing Attacks)
 */
function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  authHeader: string | null,
  tokenQuery: string | null,
  configuredSecret: string
): boolean {
  if (!configuredSecret) return false;

  // 1. Verificação via Query Parameter (?token=...)
  if (tokenQuery && tokenQuery.length === configuredSecret.length) {
    if (crypto.timingSafeEqual(Buffer.from(tokenQuery), Buffer.from(configuredSecret))) {
      return true;
    }
  }

  // 2. Verificação via Bearer Token (Authorization: Bearer <secret>)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.length === configuredSecret.length) {
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(configuredSecret))) {
        return true;
      }
    }
  }

  // 3. Verificação direta de Secret Header (x-webhook-secret ou x-infinitepay-signature)
  if (signatureHeader && signatureHeader.length === configuredSecret.length) {
    if (crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(configuredSecret))) {
      return true;
    }
  }

  // 4. Verificação de Assinatura HMAC-SHA256 (caso configurado com HMAC)
  if (signatureHeader) {
    const computedHmac = crypto.createHmac("sha256", configuredSecret).update(rawBody).digest("hex");
    if (signatureHeader.length === computedHmac.length) {
      if (crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(computedHmac))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Estrutura do payload enviada pelo Checkout Integrado da InfinitePay
 * Documentação oficial: order_nsu, transaction_nsu, slug, paid, amount, capture_method, event
 */
export interface InfinitePayWebhookPayload {
  event?: string;
  type?: string;
  status?: string;
  id?: string | number;
  transaction_id?: string;
  order_nsu?: string;
  transaction_nsu?: string;
  slug?: string;
  paid?: boolean;
  amount?: number;
  paid_amount?: number;
  capture_method?: string;
  handle?: string;
  data?: {
    id?: string;
    transaction_id?: string;
    transaction_nsu?: string;
    order_nsu?: string;
    status?: string;
    paid?: boolean;
    external_reference?: string;
    order_nfe_id?: string;
    amount?: number;
    paid_amount?: number;
    capture_method?: string;
    metadata?: {
      charge_id?: string;
      member_cid?: string;
    };
  };
  transaction?: {
    id?: string;
    transaction_id?: string;
    transaction_nsu?: string;
    order_nsu?: string;
    status?: string;
    paid?: boolean;
    external_reference?: string;
    order_nfe_id?: string;
    amount?: number;
    capture_method?: string;
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

/**
 * Handler central do webhook, permitindo injeção de dependência para testes isolados
 */
export async function handleInfinitePayWebhook(
  req: NextRequest,
  injectedSupabase?: SupabaseClient
) {
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
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-webhook-secret");
    const authHeader = req.headers.get("authorization");
    const tokenQuery = req.nextUrl?.searchParams?.get("token") || null;
    const configuredSecret = process.env.INFINITEPAY_WEBHOOK_SECRET;

    // 1. VERIFICAÇÃO DE AUTENTICIDADE E ASSINATURA
    if (configuredSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature, authHeader, tokenQuery, configuredSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: "Assinatura ou token do webhook inválido" },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("ALERTA CRÍTICO: INFINITEPAY_WEBHOOK_SECRET não configurado em ambiente de produção.");
      return NextResponse.json(
        { error: "Configuração de segurança do webhook pendente no servidor" },
        { status: 500 }
      );
    }

    // Instancia o cliente Supabase (usando injeção de teste se fornecida)
    let supabase: SupabaseClient;
    if (injectedSupabase) {
      supabase = injectedSupabase;
    } else {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
      }

      supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    // 2. PARSE DOS CAMPOS OFICIAIS DO CHECKOUT INFINITEPAY
    const eventType = String(payload.event || payload.type || payload.status || "").toLowerCase();
    const transaction = payload.data || payload.transaction || payload;
    const txStatus = String(transaction.status || payload.status || "").toLowerCase();

    // Mapeamento de campos canônicos da InfinitePay (order_nsu / transaction_nsu)
    const transactionId = String(
      payload.transaction_nsu ||
      transaction.transaction_nsu ||
      transaction.id ||
      transaction.transaction_id ||
      payload.id ||
      ""
    ).trim();

    const chargeId =
      payload.order_nsu ||
      transaction.order_nsu ||
      transaction.external_reference ||
      transaction.metadata?.charge_id ||
      transaction.order_nfe_id;

    const payerCid = transaction.metadata?.member_cid;

    // 3. CHECAGEM DE IDEMPOTÊNCIA POR ID DA TRANSAÇÃO INFINITEPAY
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

    // 4. TRATAMENTO DE EVENTOS DE FALHA OU CANCELAMENTO
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

    // 5. TRATAMENTO DE PAGAMENTO CONFIRMADO
    const isPaid =
      payload.paid === true ||
      transaction.paid === true ||
      eventType === "paid" ||
      eventType === "transaction_paid" ||
      eventType === "settled" ||
      eventType === "invoice.paid" ||
      txStatus === "paid" ||
      txStatus === "approved";

    if (isPaid) {
      // 5.1 VERIFICAÇÃO REVERSA OFICIAL (Reverse Check via API InfinitePay)
      // Se houver chave de API configurada, valida diretamente com o endpoint oficial
      const apiKey = process.env.INFINITEPAY_API_KEY;
      if (apiKey && transactionId) {
        try {
          const verifyRes = await fetch("https://api.checkout.infinitepay.io/payment_check", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": apiKey,
            },
            body: JSON.stringify({
              handle: payload.handle || process.env.INFINITEPAY_HANDLE,
              order_nsu: chargeId,
              transaction_nsu: transactionId,
              slug: payload.slug,
            }),
          });

          if (verifyRes.ok) {
            const checkData = (await verifyRes.json()) as { paid?: boolean };
            if (checkData.paid === false) {
              return NextResponse.json(
                { error: "Verificação reversa rejeitou confirmação do pagamento" },
                { status: 400 }
              );
            }
          }
        } catch (checkErr) {
          console.warn("Aviso na chamada payment_check da InfinitePay:", checkErr);
        }
      }

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

      // IDEMPOTÊNCIA: Se a cobrança já estiver confirmada, não duplica
      if (targetCharge.status === "confirmado") {
        return NextResponse.json({
          success: true,
          message: "Cobrança já se encontra confirmada",
          charge_id: targetCharge.id,
          idempotent: true,
        });
      }

      const now = new Date().toISOString();
      const method = payload.capture_method || transaction.capture_method || "infinitepay";

      // Atualiza a cobrança para confirmada
      const { error: updateError } = await supabase
        .from("member_charges")
        .update({
          status: "confirmado",
          paid_at: now,
          infinitepay_transaction_id: transactionId || null,
          payment_method: method,
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

// Endpoint padrão POST do Next.js
export async function POST(req: NextRequest) {
  return handleInfinitePayWebhook(req);
}
