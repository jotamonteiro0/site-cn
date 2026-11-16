import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export interface MasterAuthResult {
  authorized: boolean;
  userId?: string;
  email?: string;
  roleCode?: string;
  error?: string;
  statusCode?: number;
}

export async function verifyMasterAccess(request: Request): Promise<MasterAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // 1. Extração do usuário autenticado (via Bearer token oficial ou Cookie SSR de sessão)
  let callerUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
  const authHeader = request.headers.get("authorization");

  // Mocks restritos estritamente ao ambiente de testes automatizados e auditoria local isolada
  const isCloudProduction = Boolean(process.env.VERCEL || process.env.VERCEL_ENV === "production");
  const xForwardedHost = request.headers.get("x-forwarded-host");
  const host = (xForwardedHost || request.headers.get("host") || "").toLowerCase();
  const isLocalHost = host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]") || !host;

  const isLocalAuditAllowed =
    !isCloudProduction &&
    isLocalHost &&
    process.env.ALLOW_LOCAL_AUDIT_MOCKS === "true";

  const isTestEnvironment =
    (process.env.NODE_ENV === "test" && !isCloudProduction) || isLocalAuditAllowed;

  if (isTestEnvironment && authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === "mock-master-token") {
      return { authorized: true, userId: "master-test-id", roleCode: "master" };
    }
    if (token === "mock-member-token") {
      return { authorized: false, userId: "member-test-id", roleCode: "membro", error: "Acesso restrito ao perfil Master.", statusCode: 403 };
    }
  }

  // Header de teste restrito exclusivamente a NODE_ENV === "test"
  if (isTestEnvironment) {
    const devRoleHeader = request.headers.get("x-mock-role");
    if (devRoleHeader === "master") {
      return { authorized: true, userId: "mock-master-id", roleCode: "master" };
    }
    if (devRoleHeader === "membro") {
      return { authorized: false, userId: "mock-member-id", roleCode: "membro", error: "Acesso restrito: somente usuários com perfil Master podem gerenciar publicações.", statusCode: 403 };
    }
  }

  // Validação criptográfica do Bearer Token no Supabase Auth
  if (authHeader && authHeader.startsWith("Bearer ") && supabaseUrl && serviceKey) {
    const token = authHeader.substring(7);
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data?.user) {
        callerUser = data.user;
      }
    } catch {
      callerUser = null;
    }
  }

  // Validação via Cookie SSR de sessão autenticada
  if (!callerUser && supabaseUrl && anonKey) {
    try {
      const nextHeaders = await import("next/headers.js");
      const cookieStore = await nextHeaders.cookies();
      const ssrClient = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      });
      const { data } = await ssrClient.auth.getUser();
      if (data?.user) {
        callerUser = data.user;
      }
    } catch {
      callerUser = null;
    }
  }

  // Se nenhum usuário com sessão válida for localizado
  if (!callerUser) {
    return {
      authorized: false,
      error: "Autenticação obrigatória.",
      statusCode: 401,
    };
  }

  // 2. Verificação de Mantenedores Permanentes (IDs 127738 e 102836)
  const idDemolay = callerUser.user_metadata?.id_demolay;
  const email = callerUser.email?.toLowerCase();

  const isPermanentMaster =
    idDemolay === "127738" ||
    idDemolay === "102836" ||
    email === "joaomonteiro0@icloud.com" ||
    email === "airton@carvalhoneves500.org.br" ||
    email === "jarodriguesj1@gmail.com";

  if (isPermanentMaster) {
    return {
      authorized: true,
      userId: callerUser.id,
      email: callerUser.email,
      roleCode: "master",
    };
  }

  // 3. Verificação no banco de dados via chapter_memberships, Mestre Conselheiro ativo e PCC
  if (supabaseUrl && serviceKey) {
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3.1. Consulta de papel no membership do capítulo
    const { data: membership } = await supabaseAdmin
      .from("chapter_memberships")
      .select("role_code, is_active, member_id")
      .eq("user_id", callerUser.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membership && (membership.role_code === "master" || membership.role_code === "admin")) {
      return {
        authorized: true,
        userId: callerUser.id,
        email: callerUser.email,
        roleCode: membership.role_code,
      };
    }

    // 3.2. Verificação formal do Mestre Conselheiro vigente e do Presidente do Conselho Consultivo (PCC)
    // Concede Master temporário estritamente durante o mandato ativo
    const memberId = membership?.member_id;
    if (memberId) {
      const { data: activeLeader } = await supabaseAdmin
        .from("management_positions")
        .select(`
          id,
          name,
          management:managements!inner(status),
          member_management_positions!inner(member_id)
        `)
        .in("name", ["Presidente do Conselho Consultivo", "PCC", "Mestre Conselheiro"])
        .eq("management.status", "ativa")
        .eq("member_management_positions.member_id", memberId)
        .maybeSingle();

      if (activeLeader) {
        return {
          authorized: true,
          userId: callerUser.id,
          email: callerUser.email,
          roleCode: "master",
        };
      }
    }
  }

  return {
    authorized: false,
    userId: callerUser.id,
    email: callerUser.email,
    roleCode: "membro",
    error: "Acesso restrito: somente usuários com perfil Master permanente (IDs 127738 e 102836), Mestre Conselheiro em exercício ou Presidência do Conselho Consultivo possuem autorização.",
    statusCode: 403,
  };
}

/**
 * Validação de acesso ao Gerenciamento do Calendário Oficial.
 * Autoriza perfis Master (e PCC) e também o perfil Escrivão (responsável pelas atas e convocações).
 */
export async function verifyCalendarAccess(request: Request): Promise<MasterAuthResult> {
  const masterAuth = await verifyMasterAccess(request);
  if (masterAuth.authorized) {
    return masterAuth;
  }

  const authHeader = request.headers.get("authorization");
  const isCloudProduction = Boolean(process.env.VERCEL || process.env.VERCEL_ENV === "production");
  const xForwardedHost = request.headers.get("x-forwarded-host");
  const host = (xForwardedHost || request.headers.get("host") || "").toLowerCase();
  const isLocalHost = host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]") || !host;
  const isLocalAuditAllowed = !isCloudProduction && isLocalHost && process.env.ALLOW_LOCAL_AUDIT_MOCKS === "true";
  const isTestEnvironment = (process.env.NODE_ENV === "test" && !isCloudProduction) || isLocalAuditAllowed;

  // Suporte a mock de Escrivão no ambiente de teste e auditoria
  if (isTestEnvironment) {
    if (authHeader && authHeader === "Bearer mock-escrivao-token") {
      return { authorized: true, userId: "escrivao-test-id", roleCode: "escrivao" };
    }
    const devRoleHeader = request.headers.get("x-mock-role");
    if (devRoleHeader === "escrivao") {
      return { authorized: true, userId: "mock-escrivao-id", roleCode: "escrivao" };
    }
  }

  // Se o usuário não estiver autenticado (e não for mock de teste)
  if (!masterAuth.userId) {
    return {
      authorized: false,
      error: masterAuth.error || "Autenticação obrigatória.",
      statusCode: 401,
    };
  }

  // Se o usuário está autenticado mas não é Master, verifica se possui papel de Escrivão
  if (masterAuth.userId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: membership } = await supabaseAdmin
        .from("chapter_memberships")
        .select("role_code, is_active, member_id")
        .eq("user_id", masterAuth.userId)
        .eq("is_active", true)
        .maybeSingle();

      if (membership && membership.role_code === "escrivao") {
        return {
          authorized: true,
          userId: masterAuth.userId,
          email: masterAuth.email,
          roleCode: "escrivao",
        };
      }

      // Verificação de ocupação do cargo de Escrivão na gestão ativa
      const memberId = membership?.member_id;
      if (memberId) {
        const { data: officer } = await supabaseAdmin
          .from("management_positions")
          .select(`
            id,
            name,
            management:managements!inner(status),
            member_management_positions!inner(member_id)
          `)
          .eq("name", "Escrivão")
          .eq("management.status", "ativa")
          .eq("member_management_positions.member_id", memberId)
          .maybeSingle();

        if (officer) {
          return {
            authorized: true,
            userId: masterAuth.userId,
            email: masterAuth.email,
            roleCode: "escrivao",
          };
        }
      }
    }
  }

  return {
    authorized: false,
    userId: masterAuth.userId,
    email: masterAuth.email,
    roleCode: masterAuth.roleCode || "membro",
    error: "Acesso restrito: somente usuários com perfil Master ou Escrivão podem gerenciar o calendário.",
    statusCode: 403,
  };
}
