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
  Printer,
  ShieldCheck,
  BookOpen,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { HISTORICAL_MEETINGS } from "@/lib/data/historicalMeetings";
import { parseMeetingCategory, deriveManagementFromDate } from "@/lib/repositories/meetings-repository";

interface MemberRecord {
  id: string;
  id_demolay: string;
  full_name: string;
  category: "demolay_ativo" | "senior_demolay" | "macom" | "irregular";
  regularity?: string;
  masonic_lodge?: string;
}

interface MeetingRecord {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location: string;
  status: string;
  description?: string;
  category?: string;
  management?: string;
  mc_name?: string;
  complementary_info?: string | null;
  ata_pdf_url?: string | null;
  ata_num?: string;
  livro_demolay_page?: string;
  livro_macom_page?: string;
  cancelled_at?: string | null;
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
  id_demolay: string;
  name: string;
  chapter: string;
  created_at?: string;
}

type AttendanceStatus = "presente" | "ausente" | "justificado";

// Helpers Normativos DeMolay (Vade Mecum Art. 216 & Dias Obrigatórios)
const isSunday = (dateStr: string) => {
  if (!dateStr) return true;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getDay() === 0;
};

const getDayOfWeekName = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  return days[date.getDay()];
};

const getMandatoryDaysForDate = (dateStr: string) => {
  if (!dateStr) return [];
  const [, m] = dateStr.split("-").map(Number);
  switch (m) {
    case 3:
      return [
        { name: "Dia Devocional (SCDB)", desc: "Reverência pelas Coisas Sagradas (próximo a 18/03)" },
        { name: "Dia em Memória a Jacques DeMolay", desc: "Homenagem solene ao mártir histórico (18/03)" },
      ];
    case 5:
      return [
        { name: "Dia das Mães (SCDB)", desc: "Cerimônia das Mães (2º domingo de maio)" },
      ];
    case 8:
      return [
        { name: "Dia dos Pais (SCDB)", desc: "Cerimônia dos Pais (2º domingo de agosto)" },
      ];
    case 9:
      return [
        { name: "Dia do Patriota (SCDB)", desc: "Virtude do Patriotismo / Semana da Pátria" },
      ];
    case 10:
      return [
        { name: "Dia Educacional (SCDB)", desc: "Defesa da Educação e Escola Pública" },
      ];
    case 11:
      return [
        { name: "Dia em Memória a Frank S. Land", desc: "Homenagem ao Fundador / Ação Beneficente (08/11)" },
        { name: "Dia do Meu Governo (SCDB)", desc: "Consciência Cidadã e Democracia" },
      ];
    case 12:
      return [
        { name: "Dia DeMolay de Conforto (SCDB)", desc: "Ação de solidariedade social de Natal" },
      ];
    default:
      return [];
  }
};

const getMandatoryDayWarning = (title: string, dateStr: string) => {
  if (!title || !dateStr) return null;
  const lower = title.toLowerCase();
  const [, m] = dateStr.split("-").map(Number);

  if ((lower.includes("mãe") || lower.includes("maes")) && m !== 5) {
    return "💡 Atenção MC: Pelo Vade Mecum (Art. 216), o Dia das Mães é comemorado obrigatoriamente no mês de Maio.";
  }
  if ((lower.includes("pai") || lower.includes("pais")) && m !== 8) {
    return "💡 Atenção MC: Pelo Vade Mecum (Art. 216), o Dia dos Pais é comemorado obrigatoriamente no mês de Agosto.";
  }
  if (lower.includes("patriota") && m !== 9) {
    return "💡 Atenção MC: Pelo Vade Mecum (Art. 216), o Dia do Patriota é comemorado obrigatoriamente no mês de Setembro.";
  }
  if (lower.includes("educacional") && m !== 10) {
    return "💡 Atenção MC: Pelo Vade Mecum (Art. 216), o Dia Educacional é comemorado obrigatoriamente no mês de Outubro.";
  }
  if ((lower.includes("frank") || lower.includes("meu governo")) && m !== 11) {
    return "💡 Atenção MC: Pelo Vade Mecum (Art. 216), o Dia em Memória a Frank S. Land e o Dia do Meu Governo são comemorados em Novembro.";
  }
  if (lower.includes("conforto") && m !== 12) {
    return "💡 Atenção MC: Pelo Vade Mecum (Art. 216), o Dia DeMolay de Conforto é comemorado em Dezembro (próximo ao Natal).";
  }
  if ((lower.includes("devocional") || lower.includes("jacques demolay")) && m !== 3) {
    return "💡 Atenção MC: Pelo Vade Mecum (Art. 216), o Dia Devocional e o Dia em Memória a Jacques DeMolay são comemorados em Março.";
  }
  return null;
};

// Calendário Oficial das Gestões XXIV (MC José Keltton) e XXV (MC Rafael Inácio) integrado com o Acervo
const officialCalendarMeetings: MeetingRecord[] = HISTORICAL_MEETINGS.map((h) => ({
  id: h.id,
  title: h.title,
  starts_at: h.starts_at,
  location: h.location,
  status: h.status,
  description: h.description,
  ata_pdf_url: h.ata_pdf_url,
  ata_num: h.ata_num,
  livro_demolay_page: h.livro_demolay_page,
  livro_macom_page: h.livro_macom_page,
  management: h.management,
  mc_name: h.mc_name,
}));

export default function ChamadaPage() {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  
  // Visitantes
  const [visitingMasons, setVisitingMasons] = useState<VisitingMasonRecord[]>([]);
  const [visitingDemolays, setVisitingDemolays] = useState<VisitingDemolayRecord[]>([]);

  // Abas de visualização unificada (Ata vs Chamada vs Calendário)
  const [sessionSection, setSessionSection] = useState<"chamada" | "ata" | "calendario">("chamada");

  // Abas dentro da Chamada
  const [activeTab, setActiveTab] = useState<"demolay" | "macom" | "visitantes_demolay" | "visitantes_macom">("demolay");

  // Estado do Gerenciamento do Calendário (Tab 3)
  const [calendarViewMode, setCalendarViewMode] = useState<"grade" | "lista">("grade");
  const [calendarMonth, setCalendarMonth] = useState<number>(11); // Novembro (1-12)
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarCategory, setCalendarCategory] = useState<string>("todas");
  const [calendarManagement, setCalendarManagement] = useState<string>("todas");
  const [calendarStatus, setCalendarStatus] = useState<string>("todas");
  const [calendarSearch, setCalendarSearch] = useState<string>("");
  const [viewingMeeting, setViewingMeeting] = useState<MeetingRecord | null>(null);
  const [cancellingMeeting, setCancellingMeeting] = useState<MeetingRecord | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Leitura de parâmetros de busca (?tab=calendario)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const timer = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");
        if (tabParam === "calendario" || tabParam === "agenda") {
          setSessionSection("calendario");
        } else if (tabParam === "ata") {
          setSessionSection("ata");
        } else if (tabParam === "chamada") {
          setSessionSection("chamada");
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // Estado da Ata da Reunião
  const [minuteData, setMinuteData] = useState<{
    number: string;
    degree: string;
    content: string;
    storage_path?: string;
  }>({
    number: "Ata Oficial nº 24",
    degree: "Grau Iniciático",
    content: "",
    storage_path: "",
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
    endTime?: string;
    location: string;
    category?: string;
    management?: string;
    status?: string;
    description?: string;
    complementary_info?: string;
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
    id_demolay: "",
    name: "",
    chapter: "",
  });

  const [isConvocationModalOpen, setIsConvocationModalOpen] = useState(false);
  const [convocationCopied, setConvocationCopied] = useState(false);

  // Permissões e Perfis (RBAC Guard)
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("cn_audit_master") === "true" || localStorage.getItem("cn_user_role") === "master") {
        return "master";
      }
    }
    return "membro";
  });
  const [viewAsMember, setViewAsMember] = useState(false);

  // Checa Permissão do Usuário Logado
  useEffect(() => {
    async function checkRole() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

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
    checkRole();
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
  const isMaster = effectiveRole === "master" || effectiveRole === "admin";
  const canManageAttendance = isMaster || effectiveRole === "escrivao";
  const canManageCalendar = isMaster || effectiveRole === "escrivao";

  // 1. Carregar Reuniões e Membros em Paralelo
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient();

        // Carrega Reuniões e Membros concorrentemente
        const [mRes, memRes] = await Promise.all([
          supabase
            .from("meetings")
            .select("id, title, starts_at, location, status, description")
            .order("starts_at", { ascending: true }),
          supabase
            .from("members")
            .select("id, id_demolay, full_name, category, regularity, masonic_lodge")
            .order("full_name", { ascending: true }),
        ]);

        const mData = mRes.data;
        const baseMeetings = mData && mData.length > 0 ? mData : officialCalendarMeetings;
        const enrichedMeetings: MeetingRecord[] = baseMeetings.map((m) => {
          const hist = HISTORICAL_MEETINGS.find(
            (h) => h.id === m.id || h.starts_at.substring(0, 10) === m.starts_at.substring(0, 10)
          );
          return {
            ...m,
            category: parseMeetingCategory(m.title),
            management: hist?.management || deriveManagementFromDate(m.starts_at),
            ata_pdf_url: hist?.ata_pdf_url || null,
            ata_num: hist?.ata_num || "Ata Oficial",
            livro_demolay_page: hist?.livro_demolay_page,
            livro_macom_page: hist?.livro_macom_page,
            mc_name: hist?.mc_name,
          };
        });

        setMeetings(enrichedMeetings);
        if (enrichedMeetings.length > 0) {
          setSelectedMeetingId(enrichedMeetings[0].id);
        }

        if (memRes.data) {
          setMembers(memRes.data as MemberRecord[]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
      }
    }
    init();
  }, []);

  // 2. Carregar Chamada, Visitantes e Ata da Reunião Selecionada em Paralelo
  useEffect(() => {
    if (!selectedMeetingId) return;

    async function loadMeetingDetails() {
      try {
        const supabase = createClient();

        // Execução paralela das consultas de detalhes da reunião
        const [attRes, visRes, dmVisRes, minRes] = await Promise.all([
          supabase
            .from("meeting_attendance")
            .select("member_id, status")
            .eq("meeting_id", selectedMeetingId),
          supabase
            .from("meeting_visiting_masons")
            .select("id, meeting_id, cim, name, masonic_lodge, potency, created_at")
            .eq("meeting_id", selectedMeetingId)
            .order("created_at", { ascending: true }),
          supabase
            .from("meeting_visiting_demolays")
            .select("id, meeting_id, id_demolay, name, chapter, created_at")
            .eq("meeting_id", selectedMeetingId)
            .order("created_at", { ascending: true }),
          supabase
            .from("meeting_minutes")
            .select("content, storage_path, status, published_at")
            .eq("meeting_id", selectedMeetingId)
            .maybeSingle(),
        ]);

        const attData = attRes.data;
        const newMap: Record<string, AttendanceStatus> = {};
        if (attData && attData.length > 0) {
          attData.forEach((row) => {
            newMap[row.member_id] = row.status as AttendanceStatus;
          });
        }
        setAttendanceMap(newMap);

        const visData = visRes.data;
        if (visData) {
          setVisitingMasons(visData as VisitingMasonRecord[]);
        } else {
          setVisitingMasons([]);
        }

        const dmVisData = dmVisRes.data;
        if (!dmVisRes.error && dmVisData) {
          setVisitingDemolays(dmVisData as VisitingDemolayRecord[]);
        } else {
          const localData = localStorage.getItem(`cn_visiting_dm_${selectedMeetingId}`);
          if (localData) {
            setVisitingDemolays(JSON.parse(localData));
          } else {
            setVisitingDemolays([]);
          }
        }

        // Carrega conteúdo e PDF da Ata correspondente do Supabase e do Acervo
        const currentM = meetings.find((m) => m.id === selectedMeetingId);
        const hist = HISTORICAL_MEETINGS.find(
          (h) => h.id === selectedMeetingId || (currentM && h.starts_at.substring(0, 10) === currentM.starts_at.substring(0, 10))
        );

        const minData = minRes.data;

        const savedAta = localStorage.getItem(`cn_meeting_minute_${selectedMeetingId}`);
        if (savedAta) {
          const parsed = JSON.parse(savedAta);
          setMinuteData({
            ...parsed,
            storage_path: minData?.storage_path || hist?.ata_pdf_url || parsed.storage_path || "",
          });
        } else if (minData?.content) {
          setMinuteData({
            number: hist?.ata_num || "Ata Oficial Registrada",
            degree: "Grau Iniciático",
            content: minData.content,
            storage_path: minData.storage_path || hist?.ata_pdf_url || "",
          });
        } else if (hist?.ata_pdf_url) {
          setMinuteData({
            number: hist.ata_num,
            degree: "Grau Iniciático",
            content: `Ata oficial registrada na ${hist.ata_num}.\nSessão realizada em ${new Date(currentM?.starts_at || Date.now()).toLocaleDateString("pt-BR")} na ${currentM?.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"}.\n\nDeliberações:\n${hist.description}\n\nQuórum Registrado:\n- DeMolays Presentes: ${hist.demolays_present_count}\n- Tios Maçons Presentes: ${hist.masons_present_count}\n- Total Quórum: ${hist.total_quorum}`,
            storage_path: hist.ata_pdf_url,
          });
        } else if (currentM?.description) {
          setMinuteData({
            number: hist?.ata_num || "Ata da Sessão Ordinária",
            degree: "Grau Iniciático",
            content: currentM.description,
            storage_path: hist?.ata_pdf_url || "",
          });
        } else {
          setMinuteData({
            number: `Ata da Sessão do dia ${new Date(currentM?.starts_at || Date.now()).toLocaleDateString("pt-BR")}`,
            degree: "Grau Iniciático",
            content: `Aos ${new Date(currentM?.starts_at || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}, no Templo da A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI), sob a presidência do Mestre Conselheiro, reuniu-se o Capítulo Professor Carvalho Neves Nº 500 para a realização dos seus regulares trabalhos ritualísticos.\n\nAberta a sessão na forma regulamentar, procedeu-se à chamada geral dos irmãos presentes, verificação do quórum legal e leitura da ata da reunião anterior, que foi aprovada sem restrições. Seguiu-se com as deliberações administrativas e expediente do Escrivão.`,
            storage_path: hist?.ata_pdf_url || "",
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
    if (!canManageAttendance) {
      alert("Acesso restrito à Diretoria para salvar a chamada.");
      return;
    }
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
    if (!canManageAttendance) {
      alert("Acesso restrito à Diretoria para registrar atas.");
      return;
    }
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

  // Navegação de Mês do Calendário
  const handlePrevCalendarMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextCalendarMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const calendarMonthLabel = useMemo(() => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${months[calendarMonth - 1]} de ${calendarYear}`;
  }, [calendarMonth, calendarYear]);

  // Métricas do Calendário
  const calendarMetrics = useMemo(() => {
    const total = meetings.length;
    const agendadas = meetings.filter((m) => m.status === "agendada").length;
    const realizadas = meetings.filter((m) => m.status === "realizada").length;
    const canceladas = meetings.filter((m) => m.status === "cancelada").length;
    return { total, agendadas, realizadas, canceladas };
  }, [meetings]);

  // Estrutura de dados para a Grade Mensal
  const calendarGridData = useMemo(() => {
    const firstDayIndex = new Date(calendarYear, calendarMonth - 1, 1).getDay(); // 0 = Dom
    const totalDays = new Date(calendarYear, calendarMonth, 0).getDate();

    const meetingsByDay: Record<number, MeetingRecord[]> = {};
    meetings.forEach((m) => {
      const d = new Date(m.starts_at);
      if (d.getFullYear() === calendarYear && d.getMonth() + 1 === calendarMonth) {
        const day = d.getDate();
        if (!meetingsByDay[day]) meetingsByDay[day] = [];
        meetingsByDay[day].push(m);
      }
    });

    return { firstDayIndex, totalDays, meetingsByDay };
  }, [meetings, calendarYear, calendarMonth]);

  // Lista Filtrada para visualização cronológica
  const filteredCalendarMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        if (calendarCategory !== "todas") {
          const cat = (m.category || parseMeetingCategory(m.title)).toLowerCase();
          if (!cat.includes(calendarCategory.toLowerCase())) return false;
        }
        if (calendarManagement !== "todas") {
          const mgmt = (m.management || deriveManagementFromDate(m.starts_at)).toLowerCase();
          if (!mgmt.includes(calendarManagement.toLowerCase())) return false;
        }
        if (calendarStatus !== "todas") {
          if (m.status !== calendarStatus) return false;
        }
        if (calendarSearch.trim()) {
          const q = calendarSearch.toLowerCase().trim();
          const matchesTitle = m.title.toLowerCase().includes(q);
          const matchesLoc = (m.location || "").toLowerCase().includes(q);
          const matchesDesc = (m.description || "").toLowerCase().includes(q);
          const matchesCat = (m.category || "").toLowerCase().includes(q);
          if (!matchesTitle && !matchesLoc && !matchesDesc && !matchesCat) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [meetings, calendarCategory, calendarManagement, calendarStatus, calendarSearch]);

  // Cancelamento de Reunião com Preservação de Histórico
  const handleCancelMeeting = async (meetingId: string) => {
    if (!canManageCalendar) {
      alert("Acesso restrito ao perfil Master ou Escrivão para gerenciar reuniões.");
      return;
    }
    setIsCancelling(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const { error } = await supabase
          .from("meetings")
          .update({ status: "cancelada", cancelled_at: new Date().toISOString() })
          .eq("id", meetingId);
        if (error) throw error;
      }

      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId
            ? { ...m, status: "cancelada", cancelled_at: new Date().toISOString() }
            : m
        )
      );

      setSaveSuccessMsg("Sessão cancelada com sucesso no calendário oficial. Histórico preservado.");
      setTimeout(() => setSaveSuccessMsg(""), 4000);
      setCancellingMeeting(null);
    } catch (err) {
      console.error("Erro ao cancelar reunião:", err);
      alert("Erro ao cancelar reunião.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Reativação de Reunião Cancelada
  const handleReactivateMeeting = async (meetingId: string) => {
    if (!canManageCalendar) {
      alert("Acesso restrito ao perfil Master ou Escrivão para gerenciar reuniões.");
      return;
    }
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: "agendada" }),
      });

      if (!res.ok) {
        const { error } = await supabase
          .from("meetings")
          .update({ status: "agendada", cancelled_at: null })
          .eq("id", meetingId);
        if (error) throw error;
      }

      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId
            ? { ...m, status: "agendada", cancelled_at: null }
            : m
        )
      );

      setSaveSuccessMsg("Sessão reativada com sucesso no calendário oficial.");
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Erro ao reativar reunião:", err);
      alert("Erro ao reativar reunião.");
    }
  };

  // Salvar / Editar Reunião
  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;
    if (!isMaster) {
      if (!canManageCalendar) {
        alert("Acesso restrito ao Mestre Conselheiro/Master para cadastrar ou editar reuniões.");
        return;
      }
    }

    try {
      const supabase = createClient();
      const startsAt = new Date(`${editingMeeting.date}T${editingMeeting.time || "16:00"}:00-03:00`).toISOString();
      let endsAt: string | null = null;
      if (editingMeeting.endTime) {
        endsAt = new Date(`${editingMeeting.date}T${editingMeeting.endTime}:00-03:00`).toISOString();
        if (new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
          alert("O horário de término não pode ser anterior ao horário de início.");
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const category = editingMeeting.category || parseMeetingCategory(editingMeeting.title);
      const management = editingMeeting.management || deriveManagementFromDate(startsAt);
      const status = editingMeeting.status || "agendada";

      const payload = {
        title: editingMeeting.title.trim(),
        starts_at: startsAt,
        ends_at: endsAt,
        location: editingMeeting.location?.trim() || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
        category,
        management,
        status,
        description: editingMeeting.description?.trim() || "",
        complementary_info: editingMeeting.complementary_info?.trim() || null,
      };

      if (editingMeeting.id) {
        // Atualiza
        const res = await fetch(`/api/meetings/${editingMeeting.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 403) {
            alert(errData.error || "Ação não permitida: Apenas reuniões da Gestão XXV (2026.2) podem ser alteradas.");
            return;
          }
          await supabase
            .from("meetings")
            .update({
              title: payload.title,
              starts_at: startsAt,
              location: payload.location,
              status: payload.status,
              description: payload.description,
            })
            .eq("id", editingMeeting.id);
        }

        setMeetings((prev) =>
          prev.map((m) =>
            m.id === editingMeeting.id
              ? {
                  ...m,
                  title: payload.title,
                  starts_at: startsAt,
                  ends_at: payload.ends_at,
                  location: payload.location,
                  status: payload.status,
                  category: payload.category,
                  management: payload.management,
                  description: payload.description,
                  complementary_info: payload.complementary_info,
                }
              : m
          )
        );
        setSaveSuccessMsg("Reunião capitular atualizada com sucesso no calendário oficial!");
      } else {
        // Cria
        const res = await fetch("/api/meetings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const created = json.item;
          setMeetings((prev) => [...prev, created]);
          setSelectedMeetingId(created.id);
        } else {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 403) {
            alert(errData.error || "Ação não permitida: Apenas reuniões da Gestão XXV (2026.2) podem ser criadas.");
            return;
          }
          const { data, error } = await supabase
            .from("meetings")
            .insert({
              chapter_id: "00000000-0000-0000-0000-000000000500",
              title: payload.title,
              starts_at: startsAt,
              location: payload.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
              status: payload.status,
              description: payload.description,
            })
            .select()
            .single();

          if (error) throw error;
          if (data) {
            const enriched: MeetingRecord = {
              ...data,
              category: payload.category,
              management: payload.management,
              ends_at: payload.ends_at,
              complementary_info: payload.complementary_info,
            };
            setMeetings((prev) => [...prev, enriched]);
            setSelectedMeetingId(data.id);
          }
        }
        setSaveSuccessMsg("Nova reunião capitular cadastrada com sucesso no calendário oficial!");
      }

      setTimeout(() => setSaveSuccessMsg(""), 4000);
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
    if (!canManageAttendance) {
      alert("Acesso restrito à Diretoria para registrar visitantes.");
      return;
    }
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
    if (!canManageAttendance) return;
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
    if (!canManageAttendance) {
      alert("Acesso restrito à Diretoria para registrar visitantes.");
      return;
    }
    if (!selectedMeetingId || !newDemolayVisitor.name.trim() || !newDemolayVisitor.id_demolay.trim()) return;

    const newRecord: VisitingDemolayRecord = {
      id: "vis_dm_" + Date.now(),
      meeting_id: selectedMeetingId,
      id_demolay: newDemolayVisitor.id_demolay.trim(),
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
          id_demolay: newRecord.id_demolay,
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

    setNewDemolayVisitor({ id_demolay: "", name: "", chapter: "" });
    setIsDemolayVisitorModalOpen(false);
  };

  // Remover DeMolay Visitante
  const handleRemoveDemolayVisitor = async (visitorId: string) => {
    if (!canManageAttendance) return;
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
            <span>Sessões, Atas & Chamada Capitular</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestão integrada da ata da reunião, registro de presença de membros e cadastro de visitantes
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          {isMaster && (
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
              className="px-3.5 py-2 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-white/10 hover:border-[#D9AA45]/40 text-white font-medium text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-[#D9AA45]" />
              <span>Nova Reunião</span>
            </button>
          )}

          {canManageAttendance ? (
            sessionSection === "chamada" ? (
              <button
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Salvando..." : "Salvar Chamada"}</span>
              </button>
            ) : (
              <button
                onClick={handleSaveMinute}
                disabled={isSavingMinute}
                className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingMinute ? "Salvando..." : "Salvar Ata Oficial"}</span>
              </button>
            )
          ) : (
            <span className="px-3.5 py-2 rounded-lg bg-[#0E2218] border border-white/10 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Modo Leitura (Membro)</span>
            </span>
          )}
        </div>
      </div>

      {/* FEEDBACK DE SALVAMENTO */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* SELETOR DE REUNIÃO / CALENDÁRIO EXECUTIVO */}
      <div className="p-5 sm:p-6 rounded-xl bg-[#0C1D14] border border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45] font-mono">
              Sessão Capitular Selecionada
            </span>
            <div className="flex items-center gap-3 mt-1.5">
              <CalendarIcon className="w-5 h-5 text-emerald-400 shrink-0" />
              <select
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="bg-[#08140E] border border-white/15 rounded-lg px-3.5 py-2 text-white text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45] cursor-pointer shadow-inner"
              >
                {meetings.map((m) => {
                  const d = new Date(m.starts_at);
                  const dataFormatada = d.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });
                  return (
                    <option key={m.id} value={m.id} className="bg-[#08140E] text-white py-1">
                      {dataFormatada} — {m.title}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {selectedMeeting && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Botão Google Agenda (Apenas Master) */}
              {isMaster && (
                <a
                  href={getGoogleCalendarUrl(selectedMeeting)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-white/10 hover:border-[#D9AA45]/40 text-gray-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                  title="Adicionar ao Google Agenda"
                >
                  <CalendarCheck className="w-4 h-4 text-[#D9AA45]" />
                  <span>Google Agenda</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}

              {/* Botão Convocação Oficial (Apenas Master) */}
              {isMaster && (
                <button
                  onClick={() => setIsConvocationModalOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-white/10 hover:border-emerald-400/40 text-gray-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Convocação Oficial</span>
                </button>
              )}

              {/* Botão Ver Ata Oficial (se disponível - Visível para todos os irmãos) */}
              {(minuteData.storage_path || selectedMeeting.ata_pdf_url) && (
                <a
                  href={minuteData.storage_path || selectedMeeting.ata_pdf_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-[#D9AA45]/30 text-[#D9AA45] text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                  title="Abrir Ata Oficial assinada em PDF"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ata da Sessão (PDF)</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}

              {/* Botão Editar Dados da Sessão (Apenas Master) */}
              {isMaster && (
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
                  className="px-3 py-2 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-white/10 hover:border-[#D9AA45]/40 text-gray-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#D9AA45]" />
                  <span>Editar Reunião</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Detalhes da Sessão Selecionada */}
        {selectedMeeting && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-gray-300">
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
            {selectedMeeting.livro_demolay_page && (
              <div className="flex items-center gap-1.5 text-xs text-[#D9AA45] font-mono">
                <FileText className="w-3.5 h-3.5" />
                <span>Livro Presença DM: pág. {selectedMeeting.livro_demolay_page}</span>
              </div>
            )}
            {selectedMeeting.livro_macom_page && (
              <div className="flex items-center gap-1.5 text-xs text-purple-300 font-mono">
                <FileText className="w-3.5 h-3.5" />
                <span>Livro Presença Maçom: pág. {selectedMeeting.livro_macom_page}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono tabular-nums">
              <Users className="w-3.5 h-3.5" />
              <span>Quórum: {presentesDemolay.length + presentesMacons.length} presentes</span>
            </div>
          </div>
        )}
      </div>

      {/* NAVEGAÇÃO ENTRE CHAMADA E ATA DA REUNIÃO (SEGMENTED CONTROL UNSLOP) */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[#08140E] border border-white/10 w-fit">
        <button
          onClick={() => setSessionSection("chamada")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            sessionSection === "chamada"
              ? "bg-[#087443] text-white border border-[#D9AA45]/40 shadow-sm"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 text-[#D9AA45]" />
          <span>1. Chamada & Presença Capitular</span>
        </button>

        <button
          onClick={() => setSessionSection("ata")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            sessionSection === "ata"
              ? "bg-[#087443] text-white border border-[#D9AA45]/40 shadow-sm"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4 text-[#D9AA45]" />
          <span>2. Ata da Reunião</span>
        </button>

        <button
          onClick={() => setSessionSection("calendario")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            sessionSection === "calendario"
              ? "bg-[#087443] text-white border border-[#D9AA45]/40 shadow-sm"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <CalendarIcon className="w-4 h-4 text-[#D9AA45]" />
          <span>3. Gerenciamento do Calendário & Agenda</span>
        </button>
      </div>

      {/* SEÇÃO 1: CHAMADA E FREQUÊNCIA INTEGRADA */}
      {sessionSection === "chamada" && (
        <div className="space-y-6">
          {/* CARDS RESUMIDOS (DeMolays, Maçons, DeMolays Visitantes, Maçons Visitantes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Resumo DeMolay */}
            <div className="p-5 rounded-xl bg-[#0E2218] border border-white/10 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 font-mono">
                  DeMolays Ativos
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono tabular-nums">
                  {demolayStats.percent}% Assiduidade
                </span>
              </div>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">
                {demolayStats.presentes}{" "}
                <span className="text-xs text-gray-400 font-normal">de {demolayStats.total}</span>
              </p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-1 border-t border-white/5 font-mono tabular-nums">
                <span className="text-[#D9AA45] font-semibold">{demolayStats.justificados} justificados</span>
                <span>•</span>
                <span className="text-red-400 font-semibold">{demolayStats.ausentes} ausentes</span>
              </div>
            </div>

            {/* Resumo Maçônico */}
            <div className="p-5 rounded-xl bg-[#0E2218] border border-white/10 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45] font-mono">
                  Conselho Consultivo
                </span>
                <span className="text-xs font-bold text-[#D9AA45] font-mono tabular-nums">
                  {macomStats.presentes} Presentes
                </span>
              </div>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">
                {macomStats.presentes}{" "}
                <span className="text-xs text-gray-400 font-normal">de {macomStats.total} tios</span>
              </p>
              <p className="text-[10px] text-gray-400 pt-1 border-t border-white/5">
                Lojas mantenedoras regulares
              </p>
            </div>

            {/* Resumo DeMolays Visitantes */}
            <div className="p-5 rounded-xl bg-[#0E2218] border border-white/10 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 font-mono">
                  DeMolays Visitantes
                </span>
                {canManageAttendance && (
                  <button
                    onClick={() => setIsDemolayVisitorModalOpen(true)}
                    className="text-[10px] font-bold text-[#D9AA45] hover:underline cursor-pointer"
                  >
                    + Adicionar
                  </button>
                )}
              </div>
              <p className="text-2xl font-bold text-blue-300 font-mono tabular-nums">{visitingDemolays.length}</p>
              <p className="text-[10px] text-gray-400 pt-1 border-t border-white/5">
                Irmãos de outros capítulos
              </p>
            </div>

            {/* Resumo Maçons Visitantes */}
            <div className="p-5 rounded-xl bg-[#0E2218] border border-white/10 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 font-mono">
                  Maçons Visitantes
                </span>
                {canManageAttendance && (
                  <button
                    onClick={() => setIsMasonVisitorModalOpen(true)}
                    className="text-[10px] font-bold text-[#D9AA45] hover:underline cursor-pointer"
                  >
                    + Adicionar
                  </button>
                )}
              </div>
              <p className="text-2xl font-bold text-purple-300 font-mono tabular-nums">{visitingMasons.length}</p>
              <p className="text-[10px] text-gray-400 pt-1 border-t border-white/5">
                Tios de outras oficinas
              </p>
            </div>
          </div>

          {/* LISTA DE CHAMADA EM ABAS */}
          <div className="p-5 sm:p-6 rounded-xl bg-[#0C1D14] border border-white/10 shadow-sm space-y-5">
            {/* Abas */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab("demolay")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "demolay"
                      ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-sm"
                      : "bg-[#0E2218] text-gray-400 hover:text-white border border-white/5"
                  }`}
                >
                  DeMolays Ativos ({demolaysAtivos.length})
                </button>
                <button
                  onClick={() => setActiveTab("macom")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "macom"
                      ? "bg-[#087443] text-white border border-[#D9AA45]/50 shadow-sm"
                      : "bg-[#0E2218] text-gray-400 hover:text-white border border-white/5"
                  }`}
                >
                  Tios Maçons ({macons.length})
                </button>
                <button
                  onClick={() => setActiveTab("visitantes_demolay")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "visitantes_demolay"
                      ? "bg-blue-700 text-white border border-[#D9AA45]/50 shadow-sm"
                      : "bg-[#0E2218] text-gray-400 hover:text-white border border-white/5"
                  }`}
                >
                  DeMolays Visitantes ({visitingDemolays.length})
                </button>
                <button
                  onClick={() => setActiveTab("visitantes_macom")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "visitantes_macom"
                      ? "bg-purple-700 text-white border border-[#D9AA45]/50 shadow-sm"
                      : "bg-[#0E2218] text-gray-400 hover:text-white border border-white/5"
                  }`}
                >
                  Maçons Visitantes ({visitingMasons.length})
                </button>
              </div>

              {canManageAttendance && activeTab === "visitantes_demolay" && (
                <button
                  onClick={() => setIsDemolayVisitorModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Adicionar DeMolay Visitante</span>
                </button>
              )}

              {canManageAttendance && activeTab === "visitantes_macom" && (
                <button
                  onClick={() => setIsMasonVisitorModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Adicionar Maçom Visitante</span>
                </button>
              )}
            </div>

            {/* TAB 1: DEMOLAYS ATIVOS */}
            {activeTab === "demolay" && (
              <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto pr-1">
                {demolaysAtivos.map((m) => {
                  const currentStatus = attendanceMap[m.id] || "ausente";
                  return (
                    <div
                      key={m.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[#D9AA45] w-16">
                          {m.id_demolay}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white">{m.full_name}</p>
                          <p className="text-[11px] text-gray-400">
                            {m.regularity || "DeMolay Regular"}
                          </p>
                        </div>
                      </div>

                      {canManageAttendance ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setAttendanceMap((prev) => ({ ...prev, [m.id]: "presente" }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              currentStatus === "presente"
                                ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400"
                                : "bg-[#0E2218] text-gray-400 hover:bg-[#132E20] hover:text-white border border-white/5"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Presente</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setAttendanceMap((prev) => ({ ...prev, [m.id]: "justificado" }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              currentStatus === "justificado"
                                ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-400"
                                : "bg-[#0E2218] text-gray-400 hover:bg-[#132E20] hover:text-white border border-white/5"
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                            <span>Justificado</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setAttendanceMap((prev) => ({ ...prev, [m.id]: "ausente" }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              currentStatus === "ausente"
                                ? "bg-red-700 text-white shadow-sm ring-1 ring-red-400"
                                : "bg-[#0E2218] text-gray-400 hover:bg-[#132E20] hover:text-white border border-white/5"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-300" />
                            <span>Ausente</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {currentStatus === "presente" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Presente</span>
                            </span>
                          )}
                          {currentStatus === "justificado" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                              <span>Justificado</span>
                            </span>
                          )}
                          {currentStatus === "ausente" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-gray-400">
                              <XCircle className="w-3.5 h-3.5 text-red-400/80" />
                              <span>Ausente</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: TIOS MAÇONS */}
            {activeTab === "macom" && (
              <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto pr-1">
                {macons.map((m) => {
                  const currentStatus = attendanceMap[m.id] || "ausente";
                  return (
                    <div
                      key={m.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[#D9AA45] w-16">
                          {m.id_demolay}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white">{m.full_name}</p>
                          <p className="text-[11px] text-[#D9AA45]">
                            {m.masonic_lodge || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"}
                          </p>
                        </div>
                      </div>

                      {canManageAttendance ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setAttendanceMap((prev) => ({ ...prev, [m.id]: "presente" }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              currentStatus === "presente"
                                ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400"
                                : "bg-[#0E2218] text-gray-400 hover:bg-[#132E20] hover:text-white border border-white/5"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Presente</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setAttendanceMap((prev) => ({ ...prev, [m.id]: "ausente" }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              currentStatus === "ausente"
                                ? "bg-red-700 text-white shadow-sm ring-1 ring-red-400"
                                : "bg-[#0E2218] text-gray-400 hover:bg-[#132E20] hover:text-white border border-white/5"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-300" />
                            <span>Ausente</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {currentStatus === "presente" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Presente</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-gray-400">
                              <XCircle className="w-3.5 h-3.5 text-red-400/80" />
                              <span>Ausente</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 3: DEMOLAYS VISITANTES */}
            {activeTab === "visitantes_demolay" && (
              <div className="space-y-4">
                {visitingDemolays.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 bg-[#08140E] rounded-xl border border-dashed border-white/10">
                    Nenhum irmão DeMolay visitante registrado para esta sessão ainda.
                    {canManageAttendance && (
                      <div className="mt-3">
                        <button
                          onClick={() => setIsDemolayVisitorModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Adicionar DeMolay Visitante</span>
                        </button>
                      </div>
                    )}
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
                              ID: {v.id_demolay}
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

                        {canManageAttendance && (
                          <button
                            onClick={() => handleRemoveDemolayVisitor(v.id)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors cursor-pointer"
                            title="Remover visitante"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
                  <div className="py-8 text-center text-xs text-gray-400 bg-[#08140E] rounded-xl border border-dashed border-white/10">
                    Nenhum maçom visitante registrado para esta sessão ainda.
                    {canManageAttendance && (
                      <div className="mt-3">
                        <button
                          onClick={() => setIsMasonVisitorModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Adicionar Visitante</span>
                        </button>
                      </div>
                    )}
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

                        {canManageAttendance && (
                          <button
                            onClick={() => handleRemoveMasonVisitor(v.id)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors cursor-pointer"
                            title="Remover visitante"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEÇÃO 2: ATA DA REUNIÃO */}
      {sessionSection === "ata" && selectedMeeting && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-sm space-y-6">
          {/* Cabeçalho da Ata */}
          <div className="text-center space-y-1.5 border-b border-[#D9AA45]/30 pb-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9AA45] font-mono">
              Ordem DeMolay • Capítulo Professor Carvalho Neves Nº 500
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif tracking-wide text-white">
              LIVRO DE ATAS DA SESSÃO
            </h2>
            <p className="text-xs text-gray-400">
              Sede dos Trabalhos: Templo da A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI) — Teresina/PI
            </p>
          </div>

          <form onSubmit={handleSaveMinute} className="space-y-6">
            {/* Banner de Ata Oficial Digitalizada em PDF */}
            {(minuteData.storage_path || selectedMeeting.ata_pdf_url) && (
              <div className="p-4 rounded-xl bg-[#0E2218] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#087443]/30 text-emerald-300 border border-emerald-500/30">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#D9AA45]" />
                      Documento Oficial Assinado em Acervo
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {minuteData.number || selectedMeeting.ata_num || "Ata Oficial Registrada"}
                    </h4>
                    <p className="text-xs text-gray-400">
                      Ata autenticada e assinada pelo Mestre Conselheiro e Escrivão.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <a
                    href={minuteData.storage_path || selectedMeeting.ata_pdf_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] text-xs font-bold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Visualizar Ata (PDF)</span>
                  </a>
                  <a
                    href={minuteData.storage_path || selectedMeeting.ata_pdf_url || "#"}
                    download
                    className="px-4 py-2 rounded-lg bg-[#08140E] hover:bg-black/50 border border-white/10 text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Baixar</span>
                  </a>
                </div>
              </div>
            )}

            {/* Metadados da Ata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-gray-300">Identificação da Ata</label>
                <input
                  type="text"
                  required
                  readOnly={!canManageAttendance}
                  value={minuteData.number}
                  onChange={(e) => setMinuteData({ ...minuteData, number: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white font-bold focus:outline-none ${
                    canManageAttendance ? "focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]" : "cursor-default opacity-80"
                  }`}
                  placeholder="Ex: Ata nº 24 — Sessão Ordinária"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-300">Grau / Tipo de Cerimônia</label>
                <select
                  disabled={!canManageAttendance}
                  value={minuteData.degree}
                  onChange={(e) => setMinuteData({ ...minuteData, degree: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none ${
                    canManageAttendance ? "focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45] cursor-pointer" : "cursor-default opacity-80"
                  }`}
                >
                  <option value="Grau Iniciático">Grau Iniciático</option>
                  <option value="Grau DeMolay">Grau DeMolay</option>
                  <option value="Sessão Administrativa">Sessão Administrativa</option>
                  <option value="Sessão Magna Pública">Sessão Magna Pública</option>
                  <option value="Instalação e Posse">Instalação e Posse</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-300">Data e Local</label>
                <div className="px-3 py-2 rounded-lg bg-[#08140E] border border-white/10 text-gray-300 font-mono text-[11px] truncate">
                  {new Date(selectedMeeting.starts_at).toLocaleDateString("pt-BR")} • Caridade II (GOB-PI)
                </div>
              </div>
            </div>

            {/* Quórum e Presença Extraída da Chamada em Tempo Real */}
            <div className="p-4 rounded-xl bg-[#08140E] border border-white/10 space-y-3 text-xs">
              <span className="font-bold text-[#D9AA45] uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Relação de Presenças Vinculadas à Chamada Oficial</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                <div className="p-3 rounded-lg bg-[#0C1D14] border border-white/10">
                  <p className="font-bold text-white">DeMolays Presentes ({presentesDemolay.length})</p>
                  <p className="text-emerald-300 mt-1 line-clamp-2">
                    {presentesDemolay.map((p) => p.full_name.split(" ")[0]).join(", ") || "Nenhum marcado presente"}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#0C1D14] border border-white/10">
                  <p className="font-bold text-white">Conselho Consultivo ({presentesMacons.length})</p>
                  <p className="text-[#D9AA45] mt-1 line-clamp-2">
                    {presentesMacons.map((p) => p.full_name.split(" ")[0]).join(", ") || "Nenhum marcado presente"}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#0C1D14] border border-white/10">
                  <p className="font-bold text-blue-300">DeMolays Visitantes ({visitingDemolays.length})</p>
                  <p className="text-blue-200 mt-1 line-clamp-2">
                    {visitingDemolays.map((v) => `${v.name} (${v.chapter})`).join(", ") || "Nenhum visitante"}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#0C1D14] border border-white/10">
                  <p className="font-bold text-purple-300">Maçons Visitantes ({visitingMasons.length})</p>
                  <p className="text-purple-200 mt-1 line-clamp-2">
                    {visitingMasons.map((v) => `${v.name} (${v.masonic_lodge})`).join(", ") || "Nenhum visitante"}
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo / Resumo dos Trabalhos Redigidos pelo Escrivão */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-gray-300">
                Texto Oficial da Ata / Deliberações e Trabalhos Realizados
              </label>
              <textarea
                rows={9}
                required
                readOnly={!canManageAttendance}
                value={minuteData.content}
                onChange={(e) => setMinuteData({ ...minuteData, content: e.target.value })}
                className={`w-full p-4 rounded-xl bg-[#08140E] border border-white/15 text-white leading-relaxed font-serif text-sm ${
                  canManageAttendance ? "focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]" : "cursor-default opacity-90"
                }`}
                placeholder="Redija o texto da ata da reunião..."
              />
            </div>

            {/* Assinaturas Oficiais */}
            <div className="pt-6 border-t border-[#D9AA45]/30 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-white/10 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#D9AA45]" />
                <span>Imprimir Ata Oficial</span>
              </button>

              {canManageAttendance && (
                <button
                  type="submit"
                  disabled={isSavingMinute}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingMinute ? "Salvando..." : "Salvar no Livro de Atas"}</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* SEÇÃO 3: GERENCIAMENTO DO CALENDÁRIO & AGENDA CAPITULAR */}
      {sessionSection === "calendario" && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="p-6 rounded-2xl bg-[#0C1D14] border border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#D9AA45] bg-[#D9AA45]/15 border border-[#D9AA45]/30 uppercase tracking-wider font-mono">
                  Gestão Administrativa do Calendário
                </span>
                <span className="text-[11px] text-gray-400 font-mono">Fonte: PostgreSQL (public.meetings)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <CalendarIcon className="w-6 h-6 text-[#D9AA45]" />
                <span>Agenda Capitular & Controle de Sessões</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl">
                Administre as reuniões ritualísticas, sessões magnas, públicas e encontros capitulares. Qualquer alteração reflete imediatamente na Visão Geral e no Calendário de Atividades.
              </p>
            </div>

            {canManageCalendar && (
              <button
                onClick={() => {
                  setEditingMeeting({
                    title: "Sessão Ordinária",
                    date: new Date().toISOString().split("T")[0],
                    time: "16:00",
                    endTime: "18:00",
                    location: "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
                    category: "Sessão Ordinária",
                    management: "Gestão XXV (2026.2)",
                    status: "agendada",
                    description: "",
                    complementary_info: "",
                  });
                  setIsMeetingModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
              >
                <PlusCircle className="w-4 h-4 text-[#04281A]" />
                <span>+ Nova Reunião</span>
              </button>
            )}
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0E2218] border border-white/10 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                Total de Sessões
              </span>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">{calendarMetrics.total}</p>
              <p className="text-[10px] text-gray-400">Capítulo nº 500</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0E2218] border border-emerald-500/20 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 font-mono">
                Agendadas
              </span>
              <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">{calendarMetrics.agendadas}</p>
              <p className="text-[10px] text-emerald-300/70">Ativas no calendário</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0E2218] border border-blue-500/20 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 font-mono">
                Realizadas
              </span>
              <p className="text-2xl font-bold text-blue-400 font-mono tabular-nums">{calendarMetrics.realizadas}</p>
              <p className="text-[10px] text-blue-300/70">Com chamada e ata</p>
            </div>

            <div className="p-4 rounded-xl bg-[#0E2218] border border-red-500/20 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-300 font-mono">
                Canceladas
              </span>
              <p className="text-2xl font-bold text-red-400 font-mono tabular-nums">{calendarMetrics.canceladas}</p>
              <p className="text-[10px] text-red-300/70">Histórico preservado</p>
            </div>
          </div>

          {/* Barra de Filtros e Alternância de Visualização */}
          <div className="p-4 rounded-xl bg-[#0C1D14] border border-white/10 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Seletor Mês / Ano */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevCalendarMonth}
                  className="p-1.5 rounded-lg bg-[#08140E] border border-white/10 text-gray-300 hover:text-white hover:border-[#D9AA45]/40 transition-colors cursor-pointer"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-white font-mono px-3 py-1.5 rounded-lg bg-[#08140E] border border-white/10 min-w-[160px] text-center">
                  {calendarMonthLabel}
                </span>
                <button
                  onClick={handleNextCalendarMonth}
                  className="p-1.5 rounded-lg bg-[#08140E] border border-white/10 text-gray-300 hover:text-white hover:border-[#D9AA45]/40 transition-colors cursor-pointer"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Alternador Grade vs Lista */}
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#08140E] border border-white/10">
                <button
                  onClick={() => setCalendarViewMode("grade")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    calendarViewMode === "grade"
                      ? "bg-[#087443] text-white border border-[#D9AA45]/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-[#D9AA45]" />
                  <span>Grade Mensal</span>
                </button>
                <button
                  onClick={() => setCalendarViewMode("lista")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    calendarViewMode === "lista"
                      ? "bg-[#087443] text-white border border-[#D9AA45]/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#D9AA45]" />
                  <span>Lista Cronológica</span>
                </button>
              </div>
            </div>

            {/* Linha de Filtros Adicionais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-white/10">
              {/* Filtro de Categoria */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1">
                  Categoria
                </label>
                <select
                  value={calendarCategory}
                  onChange={(e) => setCalendarCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#08140E] border border-white/15 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#D9AA45] cursor-pointer"
                >
                  <option value="todas">Todas as Categorias</option>
                  <option value="Sessão Ordinária">Sessão Ordinária</option>
                  <option value="Sessão Magna de Iniciação">Sessão Magna de Iniciação</option>
                  <option value="Sessão Magna de Elevação">Sessão Magna de Elevação</option>
                  <option value="Cerimônia Pública">Cerimônia Pública</option>
                  <option value="Reunião do Conselho Consultivo">Reunião do Conselho</option>
                  <option value="Assembleia Geral">Assembleia Geral</option>
                  <option value="Ação Filantrópica">Ação Filantrópica</option>
                  <option value="Entretenimento">Entretenimento</option>
                </select>
              </div>

              {/* Filtro de Gestão */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1">
                  Gestão
                </label>
                <select
                  value={calendarManagement}
                  onChange={(e) => setCalendarManagement(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#08140E] border border-white/15 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#D9AA45] cursor-pointer"
                >
                  <option value="todas">Todas as Gestões</option>
                  <option value="Gestão XXV (2026.2)">Gestão XXV (2026.2)</option>
                  <option value="Gestão XXIV (2026.1)">Gestão XXIV (2026.1)</option>
                  <option value="Gestão XXIII (2025.2)">Gestão XXIII (2025.2)</option>
                  <option value="Gestão XXVI (2027.1)">Gestão XXVI (2027.1)</option>
                </select>
              </div>

              {/* Filtro de Status */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1">
                  Status
                </label>
                <select
                  value={calendarStatus}
                  onChange={(e) => setCalendarStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#08140E] border border-white/15 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#D9AA45] cursor-pointer"
                >
                  <option value="todas">Todos os Status</option>
                  <option value="agendada">Agendadas</option>
                  <option value="realizada">Realizadas</option>
                  <option value="cancelada">Canceladas</option>
                </select>
              </div>

              {/* Campo de Busca */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1">
                  Pesquisar Pauta / Local
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={calendarSearch}
                    onChange={(e) => setCalendarSearch(e.target.value)}
                    placeholder="Filtrar eventos..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#08140E] border border-white/15 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#D9AA45]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* VISUALIZAÇÃO: GRADE MENSAL */}
          {calendarViewMode === "grade" && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0C1D14] border border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <CalendarIcon className="w-4 h-4 text-[#D9AA45]" />
                  <span>Calendário Litúrgico — {calendarMonthLabel}</span>
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">
                  Clique na reunião para ver pauta e opções
                </span>
              </div>

              {/* Cabeçalho dos Dias da Semana */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold text-[#D9AA45] border-b border-white/10 pb-2">
                <span>DOM</span>
                <span>SEG</span>
                <span>TER</span>
                <span>QUA</span>
                <span>QUI</span>
                <span>SEX</span>
                <span>SÁB</span>
              </div>

              {/* Células da Grade */}
              <div className="grid grid-cols-7 gap-1.5 text-xs">
                {Array.from({ length: calendarGridData.firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="min-h-[90px] rounded-lg bg-black/10 border border-transparent" />
                ))}

                {Array.from({ length: calendarGridData.totalDays }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dayMeetings = calendarGridData.meetingsByDay[dayNum] || [];
                  const dayOfWeek = (calendarGridData.firstDayIndex + idx) % 7;
                  const isSun = dayOfWeek === 0;

                  return (
                    <div
                      key={`day-${dayNum}`}
                      className={`min-h-[90px] p-2 rounded-lg border transition-colors flex flex-col justify-between ${
                        dayMeetings.length > 0
                          ? "bg-[#0E2218] border-[#D9AA45]/40 shadow-sm"
                          : isSun
                          ? "bg-[#08140E]/80 border-white/10"
                          : "bg-[#08140E]/40 border-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isSun ? "text-[#D9AA45]" : "text-gray-300"
                          }`}
                        >
                          {dayNum}
                        </span>
                        {dayMeetings.length > 0 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {dayMeetings.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1">
                        {dayMeetings.map((meet) => {
                          const timeStr = new Date(meet.starts_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          let statusDot = "bg-emerald-400";
                          if (meet.status === "realizada") statusDot = "bg-blue-400";
                          if (meet.status === "cancelada") statusDot = "bg-red-400";

                          return (
                            <button
                              key={meet.id}
                              onClick={() => setViewingMeeting(meet)}
                              className={`w-full text-left p-1 rounded text-[10px] font-medium truncate cursor-pointer transition-colors block border ${
                                meet.status === "cancelada"
                                  ? "bg-red-950/40 text-red-300 border-red-500/30 hover:bg-red-950/70"
                                  : meet.status === "realizada"
                                  ? "bg-blue-950/40 text-blue-300 border-blue-500/30 hover:bg-blue-950/70"
                                  : "bg-[#08140E] text-white border-white/10 hover:border-[#D9AA45]/50"
                              }`}
                              title={`${meet.title} (${timeStr})`}
                            >
                              <div className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${statusDot} shrink-0`} />
                                <span className="font-mono text-[9px] text-[#D9AA45] shrink-0">{timeStr}</span>
                                <span className="truncate">{meet.title}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISUALIZAÇÃO: LISTA CRONOLÓGICA */}
          {calendarViewMode === "lista" && (
            <div className="space-y-3">
              {filteredCalendarMeetings.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 rounded-xl bg-[#0C1D14] border border-white/10">
                  Nenhuma reunião encontrada para os filtros selecionados.
                </div>
              ) : (
                filteredCalendarMeetings.map((m) => {
                  const d = new Date(m.starts_at);
                  const dataFormatada = d.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  });
                  const horaFormatada = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      ● Agendada
                    </span>
                  );
                  if (m.status === "realizada") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-blue-950/80 text-blue-300 border border-blue-500/30">
                        ● Realizada
                      </span>
                    );
                  } else if (m.status === "cancelada") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-red-950/80 text-red-300 border border-red-500/30">
                        ● Cancelada
                      </span>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`p-4 sm:p-5 rounded-xl bg-[#0C1D14] border transition-all space-y-3 shadow-sm ${
                        m.status === "cancelada"
                          ? "border-red-500/30 opacity-80"
                          : "border-white/10 hover:border-[#D9AA45]/40"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusBadge}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono text-[#D9AA45] bg-[#D9AA45]/15 border border-[#D9AA45]/30">
                            {m.category || parseMeetingCategory(m.title)}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            {m.management || deriveManagementFromDate(m.starts_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#D9AA45]" />
                          <span className="capitalize">{dataFormatada} às {horaFormatada}</span>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <h4 className="text-base font-bold text-white tracking-tight">
                            {m.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{m.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"}</span>
                          </div>
                          {m.description && (
                            <p className="text-xs text-gray-300/80 line-clamp-2 mt-1">
                              {m.description}
                            </p>
                          )}
                          {m.cancelled_at && (
                            <p className="text-[11px] text-red-400 font-mono mt-1">
                              ⚠️ Sessão cancelada em {new Date(m.cancelled_at).toLocaleDateString("pt-BR")}. O histórico capitular foi preservado no PostgreSQL.
                            </p>
                          )}
                        </div>

                        {/* Ações da Sessão */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={() => setViewingMeeting(m)}
                            className="px-3 py-1.5 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-white/10 text-gray-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#D9AA45]" />
                            <span>Ver Detalhes</span>
                          </button>

                          {canManageCalendar && (
                            <>
                              {(m.management || deriveManagementFromDate(m.starts_at)) === "Gestão XXV (2026.2)" ? (
                                <>
                                  <button
                                    onClick={() => {
                                      const dObj = new Date(m.starts_at);
                                      setEditingMeeting({
                                        id: m.id,
                                        title: m.title,
                                        date: dObj.toISOString().split("T")[0],
                                        time: dObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                                        endTime: m.ends_at ? new Date(m.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
                                        location: m.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
                                        category: m.category || parseMeetingCategory(m.title),
                                        management: m.management || deriveManagementFromDate(m.starts_at),
                                        status: m.status,
                                        description: m.description || "",
                                        complementary_info: m.complementary_info || "",
                                      });
                                      setIsMeetingModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-white/10 hover:border-[#D9AA45]/40 text-gray-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-[#D9AA45]" />
                                    <span>Editar</span>
                                  </button>

                                  {m.status !== "cancelada" ? (
                                    <button
                                      onClick={() => setCancellingMeeting(m)}
                                      className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/70 border border-red-500/30 text-red-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                                      <span>Cancelar Sessão</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleReactivateMeeting(m.id)}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Reativar Sessão</span>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] text-gray-400 bg-white/5 border border-white/10 font-mono">
                                  Gestão Arquivada (Somente Leitura)
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: VER DETALHES DA SESSÃO */}
      {viewingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="text-base font-bold">Detalhes da Sessão Oficial</h3>
              </div>
              <button
                onClick={() => setViewingMeeting(null)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                  Título da Reunião
                </span>
                <p className="text-base font-bold text-white mt-0.5">{viewingMeeting.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#08140E] border border-white/10">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                    Categoria
                  </span>
                  <p className="text-xs font-semibold text-[#D9AA45] mt-0.5">
                    {viewingMeeting.category || parseMeetingCategory(viewingMeeting.title)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                    Gestão
                  </span>
                  <p className="text-xs font-semibold text-white mt-0.5">
                    {viewingMeeting.management || deriveManagementFromDate(viewingMeeting.starts_at)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#08140E] border border-white/10">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                    Data & Horário
                  </span>
                  <p className="text-xs text-white mt-0.5">
                    {new Date(viewingMeeting.starts_at).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}{" "}
                    às{" "}
                    {new Date(viewingMeeting.starts_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                    Status
                  </span>
                  <p className="text-xs font-semibold uppercase mt-0.5">
                    {viewingMeeting.status === "agendada" && <span className="text-emerald-400">● Agendada</span>}
                    {viewingMeeting.status === "realizada" && <span className="text-blue-400">● Realizada</span>}
                    {viewingMeeting.status === "cancelada" && <span className="text-red-400">● Cancelada</span>}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#08140E] border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                  Local da Sessão
                </span>
                <p className="text-xs text-white mt-0.5">
                  {viewingMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"}
                </p>
              </div>

              {viewingMeeting.description && (
                <div className="p-3 rounded-lg bg-[#08140E] border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                    Pauta / Ordem dos Trabalhos
                  </span>
                  <p className="text-xs text-gray-300 mt-0.5 whitespace-pre-wrap">{viewingMeeting.description}</p>
                </div>
              )}

              {viewingMeeting.complementary_info && (
                <div className="p-3 rounded-lg bg-[#08140E] border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                    Orientações Complementares
                  </span>
                  <p className="text-xs text-emerald-200/80 mt-0.5 whitespace-pre-wrap">{viewingMeeting.complementary_info}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <a
                href={getGoogleCalendarUrl(viewingMeeting)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg bg-[#0E2218] hover:bg-[#132E20] border border-white/10 text-gray-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Google Agenda</span>
              </a>

              <div className="flex items-center gap-2">
                {canManageCalendar && (
                  <>
                    {(viewingMeeting.management || deriveManagementFromDate(viewingMeeting.starts_at)) === "Gestão XXV (2026.2)" ? (
                      <>
                        {viewingMeeting.status !== "cancelada" && (
                          <button
                            type="button"
                            onClick={() => {
                              const target = viewingMeeting;
                              setViewingMeeting(null);
                              setCancellingMeeting(target);
                            }}
                            className="px-3 py-2 rounded-lg bg-red-950/50 hover:bg-red-950 border border-red-500/40 text-red-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                            <span>Cancelar Sessão</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const m = viewingMeeting;
                            const dObj = new Date(m.starts_at);
                            setEditingMeeting({
                              id: m.id,
                              title: m.title,
                              date: dObj.toISOString().split("T")[0],
                              time: dObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                              endTime: m.ends_at ? new Date(m.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
                              location: m.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
                              category: m.category || parseMeetingCategory(m.title),
                              management: m.management || deriveManagementFromDate(m.starts_at),
                              status: m.status,
                              description: m.description || "",
                              complementary_info: m.complementary_info || "",
                            });
                            setViewingMeeting(null);
                            setIsMeetingModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs cursor-pointer shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#04281A]" />
                          <span>Editar</span>
                        </button>
                      </>
                    ) : (
                      <span className="px-2.5 py-1.5 rounded-lg text-xs text-gray-400 bg-white/5 border border-white/10 font-mono">
                        Gestão Arquivada (Somente Leitura)
                      </span>
                    )}
                  </>
                )}
                <button
                  onClick={() => setViewingMeeting(null)}
                  className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE CANCELAMENTO */}
      {cancellingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-red-500/40 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold">Confirmar Cancelamento de Sessão</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Você está prestes a cancelar a sessão <strong className="text-white">&ldquo;{cancellingMeeting.title}&rdquo;</strong> agendada para{" "}
              <strong className="text-white">
                {new Date(cancellingMeeting.starts_at).toLocaleDateString("pt-BR")}
              </strong>.
            </p>

            <div className="p-3 rounded-lg bg-[#08140E] border border-white/10 text-[11px] text-gray-400 space-y-1">
              <p className="font-semibold text-emerald-400">✓ Preservação Histórica Garantida:</p>
              <p>O registro não será apagado do banco de dados PostgreSQL. Ele permanecerá arquivado com status <code className="text-[#D9AA45]">&apos;cancelada&apos;</code> e data de cancelamento registrada para auditoria.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancellingMeeting(null)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => handleCancelMeeting(cancellingMeeting.id)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isCancelling ? "Cancelando..." : "Confirmar Cancelamento"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR REUNIÃO */}
      {isMeetingModalOpen && canManageCalendar && editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-xl p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-4 text-white animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="text-base font-bold">
                  {editingMeeting.id ? "Editar Dados da Reunião" : "Cadastrar Nova Reunião"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMeetingModalOpen(false);
                  setEditingMeeting(null);
                }}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeeting} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-gray-300">Título da Sessão *</label>
                <input
                  type="text"
                  required
                  value={editingMeeting.title}
                  onChange={(e) =>
                    setEditingMeeting({ ...editingMeeting, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  placeholder="Ex: Sessão Ordinária do Grau Iniciático"
                />

                {/* Validação de Dia Obrigatório fora do mês correto */}
                {getMandatoryDayWarning(editingMeeting.title, editingMeeting.date) && (
                  <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] flex items-start gap-1.5 mt-1.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>{getMandatoryDayWarning(editingMeeting.title, editingMeeting.date)}</span>
                  </div>
                )}
              </div>

              {/* Categoria e Gestão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">Categoria Litúrgica</label>
                  <select
                    value={editingMeeting.category || "Sessão Ordinária"}
                    onChange={(e) =>
                      setEditingMeeting({ ...editingMeeting, category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] cursor-pointer"
                  >
                    <option value="Sessão Ordinária">Sessão Ordinária</option>
                    <option value="Sessão Magna de Iniciação">Sessão Magna de Iniciação</option>
                    <option value="Sessão Magna de Elevação">Sessão Magna de Elevação</option>
                    <option value="Cerimônia Pública">Cerimônia Pública</option>
                    <option value="Reunião do Conselho Consultivo">Reunião do Conselho Consultivo</option>
                    <option value="Assembleia Geral">Assembleia Geral</option>
                    <option value="Ação Filantrópica">Ação Filantrópica</option>
                    <option value="Entretenimento">Entretenimento</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-300">Gestão</label>
                  <select
                    value="Gestão XXV (2026.2)"
                    disabled
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white/80 focus:outline-none cursor-not-allowed"
                  >
                    <option value="Gestão XXV (2026.2)">Gestão XXV (2026.2)</option>
                  </select>
                  <span className="text-[10px] text-gray-400 mt-1 block">Vinculada estritamente à gestão ativa do usuário Master.</span>
                </div>
              </div>

              {/* Data, Horário de Início e Horário de Término */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">Data *</label>
                  <input
                    type="date"
                    required
                    value={editingMeeting.date}
                    onChange={(e) =>
                      setEditingMeeting({ ...editingMeeting, date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">Horário Início *</label>
                  <input
                    type="time"
                    required
                    value={editingMeeting.time}
                    onChange={(e) =>
                      setEditingMeeting({ ...editingMeeting, time: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">Horário Término</label>
                  <input
                    type="time"
                    value={editingMeeting.endTime || ""}
                    onChange={(e) =>
                      setEditingMeeting({ ...editingMeeting, endTime: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* Lembrete Litúrgico: Reuniões aos Domingos */}
              {editingMeeting.date && !isSunday(editingMeeting.date) && (
                <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] flex items-start gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    <strong>Aviso Litúrgico:</strong> A data selecionada cai em uma <strong>{getDayOfWeekName(editingMeeting.date)}</strong>. Lembre-se que as reuniões do Capítulo habitualmente acontecem aos <strong>domingos</strong>.
                  </span>
                </div>
              )}

              {/* Sugestões de Dias Obrigatórios para o mês selecionado */}
              {editingMeeting.date && getMandatoryDaysForDate(editingMeeting.date).length > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-[11px] space-y-1.5 animate-in fade-in">
                  <span className="font-bold text-[#D9AA45] flex items-center gap-1 font-mono">
                    <BookOpen className="w-3.5 h-3.5 text-[#D9AA45]" />
                    Dias Obrigatórios previstos para este mês (Vade Mecum):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {getMandatoryDaysForDate(editingMeeting.date).map((day) => (
                      <button
                        key={day.name}
                        type="button"
                        onClick={() => setEditingMeeting({ ...editingMeeting, title: day.name })}
                        className="px-2.5 py-1 rounded-lg bg-[#D9AA45]/20 hover:bg-[#D9AA45]/35 border border-[#D9AA45]/40 text-[#D9AA45] text-[10px] font-bold cursor-pointer transition-colors"
                        title={day.desc}
                      >
                        + Usar &ldquo;{day.name}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Local e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1 text-gray-300">Local da Sessão *</label>
                  <input
                    type="text"
                    required
                    value={editingMeeting.location}
                    onChange={(e) =>
                      setEditingMeeting({ ...editingMeeting, location: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">Status da Sessão</label>
                  <select
                    value={editingMeeting.status || "agendada"}
                    onChange={(e) =>
                      setEditingMeeting({ ...editingMeeting, status: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] cursor-pointer"
                  >
                    <option value="agendada">Agendada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Descrição / Pauta */}
              <div>
                <label className="block font-semibold mb-1 text-gray-300">Pauta da Reunião / Descrição</label>
                <textarea
                  rows={2}
                  value={editingMeeting.description || ""}
                  onChange={(e) =>
                    setEditingMeeting({ ...editingMeeting, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  placeholder="Descreva a ordem dos trabalhos, temas a deliberar ou instruções litúrgicas..."
                />
              </div>

              {/* Informações Complementares */}
              <div>
                <label className="block font-semibold mb-1 text-gray-300">Orientações aos Irmãos (Traje, Materiais)</label>
                <textarea
                  rows={2}
                  value={editingMeeting.complementary_info || ""}
                  onChange={(e) =>
                    setEditingMeeting({ ...editingMeeting, complementary_info: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  placeholder="Ex: Traje a rigor completo com capa; levar capa ritualística e joia do cargo..."
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                {editingMeeting.id && editingMeeting.status !== "cancelada" ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = meetings.find((x) => x.id === editingMeeting.id);
                      setIsMeetingModalOpen(false);
                      setEditingMeeting(null);
                      if (target) setCancellingMeeting(target);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-red-950/50 hover:bg-red-950 border border-red-500/40 text-red-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Cancelar Sessão</span>
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMeetingModalOpen(false);
                      setEditingMeeting(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    Salvar Reunião
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR DEMOLAY VISITANTE (ID, NOME COMPLETO, CAPÍTULO) */}
      {isDemolayVisitorModalOpen && canManageAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-300" />
              <h3 className="text-lg font-bold">Adicionar DeMolay Visitante</h3>
            </div>
            <p className="text-xs text-gray-400">
              Cadastre a presença do irmão visitante de outro capítulo nesta sessão oficial.
            </p>

            <form onSubmit={handleAddDemolayVisitor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-gray-300">
                  ID SISDM do DeMolay *
                </label>
                <input
                  type="text"
                  required
                  value={newDemolayVisitor.id_demolay}
                  onChange={(e) =>
                    setNewDemolayVisitor({ ...newDemolayVisitor, id_demolay: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  placeholder="Ex: 148194"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-300">
                  Nome Completo do Irmão *
                </label>
                <input
                  type="text"
                  required
                  value={newDemolayVisitor.name}
                  onChange={(e) =>
                    setNewDemolayVisitor({ ...newDemolayVisitor, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  placeholder="Ex: Gabriel Carvalho de Sousa"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-300">
                  Capítulo de Origem / Cidade *
                </label>
                <input
                  type="text"
                  required
                  value={newDemolayVisitor.chapter}
                  onChange={(e) =>
                    setNewDemolayVisitor({ ...newDemolayVisitor, chapter: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  placeholder="Ex: Capítulo Teresina Nº 124"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsDemolayVisitorModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Registrar Irmão Visitante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR MAÇOM VISITANTE */}
      {isMasonVisitorModalOpen && canManageAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-300" />
              <h3 className="text-lg font-bold">Adicionar Maçom Visitante</h3>
            </div>
            <p className="text-xs text-gray-400">
              Registre a presença do Tio Maçom visitante nesta sessão do Capítulo 500.
            </p>

            <form onSubmit={handleAddMasonVisitor} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-gray-300">CIM / Identificação</label>
                  <input
                    type="text"
                    required
                    value={newMasonVisitor.cim}
                    onChange={(e) =>
                      setNewMasonVisitor({ ...newMasonVisitor, cim: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                    placeholder="Ex: 284910"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-300">Potência</label>
                  <select
                    value={newMasonVisitor.potency}
                    onChange={(e) =>
                      setNewMasonVisitor({ ...newMasonVisitor, potency: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45] cursor-pointer"
                  >
                    <option value="GOB-PI">GOB-PI</option>
                    <option value="GLMPI">GLMPI</option>
                    <option value="COMAB">COMAB</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-300">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newMasonVisitor.name}
                  onChange={(e) =>
                    setNewMasonVisitor({ ...newMasonVisitor, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  placeholder="Ex: Antônio Carlos da Silva"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-300">Loja Maçônica</label>
                <input
                  type="text"
                  required
                  value={newMasonVisitor.masonic_lodge}
                  onChange={(e) =>
                    setNewMasonVisitor({ ...newMasonVisitor, masonic_lodge: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#08140E] border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-[#D9AA45] focus:border-[#D9AA45]"
                  placeholder="Ex: A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsMasonVisitorModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Adicionar Maçom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONVOCAÇÃO OFICIAL FORMATADA */}
      {isConvocationModalOpen && isMaster && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
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

            <p className="text-xs text-gray-400">
              Copie o texto padronizado para disparo aos irmãos no WhatsApp Capitular ou e-mail:
            </p>

            <div className="p-3.5 rounded-lg bg-[#08140E] border border-white/10">
              <pre className="text-xs text-gray-200 font-mono whitespace-pre-wrap select-all max-h-56 overflow-y-auto">
                {convocationText}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-[11px] text-emerald-400 font-medium">
                {convocationCopied ? "✓ Texto copiado com sucesso!" : ""}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(convocationText);
                    setConvocationCopied(true);
                    setTimeout(() => setConvocationCopied(false), 3000);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs cursor-pointer shadow-sm transition-colors"
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
