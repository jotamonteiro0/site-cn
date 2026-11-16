"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  ShieldCheck,
  Wallet,
  Clock,
  MapPin,
  CalendarCheck,
  Calendar,
  ExternalLink,
  ChevronRight,
  ClipboardCheck,
  UserPlus,
  Heart,
  X,
  Award,
  FileText
} from "lucide-react";
import { RecentActivitiesCarousel } from "@/components/dashboard/RecentActivitiesCarousel";

interface MemberRecord {
  id: string;
  id_demolay: string;
  full_name: string;
  category: "demolay_ativo" | "senior_demolay" | "macom" | "irregular";
  masonic_lodge?: string;
}

interface MeetingRecord {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  status: string;
  description?: string;
  complementary_info?: string;
  category?: string;
  management?: string;
}

interface MajorityRecord {
  member_id: string;
  id_demolay: string;
  full_name: string;
  majority_date: string;
  current_age: number;
}

export default function DashboardOverviewPage() {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [birthdays, setBirthdays] = useState<Array<{
    member_id: string;
    full_name: string;
    id_demolay: string;
    birthday_formatted: string;
    birth_day: number;
    birth_month: number;
  }>>([]);
  const [majorityMembers, setMajorityMembers] = useState<MajorityRecord[]>([]);
  const [pendingAdminCount, setPendingAdminCount] = useState<number>(0);
  const [viewingSessionModal, setViewingSessionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Dados Individuais do Membro (Experiência Personalizada sem Ruído Administrativo)
  const [memberPersonalData, setMemberPersonalData] = useState<{
    regularity: string;
    category: string;
    idDemolay: string;
    pendingChargesCount: number;
    attendanceRate: number;
  }>({
    regularity: "Regular",
    category: "DeMolay Ativo",
    idDemolay: "",
    pendingChargesCount: 0,
    attendanceRate: 100,
  });

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
  const canManage = isMaster || effectiveRole === "escrivao";

  // Carregamento Otimizado dos Dados da Visão Geral em Paralelo Consolidado
  useEffect(() => {
    let ignore = false;
    async function loadDashboardData() {
      try {
        const supabase = createClient();

        // 1. Consulta inicial consolidada de usuário, permissões, reuniões, censo, aniversários e pendências
        const [authRes, mRes, memRes, bRes, majRes, reqsRes, docsRes, minsRes] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("meetings")
            .select("id, title, starts_at, location, status, description")
            .order("starts_at", { ascending: true }),
          supabase
            .from("members")
            .select("id, id_demolay, full_name, category, masonic_lodge"),
          supabase
            .from("view_member_birthdays")
            .select("member_id, full_name, id_demolay, birthday_formatted, birth_day, birth_month")
            .order("birth_month", { ascending: true })
            .order("birth_day", { ascending: true }),
          supabase
            .from("view_member_majority_status")
            .select("member_id, id_demolay, full_name, majority_date, current_age")
            .eq("is_major", false)
            .not("majority_date", "is", null)
            .order("majority_date", { ascending: true })
            .limit(5),
          supabase
            .from("member_requests")
            .select("id", { count: "exact", head: true })
            .in("status", ["aberta", "em_analise", "aguardando_informacoes", "pendente"]),
          supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .eq("status", "draft"),
          supabase
            .from("meeting_minutes")
            .select("id", { count: "exact", head: true })
            .eq("status", "draft"),
        ]);

        if (ignore) return;

        if (mRes.data) setMeetings(mRes.data);
        if (memRes.data) setMembers(memRes.data as MemberRecord[]);
        if (bRes.data) setBirthdays(bRes.data);
        if (majRes.data) setMajorityMembers(majRes.data as MajorityRecord[]);

        const totalPendencias =
          (reqsRes.count || 0) + (docsRes.count || 0) + (minsRes.count || 0);
        setPendingAdminCount(totalPendencias);

        // 2. Validação de Papel e Dados Pessoais do Usuário Logado
        const currentUser = authRes.data?.user;
        if (currentUser) {
          const isPermanentMaster =
            currentUser.user_metadata?.id_demolay === "127738" ||
            currentUser.user_metadata?.id_demolay === "102836" ||
            currentUser.email === "joaomonteiro0@icloud.com" ||
            currentUser.email === "airton@carvalhoneves500.org.br";

          const { data: membership } = await supabase
            .from("chapter_memberships")
            .select("role_code")
            .eq("user_id", currentUser.id)
            .eq("is_active", true)
            .maybeSingle();

          if (isPermanentMaster || membership?.role_code === "master") {
            setUserRole("master");
          } else if (membership?.role_code) {
            setUserRole(membership.role_code);
          }

          const userMember = memRes.data?.find(
            (m) =>
              (currentUser.user_metadata?.id_demolay && m.id_demolay === currentUser.user_metadata.id_demolay) ||
              (currentUser.email && m.full_name?.toLowerCase().includes(currentUser.email.split("@")[0].toLowerCase()))
          ) || memRes.data?.[0];

          if (userMember) {
            // Regra Institucional Definitiva: Todo integrante ativo do Conselho Consultivo deve pagar mensalidade (R$ 25,00),
            // independentemente de ser Maçom ou Sênior DeMolay. José Airton (102836) e demais membros são isentos.
            const { data: conselhoRecord } = await supabase
              .from("conselho_membros")
              .select("id")
              .eq("member_id", userMember.id)
              .eq("is_active", true)
              .maybeSingle();

            const isConselhoAtivo = !!conselhoRecord && userMember.id_demolay !== "102836";
            const isExemptFromDues = !isConselhoAtivo;

            const [chargesRes, attRes] = await Promise.all([
              isExemptFromDues
                ? Promise.resolve({ data: [] })
                : supabase
                    .from("member_charges")
                    .select("id, status")
                    .eq("member_id", userMember.id),
              supabase
                .from("meeting_attendance")
                .select("status")
                .eq("member_id", userMember.id),
            ]);

            const pending = isExemptFromDues ? 0 : (chargesRes.data?.filter((c) => c.status !== "confirmado").length || 0);
            let attRate = 100;
            if (attRes.data && attRes.data.length > 0) {
              const present = attRes.data.filter((a) => ["presente", "justificado"].includes(a.status)).length;
              attRate = Math.round((present / attRes.data.length) * 100);
            }

            setMemberPersonalData({
              regularity: "Regular",
              category:
                userMember.category === "macom"
                  ? "Tio Consultor Maçom"
                  : userMember.category === "senior_demolay"
                  ? "Sênior DeMolay"
                  : "DeMolay Ativo",
              idDemolay: userMember.id_demolay || "",
              pendingChargesCount: pending,
              attendanceRate: attRate,
            });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    loadDashboardData();
    return () => {
      ignore = true;
    };
  }, []);

  // Grupos
  const demolaysAtivos = useMemo(
    () => members.filter((m) => m.category === "demolay_ativo" && m.id_demolay !== "102836"),
    [members]
  );

  const [clientNow, setClientNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setClientNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  // Próxima Reunião Oficial (Estritamente com data/horário futuros)
  const nextMeeting = useMemo(() => {
    const threshold = clientNow || 0;
    const upcoming = meetings
      .filter((m) => {
        const mDate = new Date(m.starts_at);
        return mDate.getTime() > threshold && m.status !== "cancelada" && m.status !== "realizada";
      })
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    return upcoming[0] || null;
  }, [meetings, clientNow]);

  // Próximas Obrigações Litúrgicas e Calendário
  const upcomingObligations = useMemo(() => {
    const threshold = clientNow || 0;
    return meetings.filter((m) => {
      const mDate = new Date(m.starts_at);
      return mDate.getTime() > threshold && m.status !== "cancelada" && m.status !== "realizada";
    });
  }, [meetings, clientNow]);

  // Link para Google Agenda
  const getGoogleCalendarUrl = (m?: MeetingRecord | null) => {
    if (!m) return "#";
    const startDate = new Date(m.starts_at);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const formatGDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const datesStr = `${formatGDate(startDate)}/${formatGDate(endDate)}`;

    const text = encodeURIComponent(m.title);
    const details = encodeURIComponent(
      `Sessão Oficial do Capítulo Professor Carvalho Neves Nº 500.\nPor favor, confirme sua presença pelo portal do capítulo.`
    );
    const location = encodeURIComponent(m.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${datesStr}&details=${details}&location=${location}`;
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-emerald-200/60 font-mono">
        Carregando visão geral e indicadores do Capítulo...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* HEADER EXECUTIVO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="selo-vidro-cn px-3 py-1 rounded-full text-[11px] font-bold text-[#D9AA45] tracking-wider uppercase font-mono">
              Gestão XXV • 2026.2
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Visão Geral do Capítulo
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1 font-light">
            Capítulo Professor Carvalho Neves Nº 500 — Teresina/PI
          </p>
        </div>

        {/* Atalhos Rápidos */}
        <div className="flex items-center gap-2.5">
          {canManage ? (
            <>
              <Link
                href="/dashboard/chamada"
                className="btn-heraldico-esmeralda px-4 py-2.5 rounded-lg text-xs"
              >
                <ClipboardCheck className="w-4 h-4 text-[#D9AA45]" />
                <span>Frequência & Chamada</span>
              </Link>
              <Link
                href="/dashboard/membros"
                className="btn-heraldico-vidro px-4 py-2.5 rounded-lg text-xs"
              >
                <UserPlus className="w-4 h-4 text-emerald-300" />
                <span>Novo Membro</span>
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard/membro?tab=frequencia"
              className="btn-heraldico-esmeralda px-4 py-2.5 rounded-lg text-xs"
            >
              <ClipboardCheck className="w-4 h-4 text-[#D9AA45]" />
              <span>Consultar Frequência</span>
            </Link>
          )}
        </div>
      </div>

      {/* MÉTRICAS PRINCIPAIS: ADAPTADAS RIGOROSAMENTE AO PERFIL (RBAC & UX) */}
      {canManage ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: DeMolays Ativos */}
          <Link
            href="/dashboard/membros"
            className="card-heraldico-dark p-5 rounded-xl group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/80 font-mono">
                DeMolays Ativos
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{demolaysAtivos.length}</p>
            <p className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1 font-medium">
              <span>Ver quadro completo</span>
              <ChevronRight className="w-3 h-3 text-emerald-300" />
            </p>
          </Link>

          {/* Card 2: Próximas Obrigações (Substitui Conselho Consultivo) */}
          <Link
            href="/dashboard/chamada?tab=calendario"
            className="card-heraldico-dark p-5 rounded-xl group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-200/80 font-mono">
                Próximas Obrigações
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[#D9AA45] flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{upcomingObligations.length}</p>
            <p className="text-[11px] text-[#D9AA45] mt-1 flex items-center gap-1 font-medium">
              <span>{upcomingObligations.length > 0 ? `${upcomingObligations.length} sessões agendadas` : "Nenhuma obrigação iminente"}</span>
              <ChevronRight className="w-3 h-3 text-[#D9AA45]" />
            </p>
          </Link>

          {/* Card 3: Maioridades Próximas (Substitui Sêniores DeMolay) */}
          <Link
            href="/dashboard/membros"
            className="card-heraldico-dark p-5 rounded-xl group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200/80 font-mono">
                Maioridades Próximas
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            {majorityMembers.length > 0 ? (
              <div>
                <p className="text-sm font-bold text-white truncate leading-tight">
                  {majorityMembers[0].full_name}
                </p>
                <p className="text-xs text-blue-300 font-mono mt-1">
                  21 anos em {new Date(majorityMembers[0].majority_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-white tabular-nums">0</p>
                <p className="text-[11px] text-blue-300/80 mt-1">Nenhum membro próximo aos 21 anos</p>
              </div>
            )}
            <p className="text-[11px] text-blue-300 mt-2 flex items-center gap-1 font-medium">
              <span>{majorityMembers.length > 1 ? `+${majorityMembers.length - 1} no acompanhamento` : "Acompanhamento litúrgico"}</span>
              <ChevronRight className="w-3 h-3 text-blue-300" />
            </p>
          </Link>

          {/* Card 4: Pendências Administrativas (Substitui Mensalidade) */}
          <Link
            href="/dashboard/chamada"
            className="card-heraldico-dark p-5 rounded-xl group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/80 font-mono">
                Pendências Administrativas
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{pendingAdminCount}</p>
            <p className="text-[11px] text-emerald-300 mt-1 flex items-center justify-between font-medium">
              <span>{pendingAdminCount === 0 ? "Tudo em dia no Capítulo" : `${pendingAdminCount} solicitações/minutas`}</span>
              <ChevronRight className="w-3 h-3 text-emerald-300 shrink-0" />
            </p>
          </Link>
        </div>
      ) : (
        /* VISÃO INDIVIDUAL DO MEMBRO: FOCO NA SUA EXPERIÊNCIA E REGULARIDADE */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card Pessoal 1: Regularidade Capitular */}
          <Link
            href="/dashboard/membro"
            className="card-heraldico-dark p-5 rounded-xl group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/80 font-mono">
                Minha Situação
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#D9AA45]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">
              {memberPersonalData.regularity}
            </p>
            <p className="text-[11px] text-emerald-300 mt-1 flex items-center justify-between font-medium">
              <span>{memberPersonalData.category}</span>
              <ChevronRight className="w-3 h-3 text-emerald-300" />
            </p>
          </Link>

          {/* Card Pessoal 2: Frequência */}
          <Link
            href="/dashboard/membro?tab=frequencia"
            className="card-heraldico-dark p-5 rounded-xl group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-200/80 font-mono">
                Frequência
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[#D9AA45] flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{memberPersonalData.attendanceRate}%</p>
            <p className="text-[11px] text-[#D9AA45] mt-1 flex items-center justify-between font-medium">
              <span>{canManage ? "Presenças na Gestão Vigente" : "Consultar Frequência"}</span>
              <ChevronRight className="w-3 h-3 text-[#D9AA45]" />
            </p>
          </Link>

          {/* Card Pessoal 3: Mensalidades Individuais (Direciona para autoatendimento e NUNCA para tesouraria restrita) */}
          <Link
            href="/dashboard/membro?tab=mensalidades"
            className="card-heraldico-dark p-5 rounded-xl group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/80 font-mono">
                Minhas Mensalidades
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">
              {memberPersonalData.pendingChargesCount === 0
                ? "Em Dia"
                : `${memberPersonalData.pendingChargesCount} Pendente${memberPersonalData.pendingChargesCount > 1 ? "s" : ""}`}
            </p>
            <p className="text-[11px] text-emerald-300 mt-1 flex items-center justify-between font-medium">
              <span>{memberPersonalData.pendingChargesCount === 0 ? "Quitação disponível" : "Pagar via Pix"}</span>
              <ChevronRight className="w-3 h-3 text-emerald-300 shrink-0" />
            </p>
          </Link>
        </div>
      )}

      {/* CARD DE DESTAQUE: PRÓXIMA SESSÃO OFICIAL */}
      <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-[#D9AA45]/40 shadow-xl space-y-4">
        {nextMeeting ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 rounded-md text-[10px] font-bold bg-[#D9AA45] text-[#041A10] uppercase tracking-wider font-mono">
                  Próxima Sessão do Capítulo
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-2.5">
                  {nextMeeting.title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Botão Gerenciar Agenda (Apenas Master) */}
                {isMaster && (
                  <Link
                    href="/dashboard/chamada?tab=calendario"
                    className="btn-heraldico-vidro px-3.5 py-2.5 rounded-lg text-xs"
                    title="Gerenciar Calendário e Agenda de Sessões"
                  >
                    <Calendar className="w-4 h-4 text-[#D9AA45]" />
                    <span>Gerenciar Agenda</span>
                  </Link>
                )}

                {/* Botão Google Agenda (Apenas Master) */}
                {isMaster && (
                  <a
                    href={getGoogleCalendarUrl(nextMeeting)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-heraldico-vidro px-3.5 py-2.5 rounded-lg text-xs"
                    title="Adicionar ao Google Agenda"
                  >
                    <CalendarCheck className="w-4 h-4 text-[#D9AA45]" />
                    <span>Google Agenda</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}

                {/* Botão Chamada / Detalhes */}
                {canManage ? (
                  <Link
                    href="/dashboard/chamada"
                    className="btn-heraldico-ouro px-4 py-2.5 rounded-lg text-xs"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Fazer Chamada</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setViewingSessionModal(true)}
                    className="btn-heraldico-vidro px-4 py-2.5 rounded-lg text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ClipboardCheck className="w-4 h-4 text-[#D9AA45]" />
                    <span>Ver Detalhes da Sessão</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-emerald-100/90">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#D9AA45]" />
                <span className="tabular-nums">
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
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>{nextMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-md text-[10px] font-bold bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/30 uppercase tracking-wider font-mono">
                Próxima Sessão do Capítulo
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-2.5">
                Nenhuma próxima sessão cadastrada
              </h2>
              <p className="text-xs text-emerald-200/70 mt-1">
                Todas as sessões anteriores foram concluídas ou aguardam nova convocação oficial da liderança capitular.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href={canManage ? "/dashboard/chamada" : "/dashboard/documentos"}
                className="btn-heraldico-vidro px-4 py-2.5 rounded-lg text-xs"
              >
                <ClipboardCheck className="w-4 h-4 text-[#D9AA45]" />
                <span>{canManage ? "Consultar Atas & Chamadas" : "Consultar Atas Capitulares"}</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* CARROSSEL DE ATIVIDADES RECENTES DO CAPÍTULO */}
      <RecentActivitiesCarousel />

      {/* SEÇÃO: ANIVERSARIANTES DO CAPÍTULO (MIGRADA PARA A VISÃO GERAL) */}
      <section aria-label="Aniversariantes do Capítulo" className="space-y-4">
        <div className="card-heraldico-dark p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-400" />
                <span>Aniversariantes do Capítulo</span>
              </h3>
              <p className="text-xs text-emerald-200/70 mt-0.5">
                Celebre a vida e o laço fraternal de cada irmão e tio maçom do Capítulo 500.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/40 font-mono">
              {birthdays.length > 0 ? `${birthdays.length} datas cadastradas` : "Secretaria Capitular"}
            </span>
          </div>

          {birthdays.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {birthdays.map((b) => (
                <div
                  key={b.member_id}
                  className="bg-black/30 border border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#064D32] to-[#087443] border border-[#D9AA45]/40 flex items-center justify-center font-mono font-bold text-xs text-[#D9AA45] shrink-0">
                      {b.birthday_formatted}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white line-clamp-1">{b.full_name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">ID {b.id_demolay}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-xs text-emerald-200/60 leading-relaxed font-light">
              As datas natalícias dos irmãos ativos, tios do Conselho Consultivo e sêniores são mantidas e atualizadas oficialmente pela Secretaria do Capítulo Professor Carvalho Neves nº 500.
            </div>
          )}
        </div>
      </section>

      {/* MODAL: DETALHES DA SESSÃO PARA MEMBROS */}
      {viewingSessionModal && nextMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl bg-[#0C1D14] border border-[#D9AA45]/30 shadow-2xl space-y-5 text-white animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#D9AA45]" />
                <h3 className="text-base font-bold">Detalhes da Sessão Oficial</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSessionModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-mono text-[#D9AA45] uppercase tracking-wider font-bold">
                  {nextMeeting.category || "Sessão Oficial"} • {nextMeeting.management || "Gestão XXV (2026.2)"}
                </span>
                <h4 className="text-lg font-bold text-white mt-1">{nextMeeting.title}</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#08140E] border border-white/10 text-emerald-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D9AA45] shrink-0" />
                  <span>
                    {new Date(nextMeeting.starts_at).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    às{" "}
                    {new Date(nextMeeting.starts_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Status: Agendada
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#08140E] border border-white/10 flex items-start gap-2.5 text-emerald-200/90">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{nextMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"}</span>
              </div>

              {nextMeeting.description && (
                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                  <span className="font-bold text-white uppercase text-[10px] font-mono tracking-wider block">
                    Pauta & Ordem do Dia:
                  </span>
                  <p className="text-emerald-100/90 leading-relaxed whitespace-pre-wrap">
                    {nextMeeting.description}
                  </p>
                </div>
              )}

              {nextMeeting.complementary_info && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-amber-200">
                  <span className="font-bold text-[#D9AA45] uppercase text-[10px] font-mono tracking-wider block">
                    Orientações Litúrgicas & Traje:
                  </span>
                  <p className="leading-relaxed whitespace-pre-wrap">{nextMeeting.complementary_info}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <a
                href={getGoogleCalendarUrl(nextMeeting)}
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
                  <span>Consultar Frequência</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setViewingSessionModal(false)}
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
