"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";

export function PrivacyNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cn_privacy_acknowledged");
    if (!accepted) {
      requestAnimationFrame(() => setIsVisible(true));
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("cn_privacy_acknowledged", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Aviso de Privacidade e Cookies"
      className="fixed bottom-3 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#052E1D]/95 backdrop-blur-md border border-[#C59B3F]/40 text-white rounded-2xl p-3.5 sm:p-4 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#087443] border border-[#C59B3F]/50 flex items-center justify-center text-[#C59B3F] shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs leading-relaxed text-emerald-100/90">
          <p className="font-semibold text-white mb-1">
            Privacidade e Proteção de Dados (LGPD)
          </p>
          <p>
            Utilizamos apenas cookies estritamente necessários para autenticação segura. Nenhum dado é compartilhado com terceiros comerciais. Conheça nossa{" "}
            <Link href="/privacidade" className="text-[#C59B3F] underline hover:text-[#D4AF37]">
              Política de Privacidade
            </Link>{" "}
            e{" "}
            <Link href="/termos" className="text-[#C59B3F] underline hover:text-[#D4AF37]">
              Termos de Uso
            </Link>
            .
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-emerald-300 hover:text-white p-1 rounded-md transition-colors"
          aria-label="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleDismiss}
          className="px-4 py-1.5 rounded-lg bg-[#C59B3F] hover:bg-[#D4AF37] text-[#052E1D] font-bold text-xs transition-colors shadow-sm"
        >
          Entendido
        </button>
      </div>
    </aside>
  );
}
