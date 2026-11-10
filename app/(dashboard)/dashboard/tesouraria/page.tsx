"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Wallet,
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  PlusCircle,
  FileCheck,
  Printer,
  Copy,
  ExternalLink,
  Shield,
  CreditCard,
  QrCode,
  Undo2
} from "lucide-react";

interface FinancialPeriod {
  id: string;
  year: number;
  month: number;
  status: string;
}

interface MemberCharge {
  id: string;
  member_id: string;
  payer_name: string;
  payer_type: string;
  description: string;
  amount: number;
  due_date: string;
  status: "pendente" | "confirmado" | "aguardando_confirmacao" | "cancelado";
  paid_at?: string;
  financial_period_id: string;
  member?: {
    cid: string;
    category: string;
  };
}

export default function TesourariaPage() {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [charges, setCharges] = useState<MemberCharge[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendente" | "confirmado">("todos");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Modais
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(11);
  const [generateYear, setGenerateYear] = useState(2026);

  // Modal Declaração de Quitação
  const [quitacaoMember, setQuitacaoMember] = useState<{
    name: string;
    cid: string;
    code: string;
    date: string;
    period: string;
  } | null>(null);

  // 1. Carrega Períodos Financeiros
  useEffect(() => {
    async function loadPeriods() {
      try {
        const supabase = createClient();
        const { data: pData } = await supabase
          .from("financial_periods")
          .select("id, year, month, status")
          .order("year", { ascending: false })
          .order("month", { ascending: false });

        if (pData && pData.length > 0) {
          setPeriods(pData);
          // Seleciona o mês atual ou o primeiro da lista
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          const match = pData.find((p) => p.month === currentMonth && p.year === currentYear);
          setSelectedPeriodId(match ? match.id : pData[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar períodos:", err);
      }
    }
    loadPeriods();
  }, []);

  // 2. Carrega Cobranças do Período Selecionado
  const loadCharges = async () => {
    if (!selectedPeriodId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("member_charges")
        .select(`
          id,
          member_id,
          payer_name,
          payer_type,
          description,
          amount,
          due_date,
          status,
          paid_at,
          financial_period_id,
          member:members (
            cid,
            category
          )
        `)
        .eq("financial_period_id", selectedPeriodId)
        .order("payer_name", { ascending: true });

      if (data) {
        setCharges(data as any[]);
      }
    } catch (err) {
      console.error("Erro ao carregar mensalidades do mês:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCharges();
  }, [selectedPeriodId]);

  // Período Selecionado Atual
  const selectedPeriod = useMemo(() => {
    return periods.find((p) => p.id === selectedPeriodId);
  }, [periods, selectedPeriodId]);

  // Estatísticas Financeiras do Mês
  const stats = useMemo(() => {
    let totalPrevisto = 0;
    let totalPago = 0;
    let totalPendente = 0;
    let qtdPago = 0;
    let qtdTotal = charges.length;

    charges.forEach((c) => {
      totalPrevisto += Number(c.amount || 0);
      if (c.status === "confirmado") {
        totalPago += Number(c.amount || 0);
        qtdPago++;
      } else {
        totalPendente += Number(c.amount || 0);
      }
    });

    const percent = qtdTotal > 0 ? Math.round((qtdPago / qtdTotal) * 100) : 0;
    return { totalPrevisto, totalPago, totalPendente, qtdPago, qtdTotal, percent };
  }, [charges]);

  // Dar Baixa / Confirmar Pagamento da Mensalidade
  const handleTogglePaymentStatus = async (chargeId: string, currentStatus: string) => {
    setIsUpdating(true);
    const newStatus = currentStatus === "confirmado" ? "pendente" : "confirmado";
    const paidAt = newStatus === "confirmado" ? new Date().toISOString() : null;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("member_charges")
        .update({
          status: newStatus,
          paid_at: paidAt,
        })
        .eq("id", chargeId);

      if (error) throw error;

      setCharges((prev) =>
        prev.map((c) => (c.id === chargeId ? { ...c, status: newStatus as any, paid_at: paidAt || undefined } : c))
      );

      setFeedbackMsg(
        newStatus === "confirmado"
          ? "Baixa de pagamento realizada com sucesso!"
          : "Pagamento estornado para pendente."
      );
      setTimeout(() => setFeedbackMsg(""), 3500);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      alert("Erro ao registrar baixa da mensalidade.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Gerar Mensalidades em Massa para o Mês Escolhido
  const handleGenerateMonthlyCharges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("generate_monthly_charges", {
        p_chapter_id: "00000000-0000-0000-0000-000000000500",
        p_year: Number(generateYear),
        p_month: Number(generateMonth),
      });

      if (error) throw error;

      alert(`Sucesso! Foram processadas ${data} mensalidades para ${generateMonth}/${generateYear}.`);
      setIsGenerateModalOpen(false);

      // Recarrega períodos e seleciona o gerado
      const { data: updatedPeriods } = await supabase
        .from("financial_periods")
        .select("id, year, month, status")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (updatedPeriods) {
        setPeriods(updatedPeriods);
        const target = updatedPeriods.find((p) => p.month === Number(generateMonth) && p.year === Number(generateYear));
        if (target) setSelectedPeriodId(target.id);
      }
    } catch (err) {
      console.error("Erro ao gerar mensalidades:", err);
      alert("Erro ao processar mensalidades automáticas.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Abrir Modal de Declaração de Quitação
  const handleOpenQuitacao = (charge: MemberCharge) => {
    const code = `CN-DECL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const periodStr = selectedPeriod
      ? `${String(selectedPeriod.month).padStart(2, "0")}/${selectedPeriod.year}`
      : "Exercício Vigente";

    setQuitacaoMember({
      name: charge.payer_name,
      cid: charge.member?.cid || "—",
      code,
      date: new Date().toLocaleDateString("pt-BR"),
      period: periodStr,
    });
  };

  // Filtro de Busca
  const filteredCharges = charges.filter((c) => {
    const matchesStatus = statusFilter === "todos" || c.status === statusFilter;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      term === "" ||
      c.payer_name.toLowerCase().includes(term) ||
      (c.member?.cid && c.member.cid.includes(term)) ||
      c.description.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in">
      {/* Header com Navegação */}
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
            Controle de mensalidades por mês, baixas de pagamentos, chave PIX e declarações de quitação
          </p>
        </div>

        {/* Ações Rápidas do Tesoureiro */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPixModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-[#D9AA45]" />
            <span>Chave PIX & InfinitePay</span>
          </button>

          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Gerar Mensalidades do Mês</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE ATUALIZAÇÃO */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* SELETOR DE MÊS / PERÍODO FINANCEIRO */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45]">
            Exercício Financeiro por Mês
          </span>
          <div className="flex items-center gap-3 mt-1.5">
            <Calendar className="w-5 h-5 text-emerald-300" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-[#064D32] border border-emerald-500/40 rounded-xl px-4 py-2 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
            >
              {periods.map((p) => {
                const mesNome = new Date(p.year, p.month - 1).toLocaleString("pt-BR", { month: "long" });
                return (
                  <option key={p.id} value={p.id}>
                    {mesNome.toUpperCase()} de {p.year} {p.status === "aberto" ? "• Vigente" : "• Fechado"}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-emerald-100/80">
          <div className="p-2.5 rounded-xl bg-black/20 border border-white/10">
            <span className="text-gray-400">Vencimento Padrão:</span>{" "}
            <span className="font-bold text-white">Todo dia 10</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/20 border border-white/10">
            <span className="text-gray-400">Valor Unitário:</span>{" "}
            <span className="font-bold text-[#D9AA45]">R$ 50,00</span>
          </div>
        </div>
      </div>

      {/* 4 CARDS RESUMO DO MÊS SELECIONADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80">
            Previsão do Mês
          </span>
          <p className="text-2xl font-extrabold text-white">
            R$ {stats.totalPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-200/60">{stats.qtdTotal} cobranças geradas</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-emerald-500/30 backdrop-blur-md space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            Total Arrecadado
          </span>
          <p className="text-2xl font-extrabold text-emerald-300">
            R$ {stats.totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-200/60">{stats.qtdPago} mensalidades quitadas</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-amber-500/30 backdrop-blur-md space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9AA45]">
            Saldo a Receber
          </span>
          <p className="text-2xl font-extrabold text-[#D9AA45]">
            R$ {stats.totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-200/60">
            {stats.qtdTotal - stats.qtdPago} cobranças em aberto
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80">
            Taxa de Adimplência
          </span>
          <p className="text-2xl font-extrabold text-white">{stats.percent}%</p>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA DE COBRANÇAS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Abas de Status */}
          <div className="flex items-center gap-2">
            {[
              { id: "todos", label: "Todas", count: charges.length },
              { id: "pendente", label: "Pendentes", count: charges.filter((c) => c.status === "pendente").length },
              { id: "confirmado", label: "Pagas / Baixadas", count: charges.filter((c) => c.status === "confirmado").length },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-sm"
                    : "bg-white/5 text-emerald-200/70 hover:text-white"
                }`}
              >
                <span>{f.label}</span> ({f.count})
              </button>
            ))}
          </div>

          {/* Busca por Nome ou ID */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por irmão ou ID..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
            />
          </div>
        </div>

        {/* TABELA DE MENSALIDADES */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#04281A]/80 border-b border-white/10 text-emerald-300 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Irmão / Membro</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações do Tesoureiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-200/50">
                      Carregando mensalidades do mês...
                    </td>
                  </tr>
                ) : filteredCharges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-200/50">
                      Nenhuma mensalidade encontrada para este mês. Clique em <strong>&quot;Gerar Mensalidades do Mês&quot;</strong> para lançar as cobranças.
                    </td>
                  </tr>
                ) : (
                  filteredCharges.map((c) => {
                    const isPago = c.status === "confirmado";
                    return (
                      <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#D9AA45]">
                          {c.member?.cid || "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {c.payer_name}
                        </td>
                        <td className="py-3 px-4 text-emerald-200/70">
                          {c.description}
                        </td>
                        <td className="py-3 px-4 text-emerald-100/70 font-mono">
                          {c.due_date ? new Date(c.due_date).toLocaleDateString("pt-BR") : "10/11/2026"}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          R$ {Number(c.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isPago
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-amber-500/20 text-[#D9AA45] border border-amber-500/40"
                            }`}
                          >
                            {isPago ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span>{isPago ? "Baixado (Pago)" : "Pendente"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Botão de Baixa / Estorno */}
                            <button
                              onClick={() => handleTogglePaymentStatus(c.id, c.status)}
                              disabled={isUpdating}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isPago
                                  ? "bg-white/10 hover:bg-white/20 text-emerald-200"
                                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                              }`}
                            >
                              {isPago ? "Estornar" : "Dar Baixa"}
                            </button>

                            {/* Botão de Emitir Declaração de Quitação */}
                            <button
                              onClick={() => handleOpenQuitacao(c)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#D9AA45] border border-[#D9AA45]/30 text-xs font-bold transition-colors cursor-pointer"
                              title="Emitir Declaração de Quitação"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: CHAVE PIX & INFINITEPAY */}
      {isPixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#064D32] border border-white/20 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-2">
              <QrCode className="w-6 h-6 text-[#D9AA45]" />
              <h3 className="text-lg font-bold">Dados de Pagamento Capitular</h3>
            </div>
            <p className="text-xs text-emerald-200/70">
              Chave PIX oficial e link de pagamento do InfinitePay para quitação das mensalidades de R$ 50,00.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-300">
                  Chave PIX Oficial (E-mail)
                </span>
                <div className="flex items-center justify-between gap-2 bg-black/50 p-2.5 rounded-lg border border-white/10">
                  <span className="font-mono text-white text-xs select-all">
                    capitulo500@demolaybrasil.org.br
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("capitulo500@demolaybrasil.org.br");
                      setPixCopied(true);
                      setTimeout(() => setPixCopied(false), 2500);
                    }}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-[#D9AA45] cursor-pointer"
                    title="Copiar Chave PIX"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {pixCopied && <p className="text-[10px] text-emerald-400 font-bold">✓ Chave copiada!</p>}
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#D9AA45]">
                  Conta e Titularidade
                </span>
                <p className="text-xs text-white">
                  <strong>Capítulo Professor Carvalho Neves Nº 500</strong>
                </p>
                <p className="text-[11px] text-emerald-200/60">
                  Banco parceiro: InfinitePay / Stone Pagamentos
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setIsPixModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GERAR MENSALIDADES DO MÊS */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#064D32] border border-white/20 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-[#D9AA45]" />
              <h3 className="text-lg font-bold">Gerar Mensalidades em Lote</h3>
            </div>
            <p className="text-xs text-emerald-200/70">
              O sistema criará automaticamente a cobrança de <strong>R$ 50,00</strong> com vencimento no dia 10 para todos os <strong>DeMolays Ativos</strong> do Capítulo.
            </p>

            <form onSubmit={handleGenerateMonthlyCharges} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">Mês de Referência</label>
                  <select
                    value={generateMonth}
                    onChange={(e) => setGenerateMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {new Date(2026, m - 1).toLocaleString("pt-BR", { month: "long" }).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">Ano</label>
                  <select
                    value={generateYear}
                    onChange={(e) => setGenerateYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? "Processando..." : "Confirmar e Gerar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DECLARAÇÃO DE QUITAÇÃO TIMBRADA OFICIAL */}
      {quitacaoMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl p-8 rounded-3xl bg-white text-gray-900 shadow-2xl space-y-6 border-4 border-[#087443] print:p-0 print:border-none">
            {/* Cabeçalho Oficial Timbrado */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-[#D9AA45]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#087443] text-[#D9AA45] flex items-center justify-center font-bold">
                  <Shield className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-[10px] font-bold tracking-widest uppercase text-[#087443]">
                    Ordem DeMolay • Capítulo Professor Carvalho Neves Nº 500
                  </h4>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">
                    Declaração de Quitação Financeira
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Patrocinado pela A∴R∴L∴S∴ Caridade II nº 135 — Teresina/PI
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-mono text-gray-400 block">CÓDIGO DE VERIFICAÇÃO</span>
                <span className="font-mono font-bold text-xs text-[#087443]">{quitacaoMember.code}</span>
              </div>
            </div>

            {/* Texto da Declaração */}
            <div className="space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed text-justify">
              <p>
                A <strong>Tesouraria do Capítulo Professor Carvalho Neves Nº 500</strong> da Ordem DeMolay, no uso de suas atribuições legais e estatutárias, <strong>DECLARA</strong>, para os devidos fins de direito perante os órgãos capitulares, estaduais e nacionais, que o irmão:
              </p>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                <p><strong>Nome Completo:</strong> {quitacaoMember.name}</p>
                <p><strong>ID SISDM / DeMolay Brasil:</strong> {quitacaoMember.cid}</p>
                <p><strong>Período de Referência:</strong> Mensalidade de {quitacaoMember.period}</p>
                <p><strong>Situação Financeira:</strong> <span className="text-emerald-700 font-bold">REGULAR E QUITADO</span></p>
              </div>

              <p>
                Encontra-se rigorosamente em dia com suas obrigações capitulares relativas à taxa de manutenção e mensalidades, estando apto para participação nos trabalhos ritualísticos e emissão de atestados de regularidade.
              </p>

              <p className="text-right pt-4 text-xs text-gray-600">
                Teresina - PI, {quitacaoMember.date}.
              </p>
            </div>

            {/* Assinaturas Digitais */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200 text-center text-xs">
              <div>
                <div className="w-36 h-0.5 bg-gray-400 mx-auto mb-1" />
                <p className="font-bold text-gray-900">Tesoureiro Capitular</p>
                <p className="text-[10px] text-gray-500">Capítulo Professor Carvalho Neves Nº 500</p>
              </div>
              <div>
                <div className="w-36 h-0.5 bg-gray-400 mx-auto mb-1" />
                <p className="font-bold text-gray-900">Mestre Conselheiro</p>
                <p className="text-[10px] text-gray-500">Gestão XXIII • 2025.2 / 2026</p>
              </div>
            </div>

            {/* Botões do Modal */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 print:hidden text-xs">
              <span className="text-[10px] text-gray-400">
                Válido por 90 dias a contar da data de emissão.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#087443] hover:bg-[#064D32] text-white font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuitacaoMember(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
