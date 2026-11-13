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
  ArrowRight,
  CalendarCheck,
  ExternalLink,
  ChevronRight,
  ClipboardCheck,
  UserPlus,
  Building2,
  UserCheck
} from "lucide-react";

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
}

export default function DashboardOverviewPage() {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Permissões e Perfis (RBAC Guard)
  const [userRole, setUserRole] = useState<string>("membro");
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
  const canManage = isMaster || effectiveRole === "escrivao";

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        // Carregamento em paralelo de Reuniões e Membros
        const [mRes, memRes] = await Promise.all([
          supabase
            .from("meetings")
            .select("id, title, starts_at, location, status")
            .order("starts_at", { ascending: true }),
          supabase
            .from("members")
            .select("id, id_demolay, full_name, category, masonic_lodge"),
        ]);

        if (mRes.data) setMeetings(mRes.data);
        if (memRes.data) setMembers(memRes.data as MemberRecord[]);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Grupos
  const demolaysAtivos = useMemo(() => members.filter((m) => m.category === "demolay_ativo"), [members]);
  const macons = useMemo(() => members.filter((m) => m.category === "macom"), [members]);
  const seniores = useMemo(() => members.filter((m) => m.category === "senior_demolay"), [members]);

  // Próxima Reunião
  const nextMeeting = useMemo(() => {
    return meetings[0] || null;
  }, [meetings]);

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
      <div className="py-24 text-center text-xs text-emerald-200/60 animate-pulse">
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
            <span className="selo-vidro-cn px-3 py-1 rounded-full text-[11px] font-bold text-[#D9AA45] tracking-wider uppercase">
              Gestão XXIII • 2025.2 / 2026
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-300 font-medium">Conexão Oficial Ativa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Visão Geral do Capítulo
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Capítulo Professor Carvalho Neves Nº 500 — Teresina/PI
          </p>
        </div>

        {/* Atalhos Rápidos */}
        <div className="flex items-center gap-2.5">
          {canManage ? (
            <>
              <Link
                href="/dashboard/chamada"
                className="btn-heraldico-esmeralda px-4 py-2.5 rounded-xl text-xs"
              >
                <ClipboardCheck className="w-4 h-4 text-[#D9AA45]" />
                <span>Frequência & Chamada</span>
              </Link>
              <Link
                href="/dashboard/membros"
                className="btn-heraldico-vidro px-4 py-2.5 rounded-xl text-xs"
              >
                <UserPlus className="w-4 h-4 text-emerald-300" />
                <span>Novo Membro</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard/membro"
                className="btn-heraldico-esmeralda px-4 py-2.5 rounded-xl text-xs"
              >
                <UserCheck className="w-4 h-4 text-[#D9AA45]" />
                <span>Meu Autoatendimento</span>
              </Link>
              <Link
                href="/dashboard/chamada"
                className="btn-heraldico-vidro px-4 py-2.5 rounded-xl text-xs"
              >
                <ClipboardCheck className="w-4 h-4 text-emerald-300" />
                <span>Consultar Frequência</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* MÉTRICAS PRINCIPAIS (4 CARDS HERÁLDICOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: DeMolays Ativos */}
        <Link
          href="/dashboard/membros"
          className="card-heraldico-dark p-5 rounded-2xl group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/80">
              DeMolays Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{demolaysAtivos.length}</p>
          <p className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1 font-medium">
            <span>Ver quadro completo</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        {/* Card 2: Conselho Consultivo */}
        <Link
          href="/dashboard/conselho"
          className="card-heraldico-dark p-5 rounded-2xl group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200/80">
              Conselho Consultivo
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[#D9AA45] flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{macons.length}</p>
          <p className="text-[11px] text-[#D9AA45] mt-1 flex items-center gap-1 font-medium">
            <span>4 Lojas patrocinadoras</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        {/* Card 3: Sêniores DeMolay */}
        <Link
          href="/dashboard/membros"
          className="card-heraldico-dark p-5 rounded-2xl group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200/80">
              Sêniores DeMolay
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{seniores.length}</p>
          <p className="text-[11px] text-blue-300 mt-1 flex items-center gap-1 font-medium">
            <span>Alumni capitular</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        {/* Card 4: Mensalidade Capitular */}
        <Link
          href="/dashboard/tesouraria"
          className="card-heraldico-dark p-5 rounded-2xl group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/80">
              Mensalidade
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white">R$ 22 / R$ 25</p>
          <p className="text-[11px] text-emerald-300 mt-1 flex items-center justify-between font-medium">
            <span>DM R$ 22 • Maçom R$ 25 (Dia 28)</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform shrink-0" />
          </p>
        </Link>
      </div>

      {/* CARD DE DESTAQUE: PRÓXIMA SESSÃO OFICIAL */}
      {nextMeeting && (
        <div className="card-heraldico-dark p-6 sm:p-7 rounded-3xl border border-[#D9AA45]/50 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-[#D9AA45] text-[#04281A] uppercase tracking-wider shadow-sm">
                Próxima Sessão do Capítulo
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-2.5">
                {nextMeeting.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Botão Google Agenda (Apenas Master) */}
              {isMaster && (
                <a
                  href={getGoogleCalendarUrl(nextMeeting)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-heraldico-vidro px-3.5 py-2.5 rounded-xl text-xs"
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
                  className="btn-heraldico-ouro px-4 py-2.5 rounded-xl text-xs"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Fazer Chamada</span>
                </Link>
              ) : (
                <Link
                  href="/dashboard/chamada"
                  className="btn-heraldico-vidro px-4 py-2.5 rounded-xl text-xs"
                >
                  <ClipboardCheck className="w-4 h-4 text-[#D9AA45]" />
                  <span>Ver Detalhes da Sessão</span>
                </Link>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-emerald-100/90">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#D9AA45]" />
              <span>
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
        </div>
      )}

      {/* MÓDULOS DO SISTEMA (ACESSOS DEDICADOS) */}
      <div>
        <h3 className="text-base font-extrabold text-white mb-4">
          Módulos de Gestão Capitular
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Módulo 1: Reuniões, Atas & Chamada */}
          <Link
            href="/dashboard/chamada"
            className="card-heraldico-dark p-6 rounded-2xl flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#087443]/20 border border-[#087443]/40 text-emerald-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-5 h-5 text-[#D9AA45]" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Atas & Chamada da Sessão
              </h4>
              <p className="text-xs text-emerald-200/70 mt-2 leading-relaxed">
                Ata e chamada integradas da reunião, DeMolays ativos, Tios Maçons e visitantes (DeMolays e Maçons).
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#D9AA45]">
              <span>{canManage ? "Acessar Atas & Chamada" : "Consultar Atas & Chamada"}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Módulo 2: Quadro de Membros */}
          <Link
            href="/dashboard/membros"
            className="card-heraldico-dark p-6 rounded-2xl flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#087443]/20 border border-[#087443]/40 text-emerald-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 text-[#D9AA45]" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Quadro de Membros
              </h4>
              <p className="text-xs text-emerald-200/70 mt-2 leading-relaxed">
                {canManage
                  ? "Consulta completa com filtros de regularidade, datas de iniciação e botão para habilitar novos membros no capítulo."
                  : "Consulta completa do quadro capitular de DeMolays ativos, sêniores e conselheiros maçônicos regulares."}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#D9AA45]">
              <span>{canManage ? "Gerenciar Membros" : "Consultar Membros"}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Módulo 3: Conselho Consultivo */}
          <Link
            href="/dashboard/conselho"
            className="card-heraldico-dark p-6 rounded-2xl flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-[#D9AA45] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5 text-[#D9AA45]" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                Conselho Consultivo
              </h4>
              <p className="text-xs text-emerald-200/70 mt-2 leading-relaxed">
                As 4 Lojas Maçônicas Patrocinadoras (Abolição, Adonhiran, Caridade II e Mansur) e seus consultores regulares vinculados.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#D9AA45]">
              <span>Ver Lojas & Tios</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
