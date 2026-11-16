import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isLocalAuditBypassAllowed } from "@/lib/proxy-utils";

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

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/login?erro=configuracao", request.url));
  }

  // Fast-Path: se não há cookies de autenticação do Supabase, redireciona imediatamente
  const allCookies = request.cookies.getAll();
  const hasAuthToken = allCookies.some(
    (c) => c.name.startsWith("sb-") && c.name.includes("token")
  );

  if (!hasAuthToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Determina HTTPS de forma segura e não suscetível a spoofing de cabeçalhos
  const host = request.headers.get("host") || "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const isHttps =
    !isLocalhost &&
    (request.nextUrl.protocol === "https:" ||
      (process.env.VERCEL === "1" && request.headers.get("x-forwarded-proto") === "https"));

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
      return response;
    }

    // Se houve erro de credencial inválida, token expirado, revogado ou adulterado
    // Redireciona imediatamente para login
    return NextResponse.redirect(new URL("/login", request.url));
  } catch (err: unknown) {
    // Em indisponibilidade transitória ou falha de conexão, não concede acesso sem validação
    console.error("Erro no proxy de autenticação:", err);
    return NextResponse.redirect(new URL("/login?erro=temporario", request.url));
  }
}

export const config = { matcher: ["/dashboard/:path*"] };
