"use client";

import { useState } from "react";
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
  Calendar,
  Compass,
  Award,
  ChevronRight,
  Clock,
  Sparkle,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

const virtues = [
  {
    name: "Amor Filial",
    description: "Amor e respeito profundo aos pais que nos deram a vida e nos ensinaram os primeiros passos.",
    icon: Heart,
    color: "from-rose-500/20 to-rose-600/10",
    border: "border-rose-500/30",
    textColor: "text-rose-400",
  },
  {
    name: "Reverência pelas Coisas Sagradas",
    description: "Respeito sincero pela fé alheia e crença inabalável no Pai Celestial acima de tudo.",
    icon: Sparkles,
    color: "from-amber-500/20 to-amber-600/10",
    border: "border-amber-500/30",
    textColor: "text-amber-400",
  },
  {
    name: "Cortesia",
    description: "Nobreza em palavras e atitudes, tratando todos com respeito, paciência e dignidade incondicional.",
    icon: Smile,
    color: "from-blue-500/20 to-blue-600/10",
    border: "border-blue-500/30",
    textColor: "text-blue-400",
  },
  {
    name: "Companheirismo",
    description: "A verdadeira fraternidade que une os irmãos em todos os momentos, sustentando os laços do Capítulo.",
    icon: Users,
    color: "from-emerald-500/20 to-emerald-600/10",
    border: "border-emerald-500/30",
    textColor: "text-emerald-400",
  },
  {
    name: "Fidelidade",
    description: "Lealdade inegociável aos princípios, às promessas assumidas, à pátria e a cada irmão da Ordem.",
    icon: ShieldCheck,
    color: "from-indigo-500/20 to-indigo-600/10",
    border: "border-indigo-500/30",
    textColor: "text-indigo-400",
  },
  {
    name: "Pureza",
    description: "Integridade de pensamentos, pureza de coração e conduta exemplar e ilibada perante a sociedade.",
    icon: Sun,
    color: "from-yellow-500/20 to-yellow-600/10",
    border: "border-yellow-500/30",
    textColor: "text-yellow-400",
  },
  {
    name: "Patriotismo",
    description: "Amor ativo à pátria, respeito consciente às leis democráticas e dedicação ao bem comum coletivo.",
    icon: Flag,
    color: "from-green-500/20 to-green-600/10",
    border: "border-green-500/30",
    textColor: "text-green-400",
  },
];

// Nossos Encontros & Atividades (Inspirado no Priorado 156)
const encontros = [
  {
    id: 1,
    title: "Sessão Magna de Instalação e Posse da Gestão XXIII",
    date: "10 de Agosto de 2025",
    local: "A∴R∴L∴S∴ Caridade II nº 135",
    tipo: "Sessão Magna",
    descricao:
      "Instalação e posse solene da nova diretoria capitular perante os tios do Conselho Consultivo e familiares, celebrando a renovação e liderança jovem.",
    foto: "/gestoes/joao-guilherme.2025.2.jpg",
  },
  {
    id: 2,
    title: "Sessão Ordinária de Instrução Filosófica e Debate Cívico",
    date: "24 de Agosto de 2025",
    local: "A∴R∴L∴S∴ Caridade II nº 135",
    tipo: "Instrução Capitular",
    descricao:
      "Apresentação de trabalhos ritualísticos pelos irmãos do Grau Iniciático, com orientação dos Tios Consultores e aprofundamento das Sete Virtudes.",
    foto: "/gestoes/epaminondas-junior.2025.1.jpg",
  },
  {
    id: 3,
    title: "Ação Social e Filantropia Comunitária em Teresina",
    date: "14 de Setembro de 2025",
    local: "Comunidade Zona Sul — Teresina/PI",
    tipo: "Filantropia",
    descricao:
      "Arrecadação de alimentos e donativos promovida pelos DeMolays ativos e sêniores, cumprindo nosso dever cívico e amor ao próximo.",
    foto: "/gestoes/fabio-anicacio.2024.2.jpg",
  },
  {
    id: 4,
    title: "Encontro Conjunto com as 4 Lojas Patrocinadoras",
    date: "28 de Setembro de 2025",
    local: "Templo Nobre Maçônico",
    tipo: "Fraternidade",
    descricao:
      "Reunião de alinhamento com representantes das lojas Abolição nº 4199, Adonhiran nº 2782, Caridade II nº 135 e Mansur nº 4591 para fortalecimento do Conselho.",
    foto: "/gestoes/rafael-inacio.2026.2.jpg",
  },
];

export default function Home() {
  const [activeVirtue, setActiveVirtue] = useState(0);

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5F1] text-gray-900 selection:bg-[#D9AA45] selection:text-white">
      <Header />

      <main className="flex-1">
        {/* ======================================================== */}
        {/* HERO SECTION COM BRASÃO OFICIAL DO CN (ESTILO PRIORADO 156) */}
        {/* ======================================================== */}
        <section className="relative bg-gradient-to-b from-[#031C12] via-[#064D32] to-[#087443] text-white py-20 lg:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Efeito de Malha Dourada e Radial */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#D9AA45_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D9AA45]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-5xl text-center space-y-8">
            {/* BRASÃO OFICIAL HERÁLDICO DO CAPÍTULO CARVALHO NEVES */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-b from-[#D9AA45]/30 to-[#04281A] p-1.5 border-2 border-[#D9AA45] shadow-2xl backdrop-blur-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
                  <div className="w-full h-full rounded-2xl bg-[#04281A] border border-[#D9AA45]/50 flex flex-col items-center justify-center p-3 text-center">
                    <ShieldCheck className="w-12 h-12 sm:w-16 sm:h-16 text-[#D9AA45] drop-shadow-[0_0_12px_rgba(217,170,69,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D9AA45] mt-1 font-mono">
                      CN Nº 500
                    </span>
                  </div>
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-[#D9AA45]/20 via-[#087443]/30 to-[#D9AA45]/20 rounded-3xl blur-lg -z-10 group-hover:blur-xl transition-all" />
              </div>

              {/* Tags Heráldicas */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D9AA45]/50 text-xs font-bold text-[#D9AA45] uppercase tracking-wider mt-5 shadow-lg">
                <span>Fundado em 2012</span>
                <span>•</span>
                <span>Teresina / Piauí</span>
                <span>•</span>
                <span>Ordem DeMolay</span>
              </div>
            </div>

            {/* Título Principal & Patrono */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Capítulo Professor <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D9AA45] via-[#FFF3B0] to-[#D9AA45]">
                  Carvalho Neves Nº 500
                </span>
              </h1>
              <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-emerald-200">
                Sede Capitular: A∴R∴L∴S∴ Caridade II nº 135
              </p>
              <p className="text-base sm:text-lg text-emerald-100 max-w-3xl mx-auto leading-relaxed font-light">
                &ldquo;A união nos fortalece, a fidelidade nos perpetua.&rdquo;
                <br />
                Formando líderes éticos, homens de caráter e cidadãos conscientes através da fraternidade capitular.
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-extrabold text-sm transition-all shadow-xl shadow-[#D9AA45]/20 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Portal do Membro (Login)</span>
              </Link>

              <a
                href="#encontros"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 backdrop-blur-md transition-all shadow-lg cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[#D9AA45]" />
                <span>Nossos Encontros</span>
              </a>

              <a
                href="#sobre-ordem"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-transparent hover:bg-white/5 text-emerald-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-emerald-300" />
                <span>A Ordem DeMolay</span>
              </a>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* NOSSOS ENCONTROS & ATIVIDADES (PARECIDO COM PRIORADO 156) */}
        {/* ======================================================== */}
        <section id="encontros" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-6 border-b border-gray-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#087443]/10 border border-[#087443]/20 text-[#087443] text-xs font-bold uppercase tracking-wider mb-3">
                <Compass className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Vida Capitular Ativa</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#04281A] tracking-tight">
                Nossos Encontros & Atividades
              </h2>
              <p className="text-sm text-gray-600 mt-2 max-w-xl leading-relaxed">
                Acompanhe o que aconteceu nas nossas sessões, trabalhos ritualísticos, filantropia e convivência fraternal.
              </p>
            </div>

            <Link
              href="/gestoes"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#087443] hover:text-[#04281A] transition-colors"
            >
              <span>Ver todas as 25 Gestões</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {encontros.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Foto do Encontro */}
                  <div className="relative w-full aspect-[4/3] bg-[#04281A] overflow-hidden">
                    <Image
                      src={item.foto}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9AA45] text-[#04281A] shadow-md">
                      {item.tipo}
                    </span>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-[11px] text-[#087443] font-semibold">
                      <Clock className="w-3.5 h-3.5 text-[#D9AA45]" />
                      <span>{item.date}</span>
                    </div>

                    <h3 className="font-extrabold text-gray-900 text-sm leading-snug group-hover:text-[#087443] transition-colors line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                      {item.descricao}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="truncate max-w-[180px]">{item.local}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* ABA DA ORDEM DEMOLAY (ORGANIZADA, FLUIDA E ELEGANTE) */}
        {/* ======================================================== */}
        <section id="sobre-ordem" className="py-20 bg-white border-y border-gray-200 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-16">
            {/* Header da Seção */}
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
                Fraternidade • Liderança • Cidadania
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                A Ordem DeMolay & Seus Princípios
              </h2>
              <div className="w-16 h-1 bg-[#D9AA45] mx-auto rounded-full" />
              <p className="text-base text-gray-600 leading-relaxed">
                A maior organização fraternal juvenil do mundo, fundada em 1919 por Frank Sherman Land e patrocinada pela Maçonaria, dedicada a transformar rapazes dos 12 aos 21 anos em líderes conscientes de seu papel na sociedade.
              </p>
            </div>

            {/* Os 3 Pilares Capitulares */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-[#F2F5F1] border border-gray-200/80 space-y-3 hover:border-emerald-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#087443] text-[#D9AA45] flex items-center justify-center font-bold text-xl shadow-md">
                  1
                </div>
                <h3 className="text-lg font-bold text-gray-900">Desenvolvimento de Liderança</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Os próprios jovens dirigem as reuniões, gerenciam a tesouraria, organizam campanhas filantrópicas e planejam as gestões administrativas, exercitando oratória e liderança prática.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-[#F2F5F1] border border-gray-200/80 space-y-3 hover:border-emerald-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#087443] text-[#D9AA45] flex items-center justify-center font-bold text-xl shadow-md">
                  2
                </div>
                <h3 className="text-lg font-bold text-gray-900">Apoio Maçônico Intergeracional</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Cada Capítulo é patrocinado por Lojas Maçônicas e conta com o Conselho Consultivo formado por mestres maçons experientes, oferecendo mentoria moral e proteção constante.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-[#F2F5F1] border border-gray-200/80 space-y-3 hover:border-emerald-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#087443] text-[#D9AA45] flex items-center justify-center font-bold text-xl shadow-md">
                  3
                </div>
                <h3 className="text-lg font-bold text-gray-900">Serviço à Sociedade</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ação social contínua, patriotismo consciente e cultivo do amor filial como base inegociável da família e da comunidade em Teresina e no Piauí.
                </p>
              </div>
            </div>

            {/* As 7 Virtudes Cardeais com Interface Fluida */}
            <div className="space-y-8 pt-8">
              <div className="text-center max-w-xl mx-auto">
                <h3 className="text-2xl font-extrabold text-gray-900">
                  As Sete Virtudes Cardeais
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Os sete preceitos que guiam a conduta diária de cada DeMolay no Capítulo 500
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {virtues.map((v, i) => {
                  const Icon = v.icon;
                  return (
                    <div
                      key={v.name}
                      className={`p-5 rounded-2xl bg-gradient-to-br ${v.color} border ${v.border} flex flex-col justify-between hover:scale-[1.02] transition-transform`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Icon className={`w-6 h-6 ${v.textColor}`} />
                          <span className="text-[10px] font-mono font-bold text-gray-400">
                            0{i + 1}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-gray-900 mb-1">
                          {v.name}
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {v.description}
                        </p>
                      </div>
                      <span className="mt-4 text-[10px] uppercase tracking-wider font-bold text-[#087443]">
                        Virtude Capitular
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* PATRONO PROFESSOR CARVALHO NEVES & MEMÓRIA */}
        {/* ======================================================== */}
        <section id="historia" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="p-8 sm:p-12 rounded-3xl bg-[#04281A] text-white border border-[#D9AA45]/40 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#D9AA45]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[#D9AA45] text-xs font-bold uppercase tracking-wider">
              <Crown className="w-4 h-4" />
              <span>Memória e Legado Histórico</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              O Patrono Professor Carvalho Neves
            </h2>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed text-justify font-light">
              Fundado em <strong>2012</strong> em Teresina - PI, o <strong>Capítulo Professor Carvalho Neves Nº 500</strong> homenageia a nobreza moral, a dedicação ao magistério e a probidade cívica de seu patrono. Sob o patrocínio da respeitável <strong>A∴R∴L∴S∴ Caridade II nº 135</strong>, o Capítulo já formou mais de 25 gestões de jovens líderes comprometidos com o bem-estar comunitário, a lealdade fraternal e os ideais da Ordem DeMolay internacional.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-bold">
              <Link
                href="/gestoes"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] transition-all shadow-md"
              >
                <span>Conhecer a Galeria de Mestres Conselheiros</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
              >
                <span>Acessar o Sistema Capitular</span>
                <Lock className="w-3.5 h-3.5 text-[#D9AA45]" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
