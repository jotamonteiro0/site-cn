"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Search,
  UserPlus,
  ArrowLeft,
  Calendar,
  Award,
  ShieldCheck,
  CheckCircle2,
  Filter,
  UserCheck
} from "lucide-react";

interface MemberRecord {
  id: string;
  cid: string;
  full_name: string;
  category: "demolay_ativo" | "senior_demolay" | "macom" | "irregular";
  regularity?: string;
  masonic_lodge?: string;
  initiation_date?: string;
  demolay_degree_date?: string;
  created_at?: string;
}

const categoryLabels: Record<string, string> = {
  todos: "Todos os Membros",
  demolay_ativo: "DeMolays Ativos",
  macom: "Tios Maçons / Consultores",
  senior_demolay: "Sêniores DeMolay",
  irregular: "Irregulares / Inativos",
};

export default function MembrosPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal para habilitar novo membro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [newMember, setNewMember] = useState({
    cid: "",
    full_name: "",
    initiation_date: "",
    demolay_degree_date: "",
    category: "demolay_ativo" as "demolay_ativo" | "senior_demolay" | "macom" | "irregular",
    regularity: "Regular",
    masonic_lodge: "",
  });

  // Carregar Membros do Supabase
  const loadMembers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("members")
        .select("id, cid, full_name, category, regularity, masonic_lodge, initiation_date, demolay_degree_date, created_at")
        .order("full_name", { ascending: true });

      if (error) throw error;
      if (data) {
        setMembers(data as MemberRecord[]);
      }
    } catch (err) {
      console.error("Erro ao carregar quadro de membros:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Habilitar Novo Membro
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.cid.trim() || !newMember.full_name.trim()) {
      alert("Por favor, preencha pelo menos a ID e o Nome Completo.");
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg("");

    try {
      const supabase = createClient();
      const memberType = newMember.category === "macom" ? "macom" : "demolay";
      const status = newMember.category === "irregular" ? "inativo" : "ativo";

      const { data, error } = await supabase
        .from("members")
        .insert({
          chapter_id: "00000000-0000-0000-0000-000000000500",
          cid: newMember.cid.trim(),
          full_name: newMember.full_name.trim(),
          initiation_date: newMember.initiation_date || null,
          demolay_degree_date: newMember.demolay_degree_date || null,
          category: newMember.category,
          regularity: newMember.regularity || (newMember.category === "macom" ? "Consultor" : "Regular"),
          member_type: memberType,
          status: status,
          is_active: status === "ativo",
          masonic_lodge: newMember.category === "macom" ? newMember.masonic_lodge || null : null,
        })
        .select()
        .single();

      if (error) throw error;

      setSaveSuccessMsg(`Membro ${newMember.full_name} habilitado com sucesso!`);
      setIsAddModalOpen(false);
      setNewMember({
        cid: "",
        full_name: "",
        initiation_date: "",
        demolay_degree_date: "",
        category: "demolay_ativo",
        regularity: "Regular",
        masonic_lodge: "",
      });

      // Recarrega listagem
      await loadMembers();
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err: unknown) {
      console.error("Erro ao habilitar novo membro:", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Erro ao cadastrar membro: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Contadores por categoria
  const counts = useMemo(() => {
    const c = {
      todos: members.length,
      demolay_ativo: 0,
      macom: 0,
      senior_demolay: 0,
      irregular: 0,
    };
    members.forEach((m) => {
      if (c[m.category] !== undefined) c[m.category]++;
    });
    return c;
  }, [members]);

  // Lista Filtrada e Buscada
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesCat = activeFilter === "todos" || m.category === activeFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        term === "" ||
        m.full_name.toLowerCase().includes(term) ||
        (m.cid && m.cid.includes(term)) ||
        (m.regularity && m.regularity.toLowerCase().includes(term)) ||
        (m.masonic_lodge && m.masonic_lodge.toLowerCase().includes(term));

      return matchesCat && matchesSearch;
    });
  }, [members, activeFilter, searchTerm]);

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
            <span>Quadro Geral de Membros</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Censo oficial capitular: DeMolays Ativos, Consultores Maçons, Sêniores e Irregulares
          </p>
        </div>

        {/* Botão Habilitar Novo Membro */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Habilitar Novo Membro</span>
        </button>
      </div>

      {/* FEEDBACK DE SALVAMENTO */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* FILTROS E BUSCA */}
      <div className="space-y-4">
        {/* Abas de Filtros por Categoria */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "todos", label: "Todos", count: counts.todos },
            { id: "demolay_ativo", label: "DeMolays Ativos", count: counts.demolay_ativo },
            { id: "macom", label: "Tios Maçons", count: counts.macom },
            { id: "senior_demolay", label: "Sêniores DeMolay", count: counts.senior_demolay },
            { id: "irregular", label: "Irregulares / Inativos", count: counts.irregular },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === cat.id
                  ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-md"
                  : "bg-white/5 text-emerald-200/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{cat.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 text-white font-mono">
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Campo de Busca em Tempo Real */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-300" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, ID (ex: 127738), loja maçônica ou regularidade..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
          />
        </div>
      </div>

      {/* TABELA DE MEMBROS */}
      <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-[#04281A]/80 border-b border-white/10 text-emerald-300 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Nome Completo</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Iniciação</th>
                <th className="py-3 px-4">Grau DeMolay</th>
                <th className="py-3 px-4">Regularidade / Loja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-emerald-200/50">
                    Nenhum membro encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.03] transition-colors">
                    {/* ID SEM '#' */}
                    <td className="py-3 px-4 font-mono font-bold text-[#D9AA45]">
                      {m.cid}
                    </td>

                    {/* Nome Completo */}
                    <td className="py-3 px-4 font-semibold text-white">
                      {m.full_name}
                    </td>

                    {/* Categoria */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.category === "demolay_ativo"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : m.category === "macom"
                            ? "bg-amber-500/20 text-[#D9AA45] border border-amber-500/40"
                            : m.category === "senior_demolay"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            : "bg-red-500/20 text-red-300 border border-red-500/40"
                        }`}
                      >
                        {m.category === "demolay_ativo" && "DeMolay Ativo"}
                        {m.category === "macom" && "Tio Maçom"}
                        {m.category === "senior_demolay" && "Sênior DeMolay"}
                        {m.category === "irregular" && "Irregular"}
                      </span>
                    </td>

                    {/* Data de Iniciação */}
                    <td className="py-3 px-4 text-emerald-100/70">
                      {m.initiation_date
                        ? new Date(m.initiation_date).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>

                    {/* Data do Grau DeMolay */}
                    <td className="py-3 px-4 text-emerald-100/70">
                      {m.demolay_degree_date
                        ? new Date(m.demolay_degree_date).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>

                    {/* Regularidade ou Loja Maçônica */}
                    <td className="py-3 px-4">
                      <p className="text-white font-medium">
                        {m.regularity || "Regular"}
                      </p>
                      {m.masonic_lodge && (
                        <p className="text-[10px] text-[#D9AA45] truncate max-w-xs">
                          {m.masonic_lodge}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: HABILITAR NOVO MEMBRO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#064D32] border border-white/20 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#D9AA45]" />
              <h3 className="text-lg font-bold">Habilitar Novo Membro no Capítulo</h3>
            </div>
            <p className="text-xs text-emerald-200/70">
              Cadastre o irmão ou tio no banco de dados do Capítulo Professor Carvalho Neves Nº 500.
            </p>

            <form onSubmit={handleCreateMember} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">
                    ID (SISDM / DeMolay Brasil) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMember.cid}
                    onChange={(e) => setNewMember({ ...newMember, cid: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    placeholder="Ex: 159237"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">
                    Categoria *
                  </label>
                  <select
                    value={newMember.category}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
                  >
                    <option value="demolay_ativo">DeMolay Ativo</option>
                    <option value="senior_demolay">Sênior DeMolay</option>
                    <option value="macom">Tio Maçom / Consultor</option>
                    <option value="irregular">Irregular / Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newMember.full_name}
                  onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  placeholder="Ex: Lucas de Carvalho Silva"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">
                    Data de Iniciação
                  </label>
                  <input
                    type="date"
                    value={newMember.initiation_date}
                    onChange={(e) =>
                      setNewMember({ ...newMember, initiation_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">
                    Data do Grau DeMolay
                  </label>
                  <input
                    type="date"
                    value={newMember.demolay_degree_date}
                    onChange={(e) =>
                      setNewMember({ ...newMember, demolay_degree_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>
              </div>

              {newMember.category === "macom" && (
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">
                    Loja Maçônica Representada
                  </label>
                  <input
                    type="text"
                    value={newMember.masonic_lodge}
                    onChange={(e) =>
                      setNewMember({ ...newMember, masonic_lodge: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    placeholder="Ex: A∴R∴L∴S∴ Caridade II nº 135"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Habilitando..." : "Habilitar Membro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
