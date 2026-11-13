"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

export interface SeteVirtude {
  id: number;
  numeral: string;
  name: string;
  subtitle: string;
  description: string;
  reflexao: string;
  // Parâmetros geométricos no canvas SVG (viewBox 0 0 760 330)
  x: number;
  baseY: number;
  height: number;
}

export const SETE_VIRTUDES: SeteVirtude[] = [
  {
    id: 1,
    numeral: "I",
    name: "Amor Filial",
    subtitle: "Primeira Virtude Cardeal",
    description:
      "O amor, respeito e devoção aos pais, honrando aqueles que nos deram a vida, nos ampararam nos primeiros passos e nos ensinaram os primeiros princípios morais e espirituais.",
    reflexao:
      "Um jovem DeMolay recorda com gratidão o sacrifício e o afeto de seus pais, retribuindo com honra, lealdade e cuidado constante.",
    x: 95,
    baseY: 265,
    height: 75,
  },
  {
    id: 2,
    numeral: "II",
    name: "Reverência pelas Coisas Sagradas",
    subtitle: "Segunda Virtude Cardeal",
    description:
      "O respeito sincero à crença religiosa alheia e a fé inabalável em Deus (o Pai Celestial), reconhecendo e reverenciando tudo aquilo que é sagrado na vida e na humanidade.",
    reflexao:
      "A tolerância religiosa e a devoção espiritual formam o alicerce do caráter de quem busca a verdade e o bem supremo.",
    x: 190,
    baseY: 240,
    height: 85,
  },
  {
    id: 3,
    numeral: "III",
    name: "Cortesia",
    subtitle: "Terceira Virtude Cardeal",
    description:
      "A nobreza de espírito, a gentileza de palavras e a polidez nas atitudes cotidianas, tratando cada semelhante com dignidade, paciência e consideração fraterna.",
    reflexao:
      "A verdadeira cortesia não é mero protocolo, mas a expressão viva de um coração generoso que honra o próximo sem distinção.",
    x: 285,
    baseY: 215,
    height: 95,
  },
  {
    id: 4,
    numeral: "IV",
    name: "Companheirismo",
    subtitle: "Quarta Virtude Cardeal • Ápice do Arco",
    description:
      "A verdadeira fraternidade que une os irmãos na alegria e na adversidade, edificando laços indissolúveis de amizade, lealdade e mútua confiança.",
    reflexao:
      "O companheirismo é a argamassa que une todas as virtudes: o jovem DeMolay torna-se guardião e defensor de seu irmão onde quer que ele esteja.",
    x: 380,
    baseY: 195,
    height: 110,
  },
  {
    id: 5,
    numeral: "V",
    name: "Fidelidade",
    subtitle: "Quinta Virtude Cardeal",
    description:
      "A lealdade inegociável aos compromissos assumidos, aos nobres ideais da Ordem e à confiança depositada pela família, amigos e irmãos capitulares.",
    reflexao:
      "Permanecer fiel mesmo diante das tentações ou adversidades é a maior prova de integridade e nobreza de um líder.",
    x: 475,
    baseY: 215,
    height: 95,
  },
  {
    id: 6,
    numeral: "VI",
    name: "Pureza",
    subtitle: "Sexta Virtude Cardeal",
    description:
      "A integridade moral e de caráter manifestada em pensamentos puros, palavras dignas e conduta irrepreensível perante a sociedade e a família.",
    reflexao:
      "Manter o corpo, a mente e o coração imaculados de atos vis garante uma consciência límpida e uma vida respeitada por todos.",
    x: 570,
    baseY: 240,
    height: 85,
  },
  {
    id: 7,
    numeral: "VII",
    name: "Patriotismo",
    subtitle: "Sétima Virtude Cardeal",
    description:
      "O amor devotado à pátria, o respeito às leis, à bandeira e às instituições democráticas, e o compromisso ativo de exercer a cidadania com honra e retidão.",
    reflexao:
      "Servir ao bem comum da sociedade e honrar a terra onde nascemos é dever cívico e moral de todo DeMolay.",
    x: 665,
    baseY: 265,
    height: 75,
  },
];

export function SeteVirtudes() {
  const [selectedVirtueIndex, setSelectedVirtueIndex] = useState<number>(3); // Vela IV (Companheirismo) no centro por padrão
  const [hoveredVirtueIndex, setHoveredVirtueIndex] = useState<number | null>(null);

  const activeIndex = hoveredVirtueIndex !== null ? hoveredVirtueIndex : selectedVirtueIndex;
  const activeVirtue = SETE_VIRTUDES[activeIndex];

  const handlePrevious = useCallback(() => {
    setSelectedVirtueIndex((prev) => (prev > 0 ? prev - 1 : SETE_VIRTUDES.length - 1));
  }, []);

  const handleNext = useCallback(() => {
    setSelectedVirtueIndex((prev) => (prev < SETE_VIRTUDES.length - 1 ? prev + 1 : 0));
  }, []);

  // Navegação por teclado acessível
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key >= "1" && e.key <= "7") {
        e.preventDefault();
        setSelectedVirtueIndex(parseInt(e.key, 10) - 1);
      }
    },
    [handlePrevious, handleNext]
  );

  return (
    <section
      id="virtudes"
      className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#052E1D] text-white border-y border-white/10 overflow-hidden relative"
      aria-labelledby="virtudes-heading"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Luz ambiente suave de fundo cerimonial */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[320px] rounded-full bg-[radial-gradient(circle,rgba(197,155,63,0.08)_0%,transparent_70%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Cabeçalho Institucional Solene */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-[#C59B3F]/30 text-xs font-semibold text-[#C59B3F] uppercase tracking-wider mb-3.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B3F]" />
            <span>Pilares Fundamentais da Ordem DeMolay</span>
          </div>
          <h2
            id="virtudes-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4"
          >
            As Sete Virtudes Cardeais
          </h2>
          <div className="w-20 h-1 bg-[#C59B3F] mx-auto rounded-full mb-4" />
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed font-light">
            Sete luzes sagradas iluminam a jornada de um DeMolay. Dispostas em semicírculo perfeito,
            simbolizam os preceitos morais e cívicos vivenciados no Capítulo Carvalho Neves Nº 500.
          </p>
        </div>

        {/* ======================================================== */}
        {/* COMPOSIÇÃO DIGITAL: AS 7 VELAS VERMELHAS EM MEIA-LUA     */}
        {/* ======================================================== */}
        <div className="relative mx-auto max-w-3xl mb-4 sm:mb-6">
          <svg
            viewBox="50 15 660 305"
            className="w-full h-auto select-none overflow-visible"
            aria-label="Composição cerimonial das Sete Velas Vermelhas em formato de meia-lua"
            role="tablist"
          >
            <defs>
              {/* Degradê cilíndrico de cera vermelha solene */}
              <linearGradient id="cera-vermelha" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7F1D1D" />
                <stop offset="20%" stopColor="#DC2626" />
                <stop offset="60%" stopColor="#991B1B" />
                <stop offset="100%" stopColor="#450A0A" />
              </linearGradient>

              {/* Degradê superior da cera derretida */}
              <linearGradient id="cera-topo" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#991B1B" />
                <stop offset="100%" stopColor="#450A0A" />
              </linearGradient>

              {/* Chama exterior dourada nobre */}
              <radialGradient id="chama-dourada" cx="50%" cy="65%" r="55%">
                <stop offset="0%" stopColor="#FFFDF0" />
                <stop offset="25%" stopColor="#FEF08A" />
                <stop offset="55%" stopColor="#FBBF24" />
                <stop offset="85%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#C59B3F" />
              </radialGradient>

              {/* Halo quente suave ao redor da chama acesa */}
              <radialGradient id="halo-quente" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(245, 158, 11, 0.5)" />
                <stop offset="50%" stopColor="rgba(197, 155, 63, 0.2)" />
                <stop offset="100%" stopColor="rgba(197, 155, 63, 0)" />
              </radialGradient>
            </defs>

            {/* Linha de base cerimonial sutil acompanhando a curvatura do semicírculo */}
            <path
              d="M 60 270 Q 380 205 700 270"
              fill="none"
              stroke="rgba(197, 155, 63, 0.2)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {/* Renderização das 7 Velas Vermelhas com Rótulos Canônicos */}
            {SETE_VIRTUDES.map((virtue, index) => {
              const isSelected = selectedVirtueIndex === index;
              const isHovered = hoveredVirtueIndex === index;
              const isActive = isSelected || isHovered;
              const isCenter = index === 3;
              const candleWidth = 25;
              const x = virtue.x;
              const baseY = virtue.baseY;
              const topY = baseY - virtue.height;
              const flameApexY = topY - 32;

              return (
                <g
                  key={virtue.id}
                  role="tab"
                  tabIndex={0}
                  aria-selected={isSelected}
                  aria-controls="virtude-painel"
                  id={`tab-virtude-${virtue.id}`}
                  onClick={() => {
                    setSelectedVirtueIndex(index);
                    setHoveredVirtueIndex(null);
                  }}
                  onTouchStart={() => {
                    setSelectedVirtueIndex(index);
                    setHoveredVirtueIndex(null);
                  }}
                  onMouseEnter={() => setHoveredVirtueIndex(index)}
                  onMouseLeave={() => setHoveredVirtueIndex(null)}
                  onFocus={() => setHoveredVirtueIndex(index)}
                  onBlur={() => setHoveredVirtueIndex(null)}
                  className="cursor-pointer outline-none group"
                  style={{ transformOrigin: `${x}px ${baseY}px` }}
                >
                  {/* Sombra de contato na base */}
                  <ellipse
                    cx={x}
                    cy={baseY + 4}
                    rx="16"
                    ry="4"
                    fill="rgba(0, 0, 0, 0.6)"
                  />

                  {/* Anel de seleção dourado na base */}
                  {isActive && (
                    <ellipse
                      cx={x}
                      cy={baseY + 2}
                      rx="18"
                      ry="5"
                      fill="none"
                      stroke="#C59B3F"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Halo de luz quente suave ao redor da chama acesa */}
                  <circle
                    cx={x}
                    cy={topY - 14}
                    r={isActive ? 38 : 22}
                    fill="url(#halo-quente)"
                    className="transition-all duration-300 pointer-events-none"
                    opacity={isActive ? 1 : 0.6}
                  />

                  {/* Corpo da Vela Vermelha */}
                  <rect
                    x={x - candleWidth / 2}
                    y={topY}
                    width={candleWidth}
                    height={virtue.height}
                    rx="3.5"
                    fill="url(#cera-vermelha)"
                    stroke={isActive ? "#C59B3F" : "rgba(0,0,0,0.3)"}
                    strokeWidth={isActive ? "1.5" : "0.75"}
                  />

                  {/* Topo côncavo da vela (cera derretida) */}
                  <ellipse
                    cx={x}
                    cy={topY}
                    rx={candleWidth / 2}
                    ry="3.5"
                    fill="url(#cera-topo)"
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="0.5"
                  />

                  {/* Pavio */}
                  <line
                    x1={x}
                    y1={topY}
                    x2={x}
                    y2={topY - 6}
                    stroke="#1F2937"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />

                  {/* Chama Acesa Dourada */}
                  <g
                    className="transition-transform duration-200"
                    style={{
                      transformOrigin: `${x}px ${topY - 6}px`,
                      transform: isActive ? "scale(1.18)" : "scale(1)",
                    }}
                  >
                    {/* Base azulada suave */}
                    <ellipse
                      cx={x}
                      cy={topY - 6}
                      rx="2.5"
                      ry="1.5"
                      fill="rgba(147, 197, 253, 0.45)"
                    />

                    {/* Chama Exterior Dourada */}
                    <path
                      d={`M ${x} ${flameApexY}
                          C ${x + 8} ${topY - 18}, ${x + 7} ${topY - 7}, ${x} ${topY - 6}
                          C ${x - 7} ${topY - 7}, ${x - 8} ${topY - 18}, ${x} ${flameApexY} Z`}
                      fill="url(#chama-dourada)"
                    />

                    {/* Núcleo Incandescente Luminoso */}
                    <path
                      d={`M ${x} ${flameApexY + 8}
                          C ${x + 4} ${topY - 16}, ${x + 3} ${topY - 7}, ${x} ${topY - 6}
                          C ${x - 3} ${topY - 7}, ${x - 4} ${topY - 16}, ${x} ${flameApexY + 8} Z`}
                      fill="#FFFDF0"
                    />
                  </g>

                  {/* Identificador Romano no Fuste da Vela */}
                  <text
                    x={x}
                    y={baseY - 12}
                    textAnchor="middle"
                    fill={isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.85)"}
                    fontSize="11.5"
                    fontWeight="700"
                    fontFamily="monospace"
                    className="pointer-events-none select-none transition-colors"
                  >
                    {virtue.numeral}
                  </text>

                  {/* Indicador de Ápice para Vela IV */}
                  {isCenter && (
                    <text
                      x={x}
                      y={flameApexY - 10}
                      textAnchor="middle"
                      fill="#C59B3F"
                      fontSize="10"
                      fontWeight="700"
                      className="pointer-events-none uppercase tracking-wider font-mono"
                    >
                      ★ Ápice
                    </text>
                  )}

                  {/* NOME DA VIRTUDE INTEGRADO DIRETAMENTE À COMPOSIÇÃO DE MEIA-LUA */}
                  {virtue.id === 2 ? (
                    <text
                      x={x}
                      y={baseY + 16}
                      textAnchor="middle"
                      fill={isActive ? "#FFFFFF" : "rgba(229, 236, 232, 0.85)"}
                      fontSize="10.5"
                      fontWeight={isActive ? "700" : "600"}
                      className="pointer-events-none select-none transition-colors"
                    >
                      <tspan x={x} dy="0">Reverência pelas</tspan>
                      <tspan x={x} dy="12">Coisas Sagradas</tspan>
                    </text>
                  ) : (
                    <text
                      x={x}
                      y={baseY + 18}
                      textAnchor="middle"
                      fill={isActive ? "#FFFFFF" : "rgba(229, 236, 232, 0.85)"}
                      fontSize={isCenter ? "11.5" : "11"}
                      fontWeight={isActive ? "700" : "600"}
                      className="pointer-events-none select-none transition-colors"
                    >
                      {virtue.name}
                    </text>
                  )}

                  {/* Marcador tátil ativo sob o nome */}
                  {isActive && (
                    <circle
                      cx={x}
                      cy={virtue.id === 2 ? baseY + 34 : baseY + 28}
                      r="2.5"
                      fill="#C59B3F"
                    />
                  )}

                  {/* Alvo tátil generoso para toque e hover perfeitos */}
                  <rect
                    x={x - 38}
                    y={flameApexY - 20}
                    width="76"
                    height={virtue.height + 65}
                    fill="transparent"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dica tátil/interativa suave */}
        <p className="text-center text-xs text-[#C59B3F] font-semibold tracking-wide mb-3 sm:mb-4 px-2">
          Passe o cursor ou toque em uma vela para conhecer seu significado
        </p>

        {/* Seletor Rápido Canônico das 7 Virtudes (Otimização Mobile / Touch) */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6 px-2 overflow-x-auto no-scrollbar">
          {SETE_VIRTUDES.map((v, i) => {
            const isCurr = selectedVirtueIndex === i;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVirtueIndex(i)}
                className={`min-w-[38px] h-9 sm:min-w-[42px] sm:h-10 px-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                  isCurr
                    ? "bg-[#C59B3F] text-[#06140D] shadow-md ring-2 ring-[#C59B3F]/50 scale-105"
                    : "bg-white/5 text-emerald-100/80 hover:bg-white/10 hover:text-white border border-white/10 active:scale-95"
                }`}
                title={v.name}
                aria-label={`Selecionar virtude ${v.numeral}: ${v.name}`}
              >
                <span>{v.numeral}</span>
                {i === 3 && <span className="text-[10px]">★</span>}
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* PAINEL EDITORIAL DE EXPLICAÇÃO DA VIRTUDE SELECIONADA    */}
        {/* ======================================================== */}
        <div
          id="virtude-painel"
          role="tabpanel"
          aria-labelledby={`tab-virtude-${activeVirtue.id}`}
          className="relative max-w-3xl mx-auto rounded-2xl bg-[#062015] border border-[#C59B3F]/30 p-5 sm:p-8 shadow-xl transition-all duration-300"
        >
          {/* Fio decorativo de topo em ouro heráldico */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-[#C59B3F] to-transparent" />

          {/* Cabeçalho da Virtude Selecionada */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between border-b border-white/10 pb-4 mb-5 gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-[#C59B3F] font-mono font-semibold block mb-1">
                {activeVirtue.subtitle}
              </span>
              <h3 className="text-xl sm:text-3xl font-semibold text-white tracking-tight">
                {activeVirtue.numeral}. {activeVirtue.name}
              </h3>
            </div>
            <span className="text-xs text-emerald-200/70 font-mono">
              Virtude {activeVirtue.id} de 7
            </span>
          </div>

          {/* Descrição Canônica SCDB */}
          <div className="space-y-4">
            <p className="text-sm sm:text-base lg:text-lg text-emerald-100 leading-relaxed font-light">
              &ldquo;{activeVirtue.description}&rdquo;
            </p>
            <p className="text-xs sm:text-sm text-emerald-200/80 italic border-l-2 border-[#C59B3F]/60 pl-3 leading-relaxed">
              {activeVirtue.reflexao}
            </p>
          </div>

          {/* Navegação Entre Virtudes */}
          <div className="mt-6 sm:mt-8 pt-5 border-t border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-emerald-100 hover:text-white bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 transition-colors cursor-pointer min-h-[44px] flex-1 sm:flex-initial"
            >
              <ChevronLeft className="w-4 h-4 text-[#C59B3F]" />
              <span>Anterior</span>
            </button>

            <span className="text-[11px] text-emerald-200/50 hidden sm:inline font-mono">
              Navegue pelas setas ← e → do teclado ou tocando nas velas
            </span>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-emerald-100 hover:text-white bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 transition-colors cursor-pointer min-h-[44px] flex-1 sm:flex-initial"
            >
              <span>Próxima</span>
              <ChevronRight className="w-4 h-4 text-[#C59B3F]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
