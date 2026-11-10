"use client";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import Image from "next/image";
import { 
  Heart, 
  Sparkles, 
  Smile, 
  Users, 
  ShieldCheck, 
  Sun, 
  Flag,
  ArrowRight,
  BookOpen,
  Lock,
  Crown,
  Mail,
  MapPin,
  Send,
  Calendar,
  Compass,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

const virtues = [
  {
    name: "Amor Filial",
    description: "Amor e respeito profundo aos pais que nos deram a vida e nos ensinaram os primeiros passos.",
    icon: Heart,
  },
  {
    name: "Reverência pelas Coisas Sagradas",
    description: "Respeito sincero pela fé alheia e crença inabalável no Pai Celestial.",
    icon: Sparkles,
  },
  {
    name: "Cortesia",
    description: "A nobreza em palavras e ações, tratando todos com respeito, paciência e dignidade.",
    icon: Smile,
  },
  {
    name: "Companheirismo",
    description: "A verdadeira fraternidade que une os irmãos em todos os momentos da caminhada.",
    icon: Users,
  },
  {
    name: "Fidelidade",
    description: "Lealdade inegociável aos princípios, às promessas assumidas e aos irmãos.",
    icon: ShieldCheck,
  },
  {
    name: "Pureza",
    description: "Integridade de pensamentos, pureza de coração e conduta exemplar na sociedade.",
    icon: Sun,
  },
  {
    name: "Patriotismo",
    description: "Amor ativo à pátria, respeito às leis e dedicação ao bem comum e à cidadania.",
    icon: Flag,
  },
];

// Encontros e Atividades Capitulares (Scroll horizontal estilo Priorado 156)
const encontros = [
  {
    id: 1,
    tag: "Sessão Magna",
    title: "Instalação e Posse da Gestão Capitular",
    date: "Aos Domingos, às 09:00",
    local: "A∴R∴L∴S∴ Caridade II nº 135",
    descricao: "Cerimônia solene de posse da diretoria capitular com a presença dos tios do Conselho Consultivo, tias e familiares, celebrando a renovação e liderança dos jovens.",
  },
  {
    id: 2,
    tag: "Instrução & Ritualística",
    title: "Sessão Ordinária do Grau Iniciático",
    date: "Aos Domingos, às 09:00",
    local: "A∴R∴L∴S∴ Caridade II nº 135",
    descricao: "Estudo ritualístico e apresentação de trabalhos filosóficos pelos novos irmãos, aprofundando o simbolismo das Sete Virtudes Cardeais sob a mentoria dos consultores.",
  },
  {
    id: 3,
    tag: "Ação Social",
    title: "Campanha Filantrópica e Solidariedade Comunitária",
    date: "Atividade Externa",
    local: "Comunidade Teresina - PI",
    descricao: "Arrecadação e distribuição de alimentos e donativos promovida pelos DeMolays ativos e sêniores, cumprindo nosso dever cívico e amor ao próximo.",
  },
  {
    id: 4,
    tag: "Conselho Consultivo",
    title: "Encontro com as 4 Lojas Patrocinadoras",
    date: "Alinhamento Capitular",
    local: "A∴R∴L∴S∴ Caridade II nº 135",
    descricao: "Reunião de alinhamento com as lojas mantenedoras (Abolição nº 4199, Adonhiran nº 2782, Caridade II nº 135 e Mansur nº 4591) para fortalecimento das metas do Capítulo.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5F1] text-gray-900 selection:bg-[#D9AA45] selection:text-white">
      <Header />

      <main className="flex-1">
        {/* ======================================================== */}
        {/* HERO SECTION COM BRASÃO DO CN (ESTILO PRIORADO 156) */}
        {/* ======================================================== */}
        <section className="relative bg-gradient-to-b from-[#064D32] to-[#087443] text-white py-20 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D9AA45_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-10 text-center shadow-2xl backdrop-blur-sm sm:px-10 sm:py-14">
            {/* BRASÃO OFICIAL HERÁLDICO DO CN */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-b from-[#D9AA45]/30 to-[#04281A] p-1 border-2 border-[#D9AA45] shadow-xl backdrop-blur-md flex items-center justify-center">
                <div className="w-full h-full rounded-xl bg-[#04281A] border border-[#D9AA45]/50 flex flex-col items-center justify-center text-center p-2">
                  <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-[#D9AA45] drop-shadow-[0_0_8px_rgba(217,170,69,0.5)]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#D9AA45] mt-1 font-mono">
                    CN Nº 500
                  </span>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D9AA45]/40 text-xs font-semibold text-[#D9AA45] uppercase tracking-wider mb-6">
              <span>Fundado em 2012</span>
              <span>•</span>
              <span>Teresina - PI</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              Capítulo Professor <br />
              <span className="text-[#D9AA45]">Carvalho Neves Nº 500</span>
            </h1>

            <p className="text-lg sm:text-xl text-emerald-100 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Formando líderes conscientes, íntegros e fraternos através dos ensinamentos e virtudes da Ordem DeMolay.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#historia"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white text-[#064D32] font-semibold text-sm hover:bg-emerald-50 transition-colors shadow-lg cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#087443]" />
                Conheça Nossa História
              </a>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#064D32] text-white font-semibold text-sm hover:bg-[#064D32]/90 border border-[#D9AA45]/60 transition-colors shadow-lg cursor-pointer"
              >
                <Lock className="w-4 h-4 text-[#D9AA45]" />
                Acessar Área Restrita
              </Link>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SETE VIRTUDES CARDEAIS (ORDEM DEMOLAY ORGANIZADA E FLUIDA) */}
        {/* ======================================================== */}
        <section id="virtudes" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
              Pilares Fundamentais da Ordem DeMolay
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
              As Sete Virtudes Cardeais
            </h2>
            <div className="w-16 h-1 bg-[#D9AA45] mx-auto mt-4 rounded-full" />
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              Os preceitos que norteiam a conduta diária e o crescimento pessoal de cada jovem DeMolay no Capítulo 500.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {virtues.map((v, i) => {
              const Icon = v.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-xl p-6 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#087443] mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {v.name}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {v.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1 text-xs font-semibold text-[#087443]">
                    <span>Virtude {i + 1} de 7</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* HISTÓRIA E PATRONO */}
        {/* ======================================================== */}
        <section id="historia" className="py-20 bg-white border-y border-gray-200/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
              Memória & Tradição
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
              O Patrono Professor Carvalho Neves
            </h2>
            <div className="w-16 h-1 bg-[#D9AA45] mx-auto mt-4 rounded-full" />
            <p className="mt-6 text-base text-gray-700 leading-relaxed text-left sm:text-justify">
              O <strong>Capítulo Professor Carvalho Neves Nº 500</strong> honra a memória e o legado educacional, cívico e moral de seu patrono. Atuando na cidade de <strong>Teresina</strong>, Piauí, desde sua fundação em 2012, o Capítulo tem sido um polo vivo de aperfeiçoamento da juventude e de serviço à sociedade local.
            </p>
            <div className="mt-8 flex justify-center">
              <a
                href="#gestoes"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#087443] hover:text-[#064D32] transition-colors cursor-pointer"
              >
                <span>Conheça a galeria de gestões que construíram essa história</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* GESTÕES EM DESTAQUE (GALERIA ORIGINAL PRESERVADA) */}
        {/* ======================================================== */}
        <section id="gestoes" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
              Liderança e Continuidade
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
              Galeria de Gestões
            </h2>
            <div className="w-16 h-1 bg-[#D9AA45] mx-auto mt-4 rounded-full" />
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              Mais de 25 gestões dedicadas ao crescimento contínuo do Capítulo Nº 500.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* GESTÃO XXIV — Past MC */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col group">
              <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-[#04281A] via-[#064D32] to-[#087443] flex flex-col items-center justify-center p-4">
                <Image
                  src="/gestoes/jose-keltton.2026.1.jpg"
                  alt="Foto oficial de José Keltton Cardoso da Silva Viana"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white backdrop-blur-md">
                  XXIV
                </span>
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 text-emerald-200 border border-white/10">
                  2026.1
                </span>
                <div className="w-16 h-16 rounded-full bg-[#087443] border-2 border-[#D9AA45] flex items-center justify-center text-[#D9AA45] shadow-lg group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-8 h-8 text-[#D9AA45]" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#D9AA45] font-semibold mt-2">
                  Espaço para Foto Oficial
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#087443]">Gestão XXIV</span>
                  <h4 className="font-bold text-gray-900 text-base mt-1">
                    MC José Keltton Cardoso da Silva Viana
                  </h4>
                  <p className="text-xs text-gray-500">Past MC</p>
                </div>
              </div>
            </div>

            {/* GESTÃO XXV — Past MC */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col group">
              <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-[#04281A] via-[#064D32] to-[#087443] flex flex-col items-center justify-center p-4">
                <Image
                  src="/gestoes/rafael-inacio.2026.2.jpg"
                  alt="Foto oficial de Rafael Inácio do Nascimento de Morais"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white backdrop-blur-md">
                  XXV
                </span>
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 text-emerald-200 border border-white/10">
                  2026.2
                </span>
                <div className="w-16 h-16 rounded-full bg-[#087443] border-2 border-[#D9AA45] flex items-center justify-center text-[#D9AA45] shadow-lg group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-8 h-8 text-[#D9AA45]" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#D9AA45] font-semibold mt-2">
                  Espaço para Foto Oficial
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#087443]">Gestão XXV</span>
                  <h4 className="font-bold text-gray-900 text-base mt-1">
                    MC Rafael Inácio do Nascimento de Morais
                  </h4>
                  <p className="text-xs text-gray-500">Past MC</p>
                </div>
              </div>
            </div>

            {/* GESTÃO XXVI — MC ATUAL (DESTAQUE) */}
            <div className="bg-white rounded-2xl overflow-hidden border-2 border-[#D9AA45] shadow-md hover:shadow-lg transition-all flex flex-col group">
              <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-[#04281A] via-[#064D32] to-[#087443] flex flex-col items-center justify-center p-4">
                <Image
                  src="/gestoes/joao-guilherme.2027.1.jpg"
                  alt="Foto oficial de João Guilherme Martins Lopes Monteiro"
                  fill
                  preload
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#D9AA45] text-[#04281A]">
                  XXVI
                </span>
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D9AA45] text-[#04281A] flex items-center gap-1">
                  ★ MC Atual • 2027.1
                </span>
                <div className="w-16 h-16 rounded-full bg-[#087443] border-2 border-[#D9AA45] flex items-center justify-center text-[#D9AA45] shadow-lg group-hover:scale-105 transition-transform">
                  <Crown className="w-8 h-8 text-[#D9AA45]" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#D9AA45] font-semibold mt-2">
                  Espaço para Foto Oficial
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-[#D9AA45]">Gestão XXVI</span>
                  <h4 className="font-bold text-gray-900 text-base mt-1">
                    MC João Guilherme Martins Lopes Monteiro
                  </h4>
                  <p className="text-xs text-emerald-700 font-semibold">Mestre Conselheiro Atual</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/gestoes"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#087443] hover:bg-[#064D32] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all border border-[#D9AA45]/50 group cursor-pointer"
            >
              <span>Ver Galeria Completa de Mestres Conselheiros (Todas as Gestões)</span>
              <ArrowRight className="w-4 h-4 text-[#D9AA45] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>

        {/* ======================================================== */}
        {/* NOSSOS ENCONTROS E ATIVIDADES (SCROLL LATERAL ESTILO PRIORADO 156) */}
        {/* ======================================================== */}
        <section id="encontros" className="py-20 bg-white border-y border-gray-200/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
                  Vida Capitular em Ação
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
                  Nossos Encontros & Atividades
                </h2>
                <div className="w-16 h-1 bg-[#D9AA45] mt-4 rounded-full" />
                <p className="mt-3 text-sm text-gray-600 max-w-xl">
                  Registros de nossas sessões, trabalhos ritualísticos e filantropia no Capítulo 500. Deslize para o lado para ver mais.
                </p>
              </div>

              {/* Indicador de Scroll */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 font-semibold">
                <span>Deslize para o lado</span>
                <ArrowRight className="w-4 h-4 text-[#087443]" />
              </div>
            </div>

            {/* SCROLL HORIZONTAL (SNAP CAROUSEL) */}
            <div className="flex gap-5 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[#087443]/30">
              {encontros.map((item) => (
                <div
                  key={item.id}
                  className="min-w-[280px] sm:min-w-[340px] max-w-[340px] snap-start bg-[#F2F5F1] rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between shrink-0"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#087443]/15 text-[#087443] border border-[#087443]/30">
                        {item.tag}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {item.date}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-gray-900 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      {item.descricao}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center gap-1.5 text-[11px] text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                    <span className="truncate">{item.local}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* INSTAGRAM DISCRETO EMBAIXO (CONFORME SOLICITADO) */}
            <div className="pt-4 text-center">
              <a
                href="https://instagram.com/capitulo500"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs text-gray-600 hover:text-gray-900 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>Acompanhe nossos encontros e novidades no Instagram</span>
                <span className="font-bold text-[#087443]">@capitulo500</span>
              </a>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* CONTATO (PRESERVADO ORIGINAL) */}
        {/* ======================================================== */}
        <section id="contato" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
              Fale Conosco
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
              Canais de Contato
            </h2>
            <div className="w-16 h-1 bg-[#D9AA45] mx-auto mt-4 rounded-full" />
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              Dúvidas sobre ingresso, parcerias institucionais ou mensagens à diretoria do Capítulo.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#087443]/10 text-[#087443] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Local das Sessões</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    A∴R∴L∴S∴ Caridade II nº 135, Teresina/PI — Brasil
                  </p>
                  <p className="text-[11px] text-[#087443] font-semibold mt-1">Aos Domingos, às 09:00</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#087443]/10 text-[#087443] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">E-mail Institucional</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    capitulo500@demolaybrasil.org.br
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">Retorno em até 48 horas úteis</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                Envie uma mensagem ao Mestre Conselheiro
              </h3>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Mensagem institucional simulada enviada com sucesso!"); }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Seu Nome</label>
                    <input
                      type="text"
                      required
                      placeholder="Nome completo"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#087443]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Seu E-mail</label>
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#087443]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assunto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Informações sobre ingresso de novos membros"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#087443]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mensagem</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Escreva sua mensagem aqui..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#087443]"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#087443] hover:bg-[#064D32] text-white font-semibold text-sm transition-all shadow-md cursor-pointer"
                >
                  <Send className="w-4 h-4 text-[#D9AA45]" />
                  <span>Enviar Mensagem</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* CTA ÁREA RESTRITA (PRESERVADO ORIGINAL) */}
        {/* ======================================================== */}
        <section className="py-16 bg-[#064D32] text-white text-center px-4 sm:px-6 lg:px-8 border-t border-[#087443]">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">
              Acesso Exclusivo para Membros do Capítulo
            </h3>
            <p className="text-emerald-100 text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed">
              Consulte suas presenças em reuniões, emissão de comprovantes de mensalidade e documentos oficiais no Sistema Integrado de Gestão.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#D9AA45] text-[#064D32] font-bold text-sm hover:bg-[#D9AA45]/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
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
