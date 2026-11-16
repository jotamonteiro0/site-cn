export interface RequestSecurityContext {
  host?: string | null;
  xForwardedHost?: string | null;
  hasAuditMasterCookie: boolean;
  env?: {
    VERCEL?: string;
    VERCEL_ENV?: string;
    ALLOW_LOCAL_AUDIT_MOCKS?: string;
  };
}

export function isLocalAuditBypassAllowed(ctx: RequestSecurityContext): boolean {
  const env = ctx.env || process.env;

  // 1. Proibição absoluta em ambientes de nuvem/produção
  if (env.VERCEL === "1" || env.VERCEL_ENV === "production") {
    return false;
  }

  // 2. Se a flag explícita não estiver ativa, bloqueia
  if (env.ALLOW_LOCAL_AUDIT_MOCKS !== "true") {
    return false;
  }

  // 3. Inspeção de host e cabeçalhos de encaminhamento
  const host = (ctx.xForwardedHost || ctx.host || "").toLowerCase();

  const isLocalHost =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]") ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (!isLocalHost) {
    return false;
  }

  // 4. Verificação estrita do cookie de auditoria local
  return ctx.hasAuditMasterCookie;
}
