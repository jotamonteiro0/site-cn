"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, 
  ShieldCheck, 
  Award, 
  AlertCircle, 
  Search, 
  PlusCircle, 
  FileText, 
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles
} from "lucide-react";

interface MemberRecord {
  id: string;
  cid: string;
  full_name: string;
  category: "macom" | "demolay_ativo" | "senior_demolay" | "irregular";
  regularity: string | null;
  status: string;
  is_active: boolean;
  email?: string | null;
}

type FilterCategory = "todos" | "demolay_ativo" | "macom" | "senior_demolay" | "irregular";

const categoryConfig: Record<string, { label: string; badgeClass: string; borderClass: string; icon: typeof Users }> = {
  demolay_ativo: {
    label: "DeMolay Ativo",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    borderClass: "border-emerald-500/40",
    icon: Users,
  },
  macom: {
    label: "Maçom",
    badgeClass: "bg-amber-500/15 text-[#D9AA45] border-amber-500/30",
    borderClass: "border-amber-500/40",
    icon: ShieldCheck,
  },
  senior_demolay: {
    label: "Sênior DeMolay",
    badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    borderClass: "border-blue-500/40",
    icon: Award,
  },
  irregular: {
    label: "Irregular",
    badgeClass: "bg-red-500/15 text-red-300 border-red-500/30",
    borderClass: "border-red-500/40",
    icon: AlertCircle,
  },
};

export default function DashboardPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("todos");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchMembers() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("members")
          .select("id, cid, full_name, category, regularity, status, is_active, email")
          .order("full_name", { ascending: true });

        if (error) {
          console.error("Erro ao carregar membros:", error);
        } else if (data) {
          setMembers(data as MemberRecord[]);
        }
      } catch (err) {
        console.error("Erro de conexão ao carregar quadro de membros:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMembers();
  }, []);

  // Métricas calculadas diretamente dos dados reais
  const counts = useMemo(() => {
    return {
      total: members.length,
      demolay_ativo: members.filter((m) => m.category === "demolay_ativo").length,
      macom: members.filter((m) => m.category === "macom").length,
      senior_demolay: members.filter((m) => m.category === "senior_demolay").length,
      irregular: members.filter((m) => m.category === "irregular").length,
    };
  }, [members]);

  // Lista filtrada por Categoria e Busca
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesCategory = activeFilter === "todos" || m.category === activeFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        term === "" ||
        m.full_name.toLowerCase().includes(term) ||
        (m.cid && m.cid.includes(term)) ||
        (m.regularity && m.regularity.toLowerCase().includes(term));

      return matchesCategory && matchesSearch;
    });
  }, [members, activeFilter, searchTerm]);

  return (
    <div className="space-y-8">
      {/* Topo do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/40">
              Gestão XXIII • 2025.2 / 2026
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-300">Conexão Oficial SISDM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Painel Geral do Capítulo
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Capítulo Professor Carvalho Neves Nº 500 — Teresina/PI
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#087443] hover:bg-[#087443]/80 border border-[#D9AA45]/50 text-white font-semibold text-xs transition-all shadow-md">
            <PlusCircle className="w-4 h-4 text-[#D9AA45]" />
            <span>Fazer Chamada</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all">
            <FileText className="w-4 h-4 text-emerald-300" />
            <span>Nova Ata</span>
          </button>
        </div>
      </div>

      {/* Grade de Métricas Reais do Censo SISDM */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* DeMolay Ativos */}
        <button
          onClick={() => setActiveFilter("demolay_ativo")}
          className={`text-left bg-white/5 backdrop-blur-md border rounded-2xl p-5 transition-all shadow-lg group hover:scale-[1.02] ${
            activeFilter === "demolay_ativo" ? "border-emerald-400 bg-emerald-950/20" : "border-white/10 hover:border-emerald-500/50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
              DeMolay Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">
            {isLoading ? "..." : counts.demolay_ativo}
          </p>
          <p className="text-xs text-emerald-300/70 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            12 a 21 anos regulares
          </p>
        </button>

        {/* Maçons */}
        <button
          onClick={() => setActiveFilter("macom")}
          className={`text-left bg-white/5 backdrop-blur-md border rounded-2xl p-5 transition-all shadow-lg group hover:scale-[1.02] ${
            activeFilter === "macom" ? "border-amber-400 bg-amber-950/20" : "border-white/10 hover:border-[#D9AA45]/50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
              Maçons / Consultores
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#D9AA45]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#D9AA45]">
            {isLoading ? "..." : counts.macom}
          </p>
          <p className="text-xs text-emerald-300/70 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D9AA45]"></span>
            Tios consultores da Loja
          </p>
        </button>

        {/* Sênior DeMolay */}
        <button
          onClick={() => setActiveFilter("senior_demolay")}
          className={`text-left bg-white/5 backdrop-blur-md border rounded-2xl p-5 transition-all shadow-lg group hover:scale-[1.02] ${
            activeFilter === "senior_demolay" ? "border-blue-400 bg-blue-950/20" : "border-white/10 hover:border-blue-500/50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
              Sêniores DeMolay
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">
            {isLoading ? "..." : counts.senior_demolay}
          </p>
          <p className="text-xs text-blue-200/70 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Maioridade atingida (+21)
          </p>
        </button>

        {/* Irregular / Inativo */}
        <button
          onClick={() => setActiveFilter("irregular")}
          className={`text-left bg-white/5 backdrop-blur-md border rounded-2xl p-5 transition-all shadow-lg group hover:scale-[1.02] ${
            activeFilter === "irregular" ? "border-red-400 bg-red-950/20" : "border-white/10 hover:border-red-500/50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
              Irregular / Inativo
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">
            {isLoading ? "..." : counts.irregular}
          </p>
          <p className="text-xs text-red-200/70 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            Pendente de regularização
          </p>
        </button>
      </div>

      {/* SEÇÃO PRINCIPAL: QUADRO DE MEMBROS COM FILTROS */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#D9AA45]" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Quadro Geral de Membros do Capítulo
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-emerald-200/70 mt-1">
              Filtre e visualize todos os membros cadastrados na base do SISDM
            </p>
          </div>

          {/* Campo de Busca em Tempo Real */}
          <div className="relative w-full lg:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-300">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-[#D9AA45] transition-all"
            />
          </div>
        </div>

        {/* BARRAS DE FILTROS SOLICITADOS: Maçom, DeMolay Ativo, Sênior DeMolay, Irregular */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveFilter("todos")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              activeFilter === "todos"
                ? "bg-[#087443] text-white border-[#D9AA45] shadow-md"
                : "bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span>Todos os Membros</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-emerald-200">
              {counts.total}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter("demolay_ativo")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              activeFilter === "demolay_ativo"
                ? "bg-emerald-600 text-white border-emerald-300 shadow-md"
                : "bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-300" />
            <span>DeMolay Ativo</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-emerald-200">
              {counts.demolay_ativo}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter("macom")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              activeFilter === "macom"
                ? "bg-[#c59637] text-[#04281A] font-bold border-amber-200 shadow-md"
                : "bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Maçom</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30">
              {counts.macom}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter("senior_demolay")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              activeFilter === "senior_demolay"
                ? "bg-blue-600 text-white border-blue-300 shadow-md"
                : "bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Award className="w-3.5 h-3.5 text-blue-300" />
            <span>Sênior DeMolay</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-blue-200">
              {counts.senior_demolay}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter("irregular")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              activeFilter === "irregular"
                ? "bg-red-600 text-white border-red-300 shadow-md"
                : "bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-300" />
            <span>Irregular</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 text-red-200">
              {counts.irregular}
            </span>
          </button>
        </div>

        {/* Tabela de Membros */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm text-emerald-100/90">
            <thead className="bg-white/10 text-xs uppercase tracking-wider text-emerald-200 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">ID SISDM</th>
                <th className="py-3 px-4">Nome do Membro</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Regularidade</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-emerald-200/60">
                    <div className="inline-block w-6 h-6 border-2 border-[#D9AA45] border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Carregando censo de membros do Supabase...</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-emerald-200/60">
                    Nenhum membro encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const cfg = categoryConfig[m.category] || categoryConfig.demolay_ativo;
                  const Icon = cfg.icon;
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#D9AA45]">
                        #{m.cid || "S/ID"}
                      </td>

                      {/* Nome */}
                      <td className="py-3.5 px-4 font-medium text-white group-hover:text-[#D9AA45] transition-colors">
                        {m.full_name}
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badgeClass}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Regularidade */}
                      <td className="py-3.5 px-4 text-xs text-emerald-200/80">
                        {m.regularity || "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {m.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span>Ativo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-300">
                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                            <span>Inativo</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela com contador */}
        <div className="flex items-center justify-between text-xs text-emerald-200/60 pt-2">
          <span>
            Exibindo <strong>{filteredMembers.length}</strong> de <strong>{members.length}</strong> membros
          </span>
          <span className="text-[11px]">
            Base de dados sincronizada com o Capítulo Carvalho Neves Nº 500
          </span>
        </div>
      </div>
    </div>
  );
}
