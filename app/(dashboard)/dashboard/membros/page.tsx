"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Eye,
  Mail,
  Phone,
  Calendar,
  Building,
  Award,
  Shield,
  Filter,
  Key,
  Copy,
  Check,
  Lock
} from "lucide-react";

interface MemberRecord {
  id: string;
  id_demolay: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  category: "demolay_ativo" | "senior_demolay" | "macom" | "irregular";
  regularity?: string | null;
  masonic_lodge?: string | null;
  initiation_date?: string | null;
  demolay_degree_date?: string | null;
  photo_url?: string | null;
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
  const [regularityFilter, setRegularityFilter] = useState<string>("todos");
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("membro");
  const [viewAsMember, setViewAsMember] = useState(false);

  // Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMemberForView, setSelectedMemberForView] = useState<MemberRecord | null>(null);
  const [editingMember, setEditingMember] = useState<{
    id: string;
    id_demolay: string;
    full_name: string;
    email: string;
    phone: string;
    category: "demolay_ativo" | "senior_demolay" | "macom" | "irregular";
    regularity: string;
    masonic_lodge: string;
    initiation_date: string;
    demolay_degree_date: string;
  } | null>(null);

  // Modal de Exibição do Token de Primeiro Acesso Gerado
  const [tokenModalData, setTokenModalData] = useState<{
    memberName: string;
    idDemolay: string;
    token: string;
    expiresAt: string;
  } | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const [newMember, setNewMember] = useState({
    id_demolay: "",
    full_name: "",
    initiation_date: "",
    demolay_degree_date: "",
    email: "",
    phone: "",
    category: "demolay_ativo" as "demolay_ativo" | "senior_demolay" | "macom" | "irregular",
    regularity: "Regular",
    masonic_lodge: "",
  });

  // Identificação do papel para controle estrito de RBAC
  useEffect(() => {
    async function loadRole() {
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

  const [refreshKey, setRefreshKey] = useState(0);

  // Carregar Membros do Supabase com separação estrita de privacidade por perfil (RBAC)
  useEffect(() => {
    let ignore = false;
    async function fetchMembers() {
      try {
        const supabase = createClient();
        // SEPARAÇÃO RIGOROSA DE PRIVACIDADE NA CAMADA DE BANCO (RLS & SECURE VIEW):
        // - Diretoria (Master/Escrivão): consulta a tabela base "members" com dados administrativos completos.
        // - Membro Comum: consulta estritamente a view "members_public", onde e-mails, telefones e datas privadas sequer existem no schema.
        const { data, error } = canManageMembers
          ? await supabase
              .from("members")
              .select("id, id_demolay, full_name, email, phone, category, regularity, masonic_lodge, initiation_date, demolay_degree_date, photo_url, created_at")
              .order("full_name", { ascending: true })
          : await supabase
              .from("members_public")
              .select("id, id_demolay, full_name, category, regularity, masonic_lodge, photo_url")
              .order("full_name", { ascending: true });

        if (error) throw error;
        if (data && !ignore) {
          setMembers(data as unknown as MemberRecord[]);
        }
      } catch (err) {
        console.error("Erro ao carregar quadro de membros:", err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchMembers();
    return () => {
      ignore = true;
    };
  }, [canManageMembers, refreshKey]);

  // Habilitar Novo Membro e Gerar Credencial Temporária Segura (Token de Primeiro Acesso)
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMembers) {
      alert("Apenas o Mestre Conselheiro ou Escrivão podem habilitar novos membros.");
      return;
    }
    if (!newMember.id_demolay.trim() || !newMember.full_name.trim() || !newMember.initiation_date) {
      alert("Por favor, preencha todos os campos obrigatórios: ID SISDM, Nome Completo e Data de Iniciação.");
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg("");

    try {
      const supabase = createClient();
      const memberType = newMember.category === "macom" ? "macom" : "demolay";

      // 1. Cadastra o membro na base capitular
      const { data: createdMember, error: insertError } = await supabase
        .from("members")
        .insert({
          chapter_id: "00000000-0000-0000-0000-000000000500",
          id_demolay: newMember.id_demolay.trim(),
          full_name: newMember.full_name.trim(),
          initiation_date: newMember.initiation_date,
          demolay_degree_date: newMember.demolay_degree_date || null,
          email: newMember.email.trim().toLowerCase() || null,
          phone: newMember.phone.trim() || null,
          category: newMember.category,
          regularity: newMember.regularity || (newMember.category === "macom" ? "Consultor" : "Regular"),
          masonic_lodge: newMember.masonic_lodge.trim() || (newMember.category === "macom" ? "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)" : null),
          member_type: memberType,
          status: "ativo",
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Gera Credencial Temporária Segura via API com Entropia >= 128 bits e Armazenamento de Hash SHA-256
      // O ID SISDM NUNCA é utilizado como senha padrão!
      const tokenRes = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: createdMember.id }),
      });

      const tokenJson = await tokenRes.json();

      if (!tokenRes.ok || !tokenJson.token) {
        throw new Error(tokenJson.error || "Membro cadastrado, mas falhou a geração do token de primeiro acesso.");
      }

      // 3. Exibe modal com o token seguro e instruções para entrega ao membro
      setTokenModalData({
        memberName: createdMember.full_name,
        idDemolay: createdMember.id_demolay,
        token: tokenJson.token,
        expiresAt: new Date(tokenJson.expires_at).toLocaleDateString("pt-BR"),
      });

      setIsAddModalOpen(false);
      setNewMember({
        id_demolay: "",
        full_name: "",
        initiation_date: "",
        demolay_degree_date: "",
        email: "",
        phone: "",
        category: "demolay_ativo",
        regularity: "Regular",
        masonic_lodge: "",
      });

      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      console.error("Erro ao habilitar novo membro:", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Erro ao cadastrar membro: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Gerar Novo Token de Primeiro Acesso para Membro Existente (Apenas Diretoria)
  const handleGenerateNewToken = async (m: MemberRecord) => {
    if (!canManageMembers) return;
    try {
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: m.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || "Falha ao gerar token.");
      }

      setTokenModalData({
        memberName: m.full_name,
        idDemolay: m.id_demolay,
        token: data.token,
        expiresAt: new Date(data.expires_at).toLocaleDateString("pt-BR"),
      });
    } catch (err) {
      console.error("Erro ao emitir token de ativação:", err);
      alert("Não foi possível gerar novo token para este membro.");
    }
  };

  // Atualizar Membro Existente (Apenas Master e Escrivão)
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMembers || !editingMember) {
      alert("Apenas o Mestre Conselheiro ou Escrivão podem editar informações de membros.");
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const memberType = editingMember.category === "macom" ? "macom" : "demolay";

      const { error } = await supabase
        .from("members")
        .update({
          full_name: editingMember.full_name.trim(),
          email: editingMember.email.trim().toLowerCase() || null,
          phone: editingMember.phone.trim() || null,
          category: editingMember.category,
          regularity: editingMember.regularity.trim() || "Regular",
          masonic_lodge: editingMember.masonic_lodge.trim() || null,
          initiation_date: editingMember.initiation_date || null,
          demolay_degree_date: editingMember.demolay_degree_date || null,
          member_type: memberType,
        })
        .eq("id", editingMember.id);

      if (error) throw error;

      setSaveSuccessMsg(`Dados do membro ${editingMember.full_name} atualizados com sucesso!`);
      setIsEditModalOpen(false);
      setEditingMember(null);

      // Se o modal de visualização estiver aberto para o mesmo membro, atualiza-o
      if (selectedMemberForView && selectedMemberForView.id === editingMember.id) {
        setSelectedMemberForView((prev) =>
          prev
            ? {
                ...prev,
                full_name: editingMember.full_name.trim(),
                email: editingMember.email.trim().toLowerCase() || null,
                phone: editingMember.phone.trim() || null,
                category: editingMember.category,
                regularity: editingMember.regularity.trim() || "Regular",
                masonic_lodge: editingMember.masonic_lodge.trim() || null,
                initiation_date: editingMember.initiation_date || null,
                demolay_degree_date: editingMember.demolay_degree_date || null,
              }
            : null
        );
      }

      setRefreshKey((k) => k + 1);
      setTimeout(() => setSaveSuccessMsg(""), 5000);
    } catch (err: unknown) {
      console.error("Erro ao atualizar dados do membro:", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Erro ao atualizar membro: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Abrir modal de edição com dados populados
  const handleOpenEdit = (m: MemberRecord) => {
    setEditingMember({
      id: m.id,
      id_demolay: m.id_demolay,
      full_name: m.full_name,
      email: m.email || "",
      phone: m.phone || "",
      category: m.category,
      regularity: m.regularity || "Regular",
      masonic_lodge: m.masonic_lodge || "",
      initiation_date: m.initiation_date || "",
      demolay_degree_date: m.demolay_degree_date || "",
    });
    setIsEditModalOpen(true);
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
      const matchesRegularity =
        regularityFilter === "todos" ||
        (regularityFilter === "regular" && (m.regularity?.toLowerCase().includes("regular") || m.regularity?.toLowerCase().includes("consultor"))) ||
        (regularityFilter === "irregular" && m.regularity?.toLowerCase().includes("irregular")) ||
        (regularityFilter === "sem_email" && !m.email);

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        term === "" ||
        m.full_name.toLowerCase().includes(term) ||
        (m.id_demolay && m.id_demolay.includes(term)) ||
        (m.email && m.email.toLowerCase().includes(term)) ||
        (m.masonic_lodge && m.masonic_lodge.toLowerCase().includes(term)) ||
        (m.regularity && m.regularity.toLowerCase().includes(term));

      return matchesCat && matchesRegularity && matchesSearch;
    });
  }, [members, activeFilter, regularityFilter, searchTerm]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in">
      {/* Header com Navegação e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar à Visão Geral</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>Quadro Geral de Membros</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Censo oficial capitular: DeMolays Ativos, Consultores Maçons, Sêniores e Inativos
          </p>
        </div>

        {/* Botão Habilitar Novo Membro (Apenas Master e Escrivão) */}
        {canManageMembers && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Habilitar Novo Membro</span>
          </button>
        )}
      </div>

      {/* FEEDBACK DE SALVAMENTO */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* FILTROS E BUSCA */}
      <div className="space-y-4">
        {/* Abas de Filtros por Categoria com Algarismos Tabulares */}
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
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === cat.id
                  ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-sm"
                  : "bg-[#0E2218] text-gray-400 hover:text-white border border-white/5"
              }`}
            >
              <span>{cat.label}</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-black/40 text-gray-200 font-mono tabular-nums">
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Linha de Busca e Filtro de Situação */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Campo de Busca em Tempo Real */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                canManageMembers
                  ? "Buscar por nome, ID (ex: 127738), e-mail ou loja..."
                  : "Buscar por nome, ID (ex: 127738) ou loja mantenedora..."
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0C1D14] border border-white/10 text-white text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45] shadow-inner"
            />
          </div>

          {/* Filtro Secundário: Regularidade */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={regularityFilter}
              onChange={(e) => setRegularityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0C1D14] border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45] cursor-pointer"
            >
              <option value="todos">Todas as Situações</option>
              <option value="regular">Regulares / Consultores</option>
              <option value="irregular">Irregulares</option>
              {canManageMembers && <option value="sem_email">E-mail Pendente</option>}
            </select>
          </div>
        </div>
      </div>

      {/* TABELA DE MEMBROS (Com Separação Estrita de Privacidade por Papel) */}
      <div className="rounded-xl bg-[#0C1D14] border border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-[#08140E] border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px] font-mono">
              <tr>
                <th className="py-3 px-4">ID SISDM</th>
                <th className="py-3 px-4">Nome Completo</th>
                <th className="py-3 px-4">Categoria</th>
                {canManageMembers ? (
                  <th className="py-3 px-4">E-mail de Acesso (Diretoria)</th>
                ) : (
                  <th className="py-3 px-4">Situação Capitular</th>
                )}
                <th className="py-3 px-4">
                  {canManageMembers ? "Regularidade / Loja" : "Loja / Oficina Mantenedora"}
                </th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 font-mono">
                    Carregando censo oficial do Capítulo...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Nenhum membro encontrado com os critérios de busca e filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => setSelectedMemberForView(m)}
                    >
                      {/* ID SISDM em Mono Ouro */}
                      <td className="py-3 px-4 font-mono font-bold text-[#D9AA45] tabular-nums">
                        {m.id_demolay}
                      </td>

                      {/* Nome Completo */}
                      <td className="py-3 px-4 font-semibold text-white">
                        <span>{m.full_name}</span>
                      </td>

                      {/* Categoria */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                            m.category === "demolay_ativo"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : m.category === "macom"
                              ? "bg-amber-500/15 text-[#D9AA45] border border-amber-500/30"
                              : m.category === "senior_demolay"
                              ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                              : "bg-red-500/15 text-red-300 border border-red-500/30"
                          }`}
                        >
                          {m.category === "demolay_ativo" && "DeMolay Ativo"}
                          {m.category === "macom" && "Tio Maçom"}
                          {m.category === "senior_demolay" && "Sênior DeMolay"}
                          {m.category === "irregular" && "Irregular"}
                        </span>
                      </td>

                      {/* Coluna Condicional: E-mail para Diretoria | Situação para Membros Comuns */}
                      <td className="py-3 px-4">
                        {canManageMembers ? (
                          m.email ? (
                            <span className="text-gray-300 font-mono text-[11px] truncate block max-w-xs">
                              {m.email}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic font-mono text-[11px]">E-mail pendente</span>
                          )
                        ) : (
                          <span className="font-medium text-emerald-300">
                            {m.regularity || "Regular"}
                          </span>
                        )}
                      </td>

                      {/* Regularidade / Loja Mantenedora */}
                      <td className="py-3 px-4 text-gray-300">
                        {canManageMembers ? (
                          <div>
                            <span className="font-medium text-white">{m.regularity || "Regular"}</span>
                            {m.masonic_lodge && (
                              <p className="text-[10px] text-[#D9AA45] truncate max-w-xs mt-0.5">
                                {m.masonic_lodge}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">
                            {m.masonic_lodge || "Capítulo Prof. Carvalho Neves 500"}
                          </span>
                        )}
                      </td>

                      {/* Ações Rápidas */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedMemberForView(m)}
                            className="p-1.5 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                            title="Ver Perfil"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canManageMembers && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(m)}
                              className="p-1.5 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-white/10 text-[#D9AA45] hover:text-amber-300 transition-colors cursor-pointer"
                              title="Editar Informações"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* MODAL: VISUALIZAÇÃO INDIVIDUAL DO PERFIL (Com Separação de Privacidade) */}
      {selectedMemberForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-5 text-white animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="text-base font-bold">Perfil Institucional do Membro</h3>
              </div>
              <button
                onClick={() => setSelectedMemberForView(null)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Cabeçalho do Membro com ID e Categoria */}
              <div className="p-4 rounded-xl bg-[#0E2218] border border-white/10 flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-[#D9AA45] font-mono uppercase tracking-wider">
                    ID SISDM: {selectedMemberForView.id_demolay}
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5">
                    {selectedMemberForView.full_name}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Capítulo Professor Carvalho Neves Nº 500
                  </p>
                </div>

                <span
                  className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold ${
                    selectedMemberForView.category === "demolay_ativo"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : selectedMemberForView.category === "macom"
                      ? "bg-amber-500/15 text-[#D9AA45] border border-amber-500/30"
                      : selectedMemberForView.category === "senior_demolay"
                      ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                      : "bg-red-500/15 text-red-300 border border-red-500/30"
                  }`}
                >
                  {selectedMemberForView.category === "demolay_ativo" && "DeMolay Ativo"}
                  {selectedMemberForView.category === "macom" && "Tio Maçom"}
                  {selectedMemberForView.category === "senior_demolay" && "Sênior DeMolay"}
                  {selectedMemberForView.category === "irregular" && "Irregular"}
                </span>
              </div>

              {/* Informações Institucionais (Visíveis para todos os membros) */}
              <div className="space-y-2.5 bg-[#08140E] p-4 rounded-xl border border-white/10 text-gray-300">
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#D9AA45]" />
                    Situação Cadastral:
                  </span>
                  <span className="font-semibold text-white">
                    {selectedMemberForView.regularity || "Regular"}
                  </span>
                </div>

                {selectedMemberForView.masonic_lodge && (
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-[#D9AA45]" />
                      Oficina / Loja Maçônica:
                    </span>
                    <span className="font-semibold text-white text-right max-w-[200px] truncate">
                      {selectedMemberForView.masonic_lodge}
                    </span>
                  </div>
                )}

                {/* Dados Administrativos e de Contato (Restritos à Diretoria Autorizada) */}
                {canManageMembers ? (
                  <>
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        Data de Iniciação:
                      </span>
                      <span className="font-mono text-white tabular-nums">
                        {selectedMemberForView.initiation_date
                          ? new Date(selectedMemberForView.initiation_date).toLocaleDateString("pt-BR")
                          : "Não informada"}
                      </span>
                    </div>

                    {selectedMemberForView.demolay_degree_date && (
                      <div className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          Grau DeMolay:
                        </span>
                        <span className="font-mono text-white tabular-nums">
                          {new Date(selectedMemberForView.demolay_degree_date).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        E-mail de Acesso:
                      </span>
                      <span className="font-mono text-white truncate max-w-[180px]">
                        {selectedMemberForView.email || "Pendente"}
                      </span>
                    </div>

                    {selectedMemberForView.phone && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          Telefone / Contato:
                        </span>
                        <span className="font-mono text-white tabular-nums">
                          {selectedMemberForView.phone}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-gray-400 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#D9AA45] shrink-0" />
                    <span>
                      Informações de contato e dados administrativos são restritos à Diretoria do Capítulo e ao próprio titular.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedMemberForView(null)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Fechar
              </button>

              {canManageMembers && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateNewToken(selectedMemberForView)}
                    className="px-3 py-2 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-[#D9AA45]/40 text-[#D9AA45] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Emitir novo token de primeiro acesso para este membro"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Gerar Token</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEdit(selectedMemberForView);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HABILITAR NOVO MEMBRO (COM GERAÇÃO SEGURA DE CREDENCIAL) */}
      {isAddModalOpen && canManageMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="text-base font-bold text-white tracking-tight">Habilitar Novo Membro no Capítulo</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    ID SISDM / DeMolay Brasil *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMember.id_demolay}
                    onChange={(e) => setNewMember({ ...newMember, id_demolay: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="Ex: 159237"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Número de registro oficial DeMolay Brasil.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Categoria *
                  </label>
                  <select
                    value={newMember.category}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        category: e.target.value as "demolay_ativo" | "senior_demolay" | "macom" | "irregular",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45] cursor-pointer"
                  >
                    <option value="demolay_ativo">DeMolay Ativo (12 a 20 anos)</option>
                    <option value="senior_demolay">Sênior DeMolay (21+ anos)</option>
                    <option value="macom">Tio Maçom / Consultor</option>
                    <option value="irregular">Irregular / Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-300">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newMember.full_name}
                  onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  placeholder="Ex: Ryan Lima Cavalcante Maia"
                />
              </div>

              {/* Data de Iniciação e Grau DeMolay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Data de Iniciação *
                  </label>
                  <input
                    type="date"
                    required
                    value={newMember.initiation_date}
                    onChange={(e) =>
                      setNewMember({ ...newMember, initiation_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Data Grau DeMolay (opcional)
                  </label>
                  <input
                    type="date"
                    value={newMember.demolay_degree_date}
                    onChange={(e) =>
                      setNewMember({ ...newMember, demolay_degree_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  />
                </div>
              </div>

              {/* Loja Maçônica Mantenedora (se for maçom) */}
              {newMember.category === "macom" && (
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Loja Maçônica / Potência
                  </label>
                  <input
                    type="text"
                    value={newMember.masonic_lodge}
                    onChange={(e) =>
                      setNewMember({ ...newMember, masonic_lodge: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="Ex: A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"
                  />
                </div>
              )}

              {/* Contatos: E-mail e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    E-mail para Acesso *
                  </label>
                  <input
                    type="email"
                    required
                    value={newMember.email}
                    onChange={(e) =>
                      setNewMember({ ...newMember, email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="email@demolay.org.br"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={newMember.phone}
                    onChange={(e) =>
                      setNewMember({ ...newMember, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="(86) 99999-9999"
                  />
                </div>
              </div>

              {/* Aviso Normativo de Segurança */}
              <div className="p-3 rounded-lg bg-[#08140E] border border-[#D9AA45]/30 text-[11px] text-gray-300 space-y-1">
                <p className="font-bold text-[#D9AA45] flex items-center gap-1.5 font-mono">
                  <Shield className="w-3.5 h-3.5" />
                  Protocolo de Credenciais Seguras:
                </p>
                <p>
                  Por determinação de segurança, identificadores pessoais (como o ID SISDM) <strong>NUNCA</strong> são utilizados como senhas padrão. Ao habilitar o membro, será gerado um <strong>Token Individual de Primeiro Acesso</strong> criptográfico com validade de 7 dias para que o irmão crie sua senha pessoal definitiva.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSaving ? "Habilitando..." : "Habilitar Membro & Gerar Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXIBIÇÃO DE TOKEN DE PRIMEIRO ACESSO GERADO */}
      {tokenModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/40 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#087443] border border-[#D9AA45]/40 flex items-center justify-center text-[#D9AA45]">
                <Key className="w-5 h-5 text-[#D9AA45]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Token de Primeiro Acesso Gerado</h3>
                <p className="text-xs text-gray-400">Credencial Temporária de Uso Único</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#08140E] border border-white/10 space-y-3 text-xs">
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-mono tracking-wider">Membro:</span>
                <p className="text-sm font-bold text-white">{tokenModalData.memberName}</p>
                <p className="text-[11px] text-[#D9AA45] font-mono">ID SISDM: {tokenModalData.idDemolay}</p>
              </div>

              <div className="pt-2 border-t border-white/10">
                <span className="text-gray-400 text-[10px] uppercase font-mono tracking-wider">
                  Token Individual de Ativação:
                </span>
                <div className="flex items-center justify-between gap-2 mt-1 p-2.5 rounded-lg bg-black/50 border border-[#D9AA45]/40">
                  <span className="font-mono text-base font-bold text-[#D9AA45] tracking-wider select-all">
                    {tokenModalData.token}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tokenModalData.token);
                      setTokenCopied(true);
                      setTimeout(() => setTokenCopied(false), 3000);
                    }}
                    className="px-2.5 py-1 rounded bg-[#D9AA45] hover:bg-amber-400 text-[#04281A] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {tokenCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{tokenCopied ? "Copiado!" : "Copiar"}</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-gray-400 space-y-1 pt-1">
                <p>• <strong>Validade:</strong> 7 dias (até {tokenModalData.expiresAt}).</p>
                <p>• <strong>Uso:</strong> Acesso único. O irmão deverá acessar a tela de Login, clicar em &quot;Primeiro Acesso?&quot;, informar este token e criar sua senha definitiva.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setTokenModalData(null)}
                className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR DADOS CADASTRAIS DO MEMBRO */}
      {isEditModalOpen && canManageMembers && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Editar Cadastro do Membro
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingMember(null);
                }}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    ID SISDM (Fixa)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingMember.id_demolay}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-gray-400 font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Categoria *
                  </label>
                  <select
                    value={editingMember.category}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        category: e.target.value as "demolay_ativo" | "senior_demolay" | "macom" | "irregular",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45] cursor-pointer"
                  >
                    <option value="demolay_ativo">DeMolay Ativo</option>
                    <option value="senior_demolay">Sênior DeMolay</option>
                    <option value="macom">Tio Maçom / Consultor</option>
                    <option value="irregular">Irregular / Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-300">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editingMember.full_name}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, full_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Regularidade / Situação
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMember.regularity}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, regularity: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="Regular / Consultor / Irregular"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Loja Maçônica Mantenedora
                  </label>
                  <input
                    type="text"
                    value={editingMember.masonic_lodge}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, masonic_lodge: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="A∴R∴L∴S∴ Caridade II nº 135"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Data de Iniciação
                  </label>
                  <input
                    type="date"
                    value={editingMember.initiation_date}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, initiation_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Data do Grau DeMolay
                  </label>
                  <input
                    type="date"
                    value={editingMember.demolay_degree_date}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, demolay_degree_date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    E-mail Cadastrado
                  </label>
                  <input
                    type="email"
                    value={editingMember.email}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="email@demolay.org.br"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-300">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={editingMember.phone}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="(86) 99999-9999"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingMember(null);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
