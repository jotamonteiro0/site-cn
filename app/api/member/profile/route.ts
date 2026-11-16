import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getCallerUser(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const authHeader = request.headers.get("authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const admin = getAdminClient();
    const { data } = await admin.auth.getUser(token);
    if (data?.user) return data.user;
  }

  try {
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
    const { data } = await ssrClient.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

async function isMasterUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<boolean> {
  if (
    user.user_metadata?.id_demolay === "127738" ||
    user.user_metadata?.id_demolay === "102836" ||
    user.email === "joaomonteiro0@icloud.com" ||
    user.email === "airton@carvalhoneves500.org.br"
  ) {
    return true;
  }

  const admin = getAdminClient();
  const { data: membership } = await admin
    .from("chapter_memberships")
    .select("role_code")
    .eq("chapter_id", CHAPTER_ID)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return membership?.role_code === "master";
}

/**
 * GET /api/member/profile
 * Consulta o perfil completo do membro autenticado com todas as seções (A a K).
 */
export async function GET(request: Request) {
  try {
    const user = await getCallerUser(request);
    if (!user) {
      return NextResponse.json({ error: "Acesso não autorizado: autenticação obrigatória." }, { status: 401 });
    }

    const admin = getAdminClient();
    const isMaster = await isMasterUser(user);
    const { searchParams } = new URL(request.url);
    const targetMemberId = searchParams.get("member_id");

    let memberQuery = admin.from("members").select("*");

    if (targetMemberId && isMaster) {
      memberQuery = memberQuery.eq("id", targetMemberId);
    } else {
      // Busca o membro vinculado ao usuário autenticado por profile_id, id_demolay ou email
      memberQuery = memberQuery.or(
        `profile_id.eq.${user.id},id_demolay.eq.${user.user_metadata?.id_demolay || ""},email.eq.${user.email || ""}`
      );
    }

    const { data: member, error: memberErr } = await memberQuery.limit(1).maybeSingle();

    if (memberErr || !member) {
      return NextResponse.json(
        { error: "Registro de membro não localizado para a conta autenticada." },
        { status: 404 }
      );
    }

    // Busca dados complementares em paralelo:
    // - Histórico de cargos e gestões
    // - Participação no Conselho Consultivo
    // - Certificados de regularidade emitidos
    const [positionsRes, conselhoRes, declRes] = await Promise.all([
      admin
        .from("member_management_positions")
        .select(`
          id,
          position_code,
          position_name,
          management:managements (
            id,
            name,
            term,
            year
          )
        `)
        .eq("member_id", member.id),
      admin
        .from("conselho_membros")
        .select("id, role_name, sponsoring_lodge, is_active, joined_at")
        .eq("member_id", member.id)
        .maybeSingle(),
      admin
        .from("issued_declarations")
        .select("id, declaration_type, verification_code, valid_until, created_at, content_data")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      member,
      is_master: isMaster,
      positions: positionsRes.data || [],
      conselho: conselhoRes.data || null,
      declarations: declRes.data || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro em GET /api/member/profile:", error);
    return NextResponse.json({ error: "Falha ao carregar perfil: " + message }, { status: 500 });
  }
}

/**
 * PUT /api/member/profile
 * Atualização dos dados do perfil pelo próprio membro ou pelo Master.
 * Regra fundamental: Nome completo, ID DeMolay e Data de nascimento (uma vez preenchida)
 * são ESTRITAMENTE IMUTÁVEIS pelo próprio membro.
 */
export async function PUT(request: Request) {
  try {
    const user = await getCallerUser(request);
    if (!user) {
      return NextResponse.json({ error: "Acesso não autorizado: autenticação obrigatória." }, { status: 401 });
    }

    const body = await request.json();
    const admin = getAdminClient();
    const isMaster = await isMasterUser(user);

    // Identifica o membro atual no banco de dados
    const targetMemberId = body.id || body.member_id;
    let memberInDb = null;

    if (targetMemberId && isMaster) {
      const { data } = await admin.from("members").select("*").eq("id", targetMemberId).maybeSingle();
      memberInDb = data;
    } else {
      // Membro comum só pode atualizar a si mesmo
      const { data } = await admin
        .from("members")
        .select("*")
        .or(`profile_id.eq.${user.id},id_demolay.eq.${user.user_metadata?.id_demolay || ""},email.eq.${user.email || ""}`)
        .limit(1)
        .maybeSingle();

      memberInDb = data;
    }

    if (!memberInDb) {
      return NextResponse.json({ error: "Registro de membro não localizado." }, { status: 404 });
    }

    // PROTEÇÃO CONTRA ADULTERAÇÃO DE IDENTIDADE / CAMPOS IMUTÁVEIS
    if (!isMaster) {
      // 1. Nome completo imutável
      if (
        memberInDb.full_name &&
        body.full_name !== undefined &&
        body.full_name.trim() !== memberInDb.full_name.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Violação de segurança: O Nome Completo é imutável após cadastrado. Para correções ortográficas, solicite ao Mestre Conselheiro ou Presidente do Conselho Consultivo.",
          },
          { status: 403 }
        );
      }

      // 2. ID DeMolay imutável
      if (
        memberInDb.id_demolay &&
        body.id_demolay !== undefined &&
        body.id_demolay.toString().trim() !== memberInDb.id_demolay.toString().trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Violação de segurança: O ID DeMolay é imutável após cadastrado. Para correções, solicite ao Mestre Conselheiro ou Presidente do Conselho Consultivo.",
          },
          { status: 403 }
        );
      }

      // 3. Data de nascimento: se já existe no banco, não pode ser alterada pelo próprio membro
      if (memberInDb.birth_date && body.birth_date !== undefined) {
        const dbDate = new Date(memberInDb.birth_date).toISOString().substring(0, 10);
        const newDate = body.birth_date ? new Date(body.birth_date).toISOString().substring(0, 10) : "";
        if (dbDate !== newDate) {
          return NextResponse.json(
            {
              error:
                "Violação de segurança: A Data de Nascimento já se encontra homologada no banco e não pode ser alterada pelo próprio membro. Solicite correção ao Master capitular.",
            },
            { status: 403 }
          );
        }
      }
    }

    // Monta payload sanitizado para atualização em public.members
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Permite primeiro preenchimento da data de nascimento se antes era nula
    if (body.birth_date !== undefined) {
      if (isMaster || !memberInDb.birth_date) {
        if (body.birth_date) {
          const d = new Date(body.birth_date);
          if (!isNaN(d.getTime())) {
            updatePayload.birth_date = d.toISOString().substring(0, 10);
          }
        } else if (isMaster) {
          updatePayload.birth_date = null;
        }
      }
    }

    // Se Master, permite atualizar nome completo e ID DeMolay
    if (isMaster) {
      if (body.full_name !== undefined && body.full_name.trim()) {
        updatePayload.full_name = body.full_name.trim();
      }
      if (body.id_demolay !== undefined) {
        updatePayload.id_demolay = body.id_demolay.toString().trim() || null;
      }
    }

    // Seções A a K:
    if (body.cpf !== undefined) updatePayload.cpf = body.cpf ? body.cpf.trim() : null;
    if (body.rg !== undefined) updatePayload.rg = body.rg ? body.rg.trim() : null;
    if (body.blood_type !== undefined) updatePayload.blood_type = body.blood_type ? body.blood_type.trim() : null;
    if (body.blood_donor !== undefined) updatePayload.blood_donor = Boolean(body.blood_donor);
    if (body.bone_marrow_donor !== undefined) updatePayload.bone_marrow_donor = Boolean(body.bone_marrow_donor);
    if (body.organ_donor !== undefined) updatePayload.organ_donor = Boolean(body.organ_donor);
    if (body.education_level !== undefined) updatePayload.education_level = body.education_level ? body.education_level.trim() : null;
    if (body.profession !== undefined) updatePayload.profession = body.profession ? body.profession.trim() : null;

    // B. Dados Familiares
    if (body.mother_name !== undefined) updatePayload.mother_name = body.mother_name ? body.mother_name.trim() : null;
    if (body.father_name !== undefined) updatePayload.father_name = body.father_name ? body.father_name.trim() : null;
    if (body.father_is_mason !== undefined) updatePayload.father_is_mason = Boolean(body.father_is_mason);

    // F. Contatos
    if (body.phone !== undefined) updatePayload.phone = body.phone ? body.phone.trim() : null;
    if (body.alternative_email !== undefined) updatePayload.alternative_email = body.alternative_email ? body.alternative_email.trim() : null;
    if (body.alternative_phone !== undefined) updatePayload.alternative_phone = body.alternative_phone ? body.alternative_phone.trim() : null;
    if (body.commercial_phone !== undefined) updatePayload.commercial_phone = body.commercial_phone ? body.commercial_phone.trim() : null;

    // G. Redes Sociais
    if (body.social_instagram !== undefined) updatePayload.social_instagram = body.social_instagram ? body.social_instagram.trim() : null;
    if (body.social_linkedin !== undefined) updatePayload.social_linkedin = body.social_linkedin ? body.social_linkedin.trim() : null;
    if (body.social_facebook !== undefined) updatePayload.social_facebook = body.social_facebook ? body.social_facebook.trim() : null;

    // H. Endereço
    if (body.address_cep !== undefined) updatePayload.address_cep = body.address_cep ? body.address_cep.trim() : null;
    if (body.address_city !== undefined) updatePayload.address_city = body.address_city ? body.address_city.trim() : null;
    if (body.address_state !== undefined) updatePayload.address_state = body.address_state ? body.address_state.trim() : null;
    if (body.address_street !== undefined) updatePayload.address_street = body.address_street ? body.address_street.trim() : null;
    if (body.address_number !== undefined) updatePayload.address_number = body.address_number ? body.address_number.trim() : null;
    if (body.address_complement !== undefined) updatePayload.address_complement = body.address_complement ? body.address_complement.trim() : null;
    if (body.address_neighborhood !== undefined) updatePayload.address_neighborhood = body.address_neighborhood ? body.address_neighborhood.trim() : null;

    // J. Fotos
    if (body.photo_url !== undefined) updatePayload.photo_url = body.photo_url ? body.photo_url.trim() : null;
    if (body.cover_photo_url !== undefined) updatePayload.cover_photo_url = body.cover_photo_url ? body.cover_photo_url.trim() : null;

    // Garante que o profile_id está associado ao usuário se estava nulo
    if (!memberInDb.profile_id && user.id) {
      updatePayload.profile_id = user.id;
    }

    // Executa atualização no banco
    const { data: updatedMember, error: updateErr } = await admin
      .from("members")
      .update(updatePayload)
      .eq("id", memberInDb.id)
      .select()
      .single();

    if (updateErr) {
      console.error("Erro ao atualizar member no banco:", updateErr);
      return NextResponse.json({ error: "Erro ao gravar alterações: " + updateErr.message }, { status: 400 });
    }

    // Atualiza tabela profiles para sincronização consistente
    if (memberInDb.profile_id || user.id) {
      const profileId = memberInDb.profile_id || user.id;
      const profileUpdate: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updatePayload.phone !== undefined) profileUpdate.phone = updatePayload.phone;
      if (updatePayload.photo_url !== undefined) profileUpdate.avatar_path = updatePayload.photo_url;
      if (isMaster && updatePayload.full_name) profileUpdate.full_name = updatePayload.full_name;

      await admin.from("profiles").update(profileUpdate).eq("id", profileId);
    }

    return NextResponse.json({
      success: true,
      message: "Dados cadastrais atualizados com sucesso no Supabase.",
      member: updatedMember,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro em PUT /api/member/profile:", error);
    return NextResponse.json({ error: "Falha ao atualizar dados: " + message }, { status: 500 });
  }
}
