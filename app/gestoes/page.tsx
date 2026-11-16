"use client";

import { useState, useEffect } from "react";
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
  MapPin,
  Star
} from "lucide-react";

interface Gestao {
  numero: string;
  romano: string;
  mc: string;
  periodo: string;
  status: "Past MC" | "Atual" | "Eleita";
  foto?: string | null;
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
    mc: "A definir",
    periodo: "2027.1",
    status: "Eleita",
    destaque: false,
  },
  {
    numero: "XXIV",
    romano: "Gestão XXIV",
    mc: "José Keltton da Silva Cardoso Viana",
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
    foto: null,
  },
  {
    numero: "XVI",
    romano: "Gestão XVI",
    mc: "Vinícius Linhares",
    periodo: "2019.2",
    status: "Past MC",
    foto: null,
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
    foto: null,
  },
  {
    numero: "VIII",
    romano: "Gestão VIII",
    mc: "Itamar Filho",
    periodo: "2015.2",
    status: "Past MC",
    foto: null,
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
    foto: null,
  },
  {
    numero: "V",
    romano: "Gestão V",
    mc: "Victor Barros",
    periodo: "2014.1",
    status: "Past MC",
    foto: null,
  },
  {
    numero: "IV",
    romano: "Gestão IV",
    mc: "Arthur Cerqueira",
    periodo: "2013.2",
    status: "Past MC",
    foto: null,
  },
  {
    numero: "III",
    romano: "Gestão III",
    mc: "Diógenes Quaresma",
    periodo: "2013.1",
    status: "Past MC",
    foto: null,
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
  const [gestoesList, setGestoesList] = useState<Gestao[]>(gestaoData);

  useEffect(() => {
    let isMounted = true;
    async function fetchDynamicPhotos() {
      try {
        const res = await fetch("/api/mc-photos");
        if (res.ok) {
          const data = await res.json();
          if (data?.items && Array.isArray(data.items) && isMounted) {
            setGestoesList((prev) =>
              prev.map((g) => {
                const match = data.items.find(
                  (p: { management_code: string; management_roman?: string; photo_url: string; member_name?: string; status?: "Past MC" | "Atual" | "Eleita" }) =>
                    p.management_code === g.periodo ||
                    p.management_roman === g.numero ||
                    p.management_roman === g.romano
                );
                if (match) {
                  return {
                    ...g,
                    foto: match.photo_url || g.foto,
                    mc: match.member_name || g.mc,
                    status: (match.status as "Past MC" | "Atual" | "Eleita") || g.status,
                  };
                }
                return g;
              })
            );
          }
        }
      } catch (err) {
        console.warn("Aviso ao sincronizar fotos dinâmicas de MC:", err);
      }
    }
    fetchDynamicPhotos();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = gestaoData.filter(
    (g) =>
      g.mc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.periodo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.romano.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separa o MC Atual para destaque
  const mcAtual = gestoesList.find((g) => g.status === "Atual") || gestaoData.find((g) => g.status === "Atual");
  const filteredFromList = gestoesList.filter(
    (g) =>
      g.mc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.periodo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.romano.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredWithoutAtual = filteredFromList.filter((g) => g.status !== "Atual");
  const showAtual = mcAtual && (searchTerm === "" ||
    mcAtual.mc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mcAtual.periodo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mcAtual.romano.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-gray-900 selection:bg-[#C59B3F] selection:text-[#06140D]">
      <Header />

      <main className="flex-1">
        {/* HERO BANNER DA GALERIA */}
        <section className="relative bg-institucional-dark text-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden text-center border-b border-white/10">
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 hover:text-white bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#C59B3F]" />
                <span>Voltar ao Portal Público</span>
              </Link>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-[#C59B3F]/30 text-[#C59B3F] text-xs font-bold uppercase tracking-wider font-mono">
                <Crown className="w-3.5 h-3.5" />
                <span>Registro Histórico Oficial</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
              Galeria de Mestres Conselheiros
            </h1>
            <div className="w-20 h-1 bg-[#C59B3F] mx-auto rounded-full mb-6" />

            <p className="text-base sm:text-lg text-emerald-100 max-w-2xl mx-auto font-light leading-relaxed mb-8">
              Homenagem aos líderes que conduziram os trabalhos do <strong>Capítulo Professor Carvalho Neves Nº 500</strong> desde a sua fundação em 2012, preservando os princípios e a fraternidade da Ordem DeMolay.
            </p>

            {/* Barra de Busca Dinâmica */}
            <div className="max-w-md mx-auto relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-200">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, ano (ex: 2027) ou gestão..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-[#C59B3F] transition-all shadow-sm"
              />
            </div>
          </div>
        </section>

        {/* MC ATUAL EM DESTAQUE */}
        {showAtual && mcAtual && (
          <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C59B3F]/15 border border-[#C59B3F]/30 text-[#C59B3F] text-xs font-bold uppercase tracking-widest font-mono">
                <Star className="w-3.5 h-3.5" />
                <span>Mestre Conselheiro Atual</span>
              </div>
            </div>

            <div className="relative bg-white rounded-3xl overflow-hidden border-2 border-[#C59B3F] shadow-xl group">
              <div className="h-1 bg-[#C59B3F]" />

              <div className="flex flex-col md:flex-row">
                {/* Foto do MC Atual - Grande destaque */}
                <div className="relative w-full md:w-80 aspect-[3/4] md:aspect-auto bg-[#052E1D] flex items-center justify-center overflow-hidden shrink-0">
                  {/* Badge Gestão */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C59B3F] text-[#06140D] shadow-md font-mono">
                      {mcAtual.numero}
                    </span>
                  </div>

                  {/* Badge MC Atual */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#C59B3F] text-[#06140D] shadow-md flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" />
                      MC Atual
                    </span>
                  </div>

                  {mcAtual.foto && (
                    <Image
                      src={mcAtual.foto}
                      alt={`Foto oficial de ${mcAtual.mc}`}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 320px"
                      className="z-[1] object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}

                  {/* Fundo elegante caso a foto ainda esteja sendo carregada */}
                  <div className="relative z-0 flex flex-col items-center justify-center p-8 text-center text-emerald-200/40 text-xs">
                    <span>Foto Oficial Capitular</span>
                  </div>
                </div>

                {/* Informações do MC Atual */}
                <div className="flex-1 p-5 sm:p-8 md:p-10 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-[#C59B3F] uppercase tracking-widest mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Período {mcAtual.periodo}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-2">
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
                      <MapPin className="w-3.5 h-3.5 text-[#C59B3F]" />
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
                  <div className="relative w-full aspect-[4/4] bg-[#052E1D] flex items-center justify-center overflow-hidden border-b border-gray-100">
                    {/* Selo / Badge de Status */}
                    <div className="absolute top-3 right-3 z-10">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm font-mono border ${
                          item.status === "Eleita"
                            ? "bg-[#087443] text-white border-white/20"
                            : "bg-black/60 text-emerald-100 border-white/10"
                        }`}
                      >
                        {item.status === "Eleita" ? "MC Eleito" : "Past MC"}
                      </span>
                    </div>

                    {/* Número da Gestão no topo */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white backdrop-blur-md border border-white/15 font-mono">
                        {item.numero}
                      </span>
                    </div>

                    {/* Fundo elegante caso a foto ainda esteja sendo carregada */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-emerald-200/40 text-[10px] z-0">
                      <Crown className="w-8 h-8 text-[#C59B3F]/40 mb-1" />
                      <span className="font-mono uppercase tracking-wider">Foto Capitular</span>
                    </div>

                    {item.foto && (
                      <Image
                        src={item.foto}
                        alt={`Foto oficial de ${item.mc}, gestão ${item.periodo}`}
                        fill
                        loading={item.destaque ? "eager" : "lazy"}
                        priority={item.destaque}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="z-[1] object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}

                    {/* Linha discreta de acabamento */}
                    <div className="absolute bottom-0 inset-x-0 z-10 h-0.5 bg-[#C59B3F]/40" />
                  </div>

                  {/* INFORMAÇÕES DO MESTRE CONSELHEIRO */}
                  <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#087443] mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[#C59B3F]" />
                        <span>Período {item.periodo}</span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 mt-1 group-hover:text-[#087443] transition-colors">
                        {item.mc}
                      </h3>

                      <p className="text-xs text-gray-500 font-medium mt-1">
                        {item.status === "Eleita" ? "Mestre Conselheiro Eleito" : "Past Mestre Conselheiro"}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                      <span className="font-semibold text-gray-400 text-[11px]">
                        Capítulo Nº 500
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#C59B3F]">
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
