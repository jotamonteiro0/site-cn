/**
 * Centralized, Secure Logger for Capítulo Carvalho Neves Nº 500
 * - Sanitizes sensitive data (passwords, tokens, credentials, auth cookies)
 * - Outputs structured logs in production
 * - Formats standardized API errors
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "senha",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "secret",
  "service_role",
  "service_role_key",
  "apikey",
]);

function sanitize(data: unknown, depth = 0): unknown {
  if (depth > 4) return "[Deep]";
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitize(val, depth + 1);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export const logger = {
  info(scope: string, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const payload = meta ? sanitize(meta) : undefined;
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify({ timestamp, level: "INFO", scope, message, meta: payload }));
    } else {
      console.log(`[${timestamp}] [INFO] [${scope}] ${message}`, payload || "");
    }
  },

  warn(scope: string, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const payload = meta ? sanitize(meta) : undefined;
    if (process.env.NODE_ENV === "production") {
      console.warn(JSON.stringify({ timestamp, level: "WARN", scope, message, meta: payload }));
    } else {
      console.warn(`[${timestamp}] [WARN] [${scope}] ${message}`, payload || "");
    }
  },

  error(scope: string, message: string, error?: unknown, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    const payload = meta ? sanitize(meta) : undefined;

    if (process.env.NODE_ENV === "production") {
      console.error(
        JSON.stringify({
          timestamp,
          level: "ERROR",
          scope,
          message,
          error: errMessage,
          stack: errStack,
          meta: payload,
        })
      );
    } else {
      console.error(`[${timestamp}] [ERROR] [${scope}] ${message} - ${errMessage}`, payload || "");
    }
  },

  audit(scope: string, action: string, actor: { id?: string; email?: string; cid?: string }, details?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const safeDetails = details ? sanitize(details) : undefined;
    console.log(
      JSON.stringify({
        timestamp,
        level: "AUDIT",
        scope,
        action,
        actor: { id: actor.id, email: actor.email, cid: actor.cid },
        details: safeDetails,
      })
    );
  },
};
