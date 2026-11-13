import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id } = body;

    if (!member_id) {
      return NextResponse.json(
        { error: "Identificador do membro é obrigatório." },
        { status: 400 }
      );
    }

    if (!SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Configuração do servidor incompleta (SERVICE_ROLE_KEY ausente)." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";

    // 0. Autenticação e Autorização Estrita (Apenas Master ou Escrivão do Capítulo 500)
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
        const ssrClient = createServerClient(SUPABASE_URL, anonKey, {
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

    const isPermanentMaster =
      callerUser.user_metadata?.id_demolay === "127738" ||
      callerUser.user_metadata?.id_demolay === "102836" ||
      callerUser.email === "joaomonteiro0@icloud.com" ||
      callerUser.email === "airton@carvalhoneves500.org.br";

    let isAuthorized = isPermanentMaster;

    if (!isAuthorized) {
      const { data: membership } = await supabaseAdmin
        .from("chapter_memberships")
        .select("role_code")
        .eq("chapter_id", CHAPTER_ID)
        .eq("user_id", callerUser.id)
        .eq("is_active", true)
        .maybeSingle();

      if (membership && (membership.role_code === "master" || membership.role_code === "escrivao")) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Permissão negada: apenas Mestre Conselheiro ou Escrivão podem emitir credenciais de primeiro acesso." },
        { status: 403 }
      );
    }

    // 1. Localiza o membro no Capítulo 500
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("members")
      .select("id, id_demolay, full_name, email")
      .eq("chapter_id", CHAPTER_ID)
      .eq("id", member_id)
      .single();

    if (memberErr || !member) {
      return NextResponse.json(
        { error: "Membro não encontrado no Capítulo 500." },
        { status: 404 }
      );
    }

    // 2. Geração de Token Criptograficamente Seguro com Entropia >= 128 bits
    // 16 bytes = 128 bits de entropia gerados via CSPRNG (crypto.randomBytes)
    const entropyBytes = crypto.randomBytes(16);
    const hex128 = entropyBytes.toString("hex").toUpperCase(); // 32 caracteres hexadecimais
    const rawToken = `CN-ACT-${hex128}`;

    // 3. Cálculo do Hash SHA-256 do Token
    // ARMAZENAMENTO SEGURO: Apenas o hash SHA-256 é armazenado no banco de dados!
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias de validade

    // Invalida tokens anteriores pendentes do mesmo membro para evitar acúmulo
    await supabaseAdmin
      .from("issued_declarations")
      .delete()
      .eq("chapter_id", CHAPTER_ID)
      .eq("member_id", member.id)
      .eq("declaration_type", "frequencia");

    // 4. Insere o hash do token com controle de tentativas e expiração
    const { error: insertErr } = await supabaseAdmin
      .from("issued_declarations")
      .insert({
        chapter_id: CHAPTER_ID,
        member_id: member.id,
        declaration_type: "frequencia",
        verification_code: tokenHash, // Armazena apenas o HASH
        content_data: {
          action: "activation_token",
          activation_state: "PENDING",
          member_id: member.id,
          token_hash: tokenHash,
          id_demolay: member.id_demolay,
          expires_at: expiresAt,
          is_used: false,
          attempts: 0,
          max_attempts: 5,
          created_at: new Date().toISOString(),
        },
      });

    if (insertErr) {
      console.error("Erro ao registrar token de ativação:", insertErr);
      return NextResponse.json(
        { error: "Erro ao gerar token no banco de dados." },
        { status: 500 }
      );
    }

    // 5. Registra log de auditoria da emissão do token (sem expor o token raw)
    try {
      await supabaseAdmin.from("issued_declarations").insert({
        chapter_id: CHAPTER_ID,
        member_id: member.id,
        declaration_type: "frequencia",
        verification_code: "AUDIT-GEN-" + crypto.randomBytes(4).toString("hex").toUpperCase(),
        content_data: {
          action: "audit_activation_token_generated",
          member_id: member.id,
          id_demolay: member.id_demolay,
          token_hash: tokenHash,
          token_prefix: `CN-ACT-${hex128.substring(0, 4)}***`,
          expires_at: expiresAt,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn("Aviso ao registrar log de auditoria de token:", auditErr);
    }

    // O token em texto claro (rawToken) é retornado apenas nesta resposta para entrega ao membro
    return NextResponse.json({
      success: true,
      token: rawToken,
      expires_at: expiresAt,
      member_name: member.full_name,
      id_demolay: member.id_demolay,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Erro na rota de geração de token:", err);
    return NextResponse.json(
      { error: "Falha interna ao gerar token de primeiro acesso: " + msg },
      { status: 500 }
    );
  }
}
