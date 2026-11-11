import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Credenciais de backend com fallback para garantir funcionamento mesmo em novos ambientes
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dm1wc2tpeHlqYmlzbGNhdHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDIzNDQ1NSwiZXhwIjoyMTA5ODEwNDU1fQ.Z8I0fGAlGGl7NSrT-ghGmuBb6ScL2fm1BDLxGXxKGqU";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idInput = body?.id_demolay || body?.id;
    const { email, password } = body;

    const cleanId = idInput?.toString().trim();
    const cleanEmail = email?.toString().trim().toLowerCase();
    const cleanPassword = password?.toString().trim();

    if (!cleanId) {
      return NextResponse.json(
        { error: "Informe o número da sua ID DeMolay oficial." },
        { status: 400 }
      );
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "Informe um endereço de e-mail válido para vincular à sua conta." },
        { status: 400 }
      );
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return NextResponse.json(
        { error: "Crie uma senha de acesso com no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";

    // 1. Localiza o membro na tabela do capítulo pela ID DeMolay
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("members")
      .select("id, id_demolay, full_name, category, email, profile_id")
      .eq("chapter_id", CHAPTER_ID)
      .eq("id_demolay", cleanId)
      .maybeSingle();

    if (memberErr || !member) {
      return NextResponse.json(
        { error: "ID DeMolay não localizada no quadro de membros do Capítulo 500. Verifique o número digitado." },
        { status: 404 }
      );
    }

    // 2. Determina a permissão (RBAC) do membro
    let assignedRole = "membro";

    // Mantenedores e Administradores do Sistema com acesso Master permanente:
    // João Guilherme Martins Lopes Monteiro (ID 127738) e Airton (ID 102836)
    if (
      cleanId === "127738" ||
      cleanId === "102836" ||
      cleanEmail === "joaomonteiro0@icloud.com" ||
      cleanEmail === "airton@carvalhoneves500.org.br"
    ) {
      assignedRole = "master";
    } else {
      const { data: activeMgmt } = await supabaseAdmin
        .from("managements")
        .select("id")
        .eq("chapter_id", CHAPTER_ID)
        .eq("status", "ativa")
        .maybeSingle();

      if (activeMgmt) {
        const { data: officerPos } = await supabaseAdmin
          .from("member_management_positions")
          .select("management_positions(name)")
          .eq("member_id", member.id)
          .eq("management_positions.management_id", activeMgmt.id);

        if (officerPos && officerPos.length > 0) {
          for (const op of officerPos as unknown as Array<{ management_positions?: { name?: string } | null }>) {
            const posName = op.management_positions?.name;
            if (posName && ["Mestre Conselheiro", "Presidente do Conselho Consultivo", "PCC"].includes(posName)) {
              assignedRole = "master";
              break;
            } else if (posName === "Escrivão") {
              assignedRole = "escrivao";
            } else if (posName === "Tesoureiro") {
              assignedRole = "tesoureiro";
            }
          }
        }
      }
    }

    // 3. Procura ou cria o usuário no Supabase Auth
    let authUserId: string | null = member.profile_id || null;

    // Busca se já existe usuário cadastrado no Auth com esse e-mail ou profile_id
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) =>
        u.email?.toLowerCase() === cleanEmail ||
        (authUserId && u.id === authUserId)
    );

    if (existingUser) {
      authUserId = existingUser.id;
      // Atualiza o e-mail, senha e metadados no Supabase Auth
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          full_name: member.full_name,
          id_demolay: member.id_demolay,
        },
      });

      if (updateErr) {
        return NextResponse.json(
          { error: "Erro ao atualizar credenciais de acesso: " + updateErr.message },
          { status: 500 }
        );
      }
    } else {
      // Cria novo usuário diretamente no Supabase Auth com a senha escolhida
      const { data: newUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          full_name: member.full_name,
          id_demolay: member.id_demolay,
        },
      });

      if (createAuthErr || !newUser?.user) {
        return NextResponse.json(
          { error: "Erro ao criar credencial de autenticação: " + (createAuthErr?.message || "Tente novamente") },
          { status: 500 }
        );
      }

      authUserId = newUser.user.id;
    }

    // 4. Atualiza email e profile_id no cadastro do membro
    await supabaseAdmin
      .from("members")
      .update({
        email: cleanEmail,
        profile_id: authUserId,
      })
      .eq("id", member.id);

    // 5. Garante perfil na tabela profiles
    await supabaseAdmin.from("profiles").upsert(
      {
        id: authUserId,
        full_name: member.full_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // 6. Configura permissão na tabela chapter_memberships
    await supabaseAdmin.from("chapter_memberships").upsert(
      {
        chapter_id: CHAPTER_ID,
        user_id: authUserId,
        member_id: member.id,
        role_code: assignedRole,
        is_active: true,
      },
      { onConflict: "chapter_id,user_id" }
    );

    return NextResponse.json({
      success: true,
      message: `Conta ativada com sucesso para ${member.full_name}! Sua senha definitiva foi criada e seus acessos foram habilitados.`,
      memberName: member.full_name,
      role: assignedRole,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("Erro no primeiro acesso:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro ao processar o primeiro acesso: " + message },
      { status: 500 }
    );
  }
}
