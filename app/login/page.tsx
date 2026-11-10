"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Lock, Mail, ArrowLeft, Eye, EyeOff } from "lucide-react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Estado do reCAPTCHA
  const [captchaToken, setCaptchaToken] = useState("");
  const [isCaptchaReady, setIsCaptchaReady] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  // Chave pública do reCAPTCHA
  const siteKey =
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
    "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  // Carregamento resiliente do script oficial do Google reCAPTCHA
  useEffect(() => {
    let isMounted = true;
    const scriptId = "google-recaptcha-v2-script";

    const renderRecaptcha = () => {
      if (!isMounted || !recaptchaContainerRef.current) return;

      const grecaptcha = window.grecaptcha;
      if (grecaptcha && typeof grecaptcha.render === "function") {
        grecaptcha.ready(() => {
          if (!isMounted || !recaptchaContainerRef.current) return;

          // Evita renderizar duas vezes no mesmo container
          if (widgetIdRef.current === null && recaptchaContainerRef.current.childElementCount === 0) {
            try {
              const id = grecaptcha.render(recaptchaContainerRef.current, {
                sitekey: siteKey,
                callback: (token: string) => {
                  setCaptchaToken(token);
                  setError("");
                },
                "expired-callback": () => {
                  setCaptchaToken("");
                },
                "error-callback": () => {
                  console.warn("Erro no widget do Google reCAPTCHA");
                },
                theme: "dark",
              });
              widgetIdRef.current = id;
              setIsCaptchaReady(true);
            } catch (err) {
              console.warn("reCAPTCHA render error:", err);
            }
          }
        });
      }
    };

    // Verifica se o script do Google já está presente no DOM
    let scriptElement = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!scriptElement) {
      scriptElement = document.createElement("script");
      scriptElement.id = scriptId;
      scriptElement.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      scriptElement.async = true;
      scriptElement.defer = true;
      scriptElement.onload = () => {
        renderRecaptcha();
      };
      document.head.appendChild(scriptElement);
    } else {
      // Se o script já existe, aguarda o objeto estar pronto
      renderRecaptcha();
    }

    // Polling de segurança caso o onload já tenha disparado antes da montagem
    const timer = setInterval(() => {
      if (window.grecaptcha && widgetIdRef.current === null) {
        renderRecaptcha();
      } else if (widgetIdRef.current !== null) {
        clearInterval(timer);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [siteKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // 1. Validação do reCAPTCHA
    if (!captchaToken) {
      setError("Por favor, marque a caixa 'Não sou um robô' para prosseguir.");
      setIsLoading(false);
      return;
    }

    try {
      // 2. Validação do token na API interna
      const verifyRes = await fetch("/api/auth/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setError(verifyData.error || "Falha na verificação de segurança do reCAPTCHA.");
        if (window.grecaptcha && widgetIdRef.current !== null) {
          window.grecaptcha.reset(widgetIdRef.current);
          setCaptchaToken("");
        }
        setIsLoading(false);
        return;
      }

      // 3. Autenticação no Supabase
      const supabase = createClient();
      let targetEmail = email.trim();

      // Suporte a login por ID oficial ou e-mail
      if (!targetEmail.includes("@")) {
        const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
          "get_email_by_cid",
          {
            lookup_cid: targetEmail,
          }
        );

        if (rpcError || !resolvedEmail) {
          setError(
            "ID não localizado ou inativo. Verifique o número ou utilize seu e-mail cadastrado."
          );
          setIsLoading(false);
          return;
        }
        targetEmail = resolvedEmail;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (signInError) {
        setError("Não foi possível entrar. Verifique os dados de acesso.");
        if (window.grecaptcha && widgetIdRef.current !== null) {
          window.grecaptcha.reset(widgetIdRef.current);
          setCaptchaToken("");
        }
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Erro no processo de login. Contate a administração do sistema.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-[#032015] via-[#064D32] to-[#087443] px-4 py-12">
      {/* Padrão geométrico de fundo */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#D9AA45_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Brilho decorativo no fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#087443]/40 rounded-full blur-3xl pointer-events-none" />

      {/* Link para voltar ao portal público */}
      <Link
        href="/"
        className="relative z-10 mb-8 inline-flex items-center gap-2 text-sm font-medium text-emerald-200 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md"
      >
        <ArrowLeft className="w-4 h-4 text-[#D9AA45]" />
        <span>Voltar ao portal público</span>
      </Link>

      {/* Card Glassmorphism de Login */}
      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl shadow-black/40 text-white">
        {/* Identificação Institucional */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#087443] border border-[#D9AA45]/60 items-center justify-center text-[#D9AA45] shadow-lg mb-4">
            <Shield className="w-9 h-9" />
          </div>
          <span className="block text-xs uppercase tracking-widest text-[#D9AA45] font-bold">
            Ordem DeMolay
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            Capítulo Carvalho Neves Nº 500
          </h1>
          <p className="text-xs text-emerald-200/80 mt-1">
            Sistema Integrado de Gestão Administrativa
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-emerald-100 uppercase tracking-wider mb-2">
              E-mail ou ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-300">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com ou 127738"
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-[#D9AA45] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                Senha de Acesso
              </label>
              <button
                type="button"
                className="text-xs text-[#D9AA45] hover:underline transition-colors"
                onClick={() =>
                  setError(
                    "A recuperação de senha será liberada após a configuração do e-mail transacional no Supabase."
                  )
                }
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-300">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-[#D9AA45] focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-300 hover:text-white cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* ÁREA DO WIDGET OFICIAL DO GOOGLE RECAPTCHA */}
          <div className="pt-1 flex flex-col items-center justify-center min-h-[78px]">
            <div
              ref={recaptchaContainerRef}
              className="recaptcha-widget-container flex justify-center"
            />
            {!isCaptchaReady && (
              <p className="text-[11px] text-emerald-200/60 mt-1 animate-pulse">
                Carregando verificação de segurança...
              </p>
            )}
          </div>

          {/* BOTÃO ENTRAR */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-lg bg-gradient-to-r from-[#D9AA45] to-[#c59637] hover:from-[#e3b64f] hover:to-[#d0a040] text-[#04281A] font-bold text-sm tracking-wide shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-[#04281A] border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Entrar</span>
            )}
          </button>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-300/40 bg-red-950/30 px-3 py-2 text-xs text-red-100 text-center"
            >
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
