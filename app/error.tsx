"use client";

import { useEffect } from "react";
import { ShieldAlert, RefreshCw, ArrowLeft } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro capturado no layout raiz:", error);
  }, [error]);

  const handleRecover = () => {
    const msg = (error?.message || "").toLowerCase();
    if (
      typeof window !== "undefined" &&
      (msg.includes("fetch") || msg.includes("network") || msg.includes("chunk"))
    ) {
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-[#08140E]">
      <div className="max-w-md w-full bg-[#052E1D]/90 border border-[#D9AA45]/40 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#087443]/30 border border-[#D9AA45]/60 flex items-center justify-center text-[#D9AA45] mb-5">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <span className="selo-vidro-cn px-3 py-1 rounded-full text-[11px] font-bold text-[#D9AA45] uppercase tracking-wider font-mono">
          Capítulo Professor Carvalho Neves Nº 500
        </span>

        <h2 className="text-xl sm:text-2xl font-bold text-white mt-4 mb-2 tracking-tight">
          Não foi possível carregar a seção
        </h2>

        <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed mb-6">
          Houve uma falha momentânea de comunicação com o servidor. Você pode tentar recarregar esta seção ou voltar para a página inicial.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleRecover}
            type="button"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065F36] text-white font-semibold text-xs border border-[#D9AA45]/50 shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#D9AA45]" />
            <span>Tentar novamente</span>
          </button>

          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-200 font-semibold text-xs border border-white/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao início</span>
          </a>
        </div>

        {error?.digest && (
          <p className="mt-6 text-[10px] text-emerald-300/40 font-mono">
            ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
