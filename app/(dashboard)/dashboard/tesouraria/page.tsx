"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Search,
  PlusCircle,
  FileCheck,
  Printer,
  Copy,
  Shield,
  QrCode,
  UserCheck,
  Building,
  Check,
  ShieldCheck
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
  payer_type: "demolay" | "macom";
  description: string;
  amount: number;
  due_date: string;
  status: "pendente" | "confirmado" | "aguardando_confirmacao" | "cancelado";
  paid_at?: string;
  financial_period_id: string;
  member?: {
    id_demolay: string;
    category: string;
    masonic_lodge?: string;
  };
}

export default function TesourariaPage() {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [charges, setCharges] = useState<MemberCharge[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendente" | "confirmado">("todos");
  
  // Abas de Planilha dedicadas: Conselho Consultivo vs Acervo Histórico
  const [activeSheet, setActiveSheet] = useState<"conselho" | "historico">("conselho");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Permissões de Acesso (RBAC Guard)
  const [userRole, setUserRole] = useState<string>("membro");
  const [viewAsMember, setViewAsMember] = useState(false);
  const [isRoleChecked, setIsRoleChecked] = useState(false);

  // Sincroniza o modo "Ver como Membro" com a Sidebar e localStorage
  useEffect(() => {
    const checkViewAsMember = () => {
      try {
        const stored = localStorage.getItem("cn_view_as_member");
        setViewAsMember(stored === "true");
      } catch {
        // ignore
      }
    };
    const frameId = requestAnimationFrame(checkViewAsMember);
    window.addEventListener("cn_view_as_member_change", checkViewAsMember);
    window.addEventListener("storage", checkViewAsMember);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("cn_view_as_member_change", checkViewAsMember);
      window.removeEventListener("storage", checkViewAsMember);
    };
  }, []);

  const effectiveRole = viewAsMember ? "membro" : userRole;

  // Modais
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(11);
  const [generateYear, setGenerateYear] = useState(2026);

  // Modal Relatório Mensal Oficial
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Modal Alterar Valores de Mensalidade
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceMacom, setPriceMacom] = useState<number>(25);

  // Modal Declaração de Quitação
  const [quitacaoMember, setQuitacaoMember] = useState<{
    name: string;
    id_demolay: string;
    type: "demolay" | "macom";
    lodge?: string;
    code: string;
    date: string;
    period: string;
  } | null>(null);

  // 1. Checa Permissão do Usuário Logado
  useEffect(() => {
    async function checkUserRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isPermanentMaster =
            user.user_metadata?.id_demolay === "127738" ||
            user.user_metadata?.id_demolay === "102836" ||
            user.email === "joaomonteiro0@icloud.com" ||
            user.email === "airton@carvalhoneves500.org.br";

          const { data: membership } = await supabase
            .from("chapter_memberships")
            .select("role_code")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

          if (isPermanentMaster || membership?.role_code === "master") {
            setUserRole("master");
          } else if (membership?.role_code) {
            setUserRole(membership.role_code);
          }
        }
      } catch (err) {
        console.error("Erro ao validar permissões:", err);
      } finally {
        setIsRoleChecked(true);
      }
    }
    checkUserRole();
  }, []);

  // 2. Carrega Períodos Financeiros
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
          // Seleciona o mês de novembro/2026 ou o primeiro
          const match = pData.find((p) => p.month === 11 && p.year === 2026);
          setSelectedPeriodId(match ? match.id : pData[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar períodos:", err);
      }
    }
    loadPeriods();
  }, []);

  // 3. Carrega Cobranças do Período Selecionado
  const loadCharges = async () => {
    if (!selectedPeriodId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
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
            id_demolay,
            category,
            masonic_lodge
          )
        `)
        .eq("financial_period_id", selectedPeriodId)
        .order("payer_name", { ascending: true });

      if (data) {
        setCharges(data as unknown as MemberCharge[]);
      }
    } catch (err) {
      console.error("Erro ao carregar mensalidades do mês:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchCharges() {
      if (!selectedPeriodId) return;
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("member_charges")
          .select(`
            id,
            member_id,
            financial_period_id,
            payer_name,
            payer_type,
            description,
            amount,
            due_date,
            status,
            paid_at,
            payment_method,
            infinitepay_checkout_url,
            member:members (
              id_demolay,
              category,
              masonic_lodge
            )
          `)
          .eq("financial_period_id", selectedPeriodId)
          .order("payer_name", { ascending: true });

        if (!ignore && data) {
          setCharges(data as unknown as MemberCharge[]);
        }
      } catch (err) {
        console.error("Erro ao carregar mensalidades do mês:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    fetchCharges();
    return () => {
      ignore = true;
    };
  }, [selectedPeriodId]);

  // Período Selecionado Atual
  const selectedPeriod = useMemo(() => {
    return periods.find((p) => p.id === selectedPeriodId);
  }, [periods, selectedPeriodId]);

  // Membros do Conselho Consultivo que possuem mensalidade devida
  // Regra Institucional Definitiva: TODO integrante ativo do Conselho Consultivo deve pagar mensalidade (R$ 25,00),
  // independentemente de sua categoria cadastral ou de ser maçom (ex: Carlos André Machado da Silva Júnior 134106).
  const [conselhoMemberIds, setConselhoMemberIds] = useState<Set<string>>(new Set());
  const [conselhoMembersMap, setConselhoMembersMap] = useState<Map<string, { sponsoring_lodge: string; role_name: string }>>(new Map());

  // Carrega Composição Oficial do Conselho Consultivo da tabela relacional conselho_membros
  useEffect(() => {
    async function loadConselhoMembros() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("conselho_membros")
          .select("member_id, sponsoring_lodge, role_name")
          .eq("is_active", true);

        if (data && !error) {
          const ids = new Set(data.map((cm) => cm.member_id));
          const map = new Map(
            data.map((cm) => [
              cm.member_id,
              { sponsoring_lodge: cm.sponsoring_lodge, role_name: cm.role_name },
            ])
          );
          setConselhoMemberIds(ids);
          setConselhoMembersMap(map);
        }
      } catch (err) {
        console.error("Erro ao carregar conselho_membros:", err);
      }
    }
    loadConselhoMembros();
  }, []);

  const conselhoCharges = useMemo(() => {
    return charges.filter((c) => {
      // Exclui expressamente José Airton e pessoas fora do Conselho
      if (c.member?.id_demolay === "102836" || c.payer_name?.toLowerCase().includes("airton")) return false;
      // Membro ativo do Conselho Consultivo
      return c.member_id && conselhoMemberIds.has(c.member_id);
    });
  }, [charges, conselhoMemberIds]);

  // Estatísticas Financeiras Institucionais (Somente Maçons do Conselho Consultivo R$ 25,00)
  const stats = useMemo(() => {
    let totalPrevisto = 0;
    let totalPago = 0;
    let totalPendente = 0;
    let qtdPago = 0;
    const activeList = activeSheet === "conselho" ? conselhoCharges : charges;
    const qtdTotal = activeList.length;

    activeList.forEach((c) => {
      const amt = Number(c.amount || 0);
      totalPrevisto += amt;

      if (c.status === "confirmado") {
        totalPago += amt;
        qtdPago++;
      } else {
        totalPendente += amt;
      }
    });

    const percent = qtdTotal > 0 ? Math.round((qtdPago / qtdTotal) * 100) : 0;
    return {
      totalPrevisto,
      totalPago,
      totalPendente,
      qtdPago,
      qtdTotal,
      percent,
      qtdConselho: conselhoCharges.length,
      pagoConselho: conselhoCharges.filter((c) => c.status === "confirmado").length,
    };
  }, [charges, conselhoCharges, activeSheet]);

  // Dar Baixa / Estornar Pagamento
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
          payment_method: newStatus === "confirmado" ? "baixa_manual" : null
        })
        .eq("id", chargeId);

      if (error) throw error;

      setCharges((prev) =>
        prev.map((c) =>
          c.id === chargeId ? { ...c, status: newStatus as MemberCharge["status"], paid_at: paidAt || undefined } : c
        )
      );

      setFeedbackMsg(
        newStatus === "confirmado"
          ? "Baixa de pagamento registrada com sucesso!"
          : "Lançamento estornado para pendente."
      );
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch (err: unknown) {
      console.error("Erro ao alterar status da mensalidade:", err);
      alert("Não foi possível atualizar o pagamento. Verifique suas permissões.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Gerar Mensalidades em Lote via RPC (Somente Maçons do Conselho Consultivo R$ 25,00, Vencimento Dia 28)
  const handleGenerateMonthlyCharges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("generate_monthly_charges", {
        p_chapter_id: "00000000-0000-0000-0000-000000000500",
        p_year: generateYear,
        p_month: generateMonth,
      });

      if (error) throw error;

      setIsGenerateModalOpen(false);
      setFeedbackMsg(
        `Mensalidades geradas com sucesso para os 18 integrantes do Conselho Consultivo (R$ 25,00) com vencimento no dia 28!`
      );
      setTimeout(() => setFeedbackMsg(""), 5000);

      // Recarrega períodos e cobranças
      const { data: pData } = await supabase
        .from("financial_periods")
        .select("id, year, month, status")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (pData) {
        setPeriods(pData);
        const match = pData.find((p) => p.month === generateMonth && p.year === generateYear);
        if (match) setSelectedPeriodId(match.id);
      }

      await loadCharges();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tente novamente";
      console.error("Erro ao gerar mensalidades:", err);
      alert("Erro ao gerar mensalidades: " + msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // Modal Declaração de Quitação Oficial
  const handleOpenQuitacao = async (c: MemberCharge) => {
    const code = "CN-DECL-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const periodLabel = selectedPeriod
      ? `${new Date(selectedPeriod.year, selectedPeriod.month - 1).toLocaleString("pt-BR", { month: "long" }).toUpperCase()}/${selectedPeriod.year}`
      : "Exercício Vigente";

    setQuitacaoMember({
      name: c.payer_name,
      id_demolay: c.member?.id_demolay || "000000",
      type: c.payer_type,
      lodge: c.member?.masonic_lodge,
      code,
      date: new Date().toLocaleDateString("pt-BR"),
      period: periodLabel,
    });

    try {
      const supabase = createClient();
      await supabase.from("issued_declarations").insert({
        chapter_id: "00000000-0000-0000-0000-000000000500",
        member_id: c.member_id,
        declaration_type: "quitacao_tesouraria",
        verification_code: code,
        content_data: {
          payer_name: c.payer_name,
          payer_type: c.payer_type,
          amount: c.amount,
          period: periodLabel,
          status: c.status,
        },
      });
    } catch (err) {
      console.error("Erro ao registrar emissão de declaração:", err);
    }
  };

  // Alterar Valores das Mensalidades no período
  const handleUpdatePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId) return;
    setIsUpdating(true);
    try {
      const supabase = createClient();
      // Atualiza cobranças pendentes dos integrantes do Conselho Consultivo
      const conselhoIdsArray = Array.from(conselhoMemberIds);
      if (conselhoIdsArray.length > 0) {
        await supabase
          .from("member_charges")
          .update({ amount: priceMacom })
          .eq("financial_period_id", selectedPeriodId)
          .in("member_id", conselhoIdsArray)
          .eq("status", "pendente");
      }

      setCharges((prev) =>
        prev.map((c) => {
          if (c.status === "pendente" && conselhoMemberIds.has(c.member_id)) {
            return {
              ...c,
              amount: priceMacom,
            };
          }
          return c;
        })
      );

      setIsPriceModalOpen(false);
      setFeedbackMsg(
        `Valor da mensalidade do Conselho Consultivo atualizado para R$ ${priceMacom.toFixed(2)}`
      );
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("Erro ao atualizar valores:", err);
      alert("Erro ao atualizar valores de mensalidade: " + msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtros da Planilha Ativa (DeMolay ou Maçom), Status e Busca
  const filteredCharges = useMemo(() => {
    const listToFilter = activeSheet === "conselho" ? conselhoCharges : charges;
    return listToFilter.filter((c) => {
      // 1. Filtro de Status
      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "pendente" && c.status !== "confirmado") ||
        (statusFilter === "confirmado" && c.status === "confirmado");

      // 2. Filtro de Busca
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        c.payer_name.toLowerCase().includes(search) ||
        (c.member?.id_demolay && c.member.id_demolay.includes(search)) ||
        (c.member?.masonic_lodge && c.member.masonic_lodge.toLowerCase().includes(search));

      return matchesStatus && matchesSearch;
    });
  }, [charges, conselhoCharges, activeSheet, statusFilter, searchTerm]);

  // Se o usuário não for Tesoureiro nem Master, bloqueia visualização de dados financeiros
  if (isRoleChecked && effectiveRole !== "master" && effectiveRole !== "tesoureiro") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-sm">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito à Gestão da Tesouraria</h2>
        <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed font-light">
          A visualização do livro caixa capitular, baixas de pagamentos de terceiros e controle contábil geral são restritos ao Mestre Conselheiro, Presidente do Conselho Consultivo e ao Tesoureiro do Capítulo.
        </p>
        <Link
          href="/dashboard/membro"
          className="px-5 py-2.5 rounded-lg bg-[#087443] hover:bg-[#09884F] border border-[#D9AA45]/40 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <UserCheck className="w-4 h-4 text-[#D9AA45]" />
          <span>Acessar Meu Autoatendimento (Minhas Mensalidades)</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in">
      {/* Header com Navegação e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar à Visão Geral</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>Tesouraria Operacional Capitular</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1 font-light">
            Controle de mensalidades do Conselho Consultivo, baixas, PIX, InfinitePay e declarações
          </p>
        </div>

        {/* Ações Rápidas do Tesoureiro */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Principal: Gerar Relatório Mensal */}
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="btn-heraldico-ouro px-4 py-2.5 rounded-lg text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar Relatório Mensal</span>
          </button>

          {/* Botão Alterar Valor da Mensalidade */}
          <button
            type="button"
            onClick={() => setIsPriceModalOpen(true)}
            className="btn-heraldico-vidro px-3.5 py-2.5 rounded-lg text-xs"
          >
            <DollarSign className="w-4 h-4 text-[#D9AA45]" />
            <span>Alterar Valores</span>
          </button>

          {/* Botão PIX & InfinitePay */}
          <button
            type="button"
            onClick={() => setIsPixModalOpen(true)}
            className="btn-heraldico-vidro px-3.5 py-2.5 rounded-lg text-xs"
          >
            <QrCode className="w-4 h-4 text-emerald-300" />
            <span>PIX & InfinitePay</span>
          </button>

          {/* Botão Lançar Mensalidades em Lote */}
          <button
            type="button"
            onClick={() => setIsGenerateModalOpen(true)}
            className="btn-heraldico-vidro px-3 py-2.5 rounded-lg text-xs"
            title="Lançar mensalidades em lote para um novo mês"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Lançar Cobranças</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE ATUALIZAÇÃO */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* SELETOR DE MÊS E VENCIMENTO */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#0C1D14] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45] font-mono">
            Exercício Financeiro Selecionado
          </span>
          <div className="flex items-center gap-3 mt-1.5">
            <Calendar className="w-5 h-5 text-emerald-300 shrink-0" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-[#064D32] border border-emerald-500/40 rounded-lg px-4 py-2 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
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

        <div className="flex flex-wrap items-center gap-2.5 text-xs text-emerald-100/90">
          <div className="p-2.5 rounded-lg bg-black/30 border border-white/10">
            <span className="text-gray-400">Vencimento Padrão:</span>{" "}
            <span className="font-bold text-white font-mono">Todo dia 28</span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/30 border border-white/10">
            <span className="text-gray-400">Conselho Consultivo:</span>{" "}
            <span className="font-bold text-[#D9AA45] font-mono tabular-nums">R$ 25,00</span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/30 border border-white/10">
            <span className="text-gray-400">DeMolays e Sêniores:</span>{" "}
            <span className="font-bold text-emerald-300 font-mono">Isentos de Mensalidade</span>
          </div>
        </div>
      </div>

      {/* 4 CARDS RESUMO DO MÊS SELECIONADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-heraldico-dark p-5 rounded-xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80 font-mono">
            Previsão do Mês
          </span>
          <p className="text-2xl font-extrabold text-white font-mono tabular-nums">
            R$ {stats.totalPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-200/60 font-mono tabular-nums">
            {stats.qtdTotal} pagantes {activeSheet === "conselho" ? "(Conselho Consultivo)" : "(Acervo Histórico)"}
          </p>
        </div>

        <div className="card-heraldico-dark p-5 rounded-xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 font-mono">
            Total Arrecadado
          </span>
          <p className="text-2xl font-extrabold text-emerald-300 font-mono tabular-nums">
            R$ {stats.totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-200/60 font-mono tabular-nums">
            {stats.qtdPago} quitadas
          </p>
        </div>

        <div className="card-heraldico-dark p-5 rounded-xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9AA45] font-mono">
            Saldo a Receber
          </span>
          <p className="text-2xl font-extrabold text-[#D9AA45] font-mono tabular-nums">
            R$ {stats.totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-200/60 font-mono tabular-nums">
            {stats.qtdTotal - stats.qtdPago} mensalidades em aberto
          </p>
        </div>

        <div className="card-heraldico-dark p-5 rounded-xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80 font-mono">
            Taxa de Adimplência
          </span>
          <p className="text-2xl font-extrabold text-white font-mono tabular-nums">{stats.percent}%</p>
          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden mt-2 border border-white/10">
            <div
              className="bg-[#087443] h-full rounded-full transition-all"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ABAS DE PLANILHA: CONSELHO CONSULTIVO VS ACERVO HISTÓRICO */}
      <div className="space-y-4">
        {/* Seletor de Planilha por Abas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSheet("conselho")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSheet === "conselho"
                  ? "bg-[#087443] text-white border border-[#D9AA45]/60 shadow-sm"
                  : "bg-white/5 text-emerald-200/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Building className="w-4 h-4 text-[#D9AA45]" />
              <span>Conselho Consultivo (Mensalidades Vigentes)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-emerald-200 font-mono tabular-nums">
                {conselhoCharges.length} • R$ {priceMacom},00
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSheet("historico")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSheet === "historico"
                  ? "bg-[#087443] text-white border border-[#D9AA45]/60 shadow-sm"
                  : "bg-white/5 text-emerald-200/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-300" />
              <span>Acervo Geral / Auditoria Histórica</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-emerald-200 font-mono tabular-nums">
                {charges.length} registros
              </span>
            </button>
          </div>

          {/* Busca em Tempo Real */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeSheet === "conselho" ? "Buscar por nome do Conselheiro, CIM ou Loja..." : "Buscar no acervo histórico por nome, ID ou Loja..."}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white text-xs placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
            />
          </div>
        </div>

        {/* Linha de Filtros: Status de Pagamento */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-gray-400 mr-1">Filtrar Situação:</span>
          {[
            { id: "todos", label: "Todos os Registros", count: filteredCharges.length },
            { id: "pendente", label: "Pendentes (Em Aberto)", count: (activeSheet === "conselho" ? conselhoCharges : charges).filter((c) => c.status !== "confirmado").length },
            { id: "confirmado", label: "Quitados (Baixados)", count: (activeSheet === "conselho" ? conselhoCharges : charges).filter((c) => c.status === "confirmado").length },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id as "todos" | "confirmado" | "pendente")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                statusFilter === f.id
                  ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-sm"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        {/* TABELA / PLANILHA FINANCEIRA */}
        <div className="rounded-xl bg-[#0C1D14] border border-white/10 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#08140E] border-b border-white/10 text-emerald-300 uppercase tracking-wider text-[10px] font-bold font-mono">
                <tr>
                  <th className="py-3 px-4">{activeSheet === "conselho" ? "CIM / ID" : "ID"}</th>
                  <th className="py-3 px-4">{activeSheet === "conselho" ? "Nome do Conselheiro" : "Nome do Membro / Pagador"}</th>
                  <th className="py-3 px-4">{activeSheet === "conselho" ? "Loja Patrocinadora" : "Categoria / Origem"}</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações do Tesoureiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-200/50 font-mono">
                      Carregando planilha de mensalidades...
                    </td>
                  </tr>
                ) : filteredCharges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-200/50">
                      Nenhum registro encontrado nesta planilha com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredCharges.map((c) => {
                    const isPago = c.status === "confirmado";

                    return (
                      <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#D9AA45] tabular-nums">
                          {c.member?.id_demolay || "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <p>{c.payer_name}</p>
                          {c.paid_at && (
                            <p className="text-[10px] text-emerald-300/80 font-mono tabular-nums">
                              Baixa em {new Date(c.paid_at).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] text-[#D9AA45] font-medium">
                            {activeSheet === "conselho"
                              ? (conselhoMembersMap.get(c.member_id)?.sponsoring_lodge || c.member?.masonic_lodge || "A∴R∴L∴S∴ Caridade II nº 135")
                              : (c.payer_type === "demolay" ? "DeMolay (Histórico)" : "Tio Maçom")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-emerald-100/70 font-mono tabular-nums">
                          {c.due_date ? new Date(c.due_date).toLocaleDateString("pt-BR") : "28/11/2026"}
                        </td>
                        <td className="py-3 px-4 font-bold text-white font-mono tabular-nums">
                          R$ {Number(c.amount).toFixed(2).replace(".", ",")}
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
                            <span>{isPago ? "Quitado" : "Pendente"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Botão de Baixa / Estorno */}
                            <button
                              type="button"
                              onClick={() => handleTogglePaymentStatus(c.id, c.status)}
                              disabled={isUpdating}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isPago
                                  ? "bg-white/10 hover:bg-white/20 text-emerald-200"
                                  : "bg-[#087443] hover:bg-[#09884F] text-white shadow-sm"
                              }`}
                            >
                              {isPago ? "Estornar" : "Dar Baixa"}
                            </button>

                            {/* Botão de Emitir Declaração de Quitação */}
                            <button
                              type="button"
                              onClick={() => handleOpenQuitacao(c)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#D9AA45]/15 hover:bg-[#D9AA45]/25 text-[#D9AA45] border border-[#D9AA45]/30 transition-all cursor-pointer"
                              title="Emitir Declaração de Quitação Oficial"
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

      {/* MODAL: PIX & INFINITEPAY AUTOMÁTICO */}
      {isPixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="text-base font-bold">Configuração PIX & InfinitePay API</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsPixModalOpen(false)} 
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Chave PIX Oficial */}
              <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-300 font-mono">
                  Chave PIX Oficial do Capítulo (E-mail)
                </span>
                <div className="flex items-center justify-between gap-2 bg-black/50 p-2.5 rounded-lg border border-white/10">
                  <span className="font-mono text-white text-xs select-all">
                    capitulo500teresina@demolaypi.org.br
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("capitulo500teresina@demolaypi.org.br");
                      setPixCopied(true);
                      setTimeout(() => setPixCopied(false), 2500);
                    }}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-[#D9AA45] cursor-pointer"
                    title="Copiar Chave PIX"
                  >
                    {pixCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {pixCopied && <p className="text-[10px] text-emerald-400 font-bold font-mono">✓ Chave copiada!</p>}
              </div>

              {/* Conciliação Automática via Webhook InfinitePay */}
              <div className="p-3.5 rounded-lg bg-black/40 border border-[#D9AA45]/30 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D9AA45]" />
                  <span className="text-[10px] uppercase font-bold text-[#D9AA45] font-mono">
                    Conciliação Automática (InfinitePay Webhook)
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed font-light">
                  Para carregar os pagamentos <strong>automaticamente</strong> no sistema quando um irmão pagar pelo link ou cartão da InfinitePay, cadastre o endereço abaixo no painel da sua conta InfinitePay (em <em>Configurações &gt; Integrações / Webhooks</em>):
                </p>
                
                <div className="flex items-center justify-between gap-2 bg-black/60 p-2.5 rounded-lg border border-white/10">
                  <span className="font-mono text-white text-[11px] truncate select-all">
                    https://site-cn.vercel.app/api/webhooks/infinitepay
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("https://site-cn.vercel.app/api/webhooks/infinitepay");
                      setWebhookCopied(true);
                      setTimeout(() => setWebhookCopied(false), 2500);
                    }}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-[#D9AA45] cursor-pointer"
                    title="Copiar URL do Webhook"
                  >
                    {webhookCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {webhookCopied && <p className="text-[10px] text-emerald-400 font-bold font-mono">✓ URL do Webhook copiada!</p>}
              </div>

              {/* Informações de Titularidade */}
              <div className="p-3.5 rounded-lg bg-black/20 border border-white/10 text-gray-300 space-y-1 text-xs">
                <p><strong>Titular:</strong> Capítulo Professor Carvalho Neves Nº 500</p>
                <p><strong>Patrocinadora:</strong> A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)</p>
                <p><strong>Adquirente:</strong> InfinitePay / Stone Instituição de Pagamento S.A.</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                type="button"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-[#D9AA45]" />
              <h3 className="text-lg font-bold">Gerar Mensalidades em Lote</h3>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed font-light">
              O sistema lançará automaticamente a cobrança de <strong>R$ 22,00</strong> para os 35 DeMolays Ativos e <strong>R$ 25,00</strong> para os 27 Tios Maçons, com vencimento padronizado no <strong>dia 28 (final do mês)</strong>.
            </p>

            <form onSubmit={handleGenerateMonthlyCharges} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">Mês de Referência</label>
                  <select
                    value={generateMonth}
                    onChange={(e) => setGenerateMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
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
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
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
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#E5BA55] text-[#041A10] font-bold cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? "Gerando..." : "Confirmar e Lançar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GERAR RELATÓRIO MENSAL CONSOLIDADO (IMPRESSÃO & PDF) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-3xl my-8 p-6 sm:p-8 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/40 text-white shadow-2xl space-y-6 relative print:border-none print:shadow-none print:p-0 print:my-0 animate-in zoom-in-95">
            {/* Botão de Fechar */}
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white print:hidden cursor-pointer"
            >
              ✕
            </button>

            {/* Cabeçalho do Relatório Timbrado */}
            <div className="text-center space-y-1.5 border-b border-[#D9AA45]/40 pb-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9AA45] font-mono">
                Capítulo Professor Carvalho Neves Nº 500 • Ordem DeMolay
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-serif tracking-wide text-white">
                RELATÓRIO FINANCEIRO MENSAL CAPITULAR
              </h2>
              <p className="text-xs text-emerald-200/80">
                Exercício:{" "}
                <strong>
                  {selectedPeriod
                    ? `${new Date(selectedPeriod.year, selectedPeriod.month - 1).toLocaleString("pt-BR", { month: "long" }).toUpperCase()} DE ${selectedPeriod.year}`
                    : "MÊS CORRENTE"}
                </strong>{" "}
                • Vencimento Base: Dia 28
              </p>
              <p className="text-[11px] text-gray-400">
                Sede: A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI) — Teresina/PI
              </p>
            </div>

            {/* Quatro Indicadores Chave */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-black/30 border border-white/10 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-300 font-mono">Total Esperado</span>
                <p className="text-lg font-bold text-white mt-1 font-mono tabular-nums">
                  R$ {stats.totalPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-400 font-mono tabular-nums">{stats.qtdTotal} mensalidades</p>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-300 font-mono">Total Arrecadado</span>
                <p className="text-lg font-bold text-emerald-300 mt-1 font-mono tabular-nums">
                  R$ {stats.totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-emerald-400 font-mono tabular-nums">{stats.qtdPago} quitadas</p>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-center">
                <span className="text-[10px] uppercase font-bold text-[#D9AA45] font-mono">Pendente / Aberto</span>
                <p className="text-lg font-bold text-[#D9AA45] mt-1 font-mono tabular-nums">
                  R$ {stats.totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-amber-300 font-mono tabular-nums">{stats.qtdTotal - stats.qtdPago} pendentes</p>
              </div>

              <div className="p-3.5 rounded-lg bg-black/30 border border-white/10 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-300 font-mono">Adimplência</span>
                <p className="text-lg font-bold text-white mt-1 font-mono tabular-nums">{stats.percent}%</p>
                <p className="text-[10px] text-red-300 font-mono tabular-nums">{100 - stats.percent}% aberto</p>
              </div>
            </div>

            {/* Detalhamento por Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Conselho Consultivo (Maçons Pagantes) */}
              <div className="p-4 rounded-lg bg-black/30 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="font-bold text-[#D9AA45]">Conselho Consultivo (R$ {priceMacom},00)</span>
                  <span className="font-mono text-[11px] text-[#D9AA45] tabular-nums">
                    {stats.pagoConselho} / {stats.qtdConselho} quitadas
                  </span>
                </div>
                <div className="space-y-1 text-gray-300 font-mono tabular-nums">
                  <p className="flex justify-between">
                    <span>Arrecadado:</span>
                    <strong className="text-white">
                      R$ {(stats.pagoConselho * priceMacom).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Esperado Total:</span>
                    <strong className="text-white">
                      R$ {(stats.qtdConselho * priceMacom).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Pendente:</span>
                    <strong className="text-amber-300">
                      R$ {((stats.qtdConselho - stats.pagoConselho) * priceMacom).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                </div>
              </div>

              {/* DeMolays e Demais Membros */}
              <div className="p-4 rounded-lg bg-black/30 border border-emerald-500/30 space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="font-bold text-emerald-300">DeMolays e Sêniores</span>
                  <span className="font-mono text-[10px] text-emerald-300 uppercase">Isentos de Mensalidade</span>
                </div>
                <p className="text-[11px] text-emerald-100/70 leading-relaxed font-light">
                  De acordo com as normas institucionais, somente os Maçons que integram o Conselho Consultivo possuem mensalidade vinculada ao Capítulo.
                </p>
                <div className="p-2 rounded bg-black/40 border border-white/5 text-[10px] text-gray-400 font-mono">
                  Contribuição fixada exclusivamente para conselheiros ativos.
                </div>
              </div>
            </div>

            {/* Observações da Tesouraria */}
            <div className="p-3.5 rounded-lg bg-black/20 border border-white/10 text-xs text-emerald-100/80 leading-relaxed font-light">
              <p>
                O presente relatório consolida os lançamentos contábeis e as baixas de pagamentos efetuadas via PIX, InfinitePay ou dinheiro em mãos, atestando a regularidade financeira e a transparência perante o Conselho Consultivo e o Capítulo.
              </p>
            </div>

            {/* Assinatura Oficial do Tesoureiro */}
            <div className="pt-6 border-t border-[#D9AA45]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="text-center sm:text-left">
                <p className="font-bold text-white">Aloísio Oliveira Neto</p>
                <p className="text-[11px] text-[#D9AA45] font-mono">ID Nº 134104</p>
                <p className="text-[11px] text-emerald-200/70">
                  Tesoureiro do Capítulo Professor Carvalho Neves Nº 500
                </p>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#E5BA55] text-[#041A10] font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTERAR VALOR DA MENSALIDADE */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-[#D9AA45]" />
              <h3 className="text-lg font-bold">Alterar Valor das Mensalidades</h3>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed font-light">
              Defina o valor praticado pela Tesouraria para os integrantes do Conselho Consultivo. As alterações serão aplicadas às mensalidades em aberto do período selecionado.
            </p>

            <form onSubmit={handleUpdatePrices} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">
                    Mensalidade Conselho Consultivo (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      required
                      value={priceMacom}
                      onChange={(e) => setPriceMacom(Number(e.target.value))}
                      className="w-full pl-10 pr-3 py-2 rounded-lg bg-[#08140E] border border-white/20 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#D9AA45] font-mono tabular-nums"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-300/70 mt-1 block font-mono">Valor padrão vigente: R$ 25,00</span>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200">
                  <p>
                    <strong>Regra Institucional:</strong> DeMolays e Sêniores são isentos de mensalidade capitular. Somente os Maçons que pertencem ao Conselho Consultivo pagam a mensalidade.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-black/20 border border-white/10 text-[11px] text-gray-300">
                <p>
                  <strong>Vencimento:</strong> Todo dia 28 do mês. A atualização recalculará os saldos previstos e pendentes.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#E5BA55] text-[#041A10] font-bold cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? "Salvando..." : "Salvar Novos Valores"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DECLARAÇÃO DE QUITAÇÃO OFICIAL */}
      {quitacaoMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-2xl p-6 sm:p-8 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/40 text-white shadow-2xl space-y-6 relative print:border-none print:shadow-none print:p-0 animate-in zoom-in-95">
            {/* Botão de Fechar */}
            <button
              type="button"
              onClick={() => setQuitacaoMember(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white print:hidden cursor-pointer"
            >
              ✕
            </button>

            {/* Cabeçalho Oficial Timbrado */}
            <div className="text-center space-y-2 border-b border-[#D9AA45]/40 pb-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9AA45] font-mono">
                Ordem DeMolay • Capítulo Professor Carvalho Neves Nº 500
              </span>
              <h2 className="text-xl font-bold font-serif tracking-wide text-white">
                DECLARAÇÃO OFICIAL DE QUITAÇÃO FINANCEIRA
              </h2>
              <p className="text-xs text-emerald-200/70">
                Patrocinadora: A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI) — Teresina/PI
              </p>
            </div>

            {/* Texto da Declaração */}
            <div className="space-y-4 text-sm leading-relaxed text-emerald-100/90 text-justify font-light">
              <p>
                A Tesouraria do <strong>Capítulo Professor Carvalho Neves Nº 500</strong>, no uso de suas atribuições estatutárias e regimentais, declara para os devidos fins de comprovação e regularidade capitular que o {quitacaoMember.type === "macom" ? "Tio Maçom" : "Irmão DeMolay"}:
              </p>

              <div className="p-4 rounded-lg bg-black/40 border border-white/10 space-y-1">
                <p className="text-base font-bold text-[#D9AA45]">{quitacaoMember.name}</p>
                <p className="text-xs text-gray-300 font-mono">
                  {quitacaoMember.type === "macom"
                    ? `Filiação Maçônica: ${quitacaoMember.lodge || "A∴R∴L∴S∴ Caridade II nº 135"}`
                    : `ID DeMolay: ${quitacaoMember.id_demolay}`}
                </p>
              </div>

              <p>
                Encontra-se devidamente <strong>QUITADO E ADIMPLENTE</strong> com suas obrigações financeiras e mensalidades regimentais perante esta Instituição referente ao período de <strong>{quitacaoMember.period}</strong>.
              </p>

              <p className="text-xs text-emerald-200/60">
                A presente declaração possui validade legal e fraternal de 90 (noventa) dias a contar de sua data de emissão.
              </p>
            </div>

            {/* Rodapé e Autenticação */}
            <div className="pt-6 border-t border-[#D9AA45]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div>
                <span className="block text-[10px] text-gray-400">Código de Verificação de Autenticidade:</span>
                <span className="font-mono font-bold text-[#D9AA45] text-sm select-all">
                  {quitacaoMember.code}
                </span>
                <span className="block text-[10px] text-gray-400 mt-0.5 font-mono">Emitido em: {quitacaoMember.date}</span>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#E5BA55] text-[#041A10] font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
