"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar as CalendarIcon,
  Users,
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
  Compass,
  FileText,
  Printer
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

interface VisitingDemolayRecord {
  id: string;
  meeting_id: string;
  cid: string;
  name: string;
  chapter: string;
  created_at?: string;
}

type AttendanceStatus = "presente" | "ausente" | "justificado";

export default function ChamadaPage() {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  
  // Visitantes
  const [visitingMasons, setVisitingMasons] = useState<VisitingMasonRecord[]>([]);
  const [visitingDemolays, setVisitingDemolays] = useState<VisitingDemolayRecord[]>([]);

  // Abas de visualização unificada (Ata vs Chamada)
  const [sessionSection, setSessionSection] = useState<"chamada" | "ata">("chamada");

  // Abas dentro da Chamada
  const [activeTab, setActiveTab] = useState<"demolay" | "macom" | "visitantes_demolay" | "visitantes_macom">("demolay");

  // Estado da Ata da Reunião
  const [minuteData, setMinuteData] = useState<{
    number: string;
    degree: string;
    content: string;
  }>({
    number: "Ata Oficial nº 24",
    degree: "Grau Iniciático",
    content: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingMinute, setIsSavingMinute] = useState(false);
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

  // Modal Maçom Visitante
  const [isMasonVisitorModalOpen, setIsMasonVisitorModalOpen] = useState(false);
  const [newMasonVisitor, setNewMasonVisitor] = useState({
    cim: "",
    name: "",
    masonic_lodge: "",
    potency: "GOB-PI",
  });

  // Modal DeMolay Visitante (ID, Nome Completo, Capítulo)
  const [isDemolayVisitorModalOpen, setIsDemolayVisitorModalOpen] = useState(false);
  const [newDemolayVisitor, setNewDemolayVisitor] = useState({
    cid: "",
    name: "",
    chapter: "",
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

  // 2. Carregar Chamada, Visitantes e Ata da Reunião Selecionada
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

        // Visitantes DeMolays da reunião
        try {
          const { data: dmVisData, error: dmErr } = await supabase
            .from("meeting_visiting_demolays")
            .select("id, meeting_id, cid, name, chapter, created_at")
            .eq("meeting_id", selectedMeetingId)
            .order("created_at", { ascending: true });

          if (!dmErr && dmVisData) {
            setVisitingDemolays(dmVisData as VisitingDemolayRecord[]);
          } else {
            // Fallback localStorage
            const localData = localStorage.getItem(`cn_visiting_dm_${selectedMeetingId}`);
            if (localData) {
              setVisitingDemolays(JSON.parse(localData));
            } else {
              setVisitingDemolays([]);
            }
          }
        } catch {
          const localData = localStorage.getItem(`cn_visiting_dm_${selectedMeetingId}`);
          if (localData) {
            setVisitingDemolays(JSON.parse(localData));
          } else {
            setVisitingDemolays([]);
          }
        }

        // Carrega conteúdo da Ata correspondente
        const currentM = meetings.find((m) => m.id === selectedMeetingId);
        const savedAta = localStorage.getItem(`cn_meeting_minute_${selectedMeetingId}`);
        if (savedAta) {
          setMinuteData(JSON.parse(savedAta));
        } else if (currentM?.description) {
          setMinuteData({
            number: "Ata da Sessão Ordinária",
            degree: "Grau Iniciático",
            content: currentM.description,
          });
        } else {
          setMinuteData({
            number: `Ata da Sessão do dia ${new Date(currentM?.starts_at || Date.now()).toLocaleDateString("pt-BR")}`,
            degree: "Grau Iniciático",
            content: `Aos ${new Date(currentM?.starts_at || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}, no Templo da A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI), sob a presidência do Mestre Conselheiro, reuniu-se o Capítulo Professor Carvalho Neves Nº 500 para a realização dos seus regulares trabalhos ritualísticos.\n\nAberta a sessão na forma regulamentar, procedeu-se à chamada geral dos irmãos presentes, verificação do quórum legal e leitura do balaústre da reunião anterior, que foi aprovado sem restrições. Seguiu-se com as deliberações administrativas e expediente do Escrivão.`,
          });
        }
      } catch (err) {
        console.error("Erro ao carregar detalhes da reunião:", err);
      }
    }

    loadMeetingDetails();
  }, [selectedMeetingId, meetings]);

  // Reunião Selecionada
  const selectedMeeting = useMemo(() => {
    return meetings.find((m) => m.id === selectedMeetingId) || meetings[0];
  }, [meetings, selectedMeetingId]);

  // Grupos de membros
  const demolaysAtivos = useMemo(() => members.filter((m) => m.category === "demolay_ativo"), [members]);
  const macons = useMemo(() => members.filter((m) => m.category === "macom"), [members]);

  // Membros Presentes
  const presentesDemolay = useMemo(() => {
    return demolaysAtivos.filter((m) => attendanceMap[m.id] === "presente");
  }, [demolaysAtivos, attendanceMap]);

  const presentesMacons = useMemo(() => {
    return macons.filter((m) => attendanceMap[m.id] === "presente");
  }, [macons, attendanceMap]);

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

      setSaveSuccessMsg("Chamada salva com sucesso e vinculada à Ata da Sessão!");
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Erro ao salvar presença:", err);
      alert("Erro ao salvar chamada no banco.");
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Ata da Reunião
  const handleSaveMinute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingId) return;
    setIsSavingMinute(true);

    try {
      localStorage.setItem(`cn_meeting_minute_${selectedMeetingId}`, JSON.stringify(minuteData));

      // Atualiza descrição na tabela meetings
      const supabase = createClient();
      await supabase
        .from("meetings")
        .update({ description: minuteData.content })
        .eq("id", selectedMeetingId);

      setSaveSuccessMsg("Ata oficial registrada e salva no livro de atas do Capítulo!");
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Erro ao salvar ata:", err);
      alert("Erro ao salvar ata.");
    } finally {
      setIsSavingMinute(false);
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
            location: editingMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
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
  const handleAddMasonVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingId || !newMasonVisitor.name.trim() || !newMasonVisitor.cim.trim()) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("meeting_visiting_masons")
        .insert({
          meeting_id: selectedMeetingId,
          cim: newMasonVisitor.cim.trim(),
          name: newMasonVisitor.name.trim(),
          masonic_lodge: newMasonVisitor.masonic_lodge.trim() || "Loja Patrocinadora",
          potency: newMasonVisitor.potency.trim() || "GOB-PI",
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setVisitingMasons((prev) => [...prev, data as VisitingMasonRecord]);
        setNewMasonVisitor({ cim: "", name: "", masonic_lodge: "", potency: "GOB-PI" });
        setIsMasonVisitorModalOpen(false);
      }
    } catch (err) {
      console.error("Erro ao adicionar maçom visitante:", err);
      // Fallback local se erro
      const fallbackRecord: VisitingMasonRecord = {
        id: "vis_m_" + Date.now(),
        meeting_id: selectedMeetingId,
        cim: newMasonVisitor.cim.trim(),
        name: newMasonVisitor.name.trim(),
        masonic_lodge: newMasonVisitor.masonic_lodge.trim() || "Loja Patrocinadora",
        potency: newMasonVisitor.potency.trim() || "GOB-PI",
      };
      setVisitingMasons((prev) => [...prev, fallbackRecord]);
      setNewMasonVisitor({ cim: "", name: "", masonic_lodge: "", potency: "GOB-PI" });
      setIsMasonVisitorModalOpen(false);
    }
  };

  // Remover Maçom Visitante
  const handleRemoveMasonVisitor = async (visitorId: string) => {
    if (!confirm("Deseja realmente remover este maçom visitante da chamada?")) return;
    try {
      const supabase = createClient();
      await supabase.from("meeting_visiting_masons").delete().eq("id", visitorId);
      setVisitingMasons((prev) => prev.filter((v) => v.id !== visitorId));
    } catch (err) {
      console.error("Erro ao excluir maçom visitante:", err);
      setVisitingMasons((prev) => prev.filter((v) => v.id !== visitorId));
    }
  };

  // Adicionar DeMolay Visitante (ID, Nome Completo, Capítulo)
  const handleAddDemolayVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingId || !newDemolayVisitor.name.trim() || !newDemolayVisitor.cid.trim()) return;

    const newRecord: VisitingDemolayRecord = {
      id: "vis_dm_" + Date.now(),
      meeting_id: selectedMeetingId,
      cid: newDemolayVisitor.cid.trim(),
      name: newDemolayVisitor.name.trim(),
      chapter: newDemolayVisitor.chapter.trim() || "Capítulo Visitante",
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("meeting_visiting_demolays")
        .insert({
          meeting_id: selectedMeetingId,
          cid: newRecord.cid,
          name: newRecord.name,
          chapter: newRecord.chapter,
        })
        .select()
        .single();

      if (!error && data) {
        setVisitingDemolays((prev) => [...prev, data as VisitingDemolayRecord]);
      } else {
        // Fallback local
        const updated = [...visitingDemolays, newRecord];
        setVisitingDemolays(updated);
        localStorage.setItem(`cn_visiting_dm_${selectedMeetingId}`, JSON.stringify(updated));
      }
    } catch {
      const updated = [...visitingDemolays, newRecord];
      setVisitingDemolays(updated);
      localStorage.setItem(`cn_visiting_dm_${selectedMeetingId}`, JSON.stringify(updated));
    }

    setNewDemolayVisitor({ cid: "", name: "", chapter: "" });
    setIsDemolayVisitorModalOpen(false);
  };

  // Remover DeMolay Visitante
  const handleRemoveDemolayVisitor = async (visitorId: string) => {
    if (!confirm("Deseja remover este irmão visitante da reunião?")) return;
    try {
      const supabase = createClient();
      await supabase.from("meeting_visiting_demolays").delete().eq("id", visitorId);
    } catch {
      // Ignora erro se for local
    }
    const updated = visitingDemolays.filter((v) => v.id !== visitorId);
    setVisitingDemolays(updated);
    localStorage.setItem(`cn_visiting_dm_${selectedMeetingId}`, JSON.stringify(updated));
  };

  // Gerador de Link para o Google Agenda
  const getGoogleCalendarUrl = (m?: MeetingRecord) => {
    if (!m) return "#";
    const startDate = new Date(m.starts_at);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const formatGDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const datesStr = `${formatGDate(startDate)}/${formatGDate(endDate)}`;

    const text = encodeURIComponent(m.title);
    const details = encodeURIComponent(
      `Sessão Oficial do Capítulo Professor Carvalho Neves Nº 500.\nLocal: A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI).`
    );
    const location = encodeURIComponent(m.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)");

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
      `📍 Local: ${selectedMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"}\n\n` +
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
            <span>Sessões, Atas & Chamada Capitular</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Gestão integrada da ata da reunião, registro de presença de membros e cadastro de visitantes
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingMeeting({
                title: "Sessão Ordinária",
                date: new Date().toISOString().split("T")[0],
                time: "16:00",
                location: "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
              });
              setIsMeetingModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#D9AA45]" />
            <span>Nova Reunião</span>
          </button>

          {sessionSection === "chamada" ? (
            <button
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Salvando..." : "Salvar Chamada"}</span>
            </button>
          ) : (
            <button
              onClick={handleSaveMinute}
              disabled={isSavingMinute}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingMinute ? "Salvando..." : "Salvar Ata Oficial"}</span>
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK DE SALVAMENTO */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* SELETOR DE REUNIÃO / CALENDÁRIO */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45]">
              Sessão Capitular Selecionada
            </span>
            <div className="flex items-center gap-3 mt-1.5">
              <CalendarIcon className="w-5 h-5 text-emerald-300" />
              <select
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="bg-[#064D32] border border-emerald-500/40 rounded-xl px-4 py-2 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
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
                title="Adicionar ao Google Agenda"
              >
                <CalendarCheck className="w-4 h-4 text-[#D9AA45]" />
                <span>Google Agenda</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              {/* Botão Convocação */}
              <button
                onClick={() => setIsConvocationModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 text-emerald-300" />
                <span>Convocação Oficial</span>
              </button>

              {/* Botão Editar Dados da Sessão */}
              <button
                onClick={() => {
                  const d = new Date(selectedMeeting.starts_at);
                  setEditingMeeting({
                    id: selectedMeeting.id,
                    title: selectedMeeting.title,
                    date: d.toISOString().split("T")[0],
                    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                    location: selectedMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
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
              <span>{selectedMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"}</span>
            </div>
          </div>
        )}
      </div>

      {/* NAVEGAÇÃO ENTRE CHAMADA E ATA DA REUNIÃO (UNIFICADAS) */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-1">
        <button
          onClick={() => setSessionSection("chamada")}
          className={`pb-3 px-4 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            sessionSection === "chamada"
              ? "border-[#D9AA45] text-white"
              : "border-transparent text-emerald-200/60 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 text-[#D9AA45]" />
          <span>1. Chamada & Presença Capitular</span>
        </button>

        <button
          onClick={() => setSessionSection("ata")}
          className={`pb-3 px-4 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            sessionSection === "ata"
              ? "border-[#D9AA45] text-white"
              : "border-transparent text-emerald-200/60 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4 text-[#D9AA45]" />
          <span>2. Ata da Reunião & Balaústre</span>
        </button>
      </div>

      {/* SEÇÃO 1: CHAMADA E FREQUÊNCIA INTEGRADA */}
      {sessionSection === "chamada" && (
        <div className="space-y-6">
          {/* CARDS RESUMIDOS (DeMolays, Maçons, DeMolays Visitantes, Maçons Visitantes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Resumo DeMolay */}
            <div className="p-5 rounded-2xl bg-white/5 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  DeMolays Ativos
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  {demolayStats.percent}% Assiduidade
                </span>
              </div>
              <p className="text-2xl font-extrabold text-white">
                {demolayStats.presentes} <span className="text-xs text-emerald-200/60 font-normal">de {demolayStats.total}</span>
              </p>
              <div className="flex items-center gap-2 text-[10px] text-emerald-200/70 pt-1 border-t border-white/5">
                <span className="text-[#D9AA45] font-semibold">{demolayStats.justificados} justificados</span>
                <span>•</span>
                <span className="text-red-300 font-semibold">{demolayStats.ausentes} ausentes</span>
              </div>
            </div>

            {/* Resumo Maçônico */}
            <div className="p-5 rounded-2xl bg-white/5 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D9AA45]">
                  Conselho Consultivo
                </span>
                <span className="text-xs font-bold text-[#D9AA45]">
                  {macomStats.presentes} Presentes
                </span>
              </div>
              <p className="text-2xl font-extrabold text-white">
                {macomStats.presentes} <span className="text-xs text-emerald-200/60 font-normal">de {macomStats.total} tios</span>
              </p>
              <p className="text-[10px] text-emerald-200/70 pt-1 border-t border-white/5">
                Lojas mantenedoras regulares
              </p>
            </div>

            {/* Resumo DeMolays Visitantes */}
            <div className="p-5 rounded-2xl bg-white/5 border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  DeMolays Visitantes
                </span>
                <button
                  onClick={() => setIsDemolayVisitorModalOpen(true)}
                  className="text-[10px] font-bold text-[#D9AA45] hover:underline cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>
              <p className="text-2xl font-extrabold text-blue-300">{visitingDemolays.length}</p>
              <p className="text-[10px] text-blue-200/70 pt-1 border-t border-white/5">
                Irmãos de outros capítulos
              </p>
            </div>

            {/* Resumo Maçons Visitantes */}
            <div className="p-5 rounded-2xl bg-white/5 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  Maçons Visitantes
                </span>
                <button
                  onClick={() => setIsMasonVisitorModalOpen(true)}
                  className="text-[10px] font-bold text-[#D9AA45] hover:underline cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>
              <p className="text-2xl font-extrabold text-purple-300">{visitingMasons.length}</p>
              <p className="text-[10px] text-purple-200/70 pt-1 border-t border-white/5">
                Tios de outras oficinas
              </p>
            </div>
          </div>

          {/* LISTA DE CHAMADA EM ABAS */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-5">
            {/* Abas */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab("demolay")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "demolay"
                      ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-sm"
                      : "bg-white/5 text-emerald-200/70 hover:text-white"
                  }`}
                >
                  DeMolays Ativos ({demolaysAtivos.length})
                </button>
                <button
                  onClick={() => setActiveTab("macom")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "macom"
                      ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-sm"
                      : "bg-white/5 text-emerald-200/70 hover:text-white"
                  }`}
                >
                  Tios Maçons ({macons.length})
                </button>
                <button
                  onClick={() => setActiveTab("visitantes_demolay")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "visitantes_demolay"
                      ? "bg-blue-700 text-white border border-[#D9AA45]/50 shadow-sm"
                      : "bg-white/5 text-blue-200/70 hover:text-white"
                  }`}
                >
                  DeMolays Visitantes ({visitingDemolays.length})
                </button>
                <button
                  onClick={() => setActiveTab("visitantes_macom")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "visitantes_macom"
                      ? "bg-purple-700 text-white border border-[#D9AA45]/50 shadow-sm"
                      : "bg-white/5 text-purple-200/70 hover:text-white"
                  }`}
                >
                  Maçons Visitantes ({visitingMasons.length})
                </button>
              </div>

              {activeTab === "visitantes_demolay" && (
                <button
                  onClick={() => setIsDemolayVisitorModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Adicionar DeMolay Visitante</span>
                </button>
              )}

              {activeTab === "visitantes_macom" && (
                <button
                  onClick={() => setIsMasonVisitorModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Adicionar Maçom Visitante</span>
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
                            {m.masonic_lodge || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"}
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

            {/* TAB 3: DEMOLAYS VISITANTES (NOVO) */}
            {activeTab === "visitantes_demolay" && (
              <div className="space-y-4">
                {visitingDemolays.length === 0 ? (
                  <div className="py-8 text-center text-xs text-emerald-200/60 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                    Nenhum irmão DeMolay visitante registrado para esta sessão ainda.
                    <div className="mt-3">
                      <button
                        onClick={() => setIsDemolayVisitorModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Adicionar DeMolay Visitante</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {visitingDemolays.map((v) => (
                      <div
                        key={v.id}
                        className="py-3 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-3 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-300">
                              ID: {v.cid}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900/40 border border-blue-500/40 text-blue-200">
                              DeMolay Visitante
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white mt-0.5">{v.name}</p>
                          <p className="text-xs text-[#D9AA45] flex items-center gap-1 mt-0.5">
                            <span>Origem:</span> <strong>{v.chapter}</strong>
                          </p>
                        </div>

                        <button
                          onClick={() => handleRemoveDemolayVisitor(v.id)}
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

            {/* TAB 4: MAÇONS VISITANTES */}
            {activeTab === "visitantes_macom" && (
              <div className="space-y-4">
                {visitingMasons.length === 0 ? (
                  <div className="py-8 text-center text-xs text-emerald-200/60 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                    Nenhum maçom visitante registrado para esta sessão ainda.
                    <div className="mt-3">
                      <button
                        onClick={() => setIsMasonVisitorModalOpen(true)}
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
                          onClick={() => handleRemoveMasonVisitor(v.id)}
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
        </div>
      )}

      {/* SEÇÃO 2: ATA DA REUNIÃO & BALAÚSTRE OFICIAL */}
      {sessionSection === "ata" && selectedMeeting && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#04281A] border-2 border-[#D9AA45]/50 shadow-2xl space-y-6">
          {/* Cabeçalho da Ata */}
          <div className="text-center space-y-1.5 border-b border-[#D9AA45]/40 pb-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9AA45]">
              Ordem DeMolay • Capítulo Professor Carvalho Neves Nº 500
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif tracking-wide text-white">
              LIVRO DE ATAS & BALAÚSTRE DA SESSÃO
            </h2>
            <p className="text-xs text-emerald-200/80">
              Sede dos Trabalhos: Templo da A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI) — Teresina/PI
            </p>
          </div>

          <form onSubmit={handleSaveMinute} className="space-y-6">
            {/* Metadados da Ata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-emerald-200">Identificação da Ata</label>
                <input
                  type="text"
                  required
                  value={minuteData.number}
                  onChange={(e) => setMinuteData({ ...minuteData, number: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  placeholder="Ex: Ata nº 24 — Sessão Ordinária"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">Grau / Tipo de Cerimônia</label>
                <select
                  value={minuteData.degree}
                  onChange={(e) => setMinuteData({ ...minuteData, degree: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
                >
                  <option value="Grau Iniciático">Grau Iniciático</option>
                  <option value="Grau DeMolay">Grau DeMolay</option>
                  <option value="Sessão Administrativa">Sessão Administrativa</option>
                  <option value="Sessão Magna Pública">Sessão Magna Pública</option>
                  <option value="Instalação e Posse">Instalação e Posse</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">Data e Local</label>
                <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-emerald-200 font-mono text-[11px] truncate">
                  {new Date(selectedMeeting.starts_at).toLocaleDateString("pt-BR")} • Caridade II (GOB-PI)
                </div>
              </div>
            </div>

            {/* Quórum e Presença Extraída da Chamada em Tempo Real */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3 text-xs">
              <span className="font-bold text-[#D9AA45] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Relação de Presenças Vinculadas à Chamada Oficial</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-bold text-white">DeMolays Presentes ({presentesDemolay.length})</p>
                  <p className="text-emerald-300 mt-1 line-clamp-2">
                    {presentesDemolay.map((p) => p.full_name.split(" ")[0]).join(", ") || "Nenhum marcado presente"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-bold text-white">Conselho Consultivo ({presentesMacons.length})</p>
                  <p className="text-[#D9AA45] mt-1 line-clamp-2">
                    {presentesMacons.map((p) => p.full_name.split(" ")[0]).join(", ") || "Nenhum marcado presente"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-bold text-blue-300">DeMolays Visitantes ({visitingDemolays.length})</p>
                  <p className="text-blue-200 mt-1 line-clamp-2">
                    {visitingDemolays.map((v) => `${v.name} (${v.chapter})`).join(", ") || "Nenhum visitante"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-bold text-purple-300">Maçons Visitantes ({visitingMasons.length})</p>
                  <p className="text-purple-200 mt-1 line-clamp-2">
                    {visitingMasons.map((v) => `${v.name} (${v.masonic_lodge})`).join(", ") || "Nenhum visitante"}
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo / Resumo dos Trabalhos Redigidos pelo Escrivão */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-emerald-200">
                Texto Oficial da Ata / Deliberações e Trabalhos Realizados
              </label>
              <textarea
                rows={9}
                required
                value={minuteData.content}
                onChange={(e) => setMinuteData({ ...minuteData, content: e.target.value })}
                className="w-full p-4 rounded-2xl bg-black/40 border border-white/20 text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#D9AA45] font-serif text-sm"
                placeholder="Redija o texto da ata da reunião..."
              />
            </div>

            {/* Assinaturas Oficiais */}
            <div className="pt-6 border-t border-[#D9AA45]/40 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-1">
                <div className="w-3/4 mx-auto border-b border-white/20 pb-1" />
                <p className="font-bold text-white">Mestre Conselheiro</p>
                <p className="text-[10px] text-gray-400">Capítulo Prof. Carvalho Neves 500</p>
              </div>

              <div className="space-y-1">
                <div className="w-3/4 mx-auto border-b border-white/20 pb-1" />
                <p className="font-bold text-white">Waldecy Gonçalves de Araújo Neto</p>
                <p className="text-[10px] text-[#D9AA45]">ID Nº 148200 • Escrivão</p>
              </div>

              <div className="space-y-1">
                <div className="w-3/4 mx-auto border-b border-white/20 pb-1" />
                <p className="font-bold text-white">Presidente do Conselho Consultivo</p>
                <p className="text-[10px] text-gray-400">Conselho Consultivo</p>
              </div>
            </div>

            {/* Botões da Ata */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#D9AA45]" />
                <span>Imprimir Ata Oficial</span>
              </button>

              <button
                type="submit"
                disabled={isSavingMinute}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingMinute ? "Salvando..." : "Salvar no Livro de Atas"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

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
                  placeholder="A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"
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

      {/* MODAL: ADICIONAR DEMOLAY VISITANTE (ID, NOME COMPLETO, CAPÍTULO) */}
      {isDemolayVisitorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#064D32] border border-blue-500/40 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-300" />
              <h3 className="text-lg font-bold">Adicionar DeMolay Visitante</h3>
            </div>
            <p className="text-xs text-emerald-200/80">
              Cadastre a presença do irmão visitante de outro capítulo nesta sessão oficial.
            </p>

            <form onSubmit={handleAddDemolayVisitor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  ID SISDM do DeMolay *
                </label>
                <input
                  type="text"
                  required
                  value={newDemolayVisitor.cid}
                  onChange={(e) =>
                    setNewDemolayVisitor({ ...newDemolayVisitor, cid: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  placeholder="Ex: 148194"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Nome Completo do Irmão *
                </label>
                <input
                  type="text"
                  required
                  value={newDemolayVisitor.name}
                  onChange={(e) =>
                    setNewDemolayVisitor({ ...newDemolayVisitor, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  placeholder="Ex: Gabriel Carvalho de Sousa"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Capítulo de Origem / Cidade *
                </label>
                <input
                  type="text"
                  required
                  value={newDemolayVisitor.chapter}
                  onChange={(e) =>
                    setNewDemolayVisitor({ ...newDemolayVisitor, chapter: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  placeholder="Ex: Capítulo Teresina Nº 124"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsDemolayVisitorModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Registrar Irmão Visitante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR MAÇOM VISITANTE */}
      {isMasonVisitorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#064D32] border border-purple-500/40 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-300" />
              <h3 className="text-lg font-bold">Adicionar Maçom Visitante</h3>
            </div>
            <p className="text-xs text-emerald-200/80">
              Registre a presença do Tio Maçom visitante nesta sessão do Capítulo 500.
            </p>

            <form onSubmit={handleAddMasonVisitor} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">CIM / Identificação</label>
                  <input
                    type="text"
                    required
                    value={newMasonVisitor.cim}
                    onChange={(e) =>
                      setNewMasonVisitor({ ...newMasonVisitor, cim: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    placeholder="Ex: 284910"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">Potência</label>
                  <select
                    value={newMasonVisitor.potency}
                    onChange={(e) =>
                      setNewMasonVisitor({ ...newMasonVisitor, potency: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
                  >
                    <option value="GOB-PI">GOB-PI</option>
                    <option value="GLMPI">GLMPI</option>
                    <option value="COMAB">COMAB</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newMasonVisitor.name}
                  onChange={(e) =>
                    setNewMasonVisitor({ ...newMasonVisitor, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  placeholder="Ex: Antônio Carlos da Silva"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">Loja Maçônica</label>
                <input
                  type="text"
                  required
                  value={newMasonVisitor.masonic_lodge}
                  onChange={(e) =>
                    setNewMasonVisitor({ ...newMasonVisitor, masonic_lodge: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  placeholder="Ex: A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsMasonVisitorModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
                >
                  Adicionar Maçom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONVOCAÇÃO OFICIAL FORMATADA */}
      {isConvocationModalOpen && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#064D32] border border-white/20 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="text-base font-bold">Convocação Oficial da Reunião</h3>
              </div>
              <button
                onClick={() => setIsConvocationModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-emerald-200/80">
              Copie o texto padronizado para disparo aos irmãos no WhatsApp Capitular ou e-mail:
            </p>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
              <pre className="text-xs text-gray-200 font-mono whitespace-pre-wrap select-all max-h-56 overflow-y-auto">
                {convocationText}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-[11px] text-emerald-300">
                {convocationCopied ? "✓ Texto copiado com sucesso!" : ""}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(convocationText);
                    setConvocationCopied(true);
                    setTimeout(() => setConvocationCopied(false), 3000);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs cursor-pointer shadow-md"
                >
                  {convocationCopied ? "Copiado!" : "Copiar Convocação"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
