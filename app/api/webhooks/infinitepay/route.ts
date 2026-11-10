import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Webhook para conciliação automática de pagamentos da InfinitePay
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Verificação de segurança (Webhook Secret ou Token se configurado)
    const secret = req.headers.get("x-infinitepay-signature") || req.headers.get("authorization");
    const configuredSecret = process.env.INFINITEPAY_WEBHOOK_SECRET;

    if (configuredSecret && secret && !secret.includes(configuredSecret)) {
      return NextResponse.json({ error: "Assinatura do webhook inválida" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Identifica o evento da InfinitePay
    // Suporta formatos padrão da InfinitePay (transaction_paid, invoice.paid, etc.)
    const eventType = payload.event || payload.type || payload.status;
    const transaction = payload.data || payload.transaction || payload;
    const chargeId = transaction.external_reference || transaction.metadata?.charge_id || transaction.order_nfe_id;
    const payerCid = transaction.metadata?.member_cid;

    const isPaid = 
      eventType === "transaction_paid" || 
      eventType === "paid" || 
      transaction.status === "paid" || 
      transaction.status === "approved" ||
      payload.status === "paid";

    if (isPaid) {
      if (chargeId) {
        // 1. Atualização direta pelo ID da cobrança
        const { error } = await supabase
          .from("member_charges")
          .update({
            status: "confirmado",
            paid_at: new Date().toISOString(),
            infinitepay_transaction_id: String(transaction.id || transaction.transaction_id || ""),
            payment_method: "infinitepay"
          })
          .eq("id", chargeId);

        if (error) {
          console.error("Erro ao atualizar cobrança via webhook:", error);
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      } else if (payerCid) {
        // 2. Localização por ID DeMolay / CID para a mensalidade pendente mais antiga
        const { data: member } = await supabase
          .from("members")
          .select("id")
          .eq("cid", payerCid)
          .maybeSingle();

        if (member) {
          const { data: pendingCharge } = await supabase
            .from("member_charges")
            .select("id")
            .eq("member_id", member.id)
            .eq("status", "pendente")
            .order("due_date", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (pendingCharge) {
            await supabase
              .from("member_charges")
              .update({
                status: "confirmado",
                paid_at: new Date().toISOString(),
                infinitepay_transaction_id: String(transaction.id || ""),
                payment_method: "infinitepay"
              })
              .eq("id", pendingCharge.id);
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processado com sucesso" });
  } catch (err: any) {
    console.error("Erro interno no webhook InfinitePay:", err);
    return NextResponse.json({ error: err.message || "Erro desconhecido" }, { status: 500 });
  }
}
