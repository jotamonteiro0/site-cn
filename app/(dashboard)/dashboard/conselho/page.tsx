"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck,
  Building2,
  ArrowLeft,
  Search,
  Users,
  Award,
  Crown,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  MapPin,
  Shield,
} from "lucide-react";

const CHAPTER_ID = "00000000-0000-0000-0000-000000000500";

interface MemberRecord {
  id: string;
  chapter_id?: string;
  id_demolay: string;
  full_name: string;
  category: string;
  regularity?: string | null;
  masonic_lodge?: string | null;
  photo_url?: string | null;
  created_at?: string;
  email?: string | null;
  phone?: string | null;
}

interface CouncilOfficer {
  position_id: string;
  position_name: string;
  sort_order: number;
  member_id: string | null;
  member_name: string | null;
  id_demolay: string | null;
  masonic_lodge: string | null;
  regularity: string | null;
  management_id: string;
  management_title: string;
}

interface SponsoringLodge {
  name: string;
  number: string;
  tagline: string;
  potency: string;
  isHeadquarters?: boolean;
  address?: string;
  description: string;
}

const OFFICIAL_LODGES: readonly SponsoringLodge[] = [
  {
    name: "A∴R∴L∴S∴ Caridade II nº 135",
    number: "135",
    tagline: "Loja Maçônica Patrocinadora • Sede Capitular",
    potency: "GOB-PI",
    isHeadquarters: true,
    address: "Rua Álvaro Mendes, Centro, Teresina - PI",
    description:
      "Sede oficial onde se realizam as sessões magnas e ordinárias do Capítulo Carvalho Neves.",
  },
  {
    name: "A∴R∴L∴S∴ Abolição nº 4199",
    number: "4199",
    tagline: "Loja Maçônica Patrocinadora",
    potency: "GOB-PI",
    description:
      "Oficina mantenedora atuante no fomento dos princípios e virtudes da juventude DeMolay.",
  },
  {
    name: "A∴R∴L∴S∴ Adonhiran nº 2782",
    number: "2782",
    tagline: "Loja Maçônica Patrocinadora",
    potency: "GOB-PI",
    description:
      "Oficina mantenedora do Capítulo, loja de origem do Presidente do Conselho Consultivo da Gestão XXV.",
  },
  {
    name: "A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591",
    number: "4591",
    tagline: "Loja Maçônica Patrocinadora",
    potency: "GOB-PI",
    description:
      "Oficina consagrada à memória e aos ideais do fundador da Ordem DeMolay no Brasil, Tio Alberto Mansur.",
  },
] as const;

export default function ConselhoPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [officers, setOfficers] = useState<CouncilOfficer[]>([]);
  const [activeMgmtTitle, setActiveMgmtTitle] = useState<string>("Gestão XXV (2026.2)");
  const [activeMgmtId, setActiveMgmtId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // RBAC & Modo Membro
  const [userRole, setUserRole] = useState<string>("membro");
  const [viewAsMember, setViewAsMember] = useState(false);

  // Filtros e Abas
  const [activeTab, setActiveTab] = useState<"lojas" | "quadro">("lojas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLodgeFilter, setSelectedLodgeFilter] = useState<string>("todos");
  const [selectedRegularityFilter, setSelectedRegularityFilter] = useState<string>("todos");

  // Feedback de Operações
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Modais de Gerenciamento
  const [isLodgeModalOpen, setIsLodgeModalOpen] = useState(false);
  const [memberToEditLodge, setMemberToEditLodge] = useState<MemberRecord | null>(null);
  const [targetLodge, setTargetLodge] = useState<string>("");
  const [isSavingLodge, setIsSavingLodge] = useState(false);

  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [officerToEdit, setOfficerToEdit] = useState<CouncilOfficer | null>(null);
  const [selectedOfficerMemberId, setSelectedOfficerMemberId] = useState<string>("");
  const [isSavingOfficer, setIsSavingOfficer] = useState(false);

  // 1. Carregar papel inicial do usuário
  useEffect(() => {
    const loadRole = () => {
      try {
        const storedRole = localStorage.getItem("cn_user_role");
        if (storedRole) setUserRole(storedRole);
        const storedViewAsMember = localStorage.getItem("cn_view_as_member");
        setViewAsMember(storedViewAsMember === "true");
      } catch {
        // Fallback silencioso
      }
    };
    loadRole();
  }, []);

  // 2. Sincronizar simulação de papel do usuário
  useEffect(() => {
    const handleRoleChange = () => {
      try {
        const storedView = localStorage.getItem("cn_view_as_member");
        setViewAsMember(storedView === "true");
        const storedRole = localStorage.getItem("cn_user_role");
        if (storedRole) setUserRole(storedRole);
      } catch {
        // ignore
      }
    };
    window.addEventListener("cn_view_as_member_change", handleRoleChange);
    window.addEventListener("storage", handleRoleChange);
    return () => {
      window.removeEventListener("cn_view_as_member_change", handleRoleChange);
      window.removeEventListener("storage", handleRoleChange);
    };
  }, []);

  const effectiveRole = viewAsMember ? "membro" : userRole;
  const canManage = effectiveRole === "master" || effectiveRole === "escrivao";

  const [refreshKey, setRefreshKey] = useState(0);

  // 3. Carregar dados do Supabase
  useEffect(() => {
    let ignore = false;
    async function fetchCouncil() {
      try {
        const supabase = createClient();

        // Consulta membros vinculados à tabela relacional conselho_membros
        const { data: conselhoLinks } = await supabase
          .from("conselho_membros")
          .select("member_id, sponsoring_lodge, role_name")
          .eq("chapter_id", CHAPTER_ID)
          .eq("is_active", true);

        const conselhoMap = new Map(
          (conselhoLinks || []).map((cl) => [cl.member_id, cl.sponsoring_lodge])
        );
        const conselhoMemberIds = Array.from(conselhoMap.keys());

        // Consulta de membros: se canManage, consulta base members; senão, consulta members_public
        let query = canManage
          ? supabase
              .from("members")
              .select("id, chapter_id, id_demolay, full_name, category, regularity, masonic_lodge, photo_url, created_at, email, phone")
              .eq("chapter_id", CHAPTER_ID)
              .eq("is_active", true)
          : supabase
              .from("members_public")
              .select("id, chapter_id, id_demolay, full_name, category, regularity, masonic_lodge, photo_url, created_at")
              .eq("chapter_id", CHAPTER_ID);

        if (conselhoMemberIds.length > 0) {
          query = query.or(`category.eq.macom,id.in.(${conselhoMemberIds.join(",")})`);
        } else {
          query = query.eq("category", "macom");
        }

        const { data: membersData, error: memErr } = await query.order("full_name", { ascending: true });

        if (memErr) {
          console.error("Erro ao carregar membros do conselho:", memErr);
        } else if (membersData && !ignore) {
          const enriched = (membersData as MemberRecord[]).map((m) => {
            const assignedLodge = conselhoMap.get(m.id);
            return {
              ...m,
              masonic_lodge: assignedLodge || m.masonic_lodge,
            };
          });
          setMembers(enriched);
        }

        // Consulta de gestão ativa e liderança do conselho
        const { data: activeMgmt } = await supabase
          .from("managements")
          .select("id, title, code, status")
          .eq("chapter_id", CHAPTER_ID)
          .eq("status", "ativa")
          .single();

        if (activeMgmt && !ignore) {
          setActiveMgmtId(activeMgmt.id);
          setActiveMgmtTitle(activeMgmt.title || `Gestão ${activeMgmt.code}`);

          const { data: positions } = await supabase
            .from("management_positions")
            .select("id, name, sort_order, management_id")
            .eq("management_id", activeMgmt.id)
            .in("name", ["Presidente do Conselho Consultivo", "Consultor da Organização"])
            .order("sort_order", { ascending: true });

          if (positions && positions.length > 0) {
            const posIds = positions.map((p) => p.id);
            const { data: memberPositions } = await supabase
              .from("member_management_positions")
              .select("management_position_id, member_id")
              .in("management_position_id", posIds);

            const officerList: CouncilOfficer[] = [];

            for (const pos of positions) {
              const link = memberPositions?.find((mp) => mp.management_position_id === pos.id);
              let officerMember: MemberRecord | undefined;
              if (link?.member_id) {
                officerMember = (membersData as MemberRecord[] | null)?.find(
                  (m) => m.id === link.member_id
                );
                // Caso o membro da liderança não esteja na lista de maçons carregada, busca por id
                if (!officerMember) {
                  const { data: singleMem } = await supabase
                    .from("members_public")
                    .select("id, id_demolay, full_name, category, regularity, masonic_lodge")
                    .eq("id", link.member_id)
                    .single();
                  if (singleMem) officerMember = singleMem as MemberRecord;
                }
              }

              officerList.push({
                position_id: pos.id,
                position_name: pos.name,
                sort_order: pos.sort_order,
                member_id: link?.member_id || null,
                member_name: officerMember?.full_name || null,
                id_demolay: officerMember?.id_demolay || null,
                masonic_lodge: officerMember?.masonic_lodge || null,
                regularity: officerMember?.regularity || null,
                management_id: activeMgmt.id,
                management_title: activeMgmt.title || `Gestão ${activeMgmt.code}`,
              });
            }

            if (!ignore) {
              setOfficers(officerList);
            }
          }
        }
      } catch (err) {
        console.error("Falha ao inicializar Módulo Conselho Consultivo:", err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchCouncil();
    return () => {
      ignore = true;
    };
  }, [canManage, refreshKey]);

  // Agrupamento estrito dos consultores pelas 4 Lojas Patrocinadoras
  const lodgeMap = useMemo(() => {
    const map: Record<string, MemberRecord[]> = {
      "A∴R∴L∴S∴ Abolição nº 4199": [],
      "A∴R∴L∴S∴ Adonhiran nº 2782": [],
      "A∴R∴L∴S∴ Caridade II nº 135": [],
      "A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591": [],
    };

    members.forEach((m) => {
      if (m.masonic_lodge && map[m.masonic_lodge]) {
        map[m.masonic_lodge].push(m);
      }
    });

    return map;
  }, [members]);

  // Total de consultores alocados em lojas patrocinadoras
  const totalAllocated = useMemo(() => {
    return Object.values(lodgeMap).reduce((acc, list) => acc + list.length, 0);
  }, [lodgeMap]);

  // Consultores aguardando alocação preservados no modelo de dados (sem exibição na interface visual)
  const unallocatedMembers = useMemo(() => members.filter((m) => !m.masonic_lodge), [members]);
  void unallocatedMembers;

  // Filtragem para o Quadro Completo
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Filtro de Loja
      if (selectedLodgeFilter !== "todos") {
        if (selectedLodgeFilter === "sem_loja") {
          if (m.masonic_lodge && lodgeMap[m.masonic_lodge]) return false;
        } else if (m.masonic_lodge !== selectedLodgeFilter) {
          return false;
        }
      }

      // Filtro de Regularidade
      if (selectedRegularityFilter !== "todos") {
        if (m.regularity !== selectedRegularityFilter) return false;
      }

      // Busca por texto
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = m.full_name.toLowerCase().includes(query);
        const matchesId = m.id_demolay.toLowerCase().includes(query);
        const matchesLodge = (m.masonic_lodge || "").toLowerCase().includes(query);
        return matchesName || matchesId || matchesLodge;
      }

      return true;
    });
  }, [members, selectedLodgeFilter, selectedRegularityFilter, searchTerm, lodgeMap]);

  // Handlers de Gerenciamento
  const handleOpenEditLodge = (member: MemberRecord) => {
    if (!canManage) return;
    setMemberToEditLodge(member);
    setTargetLodge(member.masonic_lodge || "");
    setIsLodgeModalOpen(true);
  };

  const handleSaveLodgeAllocation = async () => {
    if (!canManage || !memberToEditLodge) return;
    setIsSavingLodge(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const supabase = createClient();
      const updatedLodge = targetLodge === "" ? null : targetLodge;

      const { error } = await supabase
        .from("members")
        .update({ masonic_lodge: updatedLodge })
        .eq("id", memberToEditLodge.id)
        .eq("chapter_id", CHAPTER_ID);

      if (error) {
        throw new Error(error.message);
      }

      if (updatedLodge) {
        await supabase
          .from("conselho_membros")
          .update({ sponsoring_lodge: updatedLodge, updated_at: new Date().toISOString() })
          .eq("member_id", memberToEditLodge.id)
          .eq("chapter_id", CHAPTER_ID);
      }

      setSaveSuccessMsg(
        `Loja Maçônica de ${memberToEditLodge.full_name} atualizada para "${updatedLodge || "Aguardando Alocação"}" com sucesso.`
      );
      setIsLodgeModalOpen(false);
      setMemberToEditLodge(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setSaveErrorMsg(`Erro ao salvar alocação de loja: ${errMsg}`);
    } finally {
      setIsSavingLodge(false);
    }
  };

  const handleOpenEditOfficer = (officer: CouncilOfficer) => {
    if (!canManage) return;
    setOfficerToEdit(officer);
    setSelectedOfficerMemberId(officer.member_id || "");
    setIsOfficerModalOpen(true);
  };

  const handleSaveOfficer = async () => {
    if (!canManage || !officerToEdit || !activeMgmtId) return;
    setIsSavingOfficer(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const supabase = createClient();
      const targetMemberId = selectedOfficerMemberId === "" ? null : selectedOfficerMemberId;

      const { error } = await supabase.rpc("set_nominata_officer", {
        p_management_id: activeMgmtId,
        p_position_name: officerToEdit.position_name,
        p_member_id: targetMemberId,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSaveSuccessMsg(
        `Cargo de "${officerToEdit.position_name}" atualizado com sucesso na ${activeMgmtTitle}.`
      );
      setIsOfficerModalOpen(false);
      setOfficerToEdit(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setSaveErrorMsg(`Erro ao atualizar oficial do conselho: ${errMsg}`);
    } finally {
      setIsSavingOfficer(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in pb-12">
      {/* HEADER EXECUTIVO COM NAVEGAÇÃO E IDENTIFICAÇÃO DE GESTÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1A2E26]">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar à Visão Geral</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Conselho Consultivo & Lojas Patrocinadoras</span>
            </h1>
          </div>
          <p className="text-sm text-emerald-200/70 mt-1 max-w-3xl">
            Corpo consultivo e representação das quatro Lojas Maçônicas mantenedoras do Capítulo Professor Carvalho Neves Nº 500 (Jurisdição GOB-PI).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-[#101E1A] border border-[#1B352C] text-xs font-bold text-[#D9AA45] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D9AA45]" />
            <span className="font-mono tabular-nums">{totalAllocated}</span>
            <span>Tios Vinculados</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#0F231D] border border-[#194033] text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sede: Caridade II nº 135</span>
          </div>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO OU ERRO */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-[#0B241C] border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-400 hover:text-white transition-colors ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-4 rounded-xl bg-[#2A0F11] border border-red-500/40 text-red-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-medium">{saveErrorMsg}</span>
          </div>
          <button
            onClick={() => setSaveErrorMsg(null)}
            className="text-red-400 hover:text-white transition-colors ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CARDS DE LIDERANÇA DO CONSELHO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Liderança: Presidente do Conselho Consultivo (PCC) */}
        {(() => {
          const pcc = officers.find((o) => o.position_name === "Presidente do Conselho Consultivo");
          return (
            <div className="bg-[#0D1815] border border-[#1B2F28] p-5 sm:p-6 rounded-2xl flex flex-col justify-between shadow-lg relative group">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <Crown className="w-4 h-4 text-[#D9AA45]" />
                    <span>Presidente do Conselho</span>
                  </div>
                  {canManage && pcc && (
                    <button
                      onClick={() => handleOpenEditOfficer(pcc)}
                      className="px-2 py-1 rounded bg-[#13231E] hover:bg-[#1C332B] text-[11px] font-semibold text-[#D9AA45] border border-[#274438] transition-colors flex items-center gap-1 cursor-pointer"
                      title="Designar ou alterar Presidente do Conselho"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Alterar</span>
                    </button>
                  )}
                </div>

                <div className="mt-3">
                  <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {pcc?.member_name || "Aguardando Designação"}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-emerald-200/70 font-mono">
                    {pcc?.id_demolay && <span>ID: {pcc.id_demolay}</span>}
                    {pcc?.regularity && <span>• {pcc.regularity}</span>}
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-300 bg-[#0A1310] border border-[#162722] p-2.5 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#D9AA45] shrink-0" />
                    <span className="truncate">{pcc?.masonic_lodge || "Loja não informada"}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Autoridade máxima do Conselho Consultivo perante o Grande Conselho Estadual e o Capítulo.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#172B23] flex items-center justify-between text-xs">
                <span className="text-gray-400">{activeMgmtTitle}</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ativo
                </span>
              </div>
            </div>
          );
        })()}

        {/* Liderança: Consultor da Organização */}
        {(() => {
          const co = officers.find((o) => o.position_name === "Consultor da Organização");
          return (
            <div className="bg-[#0D1815] border border-[#1B2F28] p-5 sm:p-6 rounded-2xl flex flex-col justify-between shadow-lg relative group">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Consultor da Organização</span>
                  </div>
                  {canManage && co && (
                    <button
                      onClick={() => handleOpenEditOfficer(co)}
                      className="px-2 py-1 rounded bg-[#13231E] hover:bg-[#1C332B] text-[11px] font-semibold text-emerald-300 border border-[#274438] transition-colors flex items-center gap-1 cursor-pointer"
                      title="Designar ou alterar Consultor da Organização"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Alterar</span>
                    </button>
                  )}
                </div>

                <div className="mt-3">
                  <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {co?.member_name || "Aguardando Designação"}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-emerald-200/70 font-mono">
                    {co?.id_demolay && <span>ID: {co.id_demolay}</span>}
                    {co?.regularity && <span>• {co.regularity}</span>}
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-300 bg-[#0A1310] border border-[#162722] p-2.5 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{co?.masonic_lodge || "Loja não informada"}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Acompanhamento executivo da rotina administrativa, ritualística e das comissões capitulares.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#172B23] flex items-center justify-between text-xs">
                <span className="text-gray-400">{activeMgmtTitle}</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ativo
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* NAVEGAÇÃO DE ABAS E CONTROLES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 p-1 bg-[#0A1411] border border-[#162923] rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("lojas")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "lojas"
                ? "bg-[#142822] text-[#D9AA45] shadow-sm border border-[#234237]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>4 Lojas Patrocinadoras</span>
            <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded bg-[#0A1512] text-gray-300">
              {totalAllocated}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("quadro")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "quadro"
                ? "bg-[#142822] text-[#D9AA45] shadow-sm border border-[#234237]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Quadro Geral</span>
            <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded bg-[#0A1512] text-gray-300">
              {members.length}
            </span>
          </button>
        </div>
      </div>

      {/* ABA 1: VISÃO PELAS 4 LOJAS PATROCINADORAS */}
      {activeTab === "lojas" && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-gray-400 bg-[#0B1512] border border-[#162822] rounded-2xl">
              Carregando dados das 4 Lojas Maçônicas Patrocinadoras e do Conselho Consultivo...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {OFFICIAL_LODGES.map((lodge) => {
                  const brothers = lodgeMap[lodge.name] || [];
                  const isHq = lodge.isHeadquarters;

                  return (
                    <div
                      key={lodge.name}
                      className={`bg-[#0D1815] border rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:border-[#2C4D41] transition-all relative ${
                        isHq ? "border-[#6E551C] ring-1 ring-[#D9AA45]/20" : "border-[#1A2E26]"
                      }`}
                    >
                      <div>
                        {/* Header do Card da Loja */}
                        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#172B23]">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45] bg-[#241E0D] px-2 py-0.5 rounded border border-[#4A3B18]">
                                {lodge.potency}
                              </span>
                              {isHq && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FBBF24] bg-[#2A230E] px-2 py-0.5 rounded border border-[#8C6D23] flex items-center gap-1">
                                  <Shield className="w-2.5 h-2.5" /> Sede Capitular
                                </span>
                              )}
                            </div>
                            <h2 className="text-base font-bold text-white mt-1.5 tracking-tight">
                              {lodge.name}
                            </h2>
                            <p className="text-xs text-emerald-200/60 mt-0.5 font-light">
                              {lodge.description}
                            </p>
                          </div>

                          <div className="px-3 py-1.5 rounded-xl bg-[#101E1A] border border-[#1C362D] text-xs font-bold text-[#D9AA45] shrink-0 text-center">
                            <span className="font-mono tabular-nums text-sm block leading-none">{brothers.length}</span>
                            <span className="text-[9px] uppercase tracking-wider text-gray-400">Maçons</span>
                          </div>
                        </div>

                        {/* Lista de Membros Vinculados */}
                        <div className="mt-4 divide-y divide-[#152620] max-h-80 overflow-y-auto pr-1 space-y-0.5">
                          {brothers.length === 0 ? (
                            <p className="py-6 text-xs text-gray-500 text-center italic">
                              Nenhum maçom vinculado a esta oficina no momento.
                            </p>
                          ) : (
                            brothers.map((m) => (
                              <div
                                key={m.id}
                                className="py-2.5 px-2 rounded-lg flex items-center justify-between gap-2 hover:bg-[#12221C] transition-colors group"
                              >
                                <div>
                                  <p className="text-xs font-bold text-white group-hover:text-emerald-200 transition-colors">
                                    {m.full_name}
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                                    <span>ID: {m.id_demolay}</span>
                                    <span>•</span>
                                    <span className="text-emerald-300/80">{m.regularity || "Consultor"}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {canManage && (
                                    <button
                                      onClick={() => handleOpenEditLodge(m)}
                                      className="px-2 py-1 rounded bg-[#0D1815] hover:bg-[#192F27] text-[10px] font-semibold text-gray-300 hover:text-[#D9AA45] border border-[#1E342B] transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Remanejar Loja Maçônica"
                                    >
                                      <Edit3 className="w-2.5 h-2.5" />
                                      <span>Remanejar</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Footer do Card */}
                      <div className="pt-3 mt-4 border-t border-[#172B23] flex items-center justify-between text-[11px] text-emerald-200/60">
                        <span>Jurisdição Regular</span>
                        <span className="text-[#D9AA45] font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#D9AA45]" /> 100% Regular
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ABA 2: QUADRO GERAL DE CONSULTORES (BUSCA E FILTROS) */}
      {activeTab === "quadro" && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="bg-[#0D1815] border border-[#1A2E26] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            {/* Input de Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, ID DeMolay ou Loja..."
                className="w-full bg-[#08120F] border border-[#1C332A] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D9AA45] transition-colors"
              />
            </div>

            {/* Selects de Filtro */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedLodgeFilter}
                onChange={(e) => setSelectedLodgeFilter(e.target.value)}
                className="bg-[#08120F] border border-[#1C332A] text-gray-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#D9AA45]"
              >
                <option value="todos">Todas as Lojas</option>
                {OFFICIAL_LODGES.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                  </option>
                ))}
                <option value="sem_loja">Sem Loja Alocada</option>
              </select>

              <select
                value={selectedRegularityFilter}
                onChange={(e) => setSelectedRegularityFilter(e.target.value)}
                className="bg-[#08120F] border border-[#1C332A] text-gray-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#D9AA45]"
              >
                <option value="todos">Todas as Qualificações</option>
                <option value="Consultor">Consultor</option>
                <option value="Sênior/Consultor">Sênior/Consultor</option>
              </select>
            </div>
          </div>

          {/* Tabela de Conselheiros */}
          <div className="bg-[#0D1815] border border-[#1A2E26] rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#09120F] border-b border-[#172B23] text-gray-400 uppercase text-[10px] tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Conselheiro / Tio Maçom</th>
                    <th className="py-3 px-4">ID SISDM</th>
                    <th className="py-3 px-4">Qualificação</th>
                    <th className="py-3 px-4">Loja Patrocinadora</th>
                    <th className="py-3 px-4">Potência</th>
                    {canManage && <th className="py-3 px-4 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#142620]">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="py-10 text-center text-gray-500 italic">
                        Nenhum consultor encontrado para os critérios selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-[#101F1B] transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          {m.full_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {m.id_demolay}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              m.regularity === "Sênior/Consultor"
                                ? "bg-[#182613] text-[#A7F3D0] border-[#254223]"
                                : "bg-[#0F221B] text-emerald-300 border-[#1B3D30]"
                            }`}
                          >
                            {m.regularity || "Consultor"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {m.masonic_lodge ? (
                            <span className="text-white flex items-center gap-1.5">
                              {m.masonic_lodge === "A∴R∴L∴S∴ Caridade II nº 135" && (
                                <Shield className="w-3 h-3 text-[#D9AA45]" />
                              )}
                              <span>{m.masonic_lodge}</span>
                            </span>
                          ) : (
                            <span className="text-amber-400/80 italic">Aguardando Alocação</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {m.masonic_lodge ? "GOB-PI" : "—"}
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenEditLodge(m)}
                              className="px-2.5 py-1 rounded bg-[#101F1B] hover:bg-[#172E26] text-xs font-semibold text-[#D9AA45] border border-[#234237] transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{m.masonic_lodge ? "Alterar" : "Alocar"}</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="py-3 px-4 border-t border-[#172B23] bg-[#0A1310] flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <span>Total exibido: {filteredMembers.length} de {members.length} consultores</span>
              <span className="text-emerald-400">100% Censo Conforme SCDB</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ALOCAÇÃO DE LOJA MAÇÔNICA PATROCINADORA */}
      {isLodgeModalOpen && memberToEditLodge && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1815] border border-[#1B322B] rounded-2xl max-w-lg w-full p-6 space-y-5 text-white shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-[#1A2E26]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45]">
                  Alocação de Loja Maçônica
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {memberToEditLodge.full_name}
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  ID SISDM: {memberToEditLodge.id_demolay} • {memberToEditLodge.regularity || "Consultor"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsLodgeModalOpen(false);
                  setMemberToEditLodge(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-300 block">
                Selecione a Loja Maçônica Patrocinadora Oficial:
              </label>

              <div className="space-y-2">
                {OFFICIAL_LODGES.map((lodge) => {
                  const isSelected = targetLodge === lodge.name;
                  return (
                    <div
                      key={lodge.name}
                      onClick={() => setTargetLodge(lodge.name)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-[#142820] border-[#D9AA45] text-white shadow-sm"
                          : "bg-[#091210] border-[#182C25] text-gray-300 hover:border-[#27463B]"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <span>{lodge.name}</span>
                          {lodge.isHeadquarters && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#2A230E] text-[#FBBF24] border border-[#8C6D23]">
                              Sede
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{lodge.potency} • {lodge.tagline}</p>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-[#D9AA45] bg-[#D9AA45] text-[#04281A]"
                            : "border-gray-600 bg-transparent"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}

                {/* Opção Sem Loja / Aguardando */}
                <div
                  onClick={() => setTargetLodge("")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    targetLodge === ""
                      ? "bg-[#1B160C] border-[#FBBF24] text-white"
                      : "bg-[#091210] border-[#182C25] text-gray-400 hover:border-[#27463B]"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold">Sem Loja Definida (Aguardando Alocação)</p>
                    <p className="text-[11px] text-gray-500">Membro permanecerá pendente de vinculação formal.</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      targetLodge === ""
                        ? "border-[#FBBF24] bg-[#FBBF24] text-[#04281A]"
                        : "border-gray-600 bg-transparent"
                    }`}
                  >
                    {targetLodge === "" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1A2E26] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsLodgeModalOpen(false);
                  setMemberToEditLodge(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#0F1D19] hover:bg-[#162A24] text-gray-300 text-xs font-semibold border border-[#1E372E] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingLodge}
                onClick={handleSaveLodgeAllocation}
                className="px-5 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {isSavingLodge ? "Salvando..." : "Confirmar Alocação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DESIGNAÇÃO DE LIDERANÇA DO CONSELHO */}
      {isOfficerModalOpen && officerToEdit && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D1815] border border-[#1B322B] rounded-2xl max-w-lg w-full p-6 space-y-5 text-white shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-[#1A2E26]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45]">
                  Nominata & Liderança do Conselho
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {officerToEdit.position_name}
                </h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Vínculo oficial na {activeMgmtTitle}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsOfficerModalOpen(false);
                  setOfficerToEdit(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-300 block">
                Selecione o Consultor / Tio Maçom Titular:
              </label>

              <select
                value={selectedOfficerMemberId}
                onChange={(e) => setSelectedOfficerMemberId(e.target.value)}
                className="w-full bg-[#08120F] border border-[#1C332A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D9AA45] font-medium"
              >
                <option value="">Aguardando Designação (Vago)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} (ID: {m.id_demolay} • {m.masonic_lodge || "Sem Loja"})
                  </option>
                ))}
              </select>

              <p className="text-[11px] text-gray-400 leading-relaxed bg-[#0A1411] p-3 rounded-lg border border-[#172B23]">
                Esta designação é registrada atomicamente no banco de dados através da função oficial <code>set_nominata_officer</code> e sincronizada diretamente com a Nominata Capitular da {activeMgmtTitle}.
              </p>
            </div>

            <div className="pt-3 border-t border-[#1A2E26] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsOfficerModalOpen(false);
                  setOfficerToEdit(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#0F1D19] hover:bg-[#162A24] text-gray-300 text-xs font-semibold border border-[#1E372E] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingOfficer}
                onClick={handleSaveOfficer}
                className="px-5 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {isSavingOfficer ? "Salvando..." : "Confirmar Designação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
