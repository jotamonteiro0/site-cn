"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Lock, Mail, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const supabase = createClient();
      let targetEmail = email.trim();

      // Suporte a login tanto por e-mail quanto por CID oficial
      if (!targetEmail.includes("@")) {
        const { data: resolvedEmail, error: rpcError } = await supabase.rpc("get_email_by_cid", {
          lookup_cid: targetEmail,
        });

        if (rpcError || !resolvedEmail) {
          setError("CID não localizado ou inativo. Verifique o número ou utilize seu e-mail cadastrado.");
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
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("A autenticação ainda não está configurada. Contate a administração do sistema.");
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
              E-mail ou CID
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
                placeholder="seu.email@exemplo.com ou 12345"
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
                onClick={() => setError("A recuperação de senha será liberada após a configuração do e-mail transacional no Supabase.")}
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
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-300 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs text-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-[#D9AA45]" />
            <span>Acesso protegido com autenticação RBAC</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-lg bg-gradient-to-r from-[#D9AA45] to-[#c59637] hover:from-[#e3b64f] hover:to-[#d0a040] text-[#04281A] font-bold text-sm tracking-wide shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-[#04281A] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Entrar no Painel</span>
              </>
            )}
          </button>
          {error && <p role="alert" className="rounded-lg border border-red-300/40 bg-red-950/30 px-3 py-2 text-xs text-red-100">{error}</p>}
        </form>

        {/* Rodapé do card */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-emerald-200/70">
            Capítulo Professor Carvalho Neves Nº 500 — Teresina/PI
          </p>
        </div>
      </div>
    </div>
  );
}
