"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  ExternalLink,
  ArrowRight,
  CalendarCheck,
} from "lucide-react";
import { HISTORICAL_MEETINGS } from "@/lib/data/historicalMeetings";

export interface DashboardActivity {
  id: string;
  title: string;
  starts_at: string;
  location?: string | null;
  description: string;
  photo_url?: string | null;
  mc_name?: string | null;
  management?: string | null;
  status?: "publicado" | "rascunho" | "arquivado" | string;
  original_post_url?: string | null;
}

// 18 registros autênticos fundamentais do Capítulo 500 ordenados por data decrescente
const AUTHENTIC_ACTIVITIES: DashboardActivity[] = [...HISTORICAL_MEETINGS].sort(
  (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
);

const SET_COUNT = 3; // 0 = buffer anterior, 1 = conjunto central autêntico, 2 = buffer posterior

export interface LoopSlideItem {
  key: string;
  item: DashboardActivity;
  setIndex: number;
  isClone: boolean;
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

function InstagramIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
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

export function RecentActivitiesCarousel() {
  // Inicialização imediata com os 18 registros autênticos históricos para renderização instantânea
  const [activitiesList, setActivitiesList] = useState<DashboardActivity[]>(AUTHENTIC_ACTIVITIES);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Controle de arrasto com mouse
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isDraggingRef = useRef(false);
  const mouseStartXRef = useRef(0);
  const mouseStartScrollLeftRef = useRef(0);

  // Controle de medição e normalização imperceptível do loop infinito
  const oneSetWidthRef = useRef(0);
  const cardStepRef = useRef(0);
  const isNormalizingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetScrollLeftRef = useRef<number | null>(null);

  // Carregamento dinâmico de publicações ativas do PostgreSQL CMS (/api/activities)
  useEffect(() => {
    let isMounted = true;
    async function loadRecent() {
      try {
        const res = await fetch("/api/activities?limit=24");
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.items || [];
          if (items.length > 0 && isMounted) {
            // Mescla sem duplicar com a base histórica autêntica
            const seen = new Set<string>();
            const merged: DashboardActivity[] = [];

            for (const it of items) {
              if (!seen.has(it.id)) {
                seen.add(it.id);
                merged.push(it);
              }
            }

            for (const h of AUTHENTIC_ACTIVITIES) {
              if (!seen.has(h.id)) {
                seen.add(h.id);
                merged.push(h);
              }
            }

            merged.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
            setActivitiesList(merged);
          }
        }
      } catch (err) {
        console.warn("Aviso ao sincronizar atividades do CMS:", err);
      }
    }

    loadRecent();
    return () => {
      isMounted = false;
    };
  }, []);

  // Buffer de 3 conjuntos para suportar navegação contínua em loop infinito
  const slides = useMemo<LoopSlideItem[]>(() => {
    const list = activitiesList.length > 0 ? activitiesList : AUTHENTIC_ACTIVITIES;
    const dynamicLoop: LoopSlideItem[] = [];
    for (let s = 0; s < SET_COUNT; s++) {
      list.forEach((activity, idx) => {
        dynamicLoop.push({
          key: `set-${s}-${activity.id}-${idx}`,
          item: activity,
          setIndex: s,
          isClone: s !== 1, // Apenas conjunto 1 (central) é exposto a tecnologias assistivas
        });
      });
    }
    return dynamicLoop;
  }, [activitiesList]);

  // Mede largura de um conjunto completo de slides e o passo de cada card
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

  // Reposicionamento silencioso e imperceptível nas extremidades dos buffers
  const normalizeLoopPosition = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || isDraggingRef.current || isNormalizingRef.current) return;

    const setWidth = oneSetWidthRef.current;
    if (setWidth <= 0) return;

    const scrollLeft = el.scrollLeft;

    // Buffer direito ultrapassado -> teleporta suavemente para o conjunto central
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
    // Buffer esquerdo ultrapassado -> avança silenciosamente para o conjunto central
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

  // Posiciona inicialmente o scroll no conjunto central (set 1)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const timer = setTimeout(() => {
      measureDimensions();
      if (el && oneSetWidthRef.current > 0) {
        el.style.scrollBehavior = "auto";
        el.scrollLeft = oneSetWidthRef.current;
        el.style.scrollBehavior = "";
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [measureDimensions, activitiesList]);

  // Listeners de scroll, scrollend e redimensionamento
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (isNormalizingRef.current) return;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
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

  // Navegação horizontal em loop por setas (loop infinito bidirecional)
  const scrollByDirection = useCallback((direction: -1 | 1) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    measureDimensions();
    const step = cardStepRef.current > 0 ? cardStepRef.current : (el.clientWidth > 768 ? 360 : 310);
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  }, [measureDimensions, normalizeLoopPosition]);

  // Autoplay do carrossel com pausa automática em interação e respeito a prefers-reduced-motion
  useEffect(() => {
    if (isPaused || isMouseDown || activitiesList.length === 0) return;

    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      if (!isDraggingRef.current && !isNormalizingRef.current) {
        scrollByDirection(1);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, isMouseDown, activitiesList.length, scrollByDirection]);

  // Suporte completo a arrasto por mouse (Mouse Drag)
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
    normalizeLoopPosition();
  };

  return (
    <section className="space-y-4" aria-label="Atividades Recentes do Capítulo">
      {/* Topo da Seção com Título e Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#D9AA45]" />
            <span>Atividades Recentes do Capítulo</span>
          </h2>
          <p className="text-xs text-emerald-200/70 mt-0.5">
            Últimas cerimônias, encontros e ações filantrópicas homologadas da liderança capitular.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Controles de Navegação Horizontal Contínua em Loop */}
          <div className="flex items-center gap-1.5 mr-2">
            <button
              type="button"
              onClick={() => scrollByDirection(-1)}
              className="w-8 h-8 rounded-lg bg-[#0C1D14] border border-white/15 text-emerald-200 hover:text-white hover:border-[#D9AA45] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              aria-label="Atividade anterior (loop infinito)"
              title="Voltar atividade (loop infinito)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByDirection(1)}
              className="w-8 h-8 rounded-lg bg-[#0C1D14] border border-white/15 text-emerald-200 hover:text-white hover:border-[#D9AA45] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              aria-label="Próxima atividade (loop infinito)"
              title="Avançar atividade (loop infinito)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Link Oficial "Ver todas as atividades" direcionando para /dashboard/atividades */}
          <Link
            href="/dashboard/atividades"
            className="btn-heraldico-esmeralda px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 group shadow-sm"
          >
            <span>Ver todas as atividades</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#D9AA45] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Trilho Horizontal com Carrossel em Loop Infinito Contínuo */}
      <div className="relative -mx-2 px-2">
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={() => {
            setIsPaused(false);
            handleMouseUpOrLeave();
          }}
          onMouseEnter={() => setIsPaused(true)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
          className={`flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory select-none ${
            isMouseDown ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          tabIndex={0}
          aria-roledescription="carrossel"
          aria-label="Atividades Recentes do Capítulo"
        >
          {slides.map((slide) => {
            const { item, isClone, key } = slide;
            const { category, headline } = parseActivityTitle(item.title);
            const civilDate = formatCivilDate(item.starts_at);

            return (
              <article
                key={key}
                aria-hidden={isClone ? "true" : undefined}
                className="min-w-[290px] max-w-[310px] sm:min-w-[320px] sm:max-w-[340px] flex-shrink-0 snap-start card-heraldico-dark rounded-xl overflow-hidden border border-white/10 hover:border-[#D9AA45]/50 transition-all flex flex-col justify-between group shadow-lg"
              >
                {/* Imagem de Capa com Fallback Heráldico */}
                <div className="relative w-full h-44 bg-[#08140E] overflow-hidden border-b border-white/5">
                  {item.photo_url ? (
                    <Image
                      src={item.photo_url}
                      alt={headline || item.title}
                      fill
                      sizes="(max-width: 640px) 300px, 340px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                      draggable={false}
                      tabIndex={isClone ? -1 : undefined}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#0B1F16] to-[#08140E] pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-[#D9AA45]/30 flex items-center justify-center mb-2 shadow-inner">
                        <Shield className="w-7 h-7 text-[#D9AA45]" />
                      </div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-200/60 font-semibold">
                        Registro Capitular Nº 500
                      </span>
                    </div>
                  )}

                  {/* Badge de Categoria */}
                  <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                    <span className="selo-vidro-cn px-2.5 py-1 rounded-md text-[10px] font-bold text-white tracking-wider uppercase font-mono shadow-md backdrop-blur-md">
                      {category}
                    </span>
                  </div>

                  {/* Linha de acabamento em ouro */}
                  <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#C59B3F]/70" />
                </div>

                {/* Informações Editoriais */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2 pointer-events-none">
                    <time
                      dateTime={item.starts_at}
                      className="text-[11px] font-mono text-[#D9AA45] font-semibold block uppercase tracking-wider"
                    >
                      {civilDate}
                    </time>
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">
                      {headline}
                    </h3>
                    <p className="text-xs text-emerald-200/70 font-light leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2 text-[11px]">
                    {/* Gestão e Mestre Conselheiro */}
                    <div className="flex items-center justify-between text-emerald-200/80 font-mono pointer-events-none">
                      <span className="truncate max-w-[150px]">
                        {item.management || "Capítulo nº 500"}
                      </span>
                      <span className="text-[#D9AA45] font-semibold truncate max-w-[140px] text-right">
                        MC {item.mc_name ? item.mc_name.split(" ")[0] + " " + (item.mc_name.split(" ").slice(-1)[0] || "") : "Oficial"}
                      </span>
                    </div>

                    {/* Link de Publicação Original ou Detalhes */}
                    {item.original_post_url ? (
                      <a
                        href={item.original_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={isClone ? -1 : 0}
                        onClick={(e) => {
                          if (isDraggingRef.current) e.preventDefault();
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-[#D9AA45] hover:text-amber-300 font-semibold transition-colors pt-1 cursor-pointer"
                      >
                        <InstagramIcon className="w-3.5 h-3.5" />
                        <span>Ver publicação original</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>
                    ) : (
                      <Link
                        href="/dashboard/atividades"
                        tabIndex={isClone ? -1 : 0}
                        onClick={(e) => {
                          if (isDraggingRef.current) e.preventDefault();
                        }}
                        className="inline-flex items-center gap-1 text-xs text-emerald-300/80 hover:text-white transition-colors pt-1 cursor-pointer"
                      >
                        <span>Ver detalhes no acervo</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
