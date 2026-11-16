"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ContactForm } from "@/components/site/ContactForm";
import { SeteVirtudes } from "@/components/site/SeteVirtudes";
import { EncontrosAtividades } from "@/components/site/EncontrosAtividades";
import { AniversariantesSecao } from "@/components/site/AniversariantesSecao";
import Image from "next/image";
import { 
  ShieldCheck, 
  ArrowRight,
  BookOpen,
  Lock,
  Mail,
  MapPin,
  Crown
} from "lucide-react";
import Link from "next/link";

function DivisorHeraldico() {
  return (
    <div className="divisor-heraldico" aria-hidden="true">
      <div className="divisor-heraldico-icone">
        <svg className="w-4 h-4 text-[#C59B3F]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
        </svg>
      </div>
    </div>
  );
}

// Marcos Históricos (Adaptação dos marcos e linha do tempo do Capítulo 500)
const marcosHistoricos = [
  {
    ano: "2012",
    titulo: "Fundação e Instalação do Capítulo",
    descricao: "Instalação solene em Teresina - PI, instituindo os ideais de Jacques DeMolay e a formação de lideranças juvenis no Estado do Piauí.",
    tipo: "Marco Fundacional"
  },
  {
    ano: "2014",
    titulo: "Aliança das 4 Lojas Patrocinadoras",
    descricao: "Consolidação do apoio maçônico integrado pelas respeitáveis lojas Abolição nº 4199, Adonhiran nº 2782, Caridade II nº 135 (GOB-PI) e Mansur nº 4591.",
    tipo: "Aliança Maçônica"
  },
  {
    ano: "2018–2024",
    titulo: "Maturidade & Mais de 20 Gestões",
    descricao: "Mais de duas décadas de liderança jovem ininterrupta, formando cidadãos exemplares, filantropos e expoentes na comunidade teresinense.",
    tipo: "Tradição Ininterrupta"
  },
  {
    ano: "2026/2027",
    titulo: "Gestão XXV, XXVI & Era Digital",
    descricao: "Implantação do Sistema Integrado de Gestão Capitular, com transparência financeira, acervo digital e modernização institucional.",
    tipo: "Modernização & Futuro"
  }
];

export default function Home() {
  const [gestoesPhotos, setGestoesPhotos] = useState<Record<string, { photo_url: string; member_name: string }>>({
    "2026.1": { photo_url: "/gestoes/jose-keltton.2026.1.jpg", member_name: "José Keltton da Silva Cardoso Viana" },
    "2026.2": { photo_url: "/gestoes/rafael-inacio.2026.2.jpg", member_name: "Rafael Inácio do Nascimento de Morais" },
    "2027.1": { photo_url: "", member_name: "A definir" },
  });

  useEffect(() => {
    let isMounted = true;
    async function loadMCPhotos() {
      try {
        const res = await fetch("/api/mc-photos");
        if (res.ok) {
          const data = await res.json();
          if (data?.items && Array.isArray(data.items) && isMounted) {
            const map: Record<string, { photo_url: string; member_name: string }> = {};
            data.items.forEach((p: { management_code: string; photo_url: string; member_name: string }) => {
              if (p.management_code && p.photo_url) {
                map[p.management_code] = { photo_url: p.photo_url, member_name: p.member_name || "" };
              }
            });
            setGestoesPhotos((prev) => ({ ...prev, ...map }));
          }
        }
      } catch (err) {
        console.warn("Aviso ao carregar fotos de MC na Home:", err);
      }
    }
    loadMCPhotos();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-gray-900 selection:bg-[#C59B3F] selection:text-[#06140D]">
      <Header />

      <main className="flex-1">
        {/* ======================================================== */}
        {/* HERO SECTION COM BRASÃO OFICIAL (HERÁLDICO & SÓBRIO)     */}
        {/* ======================================================== */}
        <section className="relative bg-[#052E1D] text-white py-14 sm:py-24 lg:py-28 px-3 sm:px-6 lg:px-8 overflow-hidden text-center">
          <div className="relative z-10 mx-auto max-w-4xl">
            {/* BRASÃO OFICIAL HERÁLDICO DO CN */}
            <div className="flex flex-col items-center mb-5 sm:mb-6">
              <div className="brasao-shimmer-container w-20 h-20 sm:w-28 sm:h-28 rounded-2xl p-1 bg-[#087443] border border-[#C59B3F]/50 flex items-center justify-center shadow-lg">
                <div className="w-full h-full rounded-[14px] bg-[#052E1D] border border-[#C59B3F]/40 flex flex-col items-center justify-center text-center p-1.5 sm:p-2 relative">
                  <ShieldCheck className="w-8 h-8 sm:w-12 sm:h-12 text-[#C59B3F]" />
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#C59B3F] mt-0.5 sm:mt-1 font-mono">
                    CN Nº 500
                  </span>
                  <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-emerald-200/90 font-medium">
                    Teresina • PI
                  </span>
                </div>
              </div>
            </div>

            {/* SELO INSTITUCIONAL HERÁLDICO */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/[0.08] border border-white/15 text-[10px] sm:text-xs font-semibold text-[#C59B3F] tracking-wider mb-5 sm:mb-6 max-w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C59B3F] shrink-0" />
              <span>Fundado em 2012</span>
              <span className="text-white/40">•</span>
              <span>Ordem DeMolay</span>
              <span className="text-white/40 hidden xs:inline">•</span>
              <span className="hidden xs:inline">Teresina - PI</span>
            </div>

            <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-4 sm:mb-6 leading-tight">
              Capítulo Professor <br />
              <span className="text-[#C59B3F]">Carvalho Neves Nº 500</span>
            </h1>

            <p className="text-sm sm:text-lg lg:text-xl text-emerald-100/90 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-light px-2">
              Formando líderes conscientes, íntegros e fraternos através dos ensinamentos e virtudes da Ordem DeMolay.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
              <a
                href="#historia"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl bg-white text-[#052E1D] font-semibold text-sm hover:bg-emerald-50 transition-colors shadow-sm cursor-pointer min-h-[46px]"
              >
                <BookOpen className="w-4 h-4 text-[#087443]" />
                <span>Conheça Nossa História</span>
              </a>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl bg-[#087443] text-white font-semibold text-sm hover:bg-[#065F36] border border-[#C59B3F]/40 transition-colors shadow-sm cursor-pointer min-h-[46px]"
              >
                <Lock className="w-4 h-4 text-[#C59B3F]" />
                <span>Acessar Área Restrita</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* COMPOSIÇÃO: AS SETE VIRTUDES (REFORMULADA COM HARMONIA)  */}
        {/* ======================================================== */}
        <SeteVirtudes />

        {/* ======================================================== */}
        {/* HISTÓRIA E PATRONO                                       */}
        {/* ======================================================== */}
        <section id="historia" className="py-20 bg-white border-b border-gray-200/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
              Memória & Tradição
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
              O Patrono Professor Carvalho Neves
            </h2>
            <DivisorHeraldico />
            <p className="mt-4 text-base text-gray-700 leading-relaxed text-left sm:text-justify">
              O <strong>Capítulo Professor Carvalho Neves Nº 500</strong> honra a memória e o legado educacional, cívico e moral de seu patrono. Atuando na cidade de <strong>Teresina</strong>, Piauí, desde sua fundação em 2012, o Capítulo tem sido um polo vivo de aperfeiçoamento da juventude e de serviço à sociedade local, patrocinado e apoiado pelas respeitáveis lojas maçônicas de nossa jurisdição.
            </p>
            <div className="mt-8 flex justify-center">
              <a
                href="#marcos"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#087443] hover:text-[#065F36] transition-colors cursor-pointer"
              >
                <span>Conheça a linha de tradição e marcos históricos</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* LINHA DO TEMPO CAPITULAR (MARCOS HISTÓRICOS)             */}
        {/* ======================================================== */}
        <section id="marcos" className="py-20 bg-[#F8FAF8] border-b border-gray-200/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
                Evolução & Legado
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
                Linha de Tradição e Marcos Históricos
              </h2>
              <DivisorHeraldico />
              <p className="mt-2 text-base text-gray-600 leading-relaxed max-w-2xl mx-auto">
                A trajetória do Capítulo Professor Carvalho Neves Nº 500 desde sua sagração em solo piauiense até a era da consolidação institucional.
              </p>
            </div>

            {/* TIMELINE CONTAINER */}
            <div className="relative pl-12 md:pl-0">
              <div className="timeline-linha-cn" />

              <div className="space-y-8 sm:space-y-10">
                {marcosHistoricos.map((m, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <div
                      key={idx}
                      className={`relative flex flex-col md:flex-row items-start md:items-center ${
                        isEven ? "md:flex-row-reverse" : ""
                      }`}
                    >
                      <div className="absolute left-[-32px] md:left-1/2 md:-translate-x-1/2 top-5 md:top-auto flex items-center justify-center">
                        <div className="timeline-ponto-cn" />
                      </div>

                      <div className="w-full md:w-[calc(50%-2rem)]">
                        <div className="card-heraldico rounded-2xl p-5 sm:p-6 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                            <span className="px-2.5 py-0.5 rounded text-xs font-bold tracking-wider badge-heraldico-dourado font-mono">
                              {m.ano}
                            </span>
                            <span className="text-[11px] font-semibold text-[#087443] uppercase tracking-wider">
                              {m.tipo}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-gray-900 mt-1 mb-2">
                            {m.titulo}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                            {m.descricao}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* GESTÕES EM DESTAQUE (FOTOGRAFIAS E NOMINATA PRESERVADAS) */}
        {/* ======================================================== */}
        <section id="gestoes" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
              Liderança e Continuidade
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
              Galeria de Gestões
            </h2>
            <DivisorHeraldico />
            <p className="mt-2 text-base text-gray-600 leading-relaxed">
              Mais de 25 gestões dedicadas ao crescimento contínuo do Capítulo Nº 500.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* GESTÃO XXIV — Past MC */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm hover:shadow-md transition-all flex flex-col group">
              <div className="relative w-full aspect-[4/3] bg-[#052E1D] flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-300/30 z-0">
                  <Crown className="w-10 h-10 mb-1" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#C59B3F]/50">Foto Oficial</span>
                </div>
                <Image
                  src={gestoesPhotos["2026.1"]?.photo_url || "/gestoes/jose-keltton.2026.1.jpg"}
                  alt="Foto oficial de José Keltton Cardoso da Silva Viana"
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover z-[1]"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <span className="absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white backdrop-blur-md font-mono">
                  XXIV
                </span>
                <span className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-emerald-100 border border-white/10 font-mono">
                  2026.1
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#087443]">Gestão XXIV</span>
                  <h4 className="font-bold text-gray-900 text-base mt-1">
                    MC {gestoesPhotos["2026.1"]?.member_name || "José Keltton Cardoso da Silva Viana"}
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">Past MC</p>
                </div>
              </div>
            </div>

            {/* GESTÃO XXV — MC EM EXERCÍCIO (DESTAQUE) */}
            <div className="bg-white rounded-2xl overflow-hidden border-2 border-[#C59B3F] shadow-md hover:shadow-lg transition-all flex flex-col group">
              <div className="relative w-full aspect-[4/3] bg-[#052E1D] flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-300/30 z-0">
                  <Crown className="w-10 h-10 mb-1 text-[#C59B3F]/60" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#C59B3F]/60">MC em Exercício</span>
                </div>
                <Image
                  src={gestoesPhotos["2026.2"]?.photo_url || "/gestoes/rafael-inacio.2026.2.jpg"}
                  alt="Foto oficial de Rafael Inácio do Nascimento de Morais"
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover z-[1]"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <span className="absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#C59B3F] text-[#06140D] font-mono">
                  XXV
                </span>
                <span className="absolute top-3 right-3 z-10 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C59B3F] text-[#06140D] flex items-center gap-1 font-mono">
                  ★ MC Atual • 2026.2
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-[#C59B3F]">Gestão XXV</span>
                  <h4 className="font-bold text-gray-900 text-base mt-1">
                    MC {gestoesPhotos["2026.2"]?.member_name || "Rafael Inácio do Nascimento de Morais"}
                  </h4>
                  <p className="text-xs text-[#087443] font-semibold">Mestre Conselheiro em Exercício</p>
                </div>
              </div>
            </div>

            {/* GESTÃO XXVI — PLANEJADA / EM DEFINIÇÃO */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm hover:shadow-md transition-all flex flex-col group">
              <div className="relative w-full aspect-[4/3] bg-[#052E1D] flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-300/30 z-0">
                  <Crown className="w-10 h-10 mb-1" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#C59B3F]/50">Gestão Futura</span>
                </div>
                {gestoesPhotos["2027.1"]?.photo_url && (
                  <Image
                    src={gestoesPhotos["2027.1"].photo_url}
                    alt="Foto oficial da Gestão XXVI"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover z-[1]"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <span className="absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white backdrop-blur-md font-mono">
                  XXVI
                </span>
                <span className="absolute top-3 right-3 z-10 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#087443]/90 text-white border border-white/20 font-mono">
                  Planejada • 2027.1
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#087443]">Gestão XXVI</span>
                  <h4 className="font-bold text-gray-900 text-base mt-1">
                    {gestoesPhotos["2027.1"]?.member_name && gestoesPhotos["2027.1"].member_name !== "A definir"
                      ? `MC ${gestoesPhotos["2027.1"].member_name}`
                      : "Aguardando confirmação oficial"}
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">Gestão Subsequente (2027.1)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 sm:mt-12 text-center">
            <Link
              href="/gestoes"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl bg-[#087443] hover:bg-[#065F36] text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all border border-[#C59B3F]/40 group cursor-pointer"
            >
              <span>Ver Galeria Completa de Mestres Conselheiros (Todas as Gestões)</span>
              <ArrowRight className="w-4 h-4 text-[#C59B3F]" />
            </Link>
          </div>
        </section>

        {/* ======================================================== */}
        {/* ATIVIDADES REALIZADAS (REFERÊNCIA PRIORADO 156)          */}
        {/* ======================================================== */}
        <EncontrosAtividades />

        {/* ======================================================== */}
        {/* ANIVERSARIANTES DO CAPÍTULO (FRATERNIDADE & CELEBRAÇÃO)  */}
        {/* ======================================================== */}
        <AniversariantesSecao />

        {/* ======================================================== */}
        {/* CONTATO                                                  */}
        {/* ======================================================== */}
        <section id="contato" className="py-16 sm:py-20 bg-white border-t border-gray-200/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
                Fale Conosco
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
                Canais de Contato
              </h2>
              <DivisorHeraldico />
              <p className="mt-2 text-base text-gray-600 leading-relaxed">
                Dúvidas sobre ingresso, parcerias institucionais ou mensagens à diretoria do Capítulo.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="space-y-4">
                <div className="bg-[#F8FAF8] p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-sm flex items-start gap-3.5 sm:gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#087443]/10 text-[#087443] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">Local das Sessões</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI), Teresina/PI — Brasil
                    </p>
                    <p className="text-[11px] text-[#087443] font-semibold mt-1">Aos Domingos, às 09:00</p>
                  </div>
                </div>

                <div className="bg-[#F8FAF8] p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-sm flex items-start gap-3.5 sm:gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#087443]/10 text-[#087443] flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-gray-900">E-mail Institucional</h4>
                    <p className="text-xs text-gray-600 mt-1 break-all sm:break-normal">
                      capitulo500@demolaybrasil.org.br
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">Retorno em até 48 horas úteis</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-[#F8FAF8] p-5 sm:p-8 rounded-2xl border border-gray-200/80 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-5 sm:mb-6">
                  Envie uma mensagem ao Mestre Conselheiro
                </h3>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* CTA ÁREA RESTRITA                                        */}
        {/* ======================================================== */}
        <section className="py-16 bg-[#052E1D] text-white text-center px-4 sm:px-6 lg:px-8 border-t border-white/10">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">
              Acesso Exclusivo para Membros do Capítulo
            </h3>
            <p className="text-emerald-100 text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed font-light">
              Consulte suas presenças em reuniões, emissão de comprovantes de mensalidade e documentos oficiais no Sistema Integrado de Gestão.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#C59B3F] text-[#06140D] font-bold text-sm hover:bg-[#D4AF37] transition-all shadow-md cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Entrar no Painel Administrativo</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
