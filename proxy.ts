import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isLocalAuditBypassAllowed } from "@/lib/proxy-utils";

function buildUncachedRedirect(
  destination: string,
  request: NextRequest,
  clearAuthCookies = false,
  isHttps = false,
) {
  const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
  redirectResponse.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate",
  );
  redirectResponse.headers.set("Vary", "Cookie, RSC, Next-Router-State-Tree");

  if (clearAuthCookies) {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        redirectResponse.cookies.set(cookie.name, "", {
          maxAge: 0,
          expires: new Date(0),
          path: "/",
          sameSite: "lax",
          secure: isHttps,
        });
      }
    }
  }

  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  // Fast-Path de auditoria local exclusivo para desenvolvimento e testes
  const bypass = isLocalAuditBypassAllowed({
    host: request.headers.get("host"),
    xForwardedHost: request.headers.get("x-forwarded-host"),
    hasAuditMasterCookie: request.cookies.get("cn_audit_master")?.value === "true",
  });

  if (bypass) {
    return NextResponse.next({ request });
  }

  // Determina HTTPS de forma segura e não suscetível a spoofing de cabeçalhos
  const host = request.headers.get("host") || "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const isHttps =
    !isLocalhost &&
    (request.nextUrl.protocol === "https:" ||
      (process.env.VERCEL === "1" && request.headers.get("x-forwarded-proto") === "https"));

  if (!isSupabaseConfigured) {
    return buildUncachedRedirect("/login?erro=configuracao", request, false, isHttps);
  }

  // Fast-Path: se não há cookies de autenticação do Supabase, redireciona imediatamente
  const allCookies = request.cookies.getAll();
  const hasAuthToken = allCookies.some(
    (c) => c.name.startsWith("sb-") && c.name.includes("token")
  );

  if (!hasAuthToken) {
    return buildUncachedRedirect("/login", request, false, isHttps);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              secure: isHttps,
              sameSite: "lax",
              path: "/",
            });
          });
        },
      },
    },
  );

  try {
    // Validação estrita de identidade no servidor (Auth GoTrue)
    // Não utiliza getSession() nem validação frágil de timestamp
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Se o usuário foi validado com sucesso pelo servidor de autenticação
    if (user && !error) {
      response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
      return response;
    }

    // Se houve erro de credencial inválida, token expirado, revogado ou adulterado:
    // Limpa cookies sb-* inválidos para impedir loops infinitos entre /login e /dashboard
    return buildUncachedRedirect("/login?erro=sessao_expirada", request, true, isHttps);
  } catch (err: unknown) {
    // Em indisponibilidade transitória ou falha de conexão, não concede acesso sem validação
    console.error("Erro no proxy de autenticação:", err);
    return buildUncachedRedirect("/login?erro=temporario", request, false, isHttps);
  }
}

export const config = { matcher: ["/dashboard/:path*"] };
