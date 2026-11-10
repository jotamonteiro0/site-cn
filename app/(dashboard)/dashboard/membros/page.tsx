"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  UserPlus,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";

interface MemberRecord {
  id: string;
  cid: string;
  full_name: string;
  email?: string;
  category: "demolay_ativo" | "senior_demolay" | "macom" | "irregular";
  regularity?: string;
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
  const [userRole, setUserRole] = useState<string>("membro");
  const [viewAsMember, setViewAsMember] = useState(false);

  // Modal para habilitar novo membro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [newMember, setNewMember] = useState({
    cid: "",
    full_name: "",
    initiation_date: "",
    email: "",
    category: "demolay_ativo" as "demolay_ativo" | "senior_demolay" | "macom",
    regularity: "Regular",
  });

  // Identificação do papel para controle estrito de RBAC
  useEffect(() => {
    async function loadRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: membership } = await supabase
            .from("chapter_memberships")
            .select("role_code")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

          if (membership?.role_code) {
            setUserRole(membership.role_code);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar papel do usuário:", err);
      }
    }
    loadRole();
  }, []);

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
  const canManageMembers = effectiveRole === "master" || effectiveRole === "escrivao";

  // Carregar Membros do Supabase
  const loadMembers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("members")
        .select("id, cid, full_name, email, category, regularity, created_at")
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
    let ignore = false;
    async function init() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("members")
          .select("id, cid, full_name, email, category, regularity, created_at")
          .order("full_name", { ascending: true });

        if (error) throw error;
        if (!ignore && data) {
          setMembers(data as MemberRecord[]);
        }
      } catch (err) {
        console.error("Erro ao carregar quadro de membros:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // Habilitar Novo Membro (Apenas Master e Escrivão)
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMembers) {
      alert("Apenas o Mestre Conselheiro ou Escrivão podem habilitar novos membros.");
      return;
    }
    if (!newMember.cid.trim() || !newMember.full_name.trim() || !newMember.initiation_date) {
      alert("Por favor, preencha todos os campos obrigatórios: ID SISDM, Nome Completo e Data de Iniciação.");
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg("");

    try {
      const supabase = createClient();
      const memberType = newMember.category === "macom" ? "macom" : "demolay";

      const { error } = await supabase
        .from("members")
        .insert({
          chapter_id: "00000000-0000-0000-0000-000000000500",
          cid: newMember.cid.trim(),
          full_name: newMember.full_name.trim(),
          initiation_date: newMember.initiation_date,
          email: newMember.email.trim().toLowerCase() || null,
          category: newMember.category,
          regularity: newMember.regularity || (newMember.category === "macom" ? "Consultor" : "Regular"),
          member_type: memberType,
          status: "ativo",
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setSaveSuccessMsg(
        `Membro ${newMember.full_name} habilitado com sucesso no Capítulo! Acesso liberado (senha inicial: ${newMember.cid.trim()}).`
      );
      setIsAddModalOpen(false);
      setNewMember({
        cid: "",
        full_name: "",
        initiation_date: "",
        email: "",
        category: "demolay_ativo",
        regularity: "Regular",
      });

      // Recarrega listagem
      await loadMembers();
      setTimeout(() => setSaveSuccessMsg(""), 6000);
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
        (m.regularity && m.regularity.toLowerCase().includes(term));

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

        {/* Botão Habilitar Novo Membro (Apenas Master e Escrivão) */}
        {canManageMembers && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Habilitar Novo Membro</span>
          </button>
        )}
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
            { id: "todos", label: categoryLabels.todos, count: counts.todos },
            { id: "demolay_ativo", label: categoryLabels.demolay_ativo, count: counts.demolay_ativo },
            { id: "macom", label: categoryLabels.macom, count: counts.macom },
            { id: "senior_demolay", label: categoryLabels.senior_demolay, count: counts.senior_demolay },
            { id: "irregular", label: categoryLabels.irregular, count: counts.irregular },
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
            placeholder="Buscar por nome, ID (ex: 127738) ou regularidade..."
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
                <th className="py-3 px-4">E-mail de Acesso</th>
                <th className="py-3 px-4">Regularidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-emerald-200/50 animate-pulse">
                    Carregando quadro de membros...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-emerald-200/50">
                    Nenhum membro encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  return (
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

                      {/* E-mail para acesso */}
                      <td className="py-3 px-4">
                        {m.email ? (
                          <span className="text-emerald-200 font-mono text-[11px] truncate block max-w-xs">
                            {m.email}
                          </span>
                        ) : (
                          <span className="text-emerald-200/40 italic">E-mail pendente</span>
                        )}
                      </td>

                      {/* Regularidade */}
                      <td className="py-3 px-4">
                        <span className="text-white font-medium">
                          {m.regularity || "Regular"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: HABILITAR NOVO MEMBRO COM GLASSMORPHISM ESTILO IOS */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-3xl ios-glass-card space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#D9AA45]/20 border border-[#D9AA45]/40 flex items-center justify-center text-[#D9AA45] shadow-lg shadow-[#D9AA45]/15">
                <UserPlus className="w-5 h-5 text-[#D9AA45]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Habilitar Novo Membro no Capítulo</h3>
                <p className="text-xs text-emerald-200/70">
                  Capítulo Professor Carvalho Neves Nº 500
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">
                    ID SISDM / DeMolay Brasil *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMember.cid}
                    onChange={(e) => setNewMember({ ...newMember, cid: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    placeholder="Ex: 159237"
                  />
                  <p className="text-[10px] text-emerald-300/70 mt-0.5">
                    Sua ID será sua senha inicial de acesso.
                  </p>
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
                        category: e.target.value as "demolay_ativo" | "senior_demolay" | "macom",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
                  >
                    <option value="demolay_ativo">DeMolay Ativo (12 a 20 anos)</option>
                    <option value="senior_demolay">Sênior DeMolay (21+ anos)</option>
                    <option value="macom">Tio Maçom / Consultor</option>
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
                  placeholder="Ex: Ryan Lima Cavalcante Maia"
                />
              </div>

              {/* Data de Iniciação */}
              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Data de Iniciação *
                </label>
                <input
                  type="date"
                  required
                  value={newMember.initiation_date}
                  onChange={(e) =>
                    setNewMember({ ...newMember, initiation_date: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
                <p className="text-[10px] text-emerald-300/70 mt-0.5">
                  Data em que foi iniciado na Ordem DeMolay ou Maçonaria.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  E-mail para Acesso ao Sistema *
                </label>
                <input
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  placeholder="email@demolay.org.br"
                />
                <p className="text-[10px] text-emerald-300/70 mt-0.5">
                  O membro usará este e-mail para autenticação no portal.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/20 border border-emerald-500/30 text-[11px] text-emerald-200/90 space-y-1">
                <p className="font-bold text-[#D9AA45]">🔑 Configuração Automática de Acesso:</p>
                <p>
                  Ao cadastrar, o membro receberá permissão correspondente ao seu perfil. No primeiro acesso, ele informará sua ID como senha e definirá sua credencial definitiva.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold cursor-pointer transition-all border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D9AA45] via-[#E5BC5C] to-[#D9AA45] hover:brightness-110 active:scale-95 text-[#04281A] font-extrabold text-xs cursor-pointer disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(217,170,69,0.3)] hover:shadow-[0_6px_22px_rgba(217,170,69,0.45)]"
                >
                  {isSaving ? "Habilitando..." : "Habilitar Membro & Acesso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
