"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { safeStorage } from "@/lib/safe-storage";
import { formatCivilDate } from "@/lib/gestao-vigencia";
import {
  Crown,
  Shield,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  PlusCircle,
  Users,
  KeyRound
} from "lucide-react";

interface Management {
  id: string;
  code: string;
  title?: string;
  theme?: string;
  starts_on: string;
  ends_on?: string;
  status: "ativa" | "planejada" | "encerrada";
}

interface Position {
  id: string;
  name: string;
  sort_order: number;
  assigned_member_id?: string;
  assigned_member_name?: string;
  assigned_member_id_demolay?: string;
  assigned_member_category?: string;
}

interface MemberOption {
  id: string;
  id_demolay: string;
  full_name: string;
  category: string;
}

const roleBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
  "Mestre Conselheiro": {
    label: "Acesso Master (MC)",
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/40",
  },
  "Presidente do Conselho Consultivo": {
    label: "Acesso Master (PCC)",
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/40",
  },
  "PCC": {
    label: "Acesso Master (PCC)",
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/40",
  },
  "Escrivão": {
    label: "Acesso Escrivão",
    bg: "bg-blue-500/20",
    text: "text-blue-300",
    border: "border-blue-500/40",
  },
  "Tesoureiro": {
    label: "Acesso Tesoureiro",
    bg: "bg-emerald-500/20",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
  },
};

export default function NominataPage() {
  const [managements, setManagements] = useState<Management[]>([]);
  const [selectedManagementId, setSelectedManagementId] = useState<string>("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [userRole, setUserRole] = useState<string>("membro");
  const [viewAsMember, setViewAsMember] = useState(false);
  const [isRoleChecked, setIsRoleChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Modal Nova Gestão
  const [isNewManagementModalOpen, setIsNewManagementModalOpen] = useState(false);
  const [newMgmtCode, setNewMgmtCode] = useState("2027.2");
  const [newMgmtTitle, setNewMgmtTitle] = useState("Gestão XXVII (2027.2)");
  const [newMgmtStarts, setNewMgmtStarts] = useState("2027-07-01");
  const [newMgmtEnds, setNewMgmtEnds] = useState("2027-12-31");
  const [isCreatingMgmt, setIsCreatingMgmt] = useState(false);

  // 1. Checa Permissão do Usuário Logado
  useEffect(() => {
    async function checkRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isPermanentMaster =
            user.user_metadata?.id_demolay === "127738" ||
            user.user_metadata?.id_demolay === "102836" ||
            user.email === "joaomonteiro0@icloud.com" ||
            user.email === "airton@carvalhoneves500.org.br" ||
            user.email === "jarodriguesj1@gmail.com";

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
    checkRole();
  }, []);

  // 2. Carrega Gestões e Membros
  useEffect(() => {
    async function loadInitialData() {
      try {
        const supabase = createClient();

        // Carregamento em paralelo de Gestões e Membros
        const [mRes, memRes] = await Promise.all([
          supabase
            .from("managements")
            .select("id, code, title, theme, starts_on, ends_on, status")
            .order("code", { ascending: false }),
          supabase
            .from("members")
            .select("id, id_demolay, full_name, category")
            .eq("is_active", true)
            .order("full_name", { ascending: true }),
        ]);

        const mData = mRes.data;
        if (mData && mData.length > 0) {
          setManagements(mData as Management[]);
          const active = mData.find((m) => m.status === "ativa");
          setSelectedManagementId(active ? active.id : mData[0].id);
        }

        if (memRes.data) {
          setMembers(memRes.data as MemberOption[]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados da nominata:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  interface RawPositionItem {
    id: string;
    name: string;
    sort_order: number;
    member_management_positions?: Array<{
      member_id?: string;
      member?: {
        id?: string;
        full_name?: string;
        id_demolay?: string;
        category?: string;
      } | null;
    }>;
  }

  // 3. Carrega Cargos e Ocupantes da Gestão Selecionada
  const loadPositions = async () => {
    if (!selectedManagementId) return;
    try {
      const supabase = createClient();

      const { data: pData } = await supabase
        .from("management_positions")
        .select(`
          id,
          name,
          sort_order,
          member_management_positions (
            member_id,
            starts_on,
            member:members (
              id,
              full_name,
              id_demolay,
              category
            )
          )
        `)
        .eq("management_id", selectedManagementId)
        .order("sort_order", { ascending: true });

      if (pData) {
        const isGestaoXXV = selectedManagementId === "00000000-0000-0000-0000-000000002026";
        const canonicalFallback: Record<string, { name: string; id_demolay: string }> = {
          "Porta-Estandarte": { name: "Moisés Escórcio Fonseca", id_demolay: "154238" },
          "Porta-Bandeira": { name: "Moisés Escórcio Fonseca", id_demolay: "154238" },
          "Sentinela": { name: "Wendel de Sousa Pinheiro de Abreu", id_demolay: "122802" },
        };

        const typed = pData as unknown as RawPositionItem[];
        const formatted: Position[] = typed.map((p) => {
          const assignment = p.member_management_positions?.[0];
          const canonical = isGestaoXXV && !assignment?.member?.full_name && canonicalFallback[p.name]
            ? canonicalFallback[p.name]
            : null;

          return {
            id: p.id,
            name: p.name,
            sort_order: p.sort_order,
            assigned_member_id: assignment?.member_id || (canonical ? `canonical-${p.name}` : ""),
            assigned_member_name: assignment?.member?.full_name || (canonical ? canonical.name : ""),
            assigned_member_id_demolay: assignment?.member?.id_demolay || (canonical ? canonical.id_demolay : ""),
            assigned_member_category: assignment?.member?.category || (canonical ? "demolay_ativo" : ""),
          };
        });
        setPositions(formatted);
      }
    } catch (err) {
      console.error("Erro ao carregar cargos:", err);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchPos() {
      if (!selectedManagementId) return;
      try {
        const supabase = createClient();
        const { data: pData } = await supabase
          .from("management_positions")
          .select(`
            id,
            name,
            sort_order,
            member_management_positions (
              member_id,
              starts_on,
              member:members (
                id,
                full_name,
                id_demolay,
                category
              )
            )
          `)
          .eq("management_id", selectedManagementId)
          .order("sort_order", { ascending: true });

        if (!ignore && pData) {
          const isGestaoXXV = selectedManagementId === "00000000-0000-0000-0000-000000002026";
          const canonicalFallback: Record<string, { name: string; id_demolay: string }> = {
            "Porta-Estandarte": { name: "Moisés Escórcio Fonseca", id_demolay: "154238" },
            "Porta-Bandeira": { name: "Moisés Escórcio Fonseca", id_demolay: "154238" },
            "Sentinela": { name: "Wendel de Sousa Pinheiro de Abreu", id_demolay: "122802" },
          };

          const typed = pData as unknown as RawPositionItem[];
          const formatted: Position[] = typed.map((p) => {
            const assignment = p.member_management_positions?.[0];
            const canonical = isGestaoXXV && !assignment?.member?.full_name && canonicalFallback[p.name]
              ? canonicalFallback[p.name]
              : null;

            return {
              id: p.id,
              name: p.name,
              sort_order: p.sort_order,
              assigned_member_id: assignment?.member_id || (canonical ? `canonical-${p.name}` : ""),
              assigned_member_name: assignment?.member?.full_name || (canonical ? canonical.name : ""),
              assigned_member_id_demolay: assignment?.member?.id_demolay || (canonical ? canonical.id_demolay : ""),
              assigned_member_category: assignment?.member?.category || (canonical ? "demolay_ativo" : ""),
            };
          });
          setPositions(formatted);
        }
      } catch (err) {
        console.error("Erro ao carregar cargos:", err);
      }
    }
    fetchPos();
    return () => {
      ignore = true;
    };
  }, [selectedManagementId]);

  // Gestão Atual Selecionada
  const selectedManagement = useMemo(() => {
    return managements.find((m) => m.id === selectedManagementId);
  }, [managements, selectedManagementId]);

  // Sincroniza o modo "Ver como Membro" com a Sidebar e safeStorage
  useEffect(() => {
    const checkViewAsMember = () => {
      const stored = safeStorage.getItem("cn_view_as_member");
      setViewAsMember(stored === "true");
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
  const canEdit = effectiveRole === "master" || effectiveRole === "escrivao";
  const canCreateMgmt = effectiveRole === "master";

  // 4. Salvar / Atribuir Oficial à Posição (Dispara Transferência Automática de Acesso)
  const handleAssignMember = async (positionName: string, memberId: string) => {
    if (!selectedManagementId || !canEdit) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_nominata_officer", {
        p_management_id: selectedManagementId,
        p_position_name: positionName,
        p_member_id: memberId || null,
      });

      if (error) throw error;

      await loadPositions();

      const memberObj = members.find((m) => m.id === memberId);
      const memberName = memberObj ? memberObj.full_name : "Nenhum membro";

      const linkedRole = roleBadges[positionName];
      if (selectedManagement?.status === "ativa" && linkedRole) {
        setFeedbackMsg(
          `Cargo '${positionName}' atribuído a ${memberName}. O acesso (${linkedRole.label}) foi sincronizado e transferido automaticamente no sistema!`
        );
      } else {
        setFeedbackMsg(`Nomeação de '${positionName}' atualizada com sucesso!`);
      }
      setTimeout(() => setFeedbackMsg(""), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tente novamente";
      console.error("Erro ao atribuir oficial:", err);
      alert("Não foi possível salvar a nomeação: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Ativar Gestão (Passar o Bastão / Posse da Gestão)
  const handleActivateManagement = async () => {
    if (!selectedManagementId || !canEdit) return;
    const confirm = window.confirm(
      `Deseja realmente ATIVAR a ${selectedManagement?.title || selectedManagement?.code} como a Gestão Oficial Vigente do Capítulo?\n\nIsso atualizará os acessos Master, Escrivão e Tesoureiro para os irmãos nomeados nesta gestão.`
    );
    if (!confirm) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("activate_management", {
        p_management_id: selectedManagementId,
      });

      if (error) throw error;

      // Recarrega gestões
      const { data: mData } = await supabase
        .from("managements")
        .select("id, code, title, theme, starts_on, ends_on, status")
        .order("code", { ascending: false });

      if (mData) setManagements(mData as Management[]);

      setFeedbackMsg(
        `Gestão ativada com sucesso! Todos os acessos administrativos (Master, Escrivão e Tesoureiro) foram sincronizados com os novos oficiais empossados.`
      );
      setTimeout(() => setFeedbackMsg(""), 7000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tente novamente";
      console.error("Erro ao ativar gestão:", err);
      alert("Erro ao ativar gestão: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Criar Nova Gestão
  const handleCreateManagement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsCreatingMgmt(true);
    try {
      const supabase = createClient();
      const { data: rpcRes, error } = await supabase.rpc("create_management_with_positions", {
        p_chapter_id: "00000000-0000-0000-0000-000000000500",
        p_code: newMgmtCode.trim(),
        p_title: newMgmtTitle.trim(),
        p_starts_on: newMgmtStarts,
        p_ends_on: newMgmtEnds || null,
        p_theme: null,
      });

      if (error) throw error;

      // Recarrega gestões do banco de forma consistente
      const { data: mData } = await supabase
        .from("managements")
        .select("id, code, title, theme, starts_on, ends_on, status")
        .order("code", { ascending: false });

      if (mData) {
        setManagements(mData as Management[]);
        if (rpcRes?.management_id) {
          setSelectedManagementId(rpcRes.management_id);
        }
      }
      setIsNewManagementModalOpen(false);

      setFeedbackMsg(`Nova ${newMgmtTitle.trim()} cadastrada com sucesso com todas as 25 posições canônicas da Ordem DeMolay!`);
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verifique se o código já existe";
      console.error("Erro ao criar gestão:", err);
      alert("Não foi possível criar a gestão: " + msg);
    } finally {
      setIsCreatingMgmt(false);
    }
  };

  // Separação Canônica dos Cargos por Bloco Litúrgico
  // 1. Liderança do Conselho Consultivo: PCC e Consultor Geral / da Organização
  const councilPositions = useMemo(() => {
    const councilNames = ["Presidente do Conselho Consultivo", "PCC", "Consultor da Organização"];
    return positions
      .filter((p) => councilNames.includes(p.name))
      .sort((a, b) => {
        if (a.name.includes("Presidente") || a.name === "PCC") return -1;
        if (b.name.includes("Presidente") || b.name === "PCC") return 1;
        return a.sort_order - b.sort_order;
      });
  }, [positions]);

  // 2. Diretoria Capitular: Exclusivamente os 6 oficiais (MC, 1C, 2C, Escrivão, Tesoureiro e Hospitaleiro)
  const executivePositions = useMemo(() => {
    const canonicalOrder = [
      "Mestre Conselheiro",
      "Primeiro Conselheiro",
      "Segundo Conselheiro",
      "Escrivão",
      "Tesoureiro",
      "Hospitaleiro",
    ];
    return positions
      .filter((p) => canonicalOrder.includes(p.name))
      .sort((a, b) => canonicalOrder.indexOf(a.name) - canonicalOrder.indexOf(b.name));
  }, [positions]);

  // 3. Oficiais da Gestão (Relação unificada: Preceptores, Diáconos, Mordomos, Harmonia, etc.)
  const oficiaisGestaoPositions = useMemo(() => {
    return positions.filter(
      (p) =>
        ![
          "Mestre Conselheiro",
          "Primeiro Conselheiro",
          "Segundo Conselheiro",
          "Escrivão",
          "Tesoureiro",
          "Hospitaleiro",
        ].includes(p.name) &&
        !["Presidente do Conselho Consultivo", "PCC", "Consultor da Organização"].includes(p.name)
    );
  }, [positions]);

  // Gestões ativas e planejadas (sem repetir histórico que já pertence à galeria)
  const visibleManagements = useMemo(() => {
    return managements.filter(
      (m) => m.status === "ativa" || (canCreateMgmt && m.status === "planejada")
    );
  }, [managements, canCreateMgmt]);

  if (isLoading || !isRoleChecked) {
    return (
      <div className="py-24 text-center text-xs text-emerald-200/60 font-mono">
        Carregando nominata capitular e permissões...
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in">
      {/* Header com Navegação e Ações */}
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
            <Crown className="w-7 h-7 text-[#D9AA45]" />
            <span>Gestões & Nominata Capitular</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Corpo de Oficiais e Nominata da Gestão Capitular
          </p>
        </div>

        {/* Membro não cadastra nova gestão; apenas Master */}
        {canCreateMgmt && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsNewManagementModalOpen(true)}
              className="btn-heraldico-esmeralda px-4 py-2.5 rounded-xl text-xs"
            >
              <PlusCircle className="w-4 h-4 text-[#D9AA45]" />
              <span>Cadastrar Nova Gestão</span>
            </button>
          </div>
        )}
      </div>

      {/* FEEDBACK DE ATUALIZAÇÃO */}
      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-3 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="font-medium leading-relaxed">{feedbackMsg}</span>
        </div>
      )}

      {/* SELETOR DE GESTÃO (ATUAL VIGENTE / PLANEJADA) */}
      <div className="card-heraldico-dark p-5 sm:p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45]">
              Gestão Oficial Vigente
            </span>
            <div className="flex items-center gap-3 mt-1.5">
              <Calendar className="w-5 h-5 text-emerald-300" />
              <select
                value={selectedManagementId}
                onChange={(e) => setSelectedManagementId(e.target.value)}
                className="bg-[#064D32] border border-emerald-500/40 rounded-xl px-4 py-2 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
              >
                {visibleManagements.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title || `Gestão ${m.code}`} ({m.status === "ativa" ? "Atual / Ativa" : "Programada"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedManagement && (
            <div className="pt-2 sm:pt-4 flex flex-wrap items-center gap-3">
              {selectedManagement.status === "ativa" ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs text-emerald-200/90 font-mono font-medium whitespace-normal">
                    Cerimônia de Instalação e Posse dos Oficiais: 08/08/2026
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Gestão Programada</span>
                  </span>
                  <span className="text-xs text-emerald-200/80 font-mono whitespace-normal">
                    Previsão de Instalação e Posse dos Oficiais: {formatCivilDate(selectedManagement.starts_on)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botão de Ativação / Posse Oficial */}
        {canCreateMgmt && selectedManagement && selectedManagement.status !== "ativa" && (
          <button
            onClick={handleActivateManagement}
            disabled={isSaving}
            className="btn-heraldico-ouro px-4 py-2.5 rounded-xl text-xs disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>Ativar Esta Gestão Oficialmente</span>
          </button>
        )}
      </div>

      {/* SEÇÃO 1: CONSELHO CONSULTIVO (POSICIONADO NO TOPO) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#D9AA45]" />
          <h2 className="text-lg font-bold text-white">Liderança do Conselho Consultivo</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {councilPositions.map((pos) => {
            const linkedBadge = roleBadges[pos.name] || roleBadges.PCC;
            const eligibleMembers = members.filter((m) => m.category === "macom");

            return (
              <div
                key={pos.id}
                className="card-heraldico-dark p-5 rounded-2xl space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {pos.name}
                    </h3>
                    {canEdit && linkedBadge && (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${linkedBadge.bg} ${linkedBadge.text} ${linkedBadge.border}`}>
                        {linkedBadge.label}
                      </span>
                    )}
                  </div>

                  {pos.assigned_member_id_demolay && (
                    <span className="text-[10px] font-mono text-[#D9AA45] bg-[#0C1D14] px-2 py-0.5 rounded border border-[#D9AA45]/30">
                      ID {pos.assigned_member_id_demolay}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  {canEdit && selectedManagement?.status === "ativa" ? (
                    <select
                      value={pos.assigned_member_id || ""}
                      onChange={(e) => handleAssignMember(pos.name, e.target.value)}
                      disabled={isSaving}
                      className="w-full bg-[#08140E] border border-white/20 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer disabled:opacity-50"
                    >
                      <option value="">-- Cargo Vago / Não Designado --</option>
                      {eligibleMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.id_demolay})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-white">
                        {pos.assigned_member_name || "Cargo Vago"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 2: DIRETORIA CAPITULAR (EXCLUSIVAMENTE OS 6 OFICIAIS) */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-[#D9AA45]" />
          <h2 className="text-lg font-bold text-white">Diretoria Capitular</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {executivePositions.map((pos) => {
            const linkedBadge = roleBadges[pos.name];
            const eligibleMembers = members.filter((m) => m.category === "demolay_ativo");

            return (
              <div
                key={pos.id}
                className="card-heraldico-dark p-5 rounded-2xl space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {pos.name}
                    </h3>
                    {canEdit && linkedBadge && (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${linkedBadge.bg} ${linkedBadge.text} ${linkedBadge.border}`}>
                        {linkedBadge.label}
                      </span>
                    )}
                  </div>

                  {pos.assigned_member_id_demolay && (
                    <span className="text-[10px] font-mono text-[#D9AA45] bg-[#0C1D14] px-2 py-0.5 rounded border border-[#D9AA45]/30">
                      ID {pos.assigned_member_id_demolay}
                    </span>
                  )}
                </div>

                {/* Seleção do Membro */}
                <div className="space-y-1.5 pt-1">
                  {canEdit && selectedManagement?.status === "ativa" ? (
                    <select
                      value={pos.assigned_member_id || ""}
                      onChange={(e) => handleAssignMember(pos.name, e.target.value)}
                      disabled={isSaving}
                      className="w-full bg-[#08140E] border border-white/20 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer disabled:opacity-50"
                    >
                      <option value="">-- Cargo Vago / Não Designado --</option>
                      {eligibleMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.id_demolay})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-white">
                        {pos.assigned_member_name || "Cargo Vago"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 3: OFICIAIS DA GESTÃO (RELAÇÃO UNIFICADA) */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D9AA45]" />
            <h2 className="text-lg font-bold text-white">Oficiais da Gestão</h2>
          </div>
          <span className="text-xs text-emerald-200/70">{oficiaisGestaoPositions.length} oficiais</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {oficiaisGestaoPositions.map((pos) => {
            const eligibleMembers = members.filter((m) => m.category === "demolay_ativo");

            return (
              <div
                key={pos.id}
                className="p-4 rounded-xl card-heraldico-dark space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">{pos.name}</span>
                  {pos.assigned_member_id_demolay && (
                    <span className="text-[9px] font-mono text-[#D9AA45] bg-[#0C1D14] px-1.5 py-0.5 rounded border border-[#D9AA45]/30">
                      ID {pos.assigned_member_id_demolay}
                    </span>
                  )}
                </div>

                {canEdit && selectedManagement?.status === "ativa" ? (
                  <select
                    value={pos.assigned_member_id || ""}
                    onChange={(e) => handleAssignMember(pos.name, e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-[#08140E] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#D9AA45] cursor-pointer"
                  >
                    <option value="">-- Vago --</option>
                    {eligibleMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-white">
                      {pos.assigned_member_name || "Vago"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: CADASTRAR NOVA GESTÃO */}
      {isNewManagementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[#0E2018] border border-white/10 space-y-4 text-white shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#087443]/30 border border-[#087443]/50 flex items-center justify-center text-[#D9AA45]">
                <PlusCircle className="w-5 h-5 text-[#D9AA45]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Cadastrar Nova Gestão</h3>
                <p className="text-xs text-emerald-200/70">
                  Capítulo Professor Carvalho Neves Nº 500
                </p>
              </div>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              Cadastre um novo período administrativo. A nova gestão será pré-configurada automaticamente no servidor com todas as 25 posições canônicas da Ordem DeMolay.
            </p>

            <form onSubmit={handleCreateManagement} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-emerald-200">Código do Semestre</label>
                <input
                  type="text"
                  value={newMgmtCode}
                  onChange={(e) => setNewMgmtCode(e.target.value)}
                  placeholder="Ex: 2027.2"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white placeholder-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">Título Oficial</label>
                <input
                  type="text"
                  value={newMgmtTitle}
                  onChange={(e) => setNewMgmtTitle(e.target.value)}
                  placeholder="Ex: Gestão XXVII (2027.2)"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white placeholder-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">Início</label>
                  <input
                    type="date"
                    value={newMgmtStarts}
                    onChange={(e) => setNewMgmtStarts(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">Término</label>
                  <input
                    type="date"
                    value={newMgmtEnds}
                    onChange={(e) => setNewMgmtEnds(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewManagementModalOpen(false)}
                  className="btn-heraldico-vidro px-4 py-2 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMgmt}
                  className="btn-heraldico-ouro px-5 py-2 rounded-lg text-xs disabled:opacity-50"
                >
                  {isCreatingMgmt ? "Cadastrando..." : "Cadastrar Gestão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
