import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST /api/member/profile/password
 * Altera a senha do usuário autenticado de forma segura via GoTrue Auth.
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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

    const { data: { user }, error: authErr } = await ssrClient.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Sessão expirada ou não autorizada. Faça login novamente." },
        { status: 401 }
      );
    }

    const { new_password, confirm_password } = await request.json();

    if (!new_password || typeof new_password !== "string" || new_password.length < 8) {
      return NextResponse.json(
        { error: "A nova senha deve possuir pelo menos 8 caracteres." },
        { status: 400 }
      );
    }

    if (new_password !== confirm_password) {
      return NextResponse.json(
        { error: "A confirmação da senha não confere com a nova senha digitada." },
        { status: 400 }
      );
    }

    // Não permite ID DeMolay como senha (requisito de segurança)
    const idDemolay = user.user_metadata?.id_demolay;
    if (idDemolay && new_password.trim() === idDemolay.toString().trim()) {
      return NextResponse.json(
        { error: "Por motivos de segurança, sua senha não pode ser igual ao seu ID DeMolay." },
        { status: 400 }
      );
    }

    // Atualiza credencial via Admin GoTrue (senha é hashed internamente com bcrypt/argon2)
    const admin = getAdminClient();
    const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    if (updateErr) {
      return NextResponse.json(
        { error: "Erro ao atualizar credenciais: " + updateErr.message },
        { status: 400 }
      );
    }

    // Registra evento de auditoria
    try {
      await admin.from("security_events").insert({
        chapter_id: "00000000-0000-0000-0000-000000000500",
        user_id: user.id,
        event_type: "password_changed",
        ip_address: request.headers.get("x-forwarded-for") || "internal",
        user_agent: request.headers.get("user-agent") || "web",
      });
    } catch {
      // Evento de auditoria não bloqueia
    }

    return NextResponse.json({
      success: true,
      message: "Senha atualizada com sucesso!",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: "Falha ao processar troca de senha: " + message },
      { status: 500 }
    );
  }
}
