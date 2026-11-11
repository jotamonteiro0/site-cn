"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Lock, Mail, ArrowLeft, Eye, EyeOff, Sparkles, CheckCircle2 } from "lucide-react";

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

  // Estado do Primeiro Acesso (Ativação e Criação de Senha)
  const [isFirstAccessOpen, setIsFirstAccessOpen] = useState(false);
  const [firstAccessId, setFirstAccessId] = useState("");
  const [firstAccessEmail, setFirstAccessEmail] = useState("");
  const [firstAccessPassword, setFirstAccessPassword] = useState("");
  const [firstAccessConfirmPassword, setFirstAccessConfirmPassword] = useState("");
  const [isSubmittingFirstAccess, setIsSubmittingFirstAccess] = useState(false);
  const [firstAccessError, setFirstAccessError] = useState("");
  const [firstAccessSuccess, setFirstAccessSuccess] = useState("");

  // Estado de Recuperação de Senha
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetError, setResetError] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes("@")) {
      setResetError("Por favor, informe um endereço de e-mail válido.");
      return;
    }
    setIsResetting(true);
    setResetError("");
    setResetMsg("");
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "https://site-cn-mu.vercel.app";
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${origin}/login?redefinir=1`,
      });
      if (resetErr) throw resetErr;
      setResetMsg("E-mail com instruções para redefinição de senha enviado com sucesso! Verifique sua caixa de entrada.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao solicitar recuperação de senha.";
      setResetError(msg);
    } finally {
      setIsResetting(false);
    }
  };

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
                  console.warn("reCAPTCHA widget error: domínio ou chave restrita no console do Google.");
                  setError("reCAPTCHA: Domínio não autorizado no Google Admin Console para esta chave.");
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

    // 1. Validação do token de segurança do reCAPTCHA
    if (!captchaToken) {
      setError("Por favor, marque a verificação de segurança para prosseguir.");
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
        setError(verifyData.error || "Falha na verificação de segurança. Tente novamente.");
        if (window.grecaptcha && widgetIdRef.current !== null) {
          window.grecaptcha.reset(widgetIdRef.current);
          setCaptchaToken("");
        }
        setIsLoading(false);
        return;
      }

      // 3. Conexão e Verificação Prévia com o Banco de Dados (prevenção contra acessos inválidos)
      const supabase = createClient();
      const cleanInput = email.trim();

      const { data: resolvedEmail, error: rpcErr } = await supabase.rpc(
        "resolve_login_email",
        { identifier: cleanInput }
      );

      // Se não existir registro no banco para essa ID ou e-mail, devolve imediatamente
      if (rpcErr || !resolvedEmail) {
        if (!cleanInput.includes("@")) {
          setError("ID DeMolay não localizada no quadro de membros do Capítulo 500. Verifique o número digitado.");
        } else {
          setError("E-mail não localizado no quadro de membros do Capítulo 500.");
        }
        if (window.grecaptcha && widgetIdRef.current !== null) {
          window.grecaptcha.reset(widgetIdRef.current);
          setCaptchaToken("");
        }
        setIsLoading(false);
        return;
      }

      // 4. Autenticação no Supabase Auth com o e-mail resolvido do membro
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: password.trim(),
      });

      if (!signInError && authData?.user) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      // Senha incorreta
      setError("Senha incorreta. Verifique os dados digitados ou utilize 'Esqueceu a senha?'.");
      if (window.grecaptcha && widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
        setCaptchaToken("");
      }
    } catch {
      setError("Erro no processo de login. Contate a administração do sistema.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirstAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFirstAccess(true);
    setFirstAccessError("");
    setFirstAccessSuccess("");

    if (firstAccessPassword.length < 6) {
      setFirstAccessError("A senha criada deve possuir no mínimo 6 caracteres.");
      setIsSubmittingFirstAccess(false);
      return;
    }

    if (firstAccessPassword !== firstAccessConfirmPassword) {
      setFirstAccessError("A confirmação da senha não coincide com a senha criada.");
      setIsSubmittingFirstAccess(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/first-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cid: firstAccessId.trim(),
          email: firstAccessEmail.trim(),
          password: firstAccessPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setFirstAccessError(data.error || "Erro ao processar ativação.");
        return;
      }

      setFirstAccessSuccess(
        data.message ||
          "Conta ativada com sucesso! Sua senha definitiva foi criada e você já pode entrar."
      );
      setEmail(firstAccessEmail.trim());
      setPassword(firstAccessPassword.trim());
    } catch (_err: unknown) {
      console.error("Erro no primeiro acesso:", _err);
      setFirstAccessError("Falha de conexão com o servidor capitular.");
    } finally {
      setIsSubmittingFirstAccess(false);
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
                className="text-xs text-[#D9AA45] hover:underline transition-colors cursor-pointer"
                onClick={() => {
                  setIsResetModalOpen(true);
                  setResetEmail(email.includes("@") ? email.trim() : "");
                  setResetMsg("");
                  setResetError("");
                }}
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

          {/* PRIMEIRO ACESSO DO DEMOLAY */}
          <div className="pt-4 border-t border-white/10 text-center space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setIsFirstAccessOpen(true);
                setFirstAccessId(!email.includes("@") ? email.trim() : "");
                setFirstAccessPassword("");
                setFirstAccessConfirmPassword("");
                setFirstAccessError("");
                setFirstAccessSuccess("");
              }}
              className="text-xs text-[#D9AA45] hover:underline font-bold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Primeiro acesso? Ative sua conta capitular</span>
            </button>
            <p className="text-[11px] text-emerald-200/70">
              Informe sua ID oficial e crie sua senha pessoal de acesso ao sistema.
            </p>
          </div>
        </form>
      </div>

      {/* MODAL DE PRIMEIRO ACESSO / CRIAÇÃO DE SENHA PESSOAL */}
      {isFirstAccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="ios-glass-card rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-white space-y-4 animate-in zoom-in-95">
            <button
              onClick={() => setIsFirstAccessOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center space-y-1 pb-2 border-b border-white/10">
              <div className="inline-flex w-12 h-12 rounded-xl bg-[#087443] border border-[#D9AA45] items-center justify-center text-[#D9AA45] shadow mb-1">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Primeiro Acesso Capitular</h3>
              <p className="text-xs text-emerald-200/80">
                Ative seu perfil no Capítulo 500 e crie sua própria senha de acesso.
              </p>
            </div>

            {firstAccessSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-900/60 border border-emerald-500 text-emerald-200 text-xs space-y-3 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-semibold leading-relaxed">{firstAccessSuccess}</p>
                <button
                  type="button"
                  onClick={() => setIsFirstAccessOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-[#D9AA45] text-[#04281A] font-bold text-xs hover:bg-amber-400 transition-all cursor-pointer"
                >
                  Entrar no Sistema
                </button>
              </div>
            ) : (
              <form onSubmit={handleFirstAccessSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-emerald-200 font-semibold mb-1">
                    Sua ID DeMolay Oficial *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstAccessId}
                    onChange={(e) => setFirstAccessId(e.target.value)}
                    placeholder="Ex: 127738 ou 148194"
                    className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/20 text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Número do seu registro oficial no SISDM / DeMolay Brasil.
                  </span>
                </div>

                <div>
                  <label className="block text-emerald-200 font-semibold mb-1">
                    Seu E-mail Pessoal / Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={firstAccessEmail}
                    onChange={(e) => setFirstAccessEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Este e-mail será vinculado ao seu perfil para notificações e acesso.
                  </span>
                </div>

                <div>
                  <label className="block text-emerald-200 font-semibold mb-1">
                    Crie Sua Senha de Acesso *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={firstAccessPassword}
                    onChange={(e) => setFirstAccessPassword(e.target.value)}
                    placeholder="Crie sua senha (mínimo 6 dígitos)"
                    className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>

                <div>
                  <label className="block text-emerald-200 font-semibold mb-1">
                    Confirme Sua Senha *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={firstAccessConfirmPassword}
                    onChange={(e) => setFirstAccessConfirmPassword(e.target.value)}
                    placeholder="Repita a mesma senha criada acima"
                    className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>

                {firstAccessError && (
                  <p className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/40 text-red-200 text-[11px] text-center">
                    {firstAccessError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsFirstAccessOpen(false)}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFirstAccess}
                    className="px-5 py-2.5 rounded-lg bg-[#D9AA45] hover:bg-amber-400 text-black font-bold cursor-pointer disabled:opacity-50 transition-all shadow"
                  >
                    {isSubmittingFirstAccess ? "Ativando..." : "Ativar Conta e Criar Senha"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE RECUPERAÇÃO DE ACESSO / SENHA */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="ios-glass-card rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-white space-y-4 animate-in zoom-in-95">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center space-y-1 pb-2 border-b border-white/10">
              <div className="inline-flex w-12 h-12 rounded-xl bg-[#087443] border border-[#D9AA45] items-center justify-center text-[#D9AA45] shadow mb-1">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Recuperar Acesso</h3>
              <p className="text-xs text-emerald-200/80">
                Informe o seu e-mail cadastrado para receber o link de redefinição de senha.
              </p>
            </div>

            {resetMsg ? (
              <div className="p-4 rounded-xl bg-emerald-900/60 border border-emerald-500 text-emerald-200 text-xs space-y-3 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-semibold leading-relaxed">{resetMsg}</p>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-[#D9AA45] text-[#04281A] font-bold text-xs hover:bg-amber-400 transition-all cursor-pointer"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-emerald-200 font-semibold mb-1">
                    E-mail Cadastrado *
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>

                {resetError && (
                  <p className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/40 text-red-200 text-[11px] text-center">
                    {resetError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-5 py-2.5 rounded-lg bg-[#D9AA45] hover:bg-amber-400 text-black font-bold cursor-pointer disabled:opacity-50 transition-all shadow"
                  >
                    {isResetting ? "Enviando..." : "Enviar Link de Recuperação"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
