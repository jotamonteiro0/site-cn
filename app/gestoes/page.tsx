"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { 
  Shield, 
  Search, 
  Crown, 
  Calendar, 
  User, 
  Award,
  ArrowLeft,
  Sparkles,
  Star
} from "lucide-react";

interface Gestao {
  numero: string;
  romano: string;
  mc: string;
  periodo: string;
  status: "Past MC" | "Atual";
  foto?: string;
  destaque?: boolean;
}

// Convenção de fotos: /gestoes/nome-sobrenome.ano.semestre.jpg
// Ex: joao-guilherme.2027.1.jpg, rafael-inacio.2026.2.jpg
const gestaoData: Gestao[] = [
  {
    numero: "XXV",
    romano: "Gestão XXV",
    mc: "Rafael Inácio do Nascimento de Morais",
    periodo: "2026.2",
    status: "Atual",
    foto: "/gestoes/rafael-inacio.2026.2.jpg",
    destaque: true,
  },
  {
    numero: "XXVI",
    romano: "Gestão XXVI",
    mc: "João Guilherme Martins Lopes Monteiro",
    periodo: "2027.1",
    status: "Past MC",
    foto: "/gestoes/joao-guilherme.2027.1.jpg",
    destaque: true,
  },
  {
    numero: "XXIV",
    romano: "Gestão XXIV",
    mc: "José Keltton Cardoso da Silva Viana",
    periodo: "2026.1",
    status: "Past MC",
    foto: "/gestoes/jose-keltton.2026.1.jpg",
    destaque: true,
  },
  {
    numero: "XXIII",
    romano: "Gestão XXIII",
    mc: "João Guilherme Martins Lopes Monteiro",
    periodo: "2025.2",
    status: "Past MC",
    foto: "/gestoes/joao-guilherme.2025.2.jpg",
    destaque: true,
  },
  {
    numero: "XXII",
    romano: "Gestão XXII",
    mc: "Epaminondas Coutinho Feitosa Júnior",
    periodo: "2025.1",
    status: "Past MC",
    foto: "/gestoes/epaminondas-junior.2025.1.jpg",
  },
  {
    numero: "XXI",
    romano: "Gestão XXI",
    mc: "Fábio Anicácio Brito Correia",
    periodo: "2024.2",
    status: "Past MC",
    foto: "/gestoes/fabio-anicacio.2024.2.jpg",
  },
  {
    numero: "XX",
    romano: "Gestão XX",
    mc: "Wesley de Sousa Pinheiro de Abreu",
    periodo: "2024.1",
    status: "Past MC",
    foto: "/gestoes/wesley-abreu.2024.1.jpg",
  },
  {
    numero: "XIX",
    romano: "Gestão XIX",
    mc: "Caio Carvalho Fonseca Lima",
    periodo: "2023.2",
    status: "Past MC",
    foto: "/gestoes/caio-carvalho.2023.2.jpg",
  },
  {
    numero: "XVIII",
    romano: "Gestão XVIII",
    mc: "Wesley de Sousa Pinheiro de Abreu",
    periodo: "2023.1",
    status: "Past MC",
    foto: "/gestoes/wesley-abreu.2023.1.jpg",
  },
  {
    numero: "XVII",
    romano: "Gestão XVII",
    mc: "Gabriel Dias",
    periodo: "2020.1",
    status: "Past MC",
    foto: "/gestoes/gabriel-dias.2020.1.jpg",
  },
  {
    numero: "XVI",
    romano: "Gestão XVI",
    mc: "Vinícius Linhares",
    periodo: "2019.2",
    status: "Past MC",
    foto: "/gestoes/vinicius-linhares.2019.2.jpg",
  },
  {
    numero: "XV",
    romano: "Gestão XV",
    mc: "Gustavo Vilarinho",
    periodo: "2019.1",
    status: "Past MC",
    foto: "/gestoes/gustavo-vilarinho.2019.1.jpg",
  },
  {
    numero: "XIV",
    romano: "Gestão XIV",
    mc: "Tomaz Neto",
    periodo: "2018.2",
    status: "Past MC",
    foto: "/gestoes/tomaz-neto.2018.2.jpg",
  },
  {
    numero: "XIII",
    romano: "Gestão XIII",
    mc: "Ezequias Júnior",
    periodo: "2018.1",
    status: "Past MC",
    foto: "/gestoes/ezequias-junior.2018.1.jpg",
  },
  {
    numero: "XII",
    romano: "Gestão XII",
    mc: "Rafael Rocha",
    periodo: "2017.2",
    status: "Past MC",
    foto: "/gestoes/rafael-rocha.2017.2.jpg",
  },
  {
    numero: "XI",
    romano: "Gestão XI",
    mc: "Breno Correia",
    periodo: "2017.1",
    status: "Past MC",
    foto: "/gestoes/breno-correia.2017.1.jpg",
  },
  {
    numero: "X",
    romano: "Gestão X",
    mc: "Cleilson Almeida",
    periodo: "2016.2",
    status: "Past MC",
    foto: "/gestoes/cleilson-almeida.2016.2.jpg",
  },
  {
    numero: "IX",
    romano: "Gestão IX",
    mc: "Ericles Guerra",
    periodo: "2016.1",
    status: "Past MC",
    foto: "/gestoes/ericles-guerra.2016.1.jpg",
  },
  {
    numero: "VIII",
    romano: "Gestão VIII",
    mc: "Itamar Filho",
    periodo: "2015.2",
    status: "Past MC",
    foto: "/gestoes/itamar-filho.2015.2.jpg",
  },
  {
    numero: "VII",
    romano: "Gestão VII",
    mc: "Renandro Reis",
    periodo: "2015.1",
    status: "Past MC",
    foto: "/gestoes/renandro-reis.2015.1.jpg",
  },
  {
    numero: "VI",
    romano: "Gestão VI",
    mc: "Marcelo Negreiros Júnior",
    periodo: "2014.2",
    status: "Past MC",
    foto: "/gestoes/marcelo-negreiros.2014.2.jpg",
  },
  {
    numero: "V",
    romano: "Gestão V",
    mc: "Victor Barros",
    periodo: "2014.1",
    status: "Past MC",
    foto: "/gestoes/victor-barros.2014.1.jpg",
  },
  {
    numero: "IV",
    romano: "Gestão IV",
    mc: "Arthur Cerqueira",
    periodo: "2013.2",
    status: "Past MC",
    foto: "/gestoes/arthur-cerqueira.2013.2.jpg",
  },
  {
    numero: "III",
    romano: "Gestão III",
    mc: "Diógenes Quaresma",
    periodo: "2013.1",
    status: "Past MC",
    foto: "/gestoes/diogenes-quaresma.2013.1.jpg",
  },
  {
    numero: "I / II",
    romano: "Gestão I / II (Fundação)",
    mc: "Tiago Moreira",
    periodo: "2012.1 / 2012.2",
    status: "Past MC",
    foto: "/gestoes/tiago-moreira.2012.1.jpg",
    destaque: true,
  },
];

export default function GestoesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = gestaoData.filter(
    (g) =>
      g.mc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.periodo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.romano.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separa o MC Atual para destaque
  const mcAtual = gestaoData.find((g) => g.status === "Atual");
  const filteredWithoutAtual = filtered.filter((g) => g.status !== "Atual");
  const showAtual = mcAtual && (searchTerm === "" ||
    mcAtual.mc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mcAtual.periodo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mcAtual.romano.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5F1] text-gray-900 selection:bg-[#D9AA45] selection:text-white">
      <Header />

      <main className="flex-1">
        {/* HERO BANNER DA GALERIA */}
        <section className="relative bg-gradient-to-b from-[#032015] via-[#064D32] to-[#087443] text-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden text-center">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D9AA45_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          <div className="max-w-4xl mx-auto relative z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 hover:text-white bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 mb-6 transition-colors backdrop-blur-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#D9AA45]" />
              <span>Voltar à Página Inicial</span>
            </Link>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9AA45]/20 border border-[#D9AA45]/40 text-[#D9AA45] text-xs font-bold uppercase tracking-widest mb-4">
              <Crown className="w-4 h-4" />
              <span>Registro Histórico Oficial</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
              Galeria de Mestres Conselheiros
            </h1>
            <div className="w-24 h-1.5 bg-[#D9AA45] mx-auto rounded-full mb-6" />

            <p className="text-base sm:text-lg text-emerald-100 max-w-2xl mx-auto font-light leading-relaxed mb-8">
              Homenagem aos líderes que conduziram os trabalhos do <strong>Capítulo Professor Carvalho Neves Nº 500</strong> desde a sua fundação em 2012, preservando os princípios e a fraternidade da Ordem DeMolay.
            </p>

            {/* Barra de Busca Dinâmica */}
            <div className="max-w-md mx-auto relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-200">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, ano (ex: 2027) ou gestão..."
                className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-emerald-200/60 focus:outline-none focus:ring-2 focus:ring-[#D9AA45] backdrop-blur-md transition-all shadow-lg"
              />
            </div>
          </div>
        </section>

        {/* MC ATUAL EM DESTAQUE (ESTILO PRIORADO 156) */}
        {showAtual && mcAtual && (
          <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9AA45]/15 border border-[#D9AA45]/30 text-[#D9AA45] text-xs font-bold uppercase tracking-widest">
                <Star className="w-3.5 h-3.5" />
                <span>Mestre Conselheiro Atual</span>
              </div>
            </div>

            <div className="relative bg-white rounded-3xl overflow-hidden border-2 border-[#D9AA45] shadow-2xl group">
              {/* Faixa dourada decorativa no topo */}
              <div className="h-1.5 bg-gradient-to-r from-[#D9AA45] via-[#f0cc6a] to-[#D9AA45]" />

              <div className="flex flex-col md:flex-row">
                {/* Foto do MC Atual - Grande destaque */}
                <div className="relative w-full md:w-80 aspect-[3/4] md:aspect-auto bg-gradient-to-b from-[#04281A] via-[#064D32] to-[#087443] flex items-center justify-center overflow-hidden shrink-0">
                  {/* Badge Gestão */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-[#D9AA45] text-[#04281A] shadow-lg">
                      {mcAtual.numero}
                    </span>
                  </div>

                  {/* Badge MC Atual */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#D9AA45] text-[#04281A] shadow-lg flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" />
                      MC Atual
                    </span>
                  </div>

                  {mcAtual.foto && (
                    <Image
                      src={mcAtual.foto}
                      alt={`Foto oficial de ${mcAtual.mc}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 320px"
                      className="z-[1] object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}

                  {/* Exibido até que a foto oficial seja adicionada à pasta public/gestoes. */}
                  <div className="relative z-0 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#087443] to-[#0a9456] border-4 border-[#D9AA45] flex items-center justify-center text-[#D9AA45] shadow-2xl group-hover:scale-105 transition-transform duration-300 relative">
                      <Crown className="w-14 h-14 text-[#D9AA45]" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-[#D9AA45] border-2 border-white flex items-center justify-center text-[10px] font-black text-[#04281A]">
                        MC
                      </div>
                    </div>
                    <span className="text-[11px] uppercase tracking-widest text-[#D9AA45]/80 font-semibold mt-4">
                      Espaço para Foto Oficial
                    </span>
                  </div>

                  {/* Detalhe dourado na borda */}
                  <div className="absolute bottom-0 inset-x-0 z-10 h-1 bg-gradient-to-r from-transparent via-[#D9AA45] to-transparent md:hidden" />
                  <div className="hidden md:block absolute top-0 bottom-0 right-0 z-10 w-1 bg-gradient-to-b from-transparent via-[#D9AA45] to-transparent" />
                </div>

                {/* Informações do MC Atual */}
                <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-[#D9AA45] uppercase tracking-widest mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Período {mcAtual.periodo}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    {mcAtual.mc}
                  </h2>

                  <p className="text-sm text-[#087443] font-semibold mb-4">
                    Mestre Conselheiro — {mcAtual.romano}
                  </p>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    Responsável por conduzir os trabalhos e atividades do Capítulo Professor Carvalho Neves Nº 500 durante o período {mcAtual.periodo}, representando os ideais e virtudes da Ordem DeMolay.
                  </p>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Shield className="w-3.5 h-3.5 text-[#087443]" />
                      <span>Capítulo Nº 500</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Sparkles className="w-3.5 h-3.5 text-[#D9AA45]" />
                      <span>Teresina — PI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* GRADE DE CARDS - GESTÕES ANTERIORES */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#087443]" />
                <span>Gestões Registradas ({filtered.length})</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Dados oficiais consolidados do SisDM e arquivos do Capítulo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {filteredWithoutAtual.map((item, idx) => {
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200/80 hover:border-[#087443]/40 flex flex-col group"
                >
                  {/* ESPAÇO SUPERIOR PARA FOTO OFICIAL */}
                  <div className="relative w-full aspect-[4/4] bg-gradient-to-b from-[#04281A] via-[#064D32] to-[#087443] flex items-center justify-center overflow-hidden border-b border-gray-100">
                    {/* Selo / Badge de Status */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md backdrop-blur-md bg-black/40 text-emerald-100 border border-white/10">
                        Past MC
                      </span>
                    </div>

                    {/* Número da Gestão no topo */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-white/15 text-white backdrop-blur-md border border-white/15">
                        {item.numero}
                      </span>
                    </div>

                    {item.foto && (
                      <Image
                        src={item.foto}
                        alt={`Foto oficial de ${item.mc}, gestão ${item.periodo}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="z-[1] object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}

                    {/* Exibido até que a foto oficial seja adicionada à pasta public/gestoes. */}
                    <div className="relative z-0 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#087443] to-[#0a9456] border-2 border-[#D9AA45] flex items-center justify-center text-[#D9AA45] shadow-xl group-hover:scale-110 transition-transform duration-300 relative">
                        <Crown className="w-10 h-10 text-[#D9AA45]" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#064D32] border border-[#D9AA45] flex items-center justify-center text-[9px] font-black text-white">
                          MC
                        </div>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-[#D9AA45] font-semibold mt-3">
                        Espaço para Foto Oficial
                      </span>
                    </div>

                    {/* Detalhe Dourado na Divisória */}
                    <div className="absolute bottom-0 inset-x-0 z-10 h-1 bg-gradient-to-r from-transparent via-[#D9AA45] to-transparent" />
                  </div>

                  {/* INFORMAÇÕES DO MESTRE CONSELHEIRO */}
                  <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#087443] mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[#D9AA45]" />
                        <span>Período {item.periodo}</span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 mt-1 group-hover:text-[#087443] transition-colors">
                        {item.mc}
                      </h3>

                      <p className="text-xs text-gray-500 font-medium mt-1">
                        Mestre Conselheiro
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                      <span className="font-semibold text-gray-400 text-[11px]">
                        Capítulo Nº 500
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#D9AA45]">
                        {item.romano}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">
                Nenhum Mestre Conselheiro encontrado
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Tente buscar por outro termo ou ano (ex: 2027, 2025, João).
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
