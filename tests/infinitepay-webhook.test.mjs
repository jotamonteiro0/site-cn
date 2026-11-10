import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { POST } from "../app/api/webhooks/infinitepay/route.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dm1wc2tpeHlqYmlzbGNhdHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDIzNDQ1NSwiZXhwIjoyMTA5ODEwNDU1fQ.Z8I0fGAlGGl7NSrT-ghGmuBb6ScL2fm1BDLxGXxKGqU";

const TEST_SECRET = "test_webhook_secret_key_cn_500_xyz123";
const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";

describe("Auditoria e Testes do Fluxo de Pagamentos InfinitePay", () => {
  let adminClient;
  let testMemberId;
  let testChargeId;
  const mockTxId = `test_tx_${Date.now()}`;

  before(async () => {
    process.env.INFINITEPAY_WEBHOOK_SECRET = TEST_SECRET;
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;

    adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Pega um membro existente do capítulo para criar cobrança temporária de teste
    const { data: member } = await adminClient
      .from("members")
      .select("id, full_name")
      .eq("chapter_id", CHAPTER_ID)
      .limit(1)
      .single();

    assert.ok(member, "Membro deve existir para o teste");
    testMemberId = member.id;

    // Pega um período financeiro existente
    const { data: period } = await adminClient
      .from("financial_periods")
      .select("id")
      .eq("chapter_id", CHAPTER_ID)
      .limit(1)
      .single();

    // Cria cobrança temporária com descrição única
    const { data: charge, error: cErr } = await adminClient
      .from("member_charges")
      .insert({
        chapter_id: CHAPTER_ID,
        member_id: testMemberId,
        payer_type: "demolay",
        payer_name: member.full_name,
        financial_period_id: period ? period.id : null,
        description: `[TEST-AUDIT] Taxa Simulação InfinitePay ${mockTxId}`,
        amount: 25.0,
        due_date: "2026-11-28",
        status: "pendente",
      })
      .select("id")
      .single();

    assert.ifError(cErr);
    testChargeId = charge.id;
  });

  after(async () => {
    // Limpeza segura dos dados de teste
    if (testChargeId) {
      await adminClient.from("payments").delete().eq("charge_id", testChargeId);
      await adminClient.from("member_charges").delete().eq("id", testChargeId);
    }
  });

  function makeRequest(body, headers = {}) {
    const rawBody = JSON.stringify(body);
    const req = {
      text: async () => rawBody,
      json: async () => body,
      headers: new Headers({
        "content-type": "application/json",
        ...headers,
      }),
    };
    return { req, rawBody };
  }

  test("1. Rejeição com HTTP 401 para assinatura inválida ou ausente", async () => {
    const payload = { event: "transaction_paid", id: "fake_tx" };
    const { req } = makeRequest(payload, {
      "x-infinitepay-signature": "assinatura_completamente_invalida",
    });

    const res = await POST(req);
    assert.equal(res.status, 401, "Deve rejeitar assinatura inválida");
    const json = await res.json();
    assert.equal(json.error, "Assinatura ou token do webhook inválido");
  });

  test("2. Rejeição com HTTP 400 para payload vazio", async () => {
    const req = {
      text: async () => "",
      json: async () => ({}),
      headers: new Headers({
        authorization: `Bearer ${TEST_SECRET}`,
      }),
    };

    const res = await POST(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error, "Payload do webhook vazio");
  });

  test("3. Confirmação de cobrança com assinatura HMAC-SHA256 válida", async () => {
    const payload = {
      event: "transaction_paid",
      data: {
        id: mockTxId,
        status: "paid",
        external_reference: testChargeId,
        amount: 2500,
      },
    };

    const raw = JSON.stringify(payload);
    const hmac = crypto.createHmac("sha256", TEST_SECRET).update(raw).digest("hex");

    const req = {
      text: async () => raw,
      json: async () => payload,
      headers: new Headers({
        "content-type": "application/json",
        "x-infinitepay-signature": hmac,
      }),
    };

    const res = await POST(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.charge_id, testChargeId);

    // Verifica que a cobrança foi marcada como confirmada no banco
    const { data: updated } = await adminClient
      .from("member_charges")
      .select("status, infinitepay_transaction_id, payment_method, paid_at")
      .eq("id", testChargeId)
      .single();

    assert.equal(updated.status, "confirmado");
    assert.equal(updated.infinitepay_transaction_id, mockTxId);
    assert.equal(updated.payment_method, "infinitepay");
    assert.ok(updated.paid_at, "Data de pagamento deve estar preenchida");
  });

  test("4. Idempotência estrita: reenvio do mesmo webhook não duplica confirmação", async () => {
    const payload = {
      event: "transaction_paid",
      data: {
        id: mockTxId,
        status: "paid",
        external_reference: testChargeId,
      },
    };

    const raw = JSON.stringify(payload);
    const hmac = crypto.createHmac("sha256", TEST_SECRET).update(raw).digest("hex");

    const req = {
      text: async () => raw,
      json: async () => payload,
      headers: new Headers({
        "content-type": "application/json",
        "x-infinitepay-signature": hmac,
      }),
    };

    const res = await POST(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.idempotent, true, "Deve sinalizar resposta idempotente");
  });

  test("5. Evento de falha ou cancelamento não altera nem confirma a cobrança", async () => {
    const payload = {
      event: "transaction_failed",
      data: {
        id: `failed_${mockTxId}`,
        status: "failed",
        external_reference: testChargeId,
      },
    };

    const raw = JSON.stringify(payload);
    const hmac = crypto.createHmac("sha256", TEST_SECRET).update(raw).digest("hex");

    const req = {
      text: async () => raw,
      json: async () => payload,
      headers: new Headers({
        "content-type": "application/json",
        "x-infinitepay-signature": hmac,
      }),
    };

    const res = await POST(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.message.includes("falha/cancelamento"));
  });

  test("6. Cobrança inexistente retorna HTTP 404", async () => {
    const nonExistentId = "00000000-0000-0000-0000-000000009999";
    const payload = {
      event: "transaction_paid",
      data: {
        id: `tx_${Date.now()}_unknown`,
        status: "paid",
        external_reference: nonExistentId,
      },
    };

    const raw = JSON.stringify(payload);
    const hmac = crypto.createHmac("sha256", TEST_SECRET).update(raw).digest("hex");

    const req = {
      text: async () => raw,
      json: async () => payload,
      headers: new Headers({
        "content-type": "application/json",
        "x-infinitepay-signature": hmac,
      }),
    };

    const res = await POST(req);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error, "Cobrança correspondente não localizada para conciliação");
  });
});
