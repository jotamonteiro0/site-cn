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
  Send
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

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5F1] text-gray-900 selection:bg-[#D9AA45] selection:text-white">
      <Header />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative bg-gradient-to-b from-[#064D32] to-[#087443] text-white py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D9AA45_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-10 text-center shadow-2xl backdrop-blur-sm sm:px-10 sm:py-14">
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white text-[#064D32] font-semibold text-sm hover:bg-emerald-50 transition-colors shadow-lg"
              >
                <BookOpen className="w-4 h-4 text-[#087443]" />
                Conheça Nossa História
              </a>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#064D32] text-white font-semibold text-sm hover:bg-[#064D32]/90 border border-[#D9AA45]/60 transition-colors shadow-lg"
              >
                <Lock className="w-4 h-4 text-[#D9AA45]" />
                Acessar Área Restrita
              </Link>
            </div>
          </div>
        </section>

        {/* SETE VIRTUDES CARDEAIS */}
        <section id="virtudes" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-[#087443] font-bold">
              Pilares Fundamentais
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
              As Sete Virtudes Cardeais
            </h2>
            <div className="w-16 h-1 bg-[#D9AA45] mx-auto mt-4 rounded-full" />
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              Os preceitos que norteiam a conduta diária e o crescimento pessoal de cada jovem DeMolay.
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

        {/* HISTÓRIA E PATRONO */}
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
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#087443] hover:text-[#064D32] transition-colors"
              >
                <span>Conheça a galeria de gestões que construíram essa história</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* GESTÕES EM DESTAQUE */}
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
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#087443] hover:bg-[#064D32] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all border border-[#D9AA45]/50 group"
            >
              <span>Ver Galeria Completa de Mestres Conselheiros (Todas as Gestões)</span>
              <ArrowRight className="w-4 h-4 text-[#D9AA45] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>

        {/* CONTATO */}
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
                    Loja Maçônica Caridade II, Piauí — Brasil
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
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#087443] hover:bg-[#064D32] text-white font-semibold text-sm transition-all shadow-md"
                >
                  <Send className="w-4 h-4 text-[#D9AA45]" />
                  <span>Enviar Mensagem</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* CTA ÁREA RESTRITA */}
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
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#D9AA45] text-[#064D32] font-bold text-sm hover:bg-[#D9AA45]/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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
