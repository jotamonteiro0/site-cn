"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar as CalendarIcon,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  PlusCircle,
  Edit2,
  MapPin,
  Clock,
  ArrowLeft,
  Mail,
  ExternalLink,
  UserPlus,
  Trash2,
  CalendarCheck,
  Compass
} from "lucide-react";

interface MemberRecord {
  id: string;
  cid: string;
  full_name: string;
  category: "demolay_ativo" | "senior_demolay" | "macom" | "irregular";
  regularity?: string;
  masonic_lodge?: string;
}

interface MeetingRecord {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  status: string;
  description?: string;
}

interface VisitingMasonRecord {
  id: string;
  meeting_id: string;
  cim: string;
  name: string;
  masonic_lodge: string;
  potency: string;
  created_at?: string;
}

type AttendanceStatus = "presente" | "ausente" | "justificado";

export default function ChamadaPage() {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [visitingMasons, setVisitingMasons] = useState<VisitingMasonRecord[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [activeTab, setActiveTab] = useState<"demolay" | "macom" | "visitantes">("demolay");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Modais
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<{
    id?: string;
    title: string;
    date: string;
    time: string;
    location: string;
  } | null>(null);

  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [newVisitor, setNewVisitor] = useState({
    cim: "",
    name: "",
    masonic_lodge: "",
    potency: "GLMPI",
  });

  const [isConvocationModalOpen, setIsConvocationModalOpen] = useState(false);
  const [convocationCopied, setConvocationCopied] = useState(false);

  // 1. Carregar Reuniões e Membros
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient();

        // Carrega Reuniões
        const { data: mData } = await supabase
          .from("meetings")
          .select("id, title, starts_at, location, status, description")
          .order("starts_at", { ascending: true });

        if (mData && mData.length > 0) {
          setMeetings(mData);
          setSelectedMeetingId(mData[0].id);
        }

        // Carrega Membros
        const { data: memData } = await supabase
          .from("members")
          .select("id, cid, full_name, category, regularity, masonic_lodge")
          .order("full_name", { ascending: true });

        if (memData) {
          setMembers(memData as MemberRecord[]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
      }
    }
    init();
  }, []);

  // 2. Carregar Chamada e Visitantes quando a reunião muda
  useEffect(() => {
    if (!selectedMeetingId) return;

    async function loadMeetingDetails() {
      try {
        const supabase = createClient();

        // Presenças registradas
        const { data: attData } = await supabase
          .from("meeting_attendance")
          .select("member_id, status")
          .eq("meeting_id", selectedMeetingId);

        const newMap: Record<string, AttendanceStatus> = {};
        if (attData && attData.length > 0) {
          attData.forEach((row) => {
            newMap[row.member_id] = row.status as AttendanceStatus;
          });
        }
        setAttendanceMap(newMap);

        // Visitantes Maçons da reunião
        const { data: visData } = await supabase
          .from("meeting_visiting_masons")
          .select("id, meeting_id, cim, name, masonic_lodge, potency, created_at")
          .eq("meeting_id", selectedMeetingId)
          .order("created_at", { ascending: true });

        if (visData) {
          setVisitingMasons(visData as VisitingMasonRecord[]);
        } else {
          setVisitingMasons([]);
        }
      } catch (err) {
        console.error("Erro ao carregar detalhes da reunião:", err);
      }
    }

    loadMeetingDetails();
  }, [selectedMeetingId]);

  // Reunião Selecionada
  const selectedMeeting = useMemo(() => {
    return meetings.find((m) => m.id === selectedMeetingId) || meetings[0];
  }, [meetings, selectedMeetingId]);

  // Grupos de membros
  const demolaysAtivos = useMemo(() => members.filter((m) => m.category === "demolay_ativo"), [members]);
  const macons = useMemo(() => members.filter((m) => m.category === "macom"), [members]);

  // Estatísticas DeMolay
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

    const total = demolaysAtivos.length;
    const percent = total > 0 ? Math.round((presentes / total) * 100) : 0;
    return { presentes, justificados, ausentes, total, percent };
  }, [demolaysAtivos, attendanceMap]);

  // Estatísticas Maçônicas
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

  // Salvar Chamada no Banco
  const handleSaveAttendance = async () => {
    if (!selectedMeetingId) return;
    setIsSaving(true);
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
      alert("Erro ao salvar chamada no banco.");
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar / Editar Reunião
  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    try {
      const supabase = createClient();
      const startsAt = new Date(`${editingMeeting.date}T${editingMeeting.time || "16:00"}:00-03:00`).toISOString();

      if (editingMeeting.id) {
        // Atualiza
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
        // Cria
        const { data, error } = await supabase
          .from("meetings")
          .insert({
            chapter_id: "00000000-0000-0000-0000-000000000500",
            title: editingMeeting.title,
            starts_at: startsAt,
            location: editingMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135",
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

  // Adicionar Maçom Visitante
  const handleAddVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingId || !newVisitor.name.trim() || !newVisitor.cim.trim()) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("meeting_visiting_masons")
        .insert({
          meeting_id: selectedMeetingId,
          cim: newVisitor.cim.trim(),
          name: newVisitor.name.trim(),
          masonic_lodge: newVisitor.masonic_lodge.trim() || "Loja Não Informada",
          potency: newVisitor.potency.trim() || "GLMPI",
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setVisitingMasons((prev) => [...prev, data as VisitingMasonRecord]);
        setNewVisitor({ cim: "", name: "", masonic_lodge: "", potency: "GLMPI" });
        setIsVisitorModalOpen(false);
      }
    } catch (err) {
      console.error("Erro ao adicionar maçom visitante:", err);
      alert("Erro ao salvar maçom visitante.");
    }
  };

  // Remover Maçom Visitante
  const handleRemoveVisitor = async (visitorId: string) => {
    if (!confirm("Deseja realmente remover este maçom visitante da chamada?")) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("meeting_visiting_masons")
        .delete()
        .eq("id", visitorId);

      if (error) throw error;
      setVisitingMasons((prev) => prev.filter((v) => v.id !== visitorId));
    } catch (err) {
      console.error("Erro ao excluir maçom visitante:", err);
    }
  };

  // Gerador de Link para o Google Agenda
  const getGoogleCalendarUrl = (m?: MeetingRecord) => {
    if (!m) return "#";
    const startDate = new Date(m.starts_at);
    // Duração estimada: 2 horas
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const formatGDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const datesStr = `${formatGDate(startDate)}/${formatGDate(endDate)}`;

    const text = encodeURIComponent(m.title);
    const details = encodeURIComponent(
      `Sessão Oficial do Capítulo Professor Carvalho Neves Nº 500.\nPor favor, confirme sua presença pelo portal do capítulo.`
    );
    const location = encodeURIComponent(m.location || "A∴R∴L∴S∴ Caridade II nº 135");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${datesStr}&details=${details}&location=${location}`;
  };

  // Texto formatado de convocação para envio
  const convocationText = selectedMeeting
    ? `🏛️ CONVOCAÇÃO OFICIAL — CAPÍTULO PROFESSOR CARVALHO NEVES Nº 500\n\n` +
      `Estimados Irmãos e Tios do Conselho Consultivo,\n` +
      `Estão todos convocados para a próxima reunião capitular:\n\n` +
      `📌 Sessão: ${selectedMeeting.title}\n` +
      `📅 Data: ${new Date(selectedMeeting.starts_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}\n` +
      `⏰ Horário: ${new Date(selectedMeeting.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n` +
      `📍 Local: ${selectedMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135"}\n\n` +
      `Favor confirmar presença com antecedência no Sistema Oficial do Capítulo.\n` +
      `"A união nos fortalece, a fidelidade nos perpetua."`
    : "";

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
            <span>Calendário & Frequência Capitular</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Gestão de reuniões, chamada DeMolay, frequência maçônica e maçons visitantes
          </p>
        </div>

        {/* Ações do Mestre Conselheiro / Escrivão */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingMeeting({
                title: "Sessão Ordinária",
                date: new Date().toISOString().split("T")[0],
                time: "16:00",
                location: "A∴R∴L∴S∴ Caridade II nº 135",
              });
              setIsMeetingModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#D9AA45]" />
            <span>Nova Reunião</span>
          </button>

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Salvando..." : "Salvar Chamada"}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE SALVAMENTO */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* SELETOR DE REUNIÃO / CALENDÁRIO */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45]">
              Calendário da Gestão Atual
            </span>
            <div className="flex items-center gap-3 mt-1">
              <CalendarIcon className="w-5 h-5 text-emerald-300" />
              <select
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="bg-[#064D32] border border-emerald-500/40 rounded-xl px-3.5 py-2 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
              >
                {meetings.map((m) => {
                  const d = new Date(m.starts_at);
                  const dataFormatada = d.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });
                  return (
                    <option key={m.id} value={m.id}>
                      {dataFormatada} — {m.title}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {selectedMeeting && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Botão Google Agenda */}
              <a
                href={getGoogleCalendarUrl(selectedMeeting)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-800/40 hover:bg-emerald-800/60 border border-emerald-500/30 text-white text-xs font-semibold transition-all cursor-pointer"
                title="Adicionar automaticamente no Google Agenda"
              >
                <CalendarCheck className="w-4 h-4 text-[#D9AA45]" />
                <span>Google Agenda</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              {/* Botão de Convocação & Confirmação de Presença */}
              <button
                onClick={() => setIsConvocationModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 text-emerald-300" />
                <span>Convocação & E-mail</span>
              </button>

              {/* Botão de Editar Dados da Sessão */}
              <button
                onClick={() => {
                  const d = new Date(selectedMeeting.starts_at);
                  setEditingMeeting({
                    id: selectedMeeting.id,
                    title: selectedMeeting.title,
                    date: d.toISOString().split("T")[0],
                    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                    location: selectedMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135",
                  });
                  setIsMeetingModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Editar Reunião</span>
              </button>
            </div>
          )}
        </div>

        {/* Detalhes da Sessão Selecionada */}
        {selectedMeeting && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-emerald-100/80">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D9AA45]" />
              <span>
                {new Date(selectedMeeting.starts_at).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}{" "}
                às{" "}
                {new Date(selectedMeeting.starts_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>{selectedMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135"}</span>
            </div>
          </div>
        )}
      </div>

      {/* CARDS RESUMIDOS (DeMolay, Maçônica e Visitantes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Resumo DeMolay */}
        <div className="p-5 rounded-2xl bg-white/5 border border-emerald-500/30 space-y-3">
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
        <div className="p-5 rounded-2xl bg-white/5 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D9AA45]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#D9AA45]">
                Frequência Maçônica (Conselho)
              </span>
            </div>
            <span className="text-xs font-bold text-[#D9AA45]">
              {macomStats.presentes} Presentes
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

        {/* Resumo Maçons Visitantes */}
        <div className="p-5 rounded-2xl bg-white/5 border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Maçons Visitantes
              </span>
            </div>
            <span className="text-xs font-bold text-purple-300">
              {visitingMasons.length} Registrados
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-lg font-extrabold text-purple-300">{visitingMasons.length}</p>
              <p className="text-[10px] text-purple-200/70">Visitantes</p>
            </div>
            <button
              onClick={() => {
                setActiveTab("visitantes");
                setIsVisitorModalOpen(true);
              }}
              className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 flex flex-col items-center justify-center transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#D9AA45] mb-0.5" />
              <span className="text-[10px] font-bold">+ Adicionar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DA CHAMADA DETALHADA */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-5">
        {/* Abas */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("demolay")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "demolay"
                  ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-sm"
                  : "bg-white/5 text-emerald-200/70 hover:text-white"
              }`}
            >
              DeMolays Ativos ({demolaysAtivos.length})
            </button>
            <button
              onClick={() => setActiveTab("macom")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "macom"
                  ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-sm"
                  : "bg-white/5 text-emerald-200/70 hover:text-white"
              }`}
            >
              Tios Maçons ({macons.length})
            </button>
            <button
              onClick={() => setActiveTab("visitantes")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "visitantes"
                  ? "bg-purple-700 text-white border border-[#D9AA45]/50 shadow-sm"
                  : "bg-white/5 text-purple-200/70 hover:text-white"
              }`}
            >
              Maçons Visitantes ({visitingMasons.length})
            </button>
          </div>

          {activeTab === "visitantes" && (
            <button
              onClick={() => setIsVisitorModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Adicionar Visitante</span>
            </button>
          )}
        </div>

        {/* TAB 1: DEMOLAYS ATIVOS */}
        {activeTab === "demolay" && (
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto pr-1">
            {demolaysAtivos.map((m) => {
              const currentStatus = attendanceMap[m.id] || "ausente";
              return (
                <div
                  key={m.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#D9AA45] w-16">
                      {m.cid}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{m.full_name}</p>
                      <p className="text-[11px] text-emerald-200/60">
                        {m.regularity || "DeMolay Regular"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setAttendanceMap((prev) => ({ ...prev, [m.id]: "presente" }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        currentStatus === "presente"
                          ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50"
                          : "bg-white/5 text-emerald-200/60 hover:bg-white/10"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Presente</span>
                    </button>

                    <button
                      onClick={() =>
                        setAttendanceMap((prev) => ({ ...prev, [m.id]: "justificado" }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        currentStatus === "justificado"
                          ? "bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50"
                          : "bg-white/5 text-amber-200/60 hover:bg-white/10"
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Justificado</span>
                    </button>

                    <button
                      onClick={() =>
                        setAttendanceMap((prev) => ({ ...prev, [m.id]: "ausente" }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        currentStatus === "ausente"
                          ? "bg-red-600 text-white shadow-md ring-2 ring-red-400/50"
                          : "bg-white/5 text-red-200/60 hover:bg-white/10"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Ausente</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: TIOS MAÇONS */}
        {activeTab === "macom" && (
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto pr-1">
            {macons.map((m) => {
              const currentStatus = attendanceMap[m.id] || "ausente";
              return (
                <div
                  key={m.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#D9AA45] w-16">
                      {m.cid}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{m.full_name}</p>
                      <p className="text-[11px] text-[#D9AA45]">
                        {m.masonic_lodge || "Loja Patrocinadora"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        setAttendanceMap((prev) => ({ ...prev, [m.id]: "presente" }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        currentStatus === "presente"
                          ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50"
                          : "bg-white/5 text-emerald-200/60 hover:bg-white/10"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Presente</span>
                    </button>

                    <button
                      onClick={() =>
                        setAttendanceMap((prev) => ({ ...prev, [m.id]: "ausente" }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        currentStatus === "ausente"
                          ? "bg-red-600 text-white shadow-md ring-2 ring-red-400/50"
                          : "bg-white/5 text-red-200/60 hover:bg-white/10"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Ausente</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: MAÇONS VISITANTES */}
        {activeTab === "visitantes" && (
          <div className="space-y-4">
            {visitingMasons.length === 0 ? (
              <div className="py-8 text-center text-xs text-emerald-200/60 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                Nenhum maçom visitante registrado para esta sessão ainda.
                <div className="mt-3">
                  <button
                    onClick={() => setIsVisitorModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Adicionar Visitante</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {visitingMasons.map((v) => (
                  <div
                    key={v.id}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-3 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-300">
                          CIM: {v.cim}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/40 border border-purple-500/40 text-purple-200">
                          {v.potency}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white mt-0.5">{v.name}</p>
                      <p className="text-xs text-[#D9AA45]">{v.masonic_lodge}</p>
                    </div>

                    <button
                      onClick={() => handleRemoveVisitor(v.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors cursor-pointer"
                      title="Remover visitante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ADICIONAR / EDITAR REUNIÃO */}
      {isMeetingModalOpen && editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#064D32] border border-white/20 shadow-2xl space-y-4 text-white">
            <h3 className="text-lg font-bold">
              {editingMeeting.id ? "Editar Dados da Reunião" : "Cadastrar Nova Reunião"}
            </h3>

            <form onSubmit={handleSaveMeeting} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-emerald-200">Título da Sessão</label>
                <input
                  type="text"
                  required
                  value={editingMeeting.title}
                  onChange={(e) =>
                    setEditingMeeting({ ...editingMeeting, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  placeholder="Ex: Sessão Ordinária do Grau Iniciático"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">Data</label>
                  <input
                    type="date"
                    required
                    value={editingMeeting.date}
                    onChange={(e) =>
                      setEditingMeeting({ ...editingMeeting, date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">Horário</label>
                  <input
                    type="time"
                    required
                    value={editingMeeting.time}
                    onChange={(e) =>
                      setEditingMeeting({ ...editingMeeting, time: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">Local da Sessão</label>
                <input
                  type="text"
                  required
                  value={editingMeeting.location}
                  onChange={(e) =>
                    setEditingMeeting({ ...editingMeeting, location: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  placeholder="A∴R∴L∴S∴ Caridade II nº 135"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsMeetingModalOpen(false);
                    setEditingMeeting(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold cursor-pointer"
                >
                  Salvar Reunião
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR MAÇOM VISITANTE */}
      {isVisitorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#064D32] border border-purple-500/40 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-300" />
              <h3 className="text-lg font-bold">Adicionar Maçom Visitante</h3>
            </div>
            <p className="text-xs text-emerald-200/70">
              Registre a presença do Tio Maçom visitante nesta sessão do Capítulo 500.
            </p>

            <form onSubmit={handleAddVisitor} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-purple-200">
                  CIM (Cadastro Individual Maçônico)
                </label>
                <input
                  type="text"
                  required
                  value={newVisitor.cim}
                  onChange={(e) => setNewVisitor({ ...newVisitor, cim: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono"
                  placeholder="Ex: 284912"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-purple-200">
                  Nome Completo do Membro
                </label>
                <input
                  type="text"
                  required
                  value={newVisitor.name}
                  onChange={(e) => setNewVisitor({ ...newVisitor, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: Raimundo Nonato dos Santos"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-purple-200">
                  Loja Maçônica
                </label>
                <input
                  type="text"
                  required
                  value={newVisitor.masonic_lodge}
                  onChange={(e) => setNewVisitor({ ...newVisitor, masonic_lodge: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: A∴R∴L∴S∴ Raul Serrano nº 07"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-purple-200">
                  Potência Maçônica
                </label>
                <input
                  type="text"
                  required
                  value={newVisitor.potency}
                  onChange={(e) => setNewVisitor({ ...newVisitor, potency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: GLMPI, GOB-PI, COMAB"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsVisitorModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
                >
                  Confirmar Visitante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONVOCAÇÃO & CONFIRMAÇÃO POR E-MAIL */}
      {isConvocationModalOpen && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#064D32] border border-white/20 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#D9AA45]" />
              <h3 className="text-lg font-bold">Convocação & Confirmação de Presença</h3>
            </div>
            <p className="text-xs text-emerald-200/80">
              Copie a convocatória oficial para o grupo dos membros ou dispare o e-mail coletivo solicitando confirmação de presença.
            </p>

            <textarea
              readOnly
              rows={8}
              value={convocationText}
              className="w-full p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-emerald-100 leading-relaxed focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(convocationText);
                  setConvocationCopied(true);
                  setTimeout(() => setConvocationCopied(false), 3000);
                }}
                className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold cursor-pointer"
              >
                {convocationCopied ? "✓ Convocação Copiada!" : "Copiar Texto da Convocação"}
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`mailto:?subject=${encodeURIComponent(`[CONVOCAÇÃO] ${selectedMeeting.title} - Cap. Carvalho Neves 500`)}&body=${encodeURIComponent(convocationText)}`}
                  className="px-3.5 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold cursor-pointer"
                >
                  Abrir no E-mail
                </a>
                <button
                  onClick={() => setIsConvocationModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"
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
