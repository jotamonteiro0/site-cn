"use client";

import { useState } from "react";
import Link from "next/link";
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
  Sparkles
} from "lucide-react";

interface Gestao {
  numero: string;
  romano: string;
  mc: string;
  periodo: string;
  status: "Past MC" | "Atual" | "Eleito";
  foto?: string;
  destaque?: boolean;
}

const gestaoData: Gestao[] = [
  {
    numero: "XXVI",
    romano: "Gestão XXVI",
    mc: "João Guilherme Martins Lopes Monteiro",
    periodo: "2027.1",
    status: "Eleito",
    foto: "/gestoes/joao-guilherme-2027.jpg",
    destaque: true,
  },
  {
    numero: "XXV",
    romano: "Gestão XXV",
    mc: "Rafael Inácio do Nascimento de Morais",
    periodo: "2026.2",
    status: "Atual",
    foto: "/gestoes/rafael-inacio.jpg",
    destaque: true,
  },
  {
    numero: "XXIV",
    romano: "Gestão XXIV",
    mc: "José Keltton Cardoso da Silva Viana",
    periodo: "2026.1",
    status: "Past MC",
    foto: "/gestoes/jose-keltton.jpg",
    destaque: true,
  },
  {
    numero: "XXIII",
    romano: "Gestão XXIII",
    mc: "João Guilherme Martins Lopes Monteiro",
    periodo: "2025.2",
    status: "Past MC",
    foto: "/gestoes/joao-guilherme.jpg",
    destaque: true,
  },
  {
    numero: "XXII",
    romano: "Gestão XXII",
    mc: "Epaminondas Coutinho Feitosa Júnior",
    periodo: "2025.1",
    status: "Past MC",
  },
  {
    numero: "XXI",
    romano: "Gestão XXI",
    mc: "Fábio Anicácio Brito Correia",
    periodo: "2024.2",
    status: "Past MC",
  },
  {
    numero: "XX",
    romano: "Gestão XX",
    mc: "Wesley de Sousa Pinheiro de Abreu",
    periodo: "2024.1",
    status: "Past MC",
  },
  {
    numero: "XIX",
    romano: "Gestão XIX",
    mc: "Caio Carvalho Fonseca Lima",
    periodo: "2023.2",
    status: "Past MC",
  },
  {
    numero: "XVIII",
    romano: "Gestão XVIII",
    mc: "Wesley de Sousa Pinheiro de Abreu",
    periodo: "2023.1",
    status: "Past MC",
  },
  {
    numero: "XVII",
    romano: "Gestão XVII",
    mc: "Gabriel Dias",
    periodo: "2020.1",
    status: "Past MC",
  },
  {
    numero: "XVI",
    romano: "Gestão XVI",
    mc: "Vinícius Linhares",
    periodo: "2019.2",
    status: "Past MC",
  },
  {
    numero: "XV",
    romano: "Gestão XV",
    mc: "Gustavo Vilarinho",
    periodo: "2019.1",
    status: "Past MC",
  },
  {
    numero: "XIV",
    romano: "Gestão XIV",
    mc: "Tomaz Neto",
    periodo: "2018.2",
    status: "Past MC",
  },
  {
    numero: "XIII",
    romano: "Gestão XIII",
    mc: "Ezequias Júnior",
    periodo: "2018.1",
    status: "Past MC",
  },
  {
    numero: "XII",
    romano: "Gestão XII",
    mc: "Rafael Rocha",
    periodo: "2017.2",
    status: "Past MC",
  },
  {
    numero: "XI",
    romano: "Gestão XI",
    mc: "Breno Correia",
    periodo: "2017.1",
    status: "Past MC",
  },
  {
    numero: "X",
    romano: "Gestão X",
    mc: "Cleilson Almeida",
    periodo: "2016.2",
    status: "Past MC",
  },
  {
    numero: "IX",
    romano: "Gestão IX",
    mc: "Ericles Guerra",
    periodo: "2016.1",
    status: "Past MC",
  },
  {
    numero: "VIII",
    romano: "Gestão VIII",
    mc: "Itamar Filho",
    periodo: "2015.2",
    status: "Past MC",
  },
  {
    numero: "VII",
    romano: "Gestão VII",
    mc: "Renandro Reis",
    periodo: "2015.1",
    status: "Past MC",
  },
  {
    numero: "VI",
    romano: "Gestão VI",
    mc: "Marcelo Negreiros Júnior",
    periodo: "2014.2",
    status: "Past MC",
  },
  {
    numero: "V",
    romano: "Gestão V",
    mc: "Victor Barros",
    periodo: "2014.1",
    status: "Past MC",
  },
  {
    numero: "IV",
    romano: "Gestão IV",
    mc: "Arthur Cerqueira",
    periodo: "2013.2",
    status: "Past MC",
  },
  {
    numero: "III",
    romano: "Gestão III",
    mc: "Diógenes Quaresma",
    periodo: "2013.1",
    status: "Past MC",
  },
  {
    numero: "I / II",
    romano: "Gestão I / II (Fundação)",
    mc: "Tiago Moreira",
    periodo: "2012.1 / 2012.2",
    status: "Past MC",
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

        {/* GRADE DE CARDS NO ESTILO GALERIA DE LÍDERES (PRIORADO 156) */}
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
            {filtered.map((item, idx) => {
              const isEleito = item.status === "Eleito";
              const isAtual = item.status === "Atual";

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border flex flex-col group ${
                    isEleito || isAtual
                      ? "border-[#D9AA45] ring-2 ring-[#D9AA45]/20 shadow-md"
                      : "border-gray-200/80 hover:border-[#087443]/40"
                  }`}
                >
                  {/* ESPAÇO SUPERIOR PARA FOTO OFICIAL (ESTILO PRIORADO 156) */}
                  <div className="relative w-full aspect-[4/4] bg-gradient-to-b from-[#04281A] via-[#064D32] to-[#087443] flex items-center justify-center overflow-hidden border-b border-gray-100">
                    {/* Selo / Badge de Status */}
                    <div className="absolute top-3 right-3 z-10">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md backdrop-blur-md ${
                          isEleito
                            ? "bg-[#D9AA45] text-[#04281A]"
                            : isAtual
                            ? "bg-emerald-400 text-[#04281A]"
                            : "bg-black/40 text-emerald-100 border border-white/10"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Número da Gestão no topo */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-white/15 text-white backdrop-blur-md border border-white/15">
                        {item.numero}
                      </span>
                    </div>

                    {/* Espaço para foto ou Placeholder com Insígnia */}
                    <div className="relative flex flex-col items-center justify-center p-6 text-center">
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
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D9AA45] to-transparent" />
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
