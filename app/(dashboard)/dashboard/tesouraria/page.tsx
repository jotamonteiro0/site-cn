"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  ShieldCheck,
  CheckSquare,
  Square,
  Users,
  Send,
  X,
  RefreshCw
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
  payment_method?: string;
  infinitepay_checkout_url?: string;
  member?: {
    id_demolay: string;
    category: string;
    masonic_lodge?: string;
  };
}

export default function TesourariaPage() {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("all");
  const [charges, setCharges] = useState<MemberCharge[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendente" | "confirmado">("todos");
  
  // Abas de Planilha dedicadas: DeMolays Ativos, Conselho Consultivo e Visão Geral
  const [activeSheet, setActiveSheet] = useState<"demolay" | "conselho" | "todas">("demolay");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Seleção múltipla de mensalidades (Pagamento e Baixa em Lote)
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [isBatchConfirmModalOpen, setIsBatchConfirmModalOpen] = useState(false);
  const [batchPaymentMethod, setBatchPaymentMethod] = useState("baixa_manual");
  const [batchNotes, setBatchNotes] = useState("");
  const [isBatchConfirming, setIsBatchConfirming] = useState(false);

  // Modal de Cobrança / PIX em Lote
  const [isBatchPayModalOpen, setIsBatchPayModalOpen] = useState(false);
  const [batchPayData, setBatchPayData] = useState<{
    totalAmount: number;
    count: number;
    chargeIds: string[];
    descriptions: string[];
    pixPayload: string;
    pixQrCodeUrl: string;
    infinitePayUrl?: string;
    txid: string;
  } | null>(null);
  const [isGeneratingBatchPay, setIsGeneratingBatchPay] = useState(false);
  const [pixBatchCopied, setPixBatchCopied] = useState(false);

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
        }
      } catch (err) {
        console.error("Erro ao carregar períodos:", err);
      }
    }
    loadPeriods();
  }, []);

  // 3. Carrega Cobranças (suporta filtro por período ou todas as competências)
  const loadCharges = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
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
          payment_method,
          infinitepay_checkout_url,
          member:members (
            id_demolay,
            category,
            masonic_lodge
          )
        `)
        .order("payer_name", { ascending: true });

      if (selectedPeriodId && selectedPeriodId !== "all") {
        query = query.eq("financial_period_id", selectedPeriodId);
      }

      const { data } = await query;
      if (data) {
        setCharges(data as unknown as MemberCharge[]);
      }
    } catch (err) {
      console.error("Erro ao carregar mensalidades:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    let isMounted = true;
    async function fetchCharges() {
      try {
        const supabase = createClient();
        let query = supabase
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
            payment_method,
            infinitepay_checkout_url,
            member:members (
              id_demolay,
              category,
              masonic_lodge
            )
          `)
          .order("payer_name", { ascending: true });

        if (selectedPeriodId && selectedPeriodId !== "all") {
          query = query.eq("financial_period_id", selectedPeriodId);
        }

        const { data } = await query;
        if (isMounted && data) {
          setCharges(data as unknown as MemberCharge[]);
        }
      } catch (err) {
        if (isMounted) console.error("Erro ao carregar mensalidades:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchCharges();
    return () => {
      isMounted = false;
    };
  }, [selectedPeriodId]);

  // Período Selecionado Atual
  const selectedPeriod = useMemo(() => {
    if (selectedPeriodId === "all") return null;
    return periods.find((p) => p.id === selectedPeriodId);
  }, [periods, selectedPeriodId]);

  // Membros do Conselho Consultivo que possuem mensalidade devida (R$ 25,00)
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

  // Listagem de DeMolays Ativos (R$ 22,00)
  const demolayCharges = useMemo(() => {
    return charges.filter(
      (c) => c.payer_type === "demolay" || c.member?.category === "demolay_ativo"
    );
  }, [charges]);

  // Listagem do Conselho Consultivo (R$ 25,00)
  const conselhoCharges = useMemo(() => {
    return charges.filter((c) => {
      // Exclui expressamente José Airton e pessoas fora do Conselho
      if (c.member?.id_demolay === "102836" || c.payer_name?.toLowerCase().includes("airton")) return false;
      return c.member_id && conselhoMemberIds.has(c.member_id);
    });
  }, [charges, conselhoMemberIds]);

  // Planilha Ativa Base
  const activeBaseList = useMemo(() => {
    if (activeSheet === "demolay") return demolayCharges;
    if (activeSheet === "conselho") return conselhoCharges;
    return charges;
  }, [activeSheet, demolayCharges, conselhoCharges, charges]);

  // Estatísticas Financeiras Institucionais
  const stats = useMemo(() => {
    let totalPrevisto = 0;
    let totalPago = 0;
    let totalPendente = 0;
    let qtdPago = 0;
    const qtdTotal = activeBaseList.length;

    activeBaseList.forEach((c) => {
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
      qtdDemolay: demolayCharges.length,
      pagoDemolay: demolayCharges.filter((c) => c.status === "confirmado").length,
    };
  }, [activeBaseList, conselhoCharges, demolayCharges]);

  // Filtros de Busca e Status
  const filteredCharges = useMemo(() => {
    return activeBaseList.filter((c) => {
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
  }, [activeBaseList, statusFilter, searchTerm]);

  // Cálculos para a seleção múltipla atual
  const selectedChargesList = useMemo(() => {
    return charges.filter((c) => selectedChargeIds.includes(c.id));
  }, [charges, selectedChargeIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedChargesList.reduce((acc, c) => acc + Number(c.amount || 0), 0);
  }, [selectedChargesList]);

  // Alterna seleção de uma cobrança
  const handleToggleSelectCharge = (chargeId: string) => {
    setSelectedChargeIds((prev) =>
      prev.includes(chargeId) ? prev.filter((id) => id !== chargeId) : [...prev, chargeId]
    );
  };

  // Seleciona todas as cobranças da visualização filtrada atual
  const handleToggleSelectAll = () => {
    const visibleIds = filteredCharges.map((c) => c.id);
    const allSelected = visibleIds.every((id) => selectedChargeIds.includes(id));
    if (allSelected) {
      setSelectedChargeIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedChargeIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Dar Baixa / Estornar Pagamento Individual
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
          payment_method: newStatus === "confirmado" ? "baixa_manual" : null,
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

  // Executa Baixa Manual em Lote pelo Tesoureiro
  const handleBatchConfirm = async () => {
    if (selectedChargeIds.length === 0) return;
    setIsBatchConfirming(true);
    try {
      const res = await fetch("/api/charges/batch-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charge_ids: selectedChargeIds,
          payment_method: batchPaymentMethod,
          notes: batchNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao confirmar baixa em lote.");
      }

      setFeedbackMsg(data.message || `${selectedChargeIds.length} mensalidades baixadas com sucesso!`);
      setSelectedChargeIds([]);
      setIsBatchConfirmModalOpen(false);
      await loadCharges();
      setTimeout(() => setFeedbackMsg(""), 6000);
    } catch (err: unknown) {
      console.error("Erro na baixa em lote:", err);
      alert(err instanceof Error ? err.message : "Falha ao processar baixa em lote.");
    } finally {
      setIsBatchConfirming(false);
    }
  };

  // Gera Link Pix / Checkout em Lote pelo Tesoureiro
  const handleGenerateBatchPayLink = async () => {
    if (selectedChargeIds.length === 0) return;
    const selectedList = charges.filter((c) => selectedChargeIds.includes(c.id));
    const memberIds = Array.from(new Set(selectedList.map((c) => c.member_id)));

    if (memberIds.length > 1) {
      alert("Para gerar pagamento Pix consolidado, todas as mensalidades selecionadas devem pertencer ao mesmo membro.");
      return;
    }

    setIsGeneratingBatchPay(true);
    try {
      const res = await fetch("/api/charges/batch-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberIds[0],
          charge_ids: selectedChargeIds,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao gerar cobrança.");
      }

      setBatchPayData({
        totalAmount: data.total_amount,
        count: data.count,
        chargeIds: data.charge_ids,
        descriptions: data.descriptions,
        pixPayload: data.pix_copia_cola,
        pixQrCodeUrl: data.pix_qrcode_url,
        infinitePayUrl: data.infinitepay_url,
        txid: data.txid,
      });
      setIsBatchPayModalOpen(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Falha ao gerar cobrança consolidada.");
    } finally {
      setIsGeneratingBatchPay(false);
    }
  };

  // Gerar Mensalidades em Lote via RPC (Conselho Consultivo R$ 25,00)
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
    if (!selectedPeriodId || selectedPeriodId === "all") return;
    setIsUpdating(true);
    try {
      const supabase = createClient();
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in pb-20">
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
            Gestão unificada de mensalidades de DeMolays e Conselho Consultivo, baixas em lote, PIX e InfinitePay
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
            <span>Gerar Relatório</span>
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

      {/* SELETOR DE COMPETÊNCIA / PERÍODO DE MENSALIDADE */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#0C1D14] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45] font-mono">
            Competência / Período
          </span>
          <div className="flex items-center gap-3 mt-1.5">
            <Calendar className="w-5 h-5 text-emerald-300 shrink-0" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-[#064D32] border border-emerald-500/40 rounded-lg px-4 py-2 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
            >
              <option value="all">Todas as Competências (Acervo Completo)</option>
              {periods.map((p) => {
                const mesNome = new Date(p.year, p.month - 1).toLocaleString("pt-BR", { month: "long" });
                return (
                  <option key={p.id} value={p.id}>
                    {mesNome.toUpperCase()} de {p.year}
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
            <span className="text-gray-400">Mensalidade DeMolay:</span>{" "}
            <span className="font-bold text-emerald-300 font-mono tabular-nums">R$ 22,00</span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/30 border border-white/10">
            <span className="text-gray-400">Conselho Consultivo:</span>{" "}
            <span className="font-bold text-[#D9AA45] font-mono tabular-nums">R$ 25,00</span>
          </div>
        </div>
      </div>

      {/* 4 CARDS RESUMO DO MÊS SELECIONADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-heraldico-dark p-5 rounded-xl space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80 font-mono">
            Previsão do Período
          </span>
          <p className="text-2xl font-extrabold text-white font-mono tabular-nums">
            R$ {stats.totalPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-200/60 font-mono tabular-nums">
            {stats.qtdTotal} pagantes {activeSheet === "demolay" ? "(DeMolays Ativos)" : activeSheet === "conselho" ? "(Conselho Consultivo)" : "(Geral)"}
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

      {/* ABAS DE PLANILHA: DEMOLAYS ATIVOS VS CONSELHO CONSULTIVO VS TODAS */}
      <div className="space-y-4">
        {/* Seletor de Planilha por Abas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Aba 1: DeMolays Ativos */}
            <button
              type="button"
              onClick={() => {
                setActiveSheet("demolay");
                setSelectedChargeIds([]);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSheet === "demolay"
                  ? "bg-[#087443] text-white border border-[#D9AA45]/60 shadow-sm"
                  : "bg-white/5 text-emerald-200/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4 text-emerald-300" />
              <span>DeMolays Ativos (R$ 22,00)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-emerald-200 font-mono tabular-nums">
                {demolayCharges.length}
              </span>
            </button>

            {/* Aba 2: Conselho Consultivo */}
            <button
              type="button"
              onClick={() => {
                setActiveSheet("conselho");
                setSelectedChargeIds([]);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSheet === "conselho"
                  ? "bg-[#087443] text-white border border-[#D9AA45]/60 shadow-sm"
                  : "bg-white/5 text-emerald-200/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Building className="w-4 h-4 text-[#D9AA45]" />
              <span>Conselho Consultivo (R$ 25,00)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-emerald-200 font-mono tabular-nums">
                {conselhoCharges.length}
              </span>
            </button>

            {/* Aba 3: Todas as Mensalidades */}
            <button
              type="button"
              onClick={() => {
                setActiveSheet("todas");
                setSelectedChargeIds([]);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSheet === "todas"
                  ? "bg-[#087443] text-white border border-[#D9AA45]/60 shadow-sm"
                  : "bg-white/5 text-emerald-200/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-300" />
              <span>Todas as Mensalidades (Geral)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-emerald-200 font-mono tabular-nums">
                {charges.length}
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
              placeholder="Buscar por nome, ID DeMolay ou Loja..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white text-xs placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
            />
          </div>
        </div>

        {/* Linha de Filtros: Status de Pagamento */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 mr-1">Filtrar Situação:</span>
            {[
              { id: "todos", label: "Todos", count: filteredCharges.length },
              { id: "pendente", label: "Pendentes (Em Aberto)", count: activeBaseList.filter((c) => c.status !== "confirmado").length },
              { id: "confirmado", label: "Quitados (Baixados)", count: activeBaseList.filter((c) => c.status === "confirmado").length },
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

          {/* Botão de Selecionar Todas Visíveis */}
          {filteredCharges.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs text-[#D9AA45] hover:underline flex items-center gap-1.5 cursor-pointer font-mono"
            >
              {filteredCharges.every((c) => selectedChargeIds.includes(c.id)) ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Desmarcar Todas da Lista</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Selecionar Todas ({filteredCharges.length})</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* TABELA / PLANILHA FINANCEIRA COM CAIXAS DE SELEÇÃO */}
        <div className="rounded-xl bg-[#0C1D14] border border-white/10 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#08140E] border-b border-white/10 text-emerald-300 uppercase tracking-wider text-[10px] font-bold font-mono">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todas"
                      checked={
                        filteredCharges.length > 0 &&
                        filteredCharges.every((c) => selectedChargeIds.includes(c.id))
                      }
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-[#D9AA45] bg-[#0C1D14] border-white/20 focus:ring-[#D9AA45] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">ID DeMolay / CIM</th>
                  <th className="py-3 px-4">Nome do Membro / Pagador</th>
                  <th className="py-3 px-4">Categoria / Origem</th>
                  <th className="py-3 px-4">Competência / Vencimento</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações do Tesoureiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-emerald-200/50 font-mono">
                      Carregando planilha de mensalidades...
                    </td>
                  </tr>
                ) : filteredCharges.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-emerald-200/50">
                      Nenhum registro encontrado nesta planilha com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredCharges.map((c) => {
                    const isPago = c.status === "confirmado";
                    const isSelected = selectedChargeIds.includes(c.id);

                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors ${
                          isSelected ? "bg-[#087443]/20" : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectCharge(c.id)}
                            className="w-4 h-4 rounded text-[#D9AA45] bg-[#0C1D14] border-white/20 focus:ring-[#D9AA45] cursor-pointer"
                          />
                        </td>
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
                          <span className="text-[11px] font-medium text-emerald-100/90">
                            {c.payer_type === "demolay"
                              ? "DeMolay Ativo"
                              : conselhoMembersMap.get(c.member_id)?.sponsoring_lodge || c.member?.masonic_lodge || "Conselho Consultivo"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-emerald-100/70 font-mono tabular-nums">
                          {c.description ? (
                            <span className="block text-[11px] text-white/90 font-sans font-semibold">
                              {c.description}
                            </span>
                          ) : null}
                          <span>Venc: {c.due_date ? new Date(c.due_date).toLocaleDateString("pt-BR") : "28/11/2026"}</span>
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

      {/* ========================================================= */}
      {/* BARRA FLUTUANTE DE OPERAÇÕES EM LOTE PARA O TESOUREIRO    */}
      {/* ========================================================= */}
      {selectedChargeIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0C1D14]/95 backdrop-blur-md border border-[#D9AA45]/50 rounded-2xl shadow-2xl p-4 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row items-center gap-4 text-xs animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9AA45] animate-ping" />
            <span className="font-bold text-white font-mono">
              {selectedChargeIds.length} mensalidade(s) selecionada(s)
            </span>
            <span className="text-white/40">•</span>
            <span className="font-extrabold text-[#D9AA45] text-sm font-mono tabular-nums">
              Total: R$ {selectedTotalAmount.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBatchConfirmModalOpen(true)}
              className="btn-heraldico-esmeralda px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#D9AA45]" />
              <span>Dar Baixa em Lote</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateBatchPayLink}
              disabled={isGeneratingBatchPay}
              className="btn-heraldico-ouro px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              <span>{isGeneratingBatchPay ? "Gerando..." : "Gerar PIX em Lote"}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedChargeIds([])}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              title="Limpar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE BAIXA EM LOTE PELO TESOUREIRO */}
      {isBatchConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/40 shadow-2xl space-y-5 text-white animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Confirmar Baixa de Pagamento em Lote</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchConfirmModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-300">
                Você está confirmando o recebimento de{" "}
                <strong className="text-white">{selectedChargeIds.length} mensalidades</strong> totalizando{" "}
                <strong className="text-[#D9AA45] text-sm font-mono">
                  R$ {selectedTotalAmount.toFixed(2).replace(".", ",")}
                </strong>
                .
              </p>

              {/* Lista resumida das cobranças */}
              <div className="max-h-44 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/10">
                {selectedChargesList.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-[11px] text-gray-300">
                    <span className="truncate max-w-[240px]">
                      {c.payer_name} — {c.description || "Mensalidade"}
                    </span>
                    <span className="font-mono font-bold text-white">
                      R$ {Number(c.amount).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-1">
                <label className="font-bold text-emerald-200">Forma de Pagamento Confirmada:</label>
                <select
                  value={batchPaymentMethod}
                  onChange={(e) => setBatchPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                >
                  <option value="baixa_manual">Baixa Manual Tesouraria</option>
                  <option value="pix">PIX Capitular</option>
                  <option value="dinheiro">Dinheiro em Mãos</option>
                  <option value="transferencia">Transferência Bancária</option>
                  <option value="infinitepay">InfinitePay / Cartão</option>
                </select>
              </div>

              {/* Observações Opcionais */}
              <div className="space-y-1">
                <label className="font-bold text-emerald-200">Observações Contábeis (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: Recebido em reunião pelo Irmão Tesoureiro"
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsBatchConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBatchConfirm}
                disabled={isBatchConfirming}
                className="btn-heraldico-esmeralda px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBatchConfirming ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{isBatchConfirming ? "Confirmando..." : "Confirmar Baixas"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PIX & LINK EM LOTE GERADO PARA COBRANÇA */}
      {isBatchPayModalOpen && batchPayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/40 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="text-base font-bold">Cobrança Consolidada Gerada</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchPayModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-center">
              <p className="text-gray-300">
                Cobrança de <strong>{batchPayData.count} mensalidade(s)</strong> no valor total de{" "}
                <strong className="text-lg text-[#D9AA45] font-mono block mt-1">
                  R$ {batchPayData.totalAmount.toFixed(2).replace(".", ",")}
                </strong>
              </p>

              {/* QR Code PIX */}
              {batchPayData.pixQrCodeUrl && (
                <div className="flex justify-center p-4 bg-white rounded-2xl max-w-[200px] mx-auto shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={batchPayData.pixQrCodeUrl}
                    alt="QR Code PIX em Lote"
                    className="w-40 h-40 object-contain"
                  />
                </div>
              )}

              {/* Código Pix Copia e Cola */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-emerald-200 uppercase font-mono">
                  Código Pix Copia e Cola:
                </label>
                <div className="flex items-center gap-2 bg-black/50 p-2.5 rounded-xl border border-white/10">
                  <input
                    type="text"
                    readOnly
                    value={batchPayData.pixPayload}
                    className="w-full bg-transparent font-mono text-[11px] text-emerald-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(batchPayData.pixPayload);
                      setPixBatchCopied(true);
                      setTimeout(() => setPixBatchCopied(false), 2500);
                    }}
                    className="p-1.5 rounded-lg bg-[#D9AA45] text-black font-bold shrink-0 cursor-pointer"
                    title="Copiar Pix"
                  >
                    {pixBatchCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {pixBatchCopied && (
                  <p className="text-[10px] text-emerald-400 font-bold font-mono">✓ Pix copiado!</p>
                )}
              </div>

              {/* Botão para Compartilhar / Enviar via WhatsApp */}
              <div className="pt-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Olá! Segue o Pix para pagamento consolidado de ${batchPayData.count} mensalidade(s) do Capítulo Carvalho Neves nº 500 no valor de R$ ${batchPayData.totalAmount.toFixed(2).replace(".", ",")}:\n\n${batchPayData.pixPayload}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-heraldico-esmeralda w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4 text-[#D9AA45]" />
                  <span>Enviar Pix via WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsBatchPayModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
              O sistema lançará a cobrança de <strong>R$ 25,00</strong> para os integrantes ativos do Conselho Consultivo, com vencimento no <strong>dia 28</strong>.
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
                    : "TODAS AS COMPETÊNCIAS / ACERVO COMPLETO"}
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
                <span className="text-[10px] uppercase font-bold text-gray-300 font-mono">Total Previsto</span>
                <p className="text-lg font-bold text-white mt-1 font-mono tabular-nums">
                  R$ {stats.totalPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-400 font-mono tabular-nums">{stats.qtdTotal} registros</p>
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
                </div>
              </div>

              <div className="p-4 rounded-lg bg-black/30 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="font-bold text-emerald-300">DeMolays Ativos (R$ 22,00)</span>
                  <span className="font-mono text-[11px] text-emerald-300 tabular-nums">
                    {stats.pagoDemolay} / {stats.qtdDemolay} quitadas
                  </span>
                </div>
                <div className="space-y-1 text-gray-300 font-mono tabular-nums">
                  <p className="flex justify-between">
                    <span>Arrecadado:</span>
                    <strong className="text-white">
                      R$ {(stats.pagoDemolay * 22).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Esperado Total:</span>
                    <strong className="text-white">
                      R$ {(stats.qtdDemolay * 22).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Observações da Tesouraria */}
            <div className="p-3.5 rounded-lg bg-black/20 border border-white/10 text-xs text-emerald-100/80 leading-relaxed font-light">
              <p>
                O presente relatório consolida os lançamentos contábeis e as baixas de pagamentos efetuadas via PIX, InfinitePay ou baixa manual em mãos, atestando a regularidade financeira e a transparência perante o Conselho Consultivo e o Capítulo.
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
                  <span className="text-[10px] text-emerald-300/70 mt-1 block font-mono">Valor padrão: R$ 25,00</span>
                </div>
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
            <button
              type="button"
              onClick={() => setQuitacaoMember(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white print:hidden cursor-pointer"
            >
              ✕
            </button>

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

            <div className="space-y-4 text-sm leading-relaxed text-emerald-100/90 text-justify font-light">
              <p>
                A Tesouraria do <strong>Capítulo Professor Carvalho Neves Nº 500</strong> declara para os devidos fins de comprovação e regularidade capitular que o {quitacaoMember.type === "macom" ? "Tio Maçom" : "Irmão DeMolay"}:
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
                Encontra-se devidamente <strong>QUITADO E ADIMPLENTE</strong> com suas obrigações financeiras perante esta Instituição referente ao período de <strong>{quitacaoMember.period}</strong>.
              </p>

              <p className="text-xs text-emerald-200/60">
                A presente declaração possui validade de 90 (noventa) dias a contar de sua data de emissão.
              </p>
            </div>

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
