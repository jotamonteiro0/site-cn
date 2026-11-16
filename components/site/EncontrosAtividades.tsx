"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  ExternalLink
} from "lucide-react";
import { HISTORICAL_MEETINGS, type HistoricalMeetingRecord } from "@/lib/data/historicalMeetings";

const OFFICIAL_INSTAGRAM_URL = "https://instagram.com/cap.carvalhoneves500";

// Formatação estrita de datas civis por extenso (sem deslocamento UTC em America/Sao_Paulo)
export function formatFullDate(isoString: string): string {
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

// Extrai a manchete objetiva do título composto (ex: "Reunião Magna | Iniciação" -> "Iniciação à Ordem DeMolay")
export function parseMeetingTitle(rawTitle: string): { category: string; headline: string } {
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

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export type DynamicMeetingRecord = HistoricalMeetingRecord & {
  status?: string;
};

// Ordenação cronológica estritamente decrescente (mais recentes primeiro)
const AUTHENTIC_ACTIVITIES: DynamicMeetingRecord[] = [...HISTORICAL_MEETINGS].sort(
  (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
);

const SET_COUNT = 3; // 0 = buffer anterior, 1 = conjunto autêntico central, 2 = buffer posterior

export interface LoopSlideItem {
  key: string;
  item: DynamicMeetingRecord;
  setIndex: number;
  isClone: boolean;
}

// Cria 3 repetições virtuais estáticas para compatibilidade e hidratação imediata
export const LOOP_SLIDES: LoopSlideItem[] = [];
for (let s = 0; s < SET_COUNT; s++) {
  AUTHENTIC_ACTIVITIES.forEach((activity, idx) => {
    LOOP_SLIDES.push({
      key: `set-${s}-${activity.id}-${idx}`,
      item: activity,
      setIndex: s,
      isClone: s !== 1, // Apenas o conjunto central (set 1) é autêntico para leitores de tela
    });
  });
}

export function EncontrosAtividades() {
  const [activitiesList, setActivitiesList] = useState<DynamicMeetingRecord[]>(AUTHENTIC_ACTIVITIES);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadedIdsRef = useRef<Set<string>>(new Set(AUTHENTIC_ACTIVITIES.map((a) => a.id)));

  // Estado de arrasto por mouse
  const [isMouseDown, setIsMouseDown] = useState(false);
  const isDraggingRef = useRef(false);
  const mouseStartXRef = useRef(0);
  const mouseStartScrollLeftRef = useRef(0);

  // Controle de largura e snap do loop
  const oneSetWidthRef = useRef(0);
  const cardStepRef = useRef(0);
  const isNormalizingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetScrollLeftRef = useRef<number | null>(null);

  // 1. Carregamento dinâmico de publicações ativas do CMS (/api/activities)
  useEffect(() => {
    let isMounted = true;
    async function loadDynamicActivities() {
      try {
        const response = await fetch("/api/activities?limit=100");
        if (response.ok) {
          const data = await response.json();
          if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
            if (!isMounted) return;
            const unique: DynamicMeetingRecord[] = [];
            const seen = new Set<string>();

            for (const it of data.items) {
              if (!seen.has(it.id)) {
                seen.add(it.id);
                // Previne duplicações usando loadedIdsRef
                if (!loadedIdsRef.current.has(it.id)) {
                  loadedIdsRef.current.add(it.id);
                }
                unique.push(it);
              }
            }

            if (unique.length > 0) {
              setActivitiesList(unique);
            }
          }
        }
      } catch (err) {
        console.warn("Aviso ao carregar publicações dinâmicas:", err);
      }
    }

    loadDynamicActivities();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Buffer dinâmico de 3 conjuntos para suportar qualquer quantidade de publicações
  const slides = useMemo<LoopSlideItem[]>(() => {
    const list = activitiesList.length > 0 ? activitiesList : AUTHENTIC_ACTIVITIES;
    const dynamicLoop: LoopSlideItem[] = [];
    for (let s = 0; s < SET_COUNT; s++) {
      list.forEach((activity, idx) => {
        dynamicLoop.push({
          key: `set-${s}-${activity.id}-${idx}`,
          item: activity,
          setIndex: s,
          isClone: s !== 1,
        });
      });
    }
    return dynamicLoop;
  }, [activitiesList]);

  // Calcula passo dos cards e largura de um conjunto completo
  const measureDimensions = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const listLen = activitiesList.length;
    const children = el.children;
    if (children.length >= listLen * 2) {
      const firstAuthentic = children[listLen] as HTMLElement;
      const secondSetFirst = children[listLen * 2] as HTMLElement;
      const firstChild = children[0] as HTMLElement;
      const secondChild = children[1] as HTMLElement;

      if (firstAuthentic && secondSetFirst) {
        oneSetWidthRef.current = secondSetFirst.offsetLeft - firstAuthentic.offsetLeft;
      }
      if (firstChild && secondChild) {
        cardStepRef.current = secondChild.offsetLeft - firstChild.offsetLeft;
      }
    }
  }, [activitiesList.length]);

  // Reposicionamento silencioso e imperceptível quando o scroll atinge os buffers das extremidades
  const normalizeLoopPosition = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || isDraggingRef.current || isNormalizingRef.current) return;

    const setWidth = oneSetWidthRef.current;
    if (setWidth <= 0) return;

    const scrollLeft = el.scrollLeft;

    // Se passou do segundo conjunto (buffer direito) -> retorna para o conjunto central
    if (scrollLeft >= 2 * setWidth - 10) {
      isNormalizingRef.current = true;
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
      el.scrollLeft = scrollLeft - setWidth;
      if (targetScrollLeftRef.current !== null) {
        targetScrollLeftRef.current -= setWidth;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (el) {
            el.style.scrollSnapType = "";
            el.style.scrollBehavior = "";
          }
          isNormalizingRef.current = false;
        });
      });
    }
    // Se recuou para o buffer esquerdo -> avança para o conjunto central
    else if (scrollLeft < setWidth - 10) {
      isNormalizingRef.current = true;
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
      el.scrollLeft = scrollLeft + setWidth;
      if (targetScrollLeftRef.current !== null) {
        targetScrollLeftRef.current += setWidth;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (el) {
            el.style.scrollSnapType = "";
            el.style.scrollBehavior = "";
          }
          isNormalizingRef.current = false;
        });
      });
    }
  }, []);

  // Posiciona o scroll inicialmente no conjunto autêntico central (set 1)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Se ainda não mediu, agenda medição e posicionamento inicial
    if (oneSetWidthRef.current === 0) {
      const timer = setTimeout(() => {
        measureDimensions();
        if (el && oneSetWidthRef.current > 0) {
          el.style.scrollBehavior = "auto";
          el.scrollLeft = oneSetWidthRef.current;
          el.style.scrollBehavior = "";
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [measureDimensions, activitiesList]);

  // Monitora scrollend e resize
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (isNormalizingRef.current) return;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Debounce para normalização assim que o movimento cessar
      scrollTimeoutRef.current = setTimeout(() => {
        normalizeLoopPosition();
      }, 100);
    };

    const onScrollEnd = () => {
      normalizeLoopPosition();
    };

    const onResize = () => {
      measureDimensions();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", onResize);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [measureDimensions, normalizeLoopPosition]);

  // Navegação horizontal em loop por setas (sempre ativas, sem limites)
  const scrollByDirection = (direction: -1 | 1) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    measureDimensions();
    const step = cardStepRef.current > 0 ? cardStepRef.current : (el.clientWidth > 768 ? 390 : 310);
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Alinha ao próximo card proporcional
    const baseScroll = targetScrollLeftRef.current ?? el.scrollLeft;
    const targetScroll = baseScroll + direction * step;
    targetScrollLeftRef.current = targetScroll;

    el.scrollTo({
      left: targetScroll,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      targetScrollLeftRef.current = null;
      normalizeLoopPosition();
    }, prefersReducedMotion ? 50 : 380);
  };

  // Suporte a arrasto contínuo por mouse (Mouse Drag)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    isDraggingRef.current = true;
    setIsMouseDown(true);
    mouseStartXRef.current = e.pageX - el.offsetLeft;
    mouseStartScrollLeftRef.current = el.scrollLeft;
    el.style.scrollSnapType = "none";
    el.style.scrollBehavior = "auto";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;

    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - mouseStartXRef.current) * 1.2;
    el.scrollLeft = mouseStartScrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsMouseDown(false);

    const el = scrollContainerRef.current;
    if (!el) return;

    el.style.scrollSnapType = "";
    el.style.scrollBehavior = "";

    // Restaura alinhamento snap e normaliza loop
    normalizeLoopPosition();
  };

  return (
    <section
      id="atividades"
      aria-label="Atividades realizadas"
      className="py-16 sm:py-24 bg-[#06140D] text-white overflow-hidden relative"
    >
      {/* Detalhe de iluminação heráldica de fundo */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#087443_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C59B3F]/40 to-transparent" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#087443]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Cabeçalho da Seção — Padrão Editorial da Referência */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#087443]/30 border border-[#C59B3F]/40 text-[#D9AA45] text-xs font-semibold uppercase tracking-wider mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>Memória e Tradição Capitular</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-serif">
              Atividades realizadas
            </h2>
            <p className="mt-3 text-base sm:text-lg text-emerald-100/80 leading-relaxed font-sans">
              Conheça as atividades e projetos do Capítulo DeMolay Professor Carvalho Neves nº 500. Registros
              autênticos das cerimônias magnas, reuniões ritualísticas, ações filantrópicas e encontros
              fraternais que constroem nossa história em Valença do Piauí.
            </p>
          </div>

          {/* Controles de Navegação Horizontal Contínua em Loop */}
          <div className="flex items-center gap-2 self-start md:self-end shrink-0">
            <button
              type="button"
              onClick={() => scrollByDirection(-1)}
              className="p-3 rounded-xl bg-white/10 hover:bg-[#087443] border border-white/10 hover:border-[#C59B3F]/50 text-white transition-all shadow-sm active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C59B3F]"
              aria-label="Atividade anterior no carrossel"
              title="Voltar atividade (loop infinito)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByDirection(1)}
              className="p-3 rounded-xl bg-white/10 hover:bg-[#087443] border border-white/10 hover:border-[#C59B3F]/50 text-white transition-all shadow-sm active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C59B3F]"
              aria-label="Próxima atividade no carrossel"
              title="Avançar atividade (loop infinito)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Trilho Horizontal com Carrossel em Loop Infinito Contínuo */}
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`flex gap-5 sm:gap-6 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory select-none ${
              isMouseDown ? "cursor-grabbing" : "cursor-grab"
            }`}
            tabIndex={0}
            aria-roledescription="carrossel"
            aria-label="Atividades realizadas do Capítulo"
          >
            {slides.map((slide) => {
              const { item, isClone, key } = slide;
              const { headline, category } = parseMeetingTitle(item.title);
              const formattedDate = formatFullDate(item.starts_at);

              return (
                <figure
                  key={key}
                  aria-hidden={isClone ? "true" : undefined}
                  className="snap-start shrink-0 w-[295px] sm:w-[350px] lg:w-[380px] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-200/90 flex flex-col select-none"
                >
                  {/* 1. Fotografia real em destaque no topo (com alternativa institucional digna se ausente) */}
                  <div className="relative w-full aspect-[4/3] sm:h-64 overflow-hidden bg-gradient-to-br from-[#032316] via-[#052E1D] to-[#0A5C3A] flex items-center justify-center border-b border-gray-100">
                    {item.photo_url ? (
                      <Image
                        src={item.photo_url}
                        alt={`Fotografia da atividade: ${headline}`}
                        fill
                        loading="lazy"
                        tabIndex={isClone ? -1 : undefined}
                        className="object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                      />
                    ) : (
                      /* Apresentação Institucional Consistente e Heráldica quando não houver fotografia */
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C59B3F_1px,transparent_1px)] [background-size:16px_16px]" />

                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-[#C59B3F]/40 flex items-center justify-center shadow-inner transition-colors">
                          <Shield className="w-7 h-7 text-[#D9AA45]" />
                        </div>

                        <span className="mt-3 text-[11px] uppercase font-bold tracking-widest text-emerald-100 font-mono">
                          {item.management}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-[#C59B3F]/90 font-mono mt-0.5">
                          Capítulo Carvalho Neves Nº 500
                        </span>
                      </div>
                    )}

                    {/* Linha de acabamento em ouro no rodapé da imagem */}
                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#C59B3F]/70" />
                  </div>

                  {/* 2. Banner de Título Objetivo — Gradiente Institucional CN500 */}
                  <div className="bg-gradient-to-r from-[#052E1D] to-[#087443] px-5 py-3.5 border-b border-[#C59B3F]/30 pointer-events-none">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#D9AA45] block font-mono">
                      {category}
                    </span>
                    <h3 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-2 mt-0.5 uppercase tracking-tight">
                      {headline}
                    </h3>
                  </div>

                  {/* 3. Figcaption com Descrição Contextualizada (Data, Local, Liderança e Detalhes) */}
                  <figcaption className="p-5 sm:p-6 flex-1 flex flex-col justify-between bg-white space-y-4">
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed pointer-events-none">
                      No dia <strong className="text-gray-900 font-semibold">{formattedDate}</strong>
                      {item.location && (
                        <>
                          , no Templo da <strong className="text-gray-900 font-semibold">{item.location}</strong>
                        </>
                      )}
                      {item.mc_name && (
                        <>
                          , sob a condução do <strong className="text-gray-900 font-semibold">MC {item.mc_name}</strong>
                        </>
                      )}
                      . {item.description}
                    </p>

                    {/* Identificação Institucional da Gestão */}
                    {item.management && (
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 pointer-events-none">
                        <span className="truncate text-gray-600 font-medium">
                          Gestão: <strong className="text-gray-800">{item.management}</strong>
                        </span>
                      </div>
                    )}

                    {/* Ação: Ver publicação original (Instagram / Link específico) */}
                    {item.original_post_url && (
                      <div className="pt-2">
                        <a
                          href={item.original_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          tabIndex={isClone ? -1 : 0}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087443] hover:text-[#065F36] hover:underline transition-colors group/link cursor-pointer"
                        >
                          <span>Ver publicação original</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#C59B3F] group-hover/link:translate-x-0.5 transition-transform" />
                        </a>
                      </div>
                    )}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>

        {/* 4. Encerramento da Seção — Link Oficial "Ver mais atividades" (Referência Priorado 156) */}
        <div className="mt-12 sm:mt-16 text-center">
          <a
            href={OFFICIAL_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#087443] to-[#0A5C3A] hover:from-[#065F36] hover:to-[#087443] text-white font-semibold text-sm sm:text-base border border-[#C59B3F]/50 shadow-lg hover:shadow-[#087443]/30 transition-all active:scale-95 group cursor-pointer"
          >
            <InstagramIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#D9AA45] group-hover:scale-110 transition-transform" />
            <span>Ver mais atividades</span>
          </a>
          <p className="mt-2.5 text-xs text-emerald-200/60 font-sans">
            Acompanhe a cobertura em tempo real e o acervo fotográfico no Instagram oficial do Capítulo 500.
          </p>
        </div>
      </div>
    </section>
  );
}
