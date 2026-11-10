"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck,
  Building2,
  ArrowLeft
} from "lucide-react";

interface MemberRecord {
  id: string;
  cid: string;
  full_name: string;
  category: string;
  regularity?: string;
  masonic_lodge?: string;
}

const OFFICIAL_LODGES = [
  {
    name: "A∴R∴L∴S∴ Abolição nº 4199",
    tagline: "Loja Maçônica Patrocinadora",
    potency: "GOB-PI",
  },
  {
    name: "A∴R∴L∴S∴ Adonhiran nº 2782",
    tagline: "Loja Maçônica Patrocinadora",
    potency: "GOB-PI",
  },
  {
    name: "A∴R∴L∴S∴ Caridade II nº 135",
    tagline: "Loja Maçônica Patrocinadora • Sede Capitular",
    potency: "GOB-PI",
  },
  {
    name: "A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591",
    tagline: "Loja Maçônica Patrocinadora",
    potency: "GOB-PI",
  },
];

export default function ConselhoPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCouncil() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("members")
          .select("id, cid, full_name, category, regularity, masonic_lodge")
          .eq("category", "macom")
          .order("full_name", { ascending: true });

        if (data) {
          setMembers(data as MemberRecord[]);
        }
      } catch (err) {
        console.error("Erro ao carregar conselho consultivo:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCouncil();
  }, []);

  // Agrupamento estrito pelas 4 Lojas Patrocinadoras (ocultando membros sem loja conforme solicitado)
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

  // Contagem de tios alocados
  const totalAllocated = useMemo(() => {
    return Object.values(lodgeMap).reduce((acc, list) => acc + list.length, 0);
  }, [lodgeMap]);

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
            <span>Conselho Consultivo & Lojas Patrocinadoras</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Representação oficial das Lojas Maçônicas mantenedoras do Capítulo Professor Carvalho Neves Nº 500
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#D9AA45] text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>{totalAllocated} Tios Consultores Vinculados</span>
        </div>
      </div>

      {/* BANNER INFORMATIVO COM GLASSMORPHISM */}
      <div className="p-5 rounded-2xl bg-[#064D32]/80 backdrop-blur-xl border border-emerald-500/30 text-xs text-emerald-100 flex items-start gap-4 shadow-xl">
        <Building2 className="w-6 h-6 text-[#D9AA45] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-white text-sm">Estrutura de Apoio Maçônico</h3>
          <p className="text-emerald-200/80 leading-relaxed">
            O Capítulo Professor Carvalho Neves Nº 500 é respaldado por quatro augustas e respeitáveis lojas maçônicas de Teresina/PI. A sede das sessões capitulares situa-se na <strong>A∴R∴L∴S∴ Caridade II nº 135</strong>.
          </p>
        </div>
      </div>

      {/* GRID DAS 4 LOJAS PATROCINADORAS */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-emerald-200/60 animate-pulse">
          Carregando dados das Lojas Patrocinadoras e do Conselho Consultivo...
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {OFFICIAL_LODGES.map((lodge) => {
          const brothers = lodgeMap[lodge.name] || [];
          return (
            <div
              key={lodge.name}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4 hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-lg"
            >
              <div>
                {/* Topo do Card */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9AA45]">
                      {lodge.potency} • {lodge.tagline}
                    </span>
                    <h2 className="text-base font-extrabold text-white mt-0.5">
                      {lodge.name}
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/40 shrink-0">
                    {brothers.length} Maçons
                  </span>
                </div>

                {/* Lista de Membros da Loja */}
                <div className="mt-4 divide-y divide-white/5 max-h-72 overflow-y-auto pr-1">
                  {brothers.length === 0 ? (
                    <p className="py-4 text-xs text-emerald-200/50 text-center italic">
                      Nenhum maçom vinculado a esta loja no momento.
                    </p>
                  ) : (
                    brothers.map((m) => (
                      <div
                        key={m.id}
                        className="py-2.5 flex items-center justify-between gap-2 hover:bg-white/[0.02] px-2 rounded-lg"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{m.full_name}</p>
                          <p className="text-[11px] text-emerald-200/60 font-mono">
                            ID: {m.cid}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {m.regularity || "Consultor"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Rodapé do Card */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-emerald-200/60">
                <span>Representação Ativa no Capítulo</span>
                <span className="text-[#D9AA45] font-semibold">100% Regular</span>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
