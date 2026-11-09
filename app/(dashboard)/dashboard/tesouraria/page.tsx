"use client";

import Link from "next/link";
import { Wallet, ArrowLeft, Clock, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";

export default function TesourariaPage() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar à Visão Geral</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Tesouraria & Caixa Capitular</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Controle de mensalidades, taxas de iniciação e prestação de contas do Capítulo 500
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#D9AA45] text-xs font-bold">
          <Clock className="w-4 h-4" />
          <span>Módulo em Lançamento</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            Mensalidade Capitular
          </span>
          <p className="text-2xl font-extrabold text-white">R$ 50,00</p>
          <p className="text-[11px] text-emerald-200/60">Vencimento todo dia 10</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D9AA45]">
            Chave PIX Oficial
          </span>
          <p className="text-sm font-mono font-bold text-[#D9AA45] break-all">
            capitulo500@demolaybrasil.org.br
          </p>
          <p className="text-[11px] text-emerald-200/60">Envio automático de comprovantes</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            Adimplência Geral
          </span>
          <p className="text-2xl font-extrabold text-emerald-300">88%</p>
          <p className="text-[11px] text-emerald-200/60">Gestão XXIII (2025.2 / 2026)</p>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-[#064D32]/60 border border-emerald-500/30 text-center space-y-3">
        <Wallet className="w-10 h-10 text-[#D9AA45] mx-auto" />
        <h3 className="text-lg font-bold text-white">Gestão Financeira Integrada</h3>
        <p className="text-xs text-emerald-200/80 max-w-md mx-auto leading-relaxed">
          O upload de comprovantes de mensalidade diretamente para o bucket de armazenamento seguro do Supabase já está estruturado. Em breve estará disponível a baixa em massa pelos Irmãos Tesoureiros.
        </p>
      </div>
    </div>
  );
}
