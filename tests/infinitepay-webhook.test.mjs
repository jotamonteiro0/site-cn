import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { handleInfinitePayWebhook } from "../app/api/webhooks/infinitepay/route.ts";

const TEST_SECRET = "test_webhook_secret_key_cn_500_xyz123";
const TEST_CHARGE_ID = "00000000-0000-0000-0000-000000009999";
const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";

describe("Auditoria e Testes do Fluxo de Pagamentos InfinitePay (Ambiente Seguro Mockado)", () => {
  let mockCharges;
  let mockPayments;
  let mockClient;

  before(() => {
    process.env.INFINITEPAY_WEBHOOK_SECRET = TEST_SECRET;

    // Base de dados em memória isolada (Zero impacto na base de produção)
    mockCharges = new Map([
      [
        TEST_CHARGE_ID,
        {
          id: TEST_CHARGE_ID,
          chapter_id: CHAPTER_ID,
          amount: 25.0,
          status: "pendente",
          infinitepay_transaction_id: null,
          paid_at: null,
          payment_method: null,
        },
      ],
    ]);
    mockPayments = [];

    // Mock do cliente Supabase para testes isolados
    mockClient = {
      from: (table) => {
        if (table === "member_charges") {
          return {
            select: () => ({
              eq: (col, val) => ({
                maybeSingle: async () => {
                  if (col === "infinitepay_transaction_id") {
                    for (const c of mockCharges.values()) {
                      if (c.infinitepay_transaction_id === val) return { data: c, error: null };
                    }
                    return { data: null, error: null };
                  }
                  if (col === "id") {
                    return { data: mockCharges.get(val) || null, error: null };
                  }
                  return { data: null, error: null };
                },
              }),
            }),
            update: (updates) => ({
              eq: (col, val) => {
                if (col === "id" && mockCharges.has(val)) {
                  const existing = mockCharges.get(val);
                  Object.assign(existing, updates);
                  return { error: null };
                }
                return { error: { message: "Registro não encontrado" } };
              },
            }),
          };
        }
        if (table === "payments") {
          return {
            insert: async (payment) => {
              mockPayments.push(payment);
              return { error: null };
            },
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      },
    };
  });

  function makeRequest(body, headers = {}, url = "https://site-cn.vercel.app/api/webhooks/infinitepay") {
    const rawBody = typeof body === "string" ? body : JSON.stringify(body);
    const parsedUrl = new URL(url);
    const req = {
      text: async () => rawBody,
      nextUrl: parsedUrl,
      headers: new Headers({
        "content-type": "application/json",
        ...headers,
      }),
    };
    return { req, rawBody };
  }

  test("1. Rejeição com HTTP 401 para assinatura inválida ou ausente", async () => {
    const payload = { event: "paid", order_nsu: TEST_CHARGE_ID };
    const { req } = makeRequest(payload, {
      "x-infinitepay-signature": "assinatura_completamente_invalida",
    });

    const res = await handleInfinitePayWebhook(req, mockClient);
    assert.equal(res.status, 401, "Deve rejeitar assinatura inválida");
    const json = await res.json();
    assert.equal(json.error, "Assinatura ou token do webhook inválido");
  });

  test("2. Rejeição com HTTP 400 para payload vazio", async () => {
    const { req } = makeRequest("", {
      authorization: `Bearer ${TEST_SECRET}`,
    });

    const res = await handleInfinitePayWebhook(req, mockClient);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error, "Payload do webhook vazio");
  });

  test("3. Confirmação com formato oficial InfinitePay (order_nsu + transaction_nsu + paid)", async () => {
    const txNsu = `infinitepay_nsu_${Date.now()}`;
    const payload = {
      event: "paid",
      order_nsu: TEST_CHARGE_ID,
      transaction_nsu: txNsu,
      paid: true,
      amount: 2500, // em centavos
      capture_method: "pix",
    };

    const raw = JSON.stringify(payload);
    const hmac = crypto.createHmac("sha256", TEST_SECRET).update(raw).digest("hex");

    const { req } = makeRequest(payload, {
      "x-infinitepay-signature": hmac,
    });

    const res = await handleInfinitePayWebhook(req, mockClient);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.charge_id, TEST_CHARGE_ID);

    // Valida que a cobrança foi confirmada na base em memória
    const charge = mockCharges.get(TEST_CHARGE_ID);
    assert.equal(charge.status, "confirmado");
    assert.equal(charge.infinitepay_transaction_id, txNsu);
    assert.equal(charge.payment_method, "pix");
    assert.ok(charge.paid_at);

    // Valida que o pagamento foi registrado para auditoria
    assert.equal(mockPayments.length, 1);
    assert.equal(mockPayments[0].charge_id, TEST_CHARGE_ID);
    assert.equal(mockPayments[0].external_reference, txNsu);
  });

  test("4. Idempotência estrita: reenvio do mesmo webhook não duplica confirmação", async () => {
    const charge = mockCharges.get(TEST_CHARGE_ID);
    const payload = {
      event: "paid",
      order_nsu: TEST_CHARGE_ID,
      transaction_nsu: charge.infinitepay_transaction_id,
      paid: true,
    };

    const raw = JSON.stringify(payload);
    const hmac = crypto.createHmac("sha256", TEST_SECRET).update(raw).digest("hex");

    const { req } = makeRequest(payload, {
      "x-infinitepay-signature": hmac,
    });

    const res = await handleInfinitePayWebhook(req, mockClient);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.idempotent, true, "Deve responder como idempotente");
  });

  test("5. Autenticação via Query Parameter (?token=...) aceita com sucesso", async () => {
    const payload = {
      event: "payment_failed",
      order_nsu: TEST_CHARGE_ID,
      transaction_nsu: `failed_tx_${Date.now()}`,
    };

    const { req } = makeRequest(
      payload,
      {},
      `https://site-cn.vercel.app/api/webhooks/infinitepay?token=${TEST_SECRET}`
    );

    const res = await handleInfinitePayWebhook(req, mockClient);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.message.includes("falha/cancelamento"));
  });

  test("6. Cobrança inexistente retorna HTTP 404 sem inconsistências", async () => {
    const payload = {
      event: "paid",
      order_nsu: "00000000-0000-0000-0000-999999999999",
      transaction_nsu: `unknown_${Date.now()}`,
      paid: true,
    };

    const { req } = makeRequest(
      payload,
      {},
      `https://site-cn.vercel.app/api/webhooks/infinitepay?token=${TEST_SECRET}`
    );

    const res = await handleInfinitePayWebhook(req, mockClient);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error, "Cobrança correspondente não localizada para conciliação");
  });
});
