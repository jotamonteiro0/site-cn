"use client";

import { useEffect } from "react";
import { ShieldAlert, RefreshCw, LayoutDashboard } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro capturado no módulo do Dashboard:", error);
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
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-[#0B1F16] border border-[#C59B3F]/40 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#087443]/30 border border-[#C59B3F]/50 flex items-center justify-center text-[#C59B3F] mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
          Falha ao carregar este módulo
        </h2>

        <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed mb-6">
          Não foi possível concluir o carregamento dos dados desta seção no momento. Tente novamente ou retorne à Visão Geral.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleRecover}
            type="button"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065F36] text-white font-semibold text-xs border border-[#C59B3F]/40 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#C59B3F]" />
            <span>Tentar novamente</span>
          </button>

          <a
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-200 font-semibold text-xs border border-white/15 transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </a>
        </div>
      </div>
    </div>
  );
}
