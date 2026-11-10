import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { cid, initialPassword, email, newPassword } = await request.json();

    const cleanCid = cid?.toString().trim();
    const cleanEmail = email?.toString().trim().toLowerCase();
    const cleanInitialPassword = initialPassword?.toString().trim();
    const cleanNewPassword = newPassword?.toString().trim();

    if (!cleanCid) {
      return NextResponse.json(
        { error: "Informe o número da sua ID oficial." },
        { status: 400 }
      );
    }

    // A primeira senha é a própria ID
    if (cleanInitialPassword !== cleanCid) {
      return NextResponse.json(
        { error: "A senha inicial de primeiro acesso deve ser exatamente a sua própria ID." },
        { status: 400 }
      );
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "Informe um endereço de e-mail válido para vincular à sua conta." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Configuração do servidor de autenticação incompleta." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";

    // 1. Localiza o membro na tabela do capítulo pelo CID
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("members")
      .select("id, cid, full_name, category, email, profile_id")
      .eq("chapter_id", CHAPTER_ID)
      .eq("cid", cleanCid)
      .maybeSingle();

    if (memberErr || !member) {
      return NextResponse.json(
        { error: "ID DeMolay não localizada no quadro de membros do Capítulo 500. Verifique o número digitado." },
        { status: 404 }
      );
    }

    // 2. Determina a permissão (RBAC) do membro com base na nominata da Gestão Ativa
    let assignedRole = "membro";

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
        for (const op of officerPos as any[]) {
          const posName = op.management_positions?.name;
          if (["Mestre Conselheiro", "Presidente do Conselho Consultivo", "PCC"].includes(posName)) {
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

    // 3. Procura ou cria o usuário no Supabase Auth
    let authUserId: string | null = member.profile_id || null;

    // Se o usuário ainda não tiver profile_id, verifica se já existe na auth por e-mail
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      authUserId = existingUser.id;
      // Atualiza senha se fornecida nova senha
      if (cleanNewPassword) {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: cleanNewPassword,
          email_confirm: true,
          user_metadata: {
            full_name: member.full_name,
            cid: member.cid,
          },
        });
      }
    } else {
      // Cria novo usuário no Supabase Auth
      const { data: newUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanNewPassword || cleanCid,
        email_confirm: true,
        user_metadata: {
          full_name: member.full_name,
          cid: member.cid,
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

    // 4. Atualiza email e profile_id no membro
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
        role_code: assignedRole,
        is_active: true,
      },
      { onConflict: "chapter_id,user_id" }
    );

    // 7. Se não forneceu nova senha direta, envia o link de redefinição / alteração de senha por e-mail
    let emailSent = false;
    if (!cleanNewPassword) {
      try {
        await supabaseAdmin.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/login`,
        });
        emailSent = true;
      } catch (err) {
        console.warn("Aviso ao enviar e-mail de redefinição:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: cleanNewPassword
        ? "Cadastro de e-mail e nova senha concluídos com sucesso! Você já pode entrar no sistema."
        : "E-mail cadastrado com sucesso! Foi enviado o procedimento para alteração da sua senha. Você também pode acessar com sua senha cadastrada.",
      emailSent,
      memberName: member.full_name,
      role: assignedRole,
    });
  } catch (error: any) {
    console.error("Erro no primeiro acesso:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro ao processar o primeiro acesso: " + (error?.message || "Erro desconhecido") },
      { status: 500 }
    );
  }
}
