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
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  ChevronRight,
  Eye,
  EyeOff,
  Edit2,
  Building2,
  Check,
  UserCheck,
  Save,
  RotateCcw
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
  masonic_lodge?: string | null;
}

interface MeetingRecord {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  description: string | null;
  status: "agendada" | "realizada" | "cancelada";
}

type TabView = "membros" | "chamada" | "consultivo";
type AttendanceStatus = "presente" | "ausente" | "justificado";

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState<TabView>("chamada");
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceSubTab, setAttendanceSubTab] = useState<"demolay" | "macom">("demolay");
  const [isFullAttendanceListOpen, setIsFullAttendanceListOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Filtros da aba Membros
  const [activeFilter, setActiveFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal para Nova/Editar Reunião
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<{ id?: string; title: string; date: string; time: string; location: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        
        // Carrega Membros
        const { data: membersData } = await supabase
          .from("members")
          .select("id, cid, full_name, category, regularity, status, is_active, email, masonic_lodge")
          .order("full_name", { ascending: true });

        if (membersData) setMembers(membersData as MemberRecord[]);

        // Carrega Reuniões do Calendário
        const { data: meetingsData } = await supabase
          .from("meetings")
          .select("id, title, starts_at, location, description, status")
          .order("starts_at", { ascending: true });

        if (meetingsData && meetingsData.length > 0) {
          setMeetings(meetingsData as MeetingRecord[]);
          setSelectedMeetingId(meetingsData[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Carrega frequência da reunião selecionada
  useEffect(() => {
    if (!selectedMeetingId) return;

    async function loadAttendance() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("meeting_attendance")
          .select("member_id, status")
          .eq("meeting_id", selectedMeetingId);

        const newMap: Record<string, AttendanceStatus> = {};
        if (data && data.length > 0) {
          data.forEach((row) => {
            newMap[row.member_id] = row.status as AttendanceStatus;
          });
        }
        setAttendanceMap(newMap);
      } catch (err) {
        console.error("Erro ao carregar frequências da reunião:", err);
      }
    }

    loadAttendance();
  }, [selectedMeetingId]);

  // Grupos de membros
  const demolaysAtivos = useMemo(() => members.filter((m) => m.category === "demolay_ativo"), [members]);
  const macons = useMemo(() => members.filter((m) => m.category === "macom"), [members]);
  const seniores = useMemo(() => members.filter((m) => m.category === "senior_demolay"), [members]);
  const irregulares = useMemo(() => members.filter((m) => m.category === "irregular"), [members]);

  // Reunião atualmente selecionada
  const selectedMeeting = useMemo(() => {
    return meetings.find((m) => m.id === selectedMeetingId) || meetings[0];
  }, [meetings, selectedMeetingId]);

  // Contadores de presença DeMolay
  const demolayStats = useMemo(() => {
    let presentes = 0;
    let justificados = 0;
    let ausentes = 0;

    demolaysAtivos.forEach((m) => {
      const st = attendanceMap[m.id] || "ausente";
      if (st === "presente") presentes++;
      else if (st === "justificado") justificados++;
      else ausentes++;
    });

    const percent = demolaysAtivos.length > 0 ? Math.round((presentes / demolaysAtivos.length) * 100) : 0;
    return { presentes, justificados, ausentes, total: demolaysAtivos.length, percent };
  }, [demolaysAtivos, attendanceMap]);

  // Contadores de presença Maçônica
  const macomStats = useMemo(() => {
    let presentes = 0;
    let ausentes = 0;

    macons.forEach((m) => {
      const st = attendanceMap[m.id] || "ausente";
      if (st === "presente") presentes++;
      else ausentes++;
    });

    return { presentes, ausentes, total: macons.length };
  }, [macons, attendanceMap]);

  // Alterar presença de um membro
  const setMemberStatus = (memberId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [memberId]: status,
    }));
  };

  // Salvar chamada no Supabase
  const handleSaveAttendance = async () => {
    if (!selectedMeetingId) return;
    setIsSavingAttendance(true);
    setSaveSuccessMsg("");

    try {
      const supabase = createClient();
      const rowsToUpsert = members
        .filter((m) => m.category === "demolay_ativo" || m.category === "macom")
        .map((m) => ({
          meeting_id: selectedMeetingId,
          member_id: m.id,
          status: attendanceMap[m.id] || "ausente",
          recorded_at: new Date().toISOString(),
        }));

      const { error } = await supabase
        .from("meeting_attendance")
        .upsert(rowsToUpsert, { onConflict: "meeting_id,member_id" });

      if (error) throw error;

      setSaveSuccessMsg("Chamada salva com sucesso no banco de dados!");
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Erro ao salvar presença:", err);
      alert("Erro ao salvar chamada. Verifique as permissões de acesso.");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Salvar/Editar Reunião no Calendário
  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    try {
      const supabase = createClient();
      const startsAt = new Date(`${editingMeeting.date}T${editingMeeting.time || "16:00"}:00-03:00`).toISOString();

      if (editingMeeting.id) {
        // Atualiza reunião existente
        await supabase
          .from("meetings")
          .update({
            title: editingMeeting.title,
            starts_at: startsAt,
            location: editingMeeting.location,
          })
          .eq("id", editingMeeting.id);

        setMeetings((prev) =>
          prev.map((m) =>
            m.id === editingMeeting.id
              ? { ...m, title: editingMeeting.title, starts_at: startsAt, location: editingMeeting.location }
              : m
          )
        );
      } else {
        // Cria nova reunião
        const { data, error } = await supabase
          .from("meetings")
          .insert({
            chapter_id: "00000000-0000-0000-0000-000000000500",
            title: editingMeeting.title,
            starts_at: startsAt,
            location: editingMeeting.location || "A∴R∴L∴S∴ Caridade II Nº 02",
            status: "agendada",
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setMeetings((prev) => [...prev, data as MeetingRecord]);
          setSelectedMeetingId(data.id);
        }
      }

      setIsMeetingModalOpen(false);
      setEditingMeeting(null);
    } catch (err) {
      console.error("Erro ao salvar reunião:", err);
      alert("Erro ao salvar reunião.");
    }
  };

  // Abrir modal de edição para a reunião atual
  const handleOpenEditMeeting = (m: MeetingRecord) => {
    const d = new Date(m.starts_at);
    const dateStr = d.toISOString().split("T")[0];
    const timeStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
    setEditingMeeting({
      id: m.id,
      title: m.title,
      date: dateStr,
      time: timeStr,
      location: m.location || "A∴R∴L∴S∴ Caridade II Nº 02",
    });
    setIsMeetingModalOpen(true);
  };

  // Lojas Maçônicas agrupadas para a aba do Conselho Consultivo
  const masonicLodges = useMemo(() => {
    const lodges: Record<string, MemberRecord[]> = {
      "A∴R∴L∴S∴ Abolição nº 4199": [],
      "A∴R∴L∴S∴ Adonhiran nº 2782": [],
      "A∴R∴L∴S∴ Caridade II nº 135": [],
      "A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591": [],
    };

    macons.forEach((m) => {
      const lodge = m.masonic_lodge || "Outras Lojas / Sem Vinculo Informado";
      if (!lodges[lodge]) lodges[lodge] = [];
      lodges[lodge].push(m);
    });

    return lodges;
  }, [macons]);

  // Membros filtrados na aba Membros
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
    <div className="space-y-6 sm:space-y-8">
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
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setCurrentTab("chamada");
              setIsFullAttendanceListOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#087443] hover:bg-[#087443]/80 border border-[#D9AA45]/50 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#D9AA45]" />
            <span>Fazer Chamada</span>
          </button>
          <button
            onClick={() => {
              setEditingMeeting({
                title: "Sessão Ordinária",
                date: new Date().toISOString().split("T")[0],
                time: "16:00",
                location: "A∴R∴L∴S∴ Caridade II Nº 02",
              });
              setIsMeetingModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-emerald-300" />
            <span>Novo Calendário</span>
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS PRINCIPAIS */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setCurrentTab("chamada")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            currentTab === "chamada"
              ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-md"
              : "text-emerald-100/70 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4 text-[#D9AA45]" />
          <span>Calendário & Livro de Chamada</span>
        </button>

        <button
          onClick={() => setCurrentTab("membros")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            currentTab === "membros"
              ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-md"
              : "text-emerald-100/70 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 text-[#D9AA45]" />
          <span>Quadro de Membros ({members.length})</span>
        </button>

        <button
          onClick={() => setCurrentTab("consultivo")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            currentTab === "consultivo"
              ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-md"
              : "text-emerald-100/70 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4 text-[#D9AA45]" />
          <span>Conselho Consultivo & Lojas Maçônicas</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: CALENDÁRIO & LIVRO DE CHAMADA (COM FREQUÊNCIA DEMOLAY E MAÇÔNICA) */}
      {/* ============================================================== */}
      {currentTab === "chamada" && (
        <div className="space-y-6">
          {/* SELETOR DO CALENDÁRIO DA GESTÃO */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-[11px] font-bold text-[#D9AA45] uppercase tracking-wider">
                  Calendário Oficial da Gestão
                </span>
                <h2 className="text-lg font-bold text-white">
                  Selecione a Data para Lançar ou Consultar a Frequência
                </h2>
              </div>

              {selectedMeeting && (
                <button
                  onClick={() => handleOpenEditMeeting(selectedMeeting)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 text-xs font-semibold border border-white/20 transition-colors self-start sm:self-auto cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#D9AA45]" />
                  <span>Editar esta Data / Reunião</span>
                </button>
              )}
            </div>

            {/* Carrossel de datas de reuniões */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {meetings.map((m) => {
                const isSelected = m.id === selectedMeetingId;
                const d = new Date(m.starts_at);
                const dataFormatada = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
                const horaFormatada = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMeetingId(m.id)}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#087443]/40 border-[#D9AA45] shadow-lg shadow-black/20"
                        : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#D9AA45]">
                        {dataFormatada} • {horaFormatada}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#D9AA45]" />}
                    </div>
                    <p className="text-sm font-bold text-white truncate">{m.title}</p>
                    <p className="text-xs text-emerald-200/70 truncate mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#D9AA45]" />
                      {m.location || "Loja Caridade II"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAINEL RESUMIDO DE FREQUÊNCIA DA DATA SELECIONADA */}
          {selectedMeeting && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D9AA45] text-[#04281A]">
                      Chamada Aberta
                    </span>
                    <h3 className="text-lg font-bold text-white">{selectedMeeting.title}</h3>
                  </div>
                  <p className="text-xs text-emerald-200/70 mt-1">
                    {new Date(selectedMeeting.starts_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} • {new Date(selectedMeeting.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsFullAttendanceListOpen(!isFullAttendanceListOpen)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                  >
                    {isFullAttendanceListOpen ? <EyeOff className="w-4 h-4 text-[#D9AA45]" /> : <Eye className="w-4 h-4 text-[#D9AA45]" />}
                    <span>{isFullAttendanceListOpen ? "Recolher Lista" : "Ver Lista Completa / Fazer Chamada"}</span>
                  </button>

                  <button
                    onClick={handleSaveAttendance}
                    disabled={isSavingAttendance}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingAttendance ? "Salvando..." : "Salvar Chamada"}</span>
                  </button>
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* CARDS RESUMIDOS (DeMolay vs Maçônica) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resumo DeMolay */}
                <div className="p-4 rounded-xl bg-white/5 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-300" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                        Frequência DeMolay
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-300">
                      {demolayStats.percent}% Assiduidade
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-lg font-extrabold text-emerald-300">{demolayStats.presentes}</p>
                      <p className="text-[10px] text-emerald-200/70">Presentes</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-lg font-extrabold text-[#D9AA45]">{demolayStats.justificados}</p>
                      <p className="text-[10px] text-amber-200/70">Justificados</p>
                    </div>
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-lg font-extrabold text-red-300">{demolayStats.ausentes}</p>
                      <p className="text-[10px] text-red-200/70">Ausentes</p>
                    </div>
                  </div>
                </div>

                {/* Resumo Maçônico */}
                <div className="p-4 rounded-xl bg-white/5 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#D9AA45]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#D9AA45]">
                        Frequência Maçônica (Conselho)
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#D9AA45]">
                      {macomStats.presentes} Tios Presentes
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-lg font-extrabold text-emerald-300">{macomStats.presentes}</p>
                      <p className="text-[10px] text-emerald-200/70">Tios Presentes</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-lg font-extrabold text-emerald-100/60">{macomStats.total}</p>
                      <p className="text-[10px] text-emerald-200/70">Total Cadastrado</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* LISTA EXPANSÍVEL DE CHAMADA (Frequência DeMolay e Frequência Maçônica) */}
              {isFullAttendanceListOpen && (
                <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in">
                  {/* Seletor entre Frequência DeMolay e Maçônica */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAttendanceSubTab("demolay")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          attendanceSubTab === "demolay"
                            ? "bg-emerald-600 text-white shadow-md"
                            : "bg-white/5 text-emerald-200/70 hover:text-white"
                        }`}
                      >
                        DeMolays Ativos ({demolaysAtivos.length})
                      </button>

                      <button
                        onClick={() => setAttendanceSubTab("macom")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          attendanceSubTab === "macom"
                            ? "bg-[#c59637] text-[#04281A] shadow-md"
                            : "bg-white/5 text-emerald-200/70 hover:text-white"
                        }`}
                      >
                        Tios Maçons ({macons.length})
                      </button>
                    </div>

                    <span className="text-[11px] text-emerald-300/70">
                      Clique em um botão para alterar o status
                    </span>
                  </div>

                  {/* Tabela de marcação de presença */}
                  <div className="overflow-x-auto rounded-xl border border-white/10 max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-sm text-emerald-100/90">
                      <thead className="sticky top-0 bg-[#063B26] text-xs uppercase tracking-wider text-emerald-200 border-b border-white/10 z-10">
                        <tr>
                          <th className="py-2.5 px-4">ID</th>
                          <th className="py-2.5 px-4">Nome do Membro</th>
                          <th className="py-2.5 px-4">{attendanceSubTab === "macom" ? "Loja Maçônica" : "Regularidade"}</th>
                          <th className="py-2.5 px-4 text-center">Presença na Sessão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(attendanceSubTab === "demolay" ? demolaysAtivos : macons).map((m) => {
                          const currentStatus = attendanceMap[m.id] || "ausente";
                          return (
                            <tr key={m.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-2.5 px-4 font-mono font-bold text-[#D9AA45] text-xs">
                                #{m.cid}
                              </td>
                              <td className="py-2.5 px-4 font-medium text-white text-xs sm:text-sm">
                                {m.full_name}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-emerald-200/70">
                                {attendanceSubTab === "macom" ? (m.masonic_lodge || "Conselho Consultivo") : (m.regularity || "Regular")}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <div className="inline-flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/10">
                                  <button
                                    onClick={() => setMemberStatus(m.id, "presente")}
                                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                      currentStatus === "presente"
                                        ? "bg-emerald-500 text-white shadow-sm"
                                        : "text-emerald-200/60 hover:text-white"
                                    }`}
                                  >
                                    Presente
                                  </button>
                                  {attendanceSubTab === "demolay" && (
                                    <button
                                      onClick={() => setMemberStatus(m.id, "justificado")}
                                      className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                        currentStatus === "justificado"
                                          ? "bg-amber-500 text-[#04281A] shadow-sm"
                                          : "text-emerald-200/60 hover:text-white"
                                      }`}
                                    >
                                      Justificado
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setMemberStatus(m.id, "ausente")}
                                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                      currentStatus === "ausente"
                                        ? "bg-red-500/80 text-white shadow-sm"
                                        : "text-emerald-200/60 hover:text-white"
                                    }`}
                                  >
                                    Ausente
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: QUADRO DE MEMBROS (COM OS 4 FILTROS) */}
      {/* ============================================================== */}
      {currentTab === "membros" && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Censo Geral de Membros do Capítulo
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/70 mt-1">
                Filtre e visualize todos os membros cadastrados na base do SISDM
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-300">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, ID ou Loja..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-[#D9AA45] transition-all"
              />
            </div>
          </div>

          {/* Botões dos 4 Filtros Solicitados */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveFilter("todos")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                activeFilter === "todos" ? "bg-[#087443] text-white border-[#D9AA45]" : "bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10"
              }`}
            >
              Todos ({members.length})
            </button>
            <button
              onClick={() => setActiveFilter("demolay_ativo")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                activeFilter === "demolay_ativo" ? "bg-emerald-600 text-white border-emerald-300" : "bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10"
              }`}
            >
              DeMolay Ativo ({demolaysAtivos.length})
            </button>
            <button
              onClick={() => setActiveFilter("macom")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                activeFilter === "macom" ? "bg-[#c59637] text-[#04281A] font-bold border-amber-200" : "bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10"
              }`}
            >
              Maçom ({macons.length})
            </button>
            <button
              onClick={() => setActiveFilter("senior_demolay")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                activeFilter === "senior_demolay" ? "bg-blue-600 text-white border-blue-300" : "bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10"
              }`}
            >
              Sênior DeMolay ({seniores.length})
            </button>
            <button
              onClick={() => setActiveFilter("irregular")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                activeFilter === "irregular" ? "bg-red-600 text-white border-red-300" : "bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10"
              }`}
            >
              Irregular ({irregulares.length})
            </button>
          </div>

          {/* Tabela de Membros */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm text-emerald-100/90">
              <thead className="bg-white/10 text-xs uppercase tracking-wider text-emerald-200 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">ID SISDM</th>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Regularidade / Loja</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#D9AA45]">#{m.cid}</td>
                    <td className="py-3 px-4 font-medium text-white">{m.full_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 border border-white/20">
                        {m.category === "demolay_ativo" ? "DeMolay Ativo" : m.category === "macom" ? "Maçom" : m.category === "senior_demolay" ? "Sênior DeMolay" : "Irregular"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-emerald-200/80">
                      {m.masonic_lodge ? `${m.regularity} • ${m.masonic_lodge}` : m.regularity}
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      {m.is_active ? <span className="text-emerald-400 font-semibold">Ativo</span> : <span className="text-red-400 font-semibold">Inativo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: CONSELHO CONSULTIVO & LOJAS MAÇÔNICAS REPRESENTADAS */}
      {/* ============================================================== */}
      {currentTab === "consultivo" && (
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-6 h-6 text-[#D9AA45]" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Conselho Consultivo — Lojas Maçônicas Patrocinadoras
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed max-w-3xl">
              Quadro oficial dos Tios Maçons e Consultores que supervisionam os trabalhos do Capítulo Professor Carvalho Neves Nº 500, distribuídos por suas respectivas oficinas de origem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Object.entries(masonicLodges).map(([lodgeName, lodgeMembers]) => (
              <div
                key={lodgeName}
                className="bg-white/5 backdrop-blur-md border border-white/10 hover:border-[#D9AA45]/50 rounded-2xl p-5 shadow-lg space-y-4 transition-all"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-[#D9AA45] tracking-tight">
                    {lodgeName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-[#D9AA45] border border-amber-500/30">
                    {lodgeMembers.length} {lodgeMembers.length === 1 ? "membro" : "membros"}
                  </span>
                </div>

                <ul className="space-y-2.5">
                  {lodgeMembers.map((tm) => (
                    <li
                      key={tm.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-emerald-100"
                    >
                      <span className="font-semibold text-white">{tm.full_name}</span>
                      <span className="font-mono text-[#D9AA45] bg-black/30 px-2 py-0.5 rounded">
                        ID: {tm.cid}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PARA ADICIONAR OU EDITAR REUNIÃO */}
      {isMeetingModalOpen && editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#04281A] border border-[#D9AA45]/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#D9AA45]" />
                <span>{editingMeeting.id ? "Editar Reunião da Gestão" : "Cadastrar Nova Data no Calendário"}</span>
              </h3>
              <button
                onClick={() => setIsMeetingModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeeting} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase font-bold text-emerald-200 mb-1">Título da Sessão</label>
                <input
                  type="text"
                  required
                  value={editingMeeting.title}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, title: e.target.value })}
                  placeholder="Ex: Sessão Ordinária do Grau Iniciático"
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-bold text-emerald-200 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={editingMeeting.date}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-emerald-200 mb-1">Horário</label>
                  <input
                    type="time"
                    required
                    value={editingMeeting.time}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, time: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase font-bold text-emerald-200 mb-1">Local da Sessão</label>
                <input
                  type="text"
                  value={editingMeeting.location}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, location: e.target.value })}
                  placeholder="Ex: A∴R∴L∴S∴ Caridade II Nº 02"
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold shadow-md cursor-pointer"
                >
                  Salvar Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
