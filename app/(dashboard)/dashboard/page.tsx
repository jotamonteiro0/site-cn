"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  ShieldCheck,
  Calendar,
  Wallet,
  Clock,
  MapPin,
  ArrowRight,
  CalendarCheck,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ClipboardCheck,
  UserPlus,
  Building2,
  CheckCircle2
} from "lucide-react";

interface MemberRecord {
  id: string;
  cid: string;
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

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        // 1. Reuniões
        const { data: mData } = await supabase
          .from("meetings")
          .select("id, title, starts_at, location, status")
          .order("starts_at", { ascending: true });

        if (mData) setMeetings(mData);

        // 2. Membros
        const { data: memData } = await supabase
          .from("members")
          .select("id, cid, full_name, category, masonic_lodge");

        if (memData) setMembers(memData as MemberRecord[]);
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
    const location = encodeURIComponent(m.location || "A∴R∴L∴S∴ Caridade II nº 135");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${datesStr}&details=${details}&location=${location}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* HEADER EXECUTIVO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/40">
              Gestão XXIII • 2025.2 / 2026
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-300">Conexão Oficial Ativa</span>
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
          <Link
            href="/dashboard/chamada"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#087443] hover:bg-[#087443]/80 border border-[#D9AA45]/50 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4 text-[#D9AA45]" />
            <span>Frequência & Chamada</span>
          </Link>
          <Link
            href="/dashboard/membros"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-300" />
            <span>Novo Membro</span>
          </Link>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPAIS (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: DeMolays Ativos */}
        <Link
          href="/dashboard/membros"
          className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-emerald-500/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/80">
              DeMolays Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{demolaysAtivos.length}</p>
          <p className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1">
            <span>Ver quadro completo</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        {/* Card 2: Conselho Consultivo */}
        <Link
          href="/dashboard/conselho"
          className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-amber-500/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200/80">
              Conselho Consultivo
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-[#D9AA45] flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{macons.length}</p>
          <p className="text-[11px] text-[#D9AA45] mt-1 flex items-center gap-1">
            <span>4 Lojas patrocinadoras</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        {/* Card 3: Sêniores DeMolay */}
        <Link
          href="/dashboard/membros"
          className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-blue-500/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200/80">
              Sêniores DeMolay
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{seniores.length}</p>
          <p className="text-[11px] text-blue-300 mt-1 flex items-center gap-1">
            <span>Alumni capitular</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        {/* Card 4: Mensalidade Capitular */}
        <Link
          href="/dashboard/tesouraria"
          className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-emerald-500/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/80">
              Mensalidade
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">R$ 50,00</p>
          <p className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1">
            <span>Acessar caixa</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>
      </div>

      {/* CARD DE DESTAQUE: PRÓXIMA SESSÃO OFICIAL */}
      {nextMeeting && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#064D32] to-[#04281A] border border-[#D9AA45]/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#D9AA45] text-[#04281A] uppercase tracking-wider">
                Próxima Sessão do Capítulo
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-2">
                {nextMeeting.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Botão Google Agenda */}
              <a
                href={getGoogleCalendarUrl(nextMeeting)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4 text-[#D9AA45]" />
                <span>Google Agenda</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              {/* Botão Chamada */}
              <Link
                href="/dashboard/chamada"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Fazer Chamada</span>
              </Link>
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
              <span>{nextMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135"}</span>
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
          {/* Módulo 1: Calendário & Chamada */}
          <Link
            href="/dashboard/chamada"
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-emerald-500/40 hover:bg-white/[0.07] transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#087443]/20 border border-[#087443]/40 text-emerald-300 flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5 text-[#D9AA45]" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Calendário & Frequência
              </h4>
              <p className="text-xs text-emerald-200/70 mt-2 leading-relaxed">
                Chamada DeMolay, registro de Tios Maçons, cadastro de maçons visitantes e convocatória para o Google Agenda.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#D9AA45]">
              <span>Acessar Chamada</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Módulo 2: Quadro de Membros */}
          <Link
            href="/dashboard/membros"
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-emerald-500/40 hover:bg-white/[0.07] transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#087443]/20 border border-[#087443]/40 text-emerald-300 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-[#D9AA45]" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Quadro de Membros
              </h4>
              <p className="text-xs text-emerald-200/70 mt-2 leading-relaxed">
                Consulta completa com filtros de regularidade, datas de iniciação e botão para habilitar novos membros no capítulo.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#D9AA45]">
              <span>Gerenciar Membros</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Módulo 3: Conselho Consultivo */}
          <Link
            href="/dashboard/conselho"
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-amber-500/40 hover:bg-white/[0.07] transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-[#D9AA45] flex items-center justify-center mb-4">
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
