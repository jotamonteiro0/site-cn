"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { HISTORICAL_MEETINGS } from "@/lib/data/historicalMeetings";
import {
  CalendarCheck,
  Search,
  ExternalLink,
  Shield,
  Sparkles,
  ArrowLeft,
  Filter,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Calendar,
  CheckCircle2
} from "lucide-react";

interface Activity {
  id: string;
  title: string;
  starts_at: string;
  location?: string | null;
  description: string;
  photo_url?: string | null;
  mc_name?: string | null;
  management?: string | null;
  status: "publicado" | "rascunho" | "arquivado";
  original_post_url?: string | null;
}

interface CalendarMeeting {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  description?: string | null;
  complementary_info?: string | null;
  category?: string | null;
  status?: string;
  management?: string;
  mc_name?: string;
}

function parseActivityTitle(rawTitle: string): { category: string; headline: string } {
  if (!rawTitle) return { category: "Atividade Capitular", headline: "" };
  if (rawTitle.startsWith("[") && rawTitle.includes("]")) {
    const endIdx = rawTitle.indexOf("]");
    return {
      category: rawTitle.substring(1, endIdx).trim(),
      headline: rawTitle.substring(endIdx + 1).trim(),
    };
  }
  if (rawTitle.includes("|")) {
    const [cat, head] = rawTitle.split("|");
    return {
      category: cat.trim(),
      headline: head.trim(),
    };
  }
  return {
    category: "Atividade Capitular",
    headline: rawTitle.trim(),
  };
}

function formatCivilDate(isoString: string): string {
  if (!isoString) return "";
  const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, y, m, d] = match;
  const monthNamesLong = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const mIndex = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} de ${monthNamesLong[mIndex]} de ${y}`;
}

function getSessionType(title: string): { label: string; badgeClass: string } {
  const lower = title.toLowerCase();
  if (lower.includes("instalação") || lower.includes("posse")) {
    return { label: "Sessão Magna de Instalação", badgeClass: "bg-amber-500/20 text-[#D9AA45] border-amber-500/30" };
  }
  if (lower.includes("iniciação")) {
    return { label: "Sessão Magna de Iniciação", badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
  }
  if (lower.includes("elevação")) {
    return { label: "Sessão Magna de Elevação", badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" };
  }
  if (lower.includes("pública") || lower.includes("mães") || lower.includes("pais")) {
    return { label: "Cerimônia Pública", badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  }
  if (lower.includes("magna")) {
    return { label: "Sessão Magna", badgeClass: "bg-amber-500/20 text-[#D9AA45] border-amber-500/30" };
  }
  return { label: "Sessão Ordinária", badgeClass: "bg-white/10 text-emerald-100 border-white/20" };
}

export default function AtividadesMembroPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedManagement, setSelectedManagement] = useState("todas");
  const [clientNow, setClientNow] = useState<number | null>(null);

  // Modal de Detalhes da Reunião
  const [viewingMeetingDetails, setViewingMeetingDetails] = useState<CalendarMeeting | null>(null);

  // Carrossel de Atividades Recentes
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const carouselTrackRef = useRef<HTMLDivElement>(null);

  // Controle de Permissões RBAC (Membro vs Master)
  const [userRole, setUserRole] = useState<string>("membro");
  const [viewAsMember, setViewAsMember] = useState(false);

  // Helper Google Agenda
  const getGoogleCalendarUrl = (m?: CalendarMeeting | null) => {
    if (!m) return "#";
    const startDate = new Date(m.starts_at);
    const endDate = m.ends_at
      ? new Date(m.ends_at)
      : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const formatGDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const datesStr = `${formatGDate(startDate)}/${formatGDate(endDate)}`;

    const text = encodeURIComponent(m.title);
    const details = encodeURIComponent(
      `Sessão Oficial do Capítulo Professor Carvalho Neves Nº 500.\n${m.description || ""}`
    );
    const location = encodeURIComponent(m.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI) — Teresina/PI");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${datesStr}&details=${details}&location=${location}`;
  };

  const scrollRecentCarousel = useCallback((direction: "left" | "right") => {
    if (!carouselTrackRef.current) return;
    const cardWidth = 320;
    carouselTrackRef.current.scrollBy({
      left: direction === "right" ? cardWidth : -cardWidth,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || isCarouselPaused) return;

    const timer = setInterval(() => {
      if (!carouselTrackRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = carouselTrackRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        carouselTrackRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRecentCarousel("right");
      }
    }, 4500);

    return () => clearInterval(timer);
  }, [isCarouselPaused, scrollRecentCarousel]);

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

  // Estado do Mês Selecionado no Calendário (Novembro 2026 por padrão da base)
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => new Date(2026, 10, 1)); // Nov 2026

  useEffect(() => {
    const timer = setTimeout(() => setClientNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const supabase = createClient();

        const [actsRes, meetRes] = await Promise.all([
          fetch("/api/activities?limit=100").then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch("/api/meetings")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => (d && Array.isArray(d.items) ? d.items : null))
            .catch(() => null),
        ]);

        if (!isMounted) return;

        // 1. Atividades do CMS com suporte integral à base canônica autêntica homologada
        const actList: Activity[] = Array.isArray(actsRes) ? actsRes : actsRes?.items || [];
        if (actList.length > 0) {
          const seen = new Set<string>();
          const merged: Activity[] = [];
          for (const it of actList) {
            if (!seen.has(it.id)) {
              seen.add(it.id);
              merged.push(it);
            }
          }
          for (const h of HISTORICAL_MEETINGS) {
            if (!seen.has(h.id)) {
              seen.add(h.id);
              merged.push({
                id: h.id,
                title: h.title,
                starts_at: h.starts_at,
                location: h.location,
                description: h.description,
                photo_url: h.photo_url,
                mc_name: h.mc_name,
                management: h.management,
                status: "publicado",
                original_post_url: h.original_post_url,
              });
            }
          }
          merged.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
          setActivities(merged);
        } else {
          // Base canônica oficial dos 18 registros históricos autênticos
          const canonList: Activity[] = [...HISTORICAL_MEETINGS]
            .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
            .map((h) => ({
              id: h.id,
              title: h.title,
              starts_at: h.starts_at,
              location: h.location,
              description: h.description,
              photo_url: h.photo_url,
              mc_name: h.mc_name,
              management: h.management,
              status: "publicado",
              original_post_url: h.original_post_url,
            }));
          setActivities(canonList);
        }

        // 2. Reuniões para o Calendário e Próxima Reunião
        let dbMeetings: CalendarMeeting[] = Array.isArray(meetRes) ? meetRes : [];
        if (dbMeetings.length === 0) {
          const { data } = await supabase
            .from("meetings")
            .select("id, title, starts_at, ends_at, location, description, complementary_info, category, status, management, mc_name")
            .order("starts_at", { ascending: true });
          if (data && data.length > 0) {
            dbMeetings = data as CalendarMeeting[];
          }
        }
        const baseList: CalendarMeeting[] = dbMeetings.length > 0
          ? dbMeetings
          : HISTORICAL_MEETINGS.map((h) => ({
              id: h.id,
              title: h.title,
              starts_at: h.starts_at,
              location: h.location,
              description: h.description,
              status: "agendada",
              management: h.management,
              mc_name: h.mc_name,
            }));

        setMeetings(baseList);
      } catch (err) {
        console.error("Erro ao carregar atividades capitulares:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Identificação da Próxima Reunião Oficial (Estritamente Futura)
  const nextMeeting = useMemo(() => {
    const threshold = clientNow ?? new Date("2026-11-14T00:00:00Z").getTime();
    // Filtra estritamente reuniões com data e horário futuros que não estejam canceladas nem realizadas
    const future = meetings
      .filter((m) => {
        const mDate = new Date(m.starts_at);
        return mDate.getTime() > threshold && m.status !== "cancelada" && m.status !== "realizada";
      })
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    return future[0] || null;
  }, [meetings, clientNow]);

  // Dados do mês selecionado
  const monthYearLabel = useMemo(() => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${monthNames[currentCalendarDate.getMonth()]} de ${currentCalendarDate.getFullYear()}`;
  }, [currentCalendarDate]);

  const daysInMonth = useMemo(() => {
    const y = currentCalendarDate.getFullYear();
    const m = currentCalendarDate.getMonth();
    return new Date(y, m + 1, 0).getDate();
  }, [currentCalendarDate]);

  const firstDayWeekIndex = useMemo(() => {
    const y = currentCalendarDate.getFullYear();
    const m = currentCalendarDate.getMonth();
    // 0 = Domingo, 1 = Segunda ...
    return new Date(y, m, 1).getDay();
  }, [currentCalendarDate]);

  const monthMeetingsMap = useMemo(() => {
    const map = new Map<number, CalendarMeeting[]>();
    const y = currentCalendarDate.getFullYear();
    const m = currentCalendarDate.getMonth();

    meetings.forEach((meet) => {
      const d = new Date(meet.starts_at);
      if (d.getFullYear() === y && d.getMonth() === m) {
        const day = d.getDate();
        const list = map.get(day) || [];
        list.push(meet);
        map.set(day, list);
      }
    });
    return map;
  }, [meetings, currentCalendarDate]);

  const monthMeetingsList = useMemo(() => {
    const y = currentCalendarDate.getFullYear();
    const m = currentCalendarDate.getMonth();
    return meetings.filter((meet) => {
      const d = new Date(meet.starts_at);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [meetings, currentCalendarDate]);

  const handlePrevMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // 3. Atividades Recentes (destaques para o carrossel contínuo)
  const recentActivities = useMemo(() => {
    return activities.slice(0, 8);
  }, [activities]);

  // 4. Gestões disponíveis no CMS
  const managementsList = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((act) => {
      if (act.management) set.add(act.management);
    });
    return Array.from(set);
  }, [activities]);

  // Filtros de busca no Histórico Completo
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedManagement !== "todas" && act.management !== selectedManagement) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = act.title.toLowerCase().includes(term);
        const matchesDesc = act.description.toLowerCase().includes(term);
        const matchesLocation = act.location?.toLowerCase().includes(term) || false;
        const matchesMC = act.mc_name?.toLowerCase().includes(term) || false;
        if (!matchesTitle && !matchesDesc && !matchesLocation && !matchesMC) {
          return false;
        }
      }
      return true;
    });
  }, [activities, selectedManagement, searchTerm]);

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      {/* CABEÇALHO INSTITUCIONAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs text-emerald-300/80 hover:text-white flex items-center gap-1 font-mono transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Visão Geral</span>
            </Link>
            <span className="text-white/30 text-xs">•</span>
            <span className="text-xs text-[#D9AA45] font-mono">Gestão XXV • 2026.2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-[#D9AA45]" />
            <span>Atividades do Capítulo</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1 max-w-3xl leading-relaxed">
            Cronograma litúrgico oficial, calendário de reuniões da gestão ativa e acervo histórico de publicações do Capítulo Professor Carvalho Neves nº 500.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#0C1D14] border border-[#D9AA45]/30 text-xs font-mono text-[#D9AA45] flex items-center gap-2 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#D9AA45]" />
            <span>{activities.length} Atividades no Acervo</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SEÇÃO 1: PRÓXIMA REUNIÃO OFICIAL                           */}
      {/* ========================================================= */}
      <section aria-label="Próxima Reunião Oficial" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9AA45] animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
              Seção I — Próxima Reunião Oficial
            </h2>
          </div>
          <span className="text-xs text-emerald-300 font-mono">Convocação Capitular</span>
        </div>

        {nextMeeting ? (
          <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-[#D9AA45]/40 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md text-[10px] font-bold bg-[#D9AA45] text-[#041A10] uppercase tracking-wider font-mono">
                    Sessão Oficial Agendada
                  </span>
                  {nextMeeting.management && (
                    <span className="selo-vidro-cn px-2.5 py-0.5 rounded-md text-[10px] text-emerald-200 font-mono">
                      {nextMeeting.management}
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {nextMeeting.title}
                </h3>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setViewingMeetingDetails(nextMeeting)}
                  className="btn-heraldico-vidro px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#D9AA45]" />
                  <span>Ver Detalhes da Sessão</span>
                </button>
                <Link
                  href="/dashboard/membro?tab=frequencia"
                  className="btn-heraldico-esmeralda px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D9AA45]" />
                  <span>Autoatendimento do Membro</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Informações de Data, Hora e Local */}
            <div className="pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-emerald-100">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#D9AA45] shrink-0" />
                <span className="tabular-nums font-medium">
                  {new Date(nextMeeting.starts_at).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  às{" "}
                  {new Date(nextMeeting.starts_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{nextMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI) — Teresina/PI"}</span>
              </div>
            </div>

            {/* Pauta e Ordem do Dia */}
            {nextMeeting.description && (
              <div className="p-4 rounded-xl bg-[#08140E]/80 border border-white/10 text-xs text-emerald-200/80 leading-relaxed font-light">
                <strong className="text-white font-semibold block mb-1 font-mono uppercase tracking-wider text-[11px]">
                  Pauta & Ordem do Dia:
                </strong>
                {nextMeeting.description}
              </div>
            )}
          </div>
        ) : (
          <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-white/10 space-y-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-[#D9AA45] border border-amber-500/20">
                Convocação Litúrgica
              </span>
              <h3 className="text-lg font-bold text-white mt-2">
                Nenhuma próxima sessão cadastrada
              </h3>
              <p className="text-xs text-emerald-200/70 mt-1">
                Todas as sessões anteriores foram devidamente concluídas. Novas convocações serão agendadas pela Diretoria Capitular.
              </p>
            </div>
            <Link
              href="/dashboard/documentos"
              className="btn-heraldico-vidro px-4 py-2 rounded-lg text-xs self-start sm:self-auto shrink-0"
            >
              <span>Acessar Atas Capitulares</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* SEÇÃO 2: CALENDÁRIO DA GESTÃO ATIVA                        */}
      {/* ========================================================= */}
      <section aria-label="Calendário da Gestão" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="selo-vidro-cn px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#D9AA45] uppercase tracking-wider font-mono">
                Gestão XXV • 2026.2
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D9AA45]" />
              <span>Seção II — Calendário da Gestão</span>
            </h2>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Encontros ritualísticos, sessões magnas e eventos comemorativos programados.
            </p>
          </div>

          {/* Controles do Cabeçalho */}
          <div className="flex flex-wrap items-center gap-3">
            {isMaster && (
              <Link
                href="/dashboard/chamada?tab=calendario"
                className="btn-heraldico-vidro px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                title="Acessar gerenciador administrativo do calendário oficial"
              >
                <Calendar className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Gerenciar Calendário</span>
              </Link>
            )}

            {/* Navegação Mensal */}
            <div className="flex items-center gap-3 bg-[#0C1D14] border border-white/10 rounded-xl px-3 py-1.5 shadow-sm">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-white font-mono min-w-[150px] text-center">
                {monthYearLabel}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Grade Mensal Interativa */}
          <div className="lg:col-span-7 card-heraldico-dark p-5 rounded-2xl border border-white/10 space-y-4">
            {/* Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold text-[#D9AA45]/90 border-b border-white/10 pb-2">
              <span>DOM</span>
              <span>SEG</span>
              <span>TER</span>
              <span>QUA</span>
              <span>QUI</span>
              <span>SEX</span>
              <span>SÁB</span>
            </div>

            {/* Células de Dias */}
            <div className="grid grid-cols-7 gap-1.5 text-xs">
              {/* Espaços em branco antes do primeiro dia */}
              {Array.from({ length: firstDayWeekIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-10 rounded-lg bg-transparent" />
              ))}

              {/* Dias do Mês */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dayMeetings = monthMeetingsMap.get(day) || [];
                const hasMeeting = dayMeetings.length > 0;

                return (
                  <div
                    key={`day-${day}`}
                    className={`h-11 rounded-lg border p-1 flex flex-col justify-between transition-all ${
                      hasMeeting
                        ? "bg-[#087443]/30 border-[#D9AA45]/60 text-white font-bold shadow-sm"
                        : "bg-[#08140E]/60 border-white/5 text-emerald-200/70"
                    }`}
                  >
                    <span className="text-[11px] font-mono leading-none">{day}</span>
                    {hasMeeting && (
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#D9AA45] animate-pulse" />
                        <span className="text-[9px] font-mono text-[#D9AA45] uppercase tracking-tight hidden sm:inline">
                          Sessão
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200/60 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D9AA45]" />
                <span>Dia com Sessão Litúrgica</span>
              </div>
              <span>{monthMeetingsList.length} reuniões neste mês</span>
            </div>
          </div>

          {/* Listagem Cronológica dos Eventos do Mês / Gestão */}
          <div className="lg:col-span-5 card-heraldico-dark p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-200/90 font-mono">
                Eventos em {monthYearLabel}
              </h3>

              {monthMeetingsList.length === 0 ? (
                <div className="py-12 text-center text-xs text-emerald-200/60 font-light">
                  Nenhuma reunião agendada para este mês no calendário oficial.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {monthMeetingsList.map((meet) => {
                    const sessionType = getSessionType(meet.title);
                    const formatted = formatCivilDate(meet.starts_at);

                    return (
                      <div
                        key={meet.id}
                        className="p-3.5 rounded-xl bg-[#08140E]/80 border border-white/10 hover:border-[#D9AA45]/40 transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${sessionType.badgeClass}`}
                            >
                              {sessionType.label}
                            </span>
                            {meet.status === "cancelada" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-950/80 text-red-300 border border-red-500/30">
                                ● Cancelada
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-[#D9AA45] font-semibold">
                            {formatted.split(" de ")[0]} de {formatted.split(" de ")[1]}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">
                          {meet.title}
                        </h4>
                        <p className="text-[11px] text-emerald-200/70 font-light line-clamp-2">
                          {meet.description || "Sessão ordinária do Capítulo Professor Carvalho Neves nº 500."}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setViewingMeetingDetails(meet)}
                            className="text-[11px] text-[#D9AA45] hover:text-amber-300 font-mono font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Ver Detalhes</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          {meet.management && (
                            <span className="text-[10px] text-emerald-300/60 font-mono">
                              {meet.management}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              {isMaster ? (
                <Link
                  href="/dashboard/chamada?tab=calendario"
                  className="text-xs font-bold text-emerald-300 hover:text-white inline-flex items-center gap-1 font-mono transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#D9AA45]" />
                  <span>Gerenciar Calendário</span>
                </Link>
              ) : (
                <span className="text-[11px] text-gray-500 font-mono">Modo Consulta (Membro)</span>
              )}
              {isMaster ? (
                <Link
                  href="/dashboard/chamada"
                  className="text-xs font-bold text-[#D9AA45] hover:text-amber-300 inline-flex items-center gap-1 font-mono transition-colors"
                >
                  <span>Acessar Atas & Chamadas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  href="/dashboard/documentos"
                  className="text-xs font-bold text-[#D9AA45] hover:text-amber-300 inline-flex items-center gap-1 font-mono transition-colors"
                >
                  <span>Acessar Atas Capitulares</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SEÇÃO 3: ATIVIDADES RECENTES (CARROSSEL COM AUTOPLAY)       */}
      {/* ========================================================= */}
      <section aria-label="Atividades Recentes" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="selo-vidro-cn px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#D9AA45] uppercase tracking-wider font-mono">
                Destaques Editoriais
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D9AA45]" />
              <span>Seção III — Atividades Recentes</span>
            </h2>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Últimas realizações e cerimônias documentadas da liderança capitular.
            </p>
          </div>

          {/* Controles Manuais do Carrossel */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollRecentCarousel("left")}
              aria-label="Atividade anterior"
              className="p-2 rounded-xl bg-[#0C1D14] border border-white/10 hover:border-[#D9AA45]/50 text-white hover:text-[#D9AA45] transition-all cursor-pointer shadow-md"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollRecentCarousel("right")}
              aria-label="Próxima atividade"
              className="p-2 rounded-xl bg-[#0C1D14] border border-white/10 hover:border-[#D9AA45]/50 text-white hover:text-[#D9AA45] transition-all cursor-pointer shadow-md"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trilho de Cards com Autoplay e Pausa na Interação */}
        <div
          ref={carouselTrackRef}
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
          onTouchStart={() => setIsCarouselPaused(true)}
          onTouchEnd={() => setIsCarouselPaused(false)}
          onFocus={() => setIsCarouselPaused(true)}
          onBlur={() => setIsCarouselPaused(false)}
          tabIndex={0}
          aria-label="Carrossel de Atividades Recentes"
          className="flex gap-4 overflow-x-auto scrollbar-none pb-2 pt-1 scroll-smooth snap-x snap-mandatory focus:outline-none"
        >
          {recentActivities.map((item) => {
            const { category, headline } = parseActivityTitle(item.title);
            const civilDate = formatCivilDate(item.starts_at);

            return (
              <div
                key={`recent-${item.id}`}
                className="w-[280px] sm:w-[320px] shrink-0 snap-start card-heraldico-dark rounded-xl overflow-hidden border border-white/10 hover:border-[#D9AA45]/50 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div className="relative w-full h-36 bg-[#08140E] overflow-hidden">
                  {item.photo_url ? (
                    <Image
                      src={item.photo_url}
                      alt={headline}
                      fill
                      sizes="(max-width: 640px) 280px, 320px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#0B1F16] to-[#08140E]">
                      <Shield className="w-8 h-8 text-[#D9AA45]/60 mb-1" />
                      <span className="text-[10px] font-mono text-[#D9AA45]">Capítulo nº 500</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 z-10">
                    <span className="selo-vidro-cn px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase font-mono shadow-sm">
                      {category}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <time className="text-[10px] font-mono text-[#D9AA45] font-semibold block uppercase">
                      {civilDate}
                    </time>
                    <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">
                      {headline}
                    </h3>
                    <p className="text-[11px] text-emerald-200/70 font-light line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 text-[10px] text-emerald-200/60 font-mono flex items-center justify-between">
                    <span>{item.management || "Gestão XXV"}</span>
                    {item.original_post_url && (
                      <a
                        href={item.original_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#D9AA45] hover:text-amber-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Instagram</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* SEÇÃO 4: HISTÓRICO DE ATIVIDADES PUBLICADAS               */}
      {/* ========================================================= */}
      <section aria-label="Histórico de Atividades Publicadas" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="selo-vidro-cn px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#D9AA45] uppercase tracking-wider font-mono">
                Acervo Completo
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#D9AA45]" />
              <span>Seção IV — Histórico de Atividades Publicadas</span>
            </h2>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Consulta pública e de membros com busca temática e filtros por gestão capitular.
            </p>
          </div>
        </div>

        {/* Barra de Filtros e Busca Institucional */}
        <div className="card-heraldico-dark p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-white/10">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, temática, local ou Mestre Conselheiro..."
              className="w-full bg-[#08140E] border border-white/20 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-emerald-100/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#D9AA45] shrink-0" />
            <select
              value={selectedManagement}
              onChange={(e) => setSelectedManagement(e.target.value)}
              className="bg-[#08140E] border border-white/20 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
            >
              <option value="todas">Todas as Gestões</option>
              {managementsList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grade do Acervo Completo de Atividades */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-[#D9AA45] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-emerald-200/70 font-mono">Carregando acervo de atividades capitulares...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="card-heraldico-dark p-12 rounded-2xl text-center space-y-3 border border-white/10">
            <Shield className="w-10 h-10 text-[#D9AA45]/50 mx-auto" />
            <p className="text-sm font-bold text-white">Nenhuma atividade localizada</p>
            <p className="text-xs text-emerald-200/60 max-w-md mx-auto">
              Não foram encontradas publicações com os critérios selecionados. Tente ajustar os termos de busca ou o filtro de gestão.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActivities.map((item) => {
              const { category, headline } = parseActivityTitle(item.title);
              const formattedDate = formatCivilDate(item.starts_at);

              return (
                <article
                  key={item.id}
                  className="card-heraldico-dark rounded-2xl overflow-hidden border border-white/10 hover:border-[#D9AA45]/50 transition-all duration-300 flex flex-col group shadow-xl"
                >
                  {/* Foto Real da Atividade */}
                  <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-[#032316] to-[#0A5C3A] flex items-center justify-center overflow-hidden border-b border-white/10">
                    {item.photo_url ? (
                      <Image
                        src={item.photo_url}
                        alt={headline}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-white/90">
                        <div className="w-12 h-12 rounded-full bg-white/10 border border-[#D9AA45]/50 flex items-center justify-center mb-2 shadow-inner">
                          <Shield className="w-6 h-6 text-[#D9AA45]" />
                        </div>
                        <span className="text-[11px] uppercase tracking-widest font-bold text-[#D9AA45] font-mono">
                          {item.management || "Capítulo nº 500"}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="selo-vidro-cn px-3 py-1 rounded-md text-[10px] font-bold text-white uppercase font-mono shadow-md backdrop-blur-md">
                        {category}
                      </span>
                    </div>
                    {/* Faixa Dourada Decorativa */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-[#D9AA45] via-[#F4E3A1] to-[#D9AA45] opacity-90" />
                  </div>

                  {/* Título e Conteúdo */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <time className="text-[11px] font-mono text-[#D9AA45] font-semibold block uppercase">
                        {formattedDate}
                      </time>
                      <h3 className="font-bold text-white text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">
                        {headline}
                      </h3>
                      <p className="text-xs text-emerald-200/80 leading-relaxed font-light line-clamp-3">
                        {item.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/10">
                      {/* Gestão Capitular e Mestre Conselheiro */}
                      <div className="flex items-center justify-between text-[11px] text-emerald-200/70 font-mono">
                        <span className="truncate max-w-[150px]">
                          {item.management || "Capítulo nº 500"}
                        </span>
                        {item.mc_name && (
                          <span className="text-[#D9AA45] font-semibold truncate max-w-[150px] text-right">
                            MC {item.mc_name}
                          </span>
                        )}
                      </div>

                      {/* Link para Publicação Original se disponível */}
                      {item.original_post_url && (
                        <div className="pt-1">
                          <a
                            href={item.original_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D9AA45] hover:text-amber-300 transition-colors cursor-pointer"
                          >
                            <span>Ver publicação original</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL DE DETALHES DA SESSÃO / EVENTO LITÚRGICO */}
      {viewingMeetingDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="meeting-details-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="card-heraldico-dark max-w-lg w-full p-6 sm:p-7 rounded-2xl border border-[#D9AA45]/50 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="selo-vidro-cn px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase text-[#D9AA45]">
                  {viewingMeetingDetails.management || "Gestão XXV • 2026.2"}
                </span>
                <h3 id="meeting-details-title" className="text-lg font-bold text-white mt-1.5 leading-snug">
                  {viewingMeetingDetails.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingMeetingDetails(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#08140E] border border-white/10 flex items-center gap-2.5 text-emerald-100">
                  <Clock className="w-4 h-4 text-[#D9AA45] shrink-0" />
                  <span className="tabular-nums font-medium">
                    {new Date(viewingMeetingDetails.starts_at).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    às{" "}
                    {new Date(viewingMeetingDetails.starts_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#08140E] border border-white/10 flex items-center justify-between text-emerald-100">
                  <span className="text-[11px] font-mono text-emerald-300">Situação:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      viewingMeetingDetails.status === "cancelada"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {viewingMeetingDetails.status === "cancelada" ? "Cancelada" : "Agendada"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#08140E] border border-white/10 flex items-start gap-2.5 text-emerald-200/90">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{viewingMeetingDetails.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI) — Teresina/PI"}</span>
              </div>

              {viewingMeetingDetails.description && (
                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                  <span className="font-bold text-white uppercase text-[10px] font-mono tracking-wider block">
                    Pauta & Ordem do Dia:
                  </span>
                  <p className="text-emerald-100/90 leading-relaxed whitespace-pre-wrap">
                    {viewingMeetingDetails.description}
                  </p>
                </div>
              )}

              {viewingMeetingDetails.complementary_info && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-amber-200">
                  <span className="font-bold text-[#D9AA45] uppercase text-[10px] font-mono tracking-wider block">
                    Orientações Litúrgicas & Traje:
                  </span>
                  <p className="leading-relaxed whitespace-pre-wrap">
                    {viewingMeetingDetails.complementary_info}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <a
                href={getGoogleCalendarUrl(viewingMeetingDetails)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-heraldico-vidro px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Google Agenda</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/membro?tab=frequencia"
                  className="btn-heraldico-esmeralda px-3.5 py-2 rounded-lg text-xs font-semibold"
                >
                  <span>Autoatendimento</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setViewingMeetingDetails(null)}
                  className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white cursor-pointer"
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
