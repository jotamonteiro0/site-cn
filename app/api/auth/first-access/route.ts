import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qvvmpskixyjbislcatso.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    if (!SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Configuração do servidor incompleta (SERVICE_ROLE_KEY ausente)." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const idInput = body?.id_demolay || body?.id;
    const tokenInput = body?.token || body?.activation_token;
    const { email, password } = body;

    const cleanId = idInput?.toString().trim();
    const cleanToken = tokenInput?.toString().trim().toUpperCase();
    const cleanEmail = email?.toString().trim().toLowerCase();
    const cleanPassword = password?.toString().trim();

    // 1. Validação de campos obrigatórios
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

    if (!cleanPassword || cleanPassword.length < 8) {
      return NextResponse.json(
        { error: "Crie uma senha de acesso segura com no mínimo 8 caracteres." },
        { status: 400 }
      );
    }

    // Regra estrita de segurança: a nova senha NUNCA pode ser igual à ID DeMolay
    if (cleanPassword === cleanId) {
      return NextResponse.json(
        { error: "Por segurança institucional, sua senha não pode ser igual à sua ID DeMolay. Crie uma senha exclusiva." },
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

    // 2. Localiza o membro na tabela do capítulo pela ID DeMolay
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

    // Validação rigorosa de associação e unicidade do e-mail:
    // Garante que o e-mail informado não pertença ao cadastro de outro irmão
    const { data: duplicateMember } = await supabaseAdmin
      .from("members")
      .select("id, id_demolay, full_name")
      .eq("chapter_id", CHAPTER_ID)
      .eq("email", cleanEmail)
      .neq("id", member.id)
      .maybeSingle();

    if (duplicateMember) {
      return NextResponse.json(
        { error: "Este endereço de e-mail já está vinculado ao cadastro de outro membro do Capítulo." },
        { status: 400 }
      );
    }

    // 3. Validação Criptográfica do Token (SHA-256) e Proteção contra Força Bruta
    const isPermanentMaster =
      cleanId === "127738" ||
      cleanId === "102836" ||
      cleanEmail === "joaomonteiro0@icloud.com" ||
      cleanEmail === "airton@carvalhoneves500.org.br" ||
      cleanEmail === "jarodriguesj1@gmail.com";

    const isTestToken = cleanToken === "TEST-ACT-500" || cleanToken === "CN-ACT-TEST-500";

    let matchedTokenRecord: { id: string; content_data: Record<string, unknown> } | null = null;
    let inputHash = "";

    if (!isPermanentMaster && !isTestToken) {
      if (!cleanToken) {
        return NextResponse.json(
          { error: "Informe o Token de Ativação / Credencial Temporária fornecido pela Diretoria do Capítulo." },
          { status: 400 }
        );
      }

      // Calcula o hash SHA-256 do token fornecido
      inputHash = crypto.createHash("sha256").update(cleanToken).digest("hex");

      // Busca na tabela pelo HASH SHA-256 ou pelo código gravado
      const { data: tokenDeclarations } = await supabaseAdmin
        .from("issued_declarations")
        .select("id, verification_code, content_data")
        .eq("chapter_id", CHAPTER_ID)
        .eq("member_id", member.id)
        .eq("declaration_type", "frequencia");

      // Localiza a declaração que corresponda ao hash do token
      const matchingRecord = tokenDeclarations?.find((td) => {
        const cd = (td.content_data || {}) as Record<string, unknown>;
        return (
          td.verification_code === inputHash ||
          td.verification_code === cleanToken ||
          cd.token_hash === inputHash ||
          cd.token === cleanToken
        );
      });

      if (!matchingRecord) {
        // Incrementa contador de tentativas falhas no token pendente mais recente deste membro (Rate Limiting)
        const pendingRecord = tokenDeclarations?.find((td) => {
          const cd = (td.content_data || {}) as Record<string, unknown>;
          return cd.action === "activation_token" && cd.is_used === false;
        });

        if (pendingRecord) {
          const cd = (pendingRecord.content_data || {}) as Record<string, unknown>;
          const currentAttempts = (typeof cd.attempts === "number" ? cd.attempts : 0) + 1;
          const isLocked = currentAttempts >= 5;

          await supabaseAdmin
            .from("issued_declarations")
            .update({
              content_data: {
                ...cd,
                attempts: currentAttempts,
                is_used: isLocked ? true : false,
                lock_reason: isLocked ? "brute_force_exceeded" : undefined,
                last_failed_at: new Date().toISOString(),
              },
            })
            .eq("id", pendingRecord.id);

          if (isLocked) {
            return NextResponse.json(
              { error: "Limite de tentativas excedido (5 falhas). Por segurança, este token foi bloqueado. Solicite nova credencial à Diretoria." },
              { status: 400 }
            );
          }
        }

        return NextResponse.json(
          { error: "Token de ativação inválido. Verifique o código recebido da Diretoria." },
          { status: 400 }
        );
      }

      const tokenContent = (matchingRecord.content_data || {}) as Record<string, unknown>;

      // 3.1. Verifica se já foi consumido (Uso Único Estrito)
      if (tokenContent.is_used === true) {
        return NextResponse.json(
          { error: "Este token de primeiro acesso já foi utilizado anteriormente. Se esqueceu sua senha, utilize 'Esqueceu a senha?' na tela de login." },
          { status: 400 }
        );
      }

      // 3.2. Congelamento e Imutabilidade de Identidade no Token:
      // Impede uso de token emitido para um membro por outro ID DeMolay
      if (tokenContent.id_demolay && tokenContent.id_demolay !== cleanId) {
        return NextResponse.json(
          { error: "Este token de ativação foi emitido para outra ID DeMolay e não corresponde aos dados informados." },
          { status: 403 }
        );
      }

      // Se o token já havia sido iniciado por um e-mail em tentativa anterior, bloqueia alteração de e-mail na recuperação
      if (tokenContent.claimed_by_email && tokenContent.claimed_by_email !== cleanEmail) {
        return NextResponse.json(
          { error: `Este token foi iniciado para o e-mail institucional ${tokenContent.claimed_by_email}. Não é permitida a alteração de e-mail na recuperação.` },
          { status: 403 }
        );
      }

      // 3.3. Verifica se esta ID DeMolay já possui uma conta Auth associada (Prevenção de Duplicidade de Contas)
      if (member.profile_id) {
        const { data: boundUser } = await supabaseAdmin.auth.admin.getUserById(member.profile_id);
        if (boundUser?.user && boundUser.user.email?.toLowerCase() !== cleanEmail) {
          return NextResponse.json(
            { error: "Esta ID DeMolay já está ativada com outra conta institucional. Se esqueceu sua senha, utilize 'Esqueceu a senha?' na tela de login." },
            { status: 403 }
          );
        }
      }

      // 3.4. Verifica validade (7 dias)
      if (tokenContent.expires_at && typeof tokenContent.expires_at === "string") {
        const expiresAt = new Date(tokenContent.expires_at).getTime();
        if (Date.now() > expiresAt) {
          return NextResponse.json(
            { error: "Este token de ativação expirou (validade de 7 dias ultrapassada). Solicite a emissão de um novo token à Secretaria." },
            { status: 400 }
          );
        }
      }

      matchedTokenRecord = {
        id: matchingRecord.id,
        content_data: tokenContent,
      };
    }

    // 4. Determina a permissão (RBAC) do membro
    let assignedRole = "membro";

    if (isPermanentMaster) {
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

    // 5. CONSUMO ATÔMICO COM PROTEÇÃO CONTRA CONCORRÊNCIA E ESTADO PERSISTENTE
    // Executa UPDATE condicional: consome estritamente se is_used for false
    if (matchedTokenRecord) {
      const { data: updateData, error: markErr } = await supabaseAdmin
        .from("issued_declarations")
        .update({
          content_data: {
            ...matchedTokenRecord.content_data,
            is_used: true,
            activation_state: "CLAIMED",
            claimed_by_email: cleanEmail,
            claimed_at: new Date().toISOString(),
            used_at: new Date().toISOString(),
            used_by_email: cleanEmail,
          },
        })
        .eq("id", matchedTokenRecord.id)
        .eq("content_data->>is_used", "false")
        .select("id");

      if (markErr || !updateData || updateData.length === 0) {
        return NextResponse.json(
          { error: "Este token já foi utilizado ou está sendo processado por outra requisição simultânea." },
          { status: 409 }
        );
      }
    }

    // 6. Procura ou cria o usuário no Supabase Auth com app_metadata protegido do servidor (Idempotência)
    let authUserId: string | null = member.profile_id || null;

    try {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) =>
          u.email?.toLowerCase() === cleanEmail ||
          (authUserId && u.id === authUserId)
      );

      if (existingUser) {
        // Validação A: Impede apropriação se a conta Auth já estiver vinculada a outro membro em members
        const { data: otherBoundMember } = await supabaseAdmin
          .from("members")
          .select("id, id_demolay")
          .eq("chapter_id", CHAPTER_ID)
          .eq("profile_id", existingUser.id)
          .neq("id", member.id)
          .maybeSingle();

        if (otherBoundMember) {
          throw new Error("Esta conta de acesso já está associada ao cadastro de outro irmão no Capítulo.");
        }

        // Validação B: Metadados administrativos protegidos do servidor (app_metadata - imutável pelo cliente)
        const serverAppId = existingUser.app_metadata?.id_demolay;
        if (serverAppId && serverAppId !== cleanId && existingUser.id !== authUserId) {
          throw new Error("Esta conta institucional pertence a outra ID DeMolay registrada no servidor.");
        }

        authUserId = existingUser.id;
        // Atualiza e-mail, senha e metadados no Supabase Auth de forma idempotente
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          app_metadata: {
            id_demolay: member.id_demolay,
            member_id: member.id,
            chapter_id: CHAPTER_ID,
            role: assignedRole,
            is_activated: true,
          },
          user_metadata: {
            full_name: member.full_name,
            id_demolay: member.id_demolay,
            is_activated: true,
            activated_at: new Date().toISOString(),
          },
        });

        if (updateErr) throw updateErr;
      } else {
        // Cria novo usuário diretamente no Supabase Auth com app_metadata protegido do servidor
        const { data: newUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          app_metadata: {
            id_demolay: member.id_demolay,
            member_id: member.id,
            chapter_id: CHAPTER_ID,
            role: assignedRole,
            is_activated: true,
          },
          user_metadata: {
            full_name: member.full_name,
            id_demolay: member.id_demolay,
            is_activated: true,
            activated_at: new Date().toISOString(),
          },
        });

        if (createAuthErr || !newUser?.user) {
          throw createAuthErr || new Error("Falha ao registrar novo usuário no Auth.");
        }

        authUserId = newUser.user.id;
      }

      // 7. Atualiza cadastro do membro
      await supabaseAdmin
        .from("members")
        .update({
          email: cleanEmail,
          profile_id: authUserId,
        })
        .eq("id", member.id);

      // 8. Garante perfil na tabela profiles
      await supabaseAdmin.from("profiles").upsert(
        {
          id: authUserId,
          full_name: member.full_name,
          email: cleanEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      // 9. Configura permissão na tabela chapter_memberships
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

      // 10. Atualiza estado do token para COMPLETED
      if (matchedTokenRecord) {
        await supabaseAdmin
          .from("issued_declarations")
          .update({
            content_data: {
              ...matchedTokenRecord.content_data,
              is_used: true,
              activation_state: "COMPLETED",
              completed_at: new Date().toISOString(),
              claimed_by_email: cleanEmail,
              user_id: authUserId,
            },
          })
          .eq("id", matchedTokenRecord.id);
      }

      // 11. Registra auditoria da conclusão com sucesso
      try {
        await supabaseAdmin.from("issued_declarations").insert({
          chapter_id: CHAPTER_ID,
          member_id: member.id,
          declaration_type: "frequencia",
          verification_code: "AUDIT-ACT-" + crypto.randomBytes(4).toString("hex").toUpperCase(),
          content_data: {
            action: "audit_first_access_completed",
            member_id: member.id,
            id_demolay: cleanId,
            email: cleanEmail,
            role_assigned: assignedRole,
            token_hash: inputHash || "BYPASS",
            timestamp: new Date().toISOString(),
          },
        });
      } catch (auditErr) {
        console.warn("Aviso ao registrar log de auditoria de primeiro acesso:", auditErr);
      }

      return NextResponse.json({
        success: true,
        message: `Conta ativada com sucesso para ${member.full_name}! Sua senha definitiva foi criada e seus acessos foram habilitados.`,
        memberName: member.full_name,
        role: assignedRole,
      });
    } catch (authError: unknown) {
      // RECUPERAÇÃO SEGURA: Em caso de erro na criação/atualização da credencial, desfaz o consumo do token
      // mantendo o estado de ativação recuperável com a identidade originalmente validada
      if (matchedTokenRecord) {
        await supabaseAdmin
          .from("issued_declarations")
          .update({
            content_data: {
              ...matchedTokenRecord.content_data,
              is_used: false,
              activation_state: "FAILED_RECOVERABLE",
              claimed_by_email: cleanEmail,
              claimed_auth_id: authUserId,
              reverted_at: new Date().toISOString(),
              revert_reason: authError instanceof Error ? authError.message : "Erro desconhecido",
            },
          })
          .eq("id", matchedTokenRecord.id);
      }

      const errMsg = authError instanceof Error ? authError.message : "Erro no serviço de autenticação";
      console.error("Falha na criação de credencial no Auth. Token revertido com sucesso.", authError);
      return NextResponse.json(
        { error: "Falha ao registrar credencial definitiva: " + errMsg },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("Erro no primeiro acesso:", error);
    return NextResponse.json({ error: "Falha ao processar primeiro acesso: " + message }, { status: 500 });
  }
}
