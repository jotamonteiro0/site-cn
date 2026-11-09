"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";

export function PrivacyNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cn_privacy_acknowledged");
    if (!accepted) {
      setIsVisible(true);
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
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#04281A]/95 backdrop-blur-md border border-[#D9AA45]/40 text-white rounded-2xl p-4 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#087443] border border-[#D9AA45]/50 flex items-center justify-center text-[#D9AA45] shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs leading-relaxed text-emerald-100/90">
          <p className="font-semibold text-white mb-1">
            Privacidade e Proteção de Dados (LGPD)
          </p>
          <p>
            Utilizamos apenas cookies estritamente necessários para autenticação segura. Nenhum dado é compartilhado com terceiros comerciais. Conheça nossa{" "}
            <Link href="/privacidade" className="text-[#D9AA45] underline hover:text-[#f0cc6a]">
              Política de Privacidade
            </Link>{" "}
            e{" "}
            <Link href="/termos" className="text-[#D9AA45] underline hover:text-[#f0cc6a]">
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
          className="px-4 py-1.5 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-colors shadow-sm"
        >
          Entendido
        </button>
      </div>
    </aside>
  );
}
