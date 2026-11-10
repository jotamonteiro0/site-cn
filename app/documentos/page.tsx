"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  FileText,
  Download,
  Building,
  Shield,
  Search,
  ArrowLeft
} from "lucide-react";

interface DocumentItem {
  id: string;
  title: string;
  category: "supremo_conselho" | "gestao";
  management?: string;
  type: string;
  description: string;
  fileSize: string;
  date: string;
  downloadUrl?: string;
}

const officialDocuments: DocumentItem[] = [
  // Documentos do Supremo Conselho (Externos / Gerais)
  {
    id: "sc-01",
    title: "Regulamento Geral da Ordem DeMolay (RGD)",
    category: "supremo_conselho",
    type: "Legislação Nacional",
    description: "Normas fundamentais, deveres, hierarquia e regulamento geral promulgado pelo Supremo Conselho DeMolay Brasil.",
    fileSize: "2.4 MB",
    date: "Atualizado 2024",
  },
  {
    id: "sc-02",
    title: "Estatuto Social do DeMolay Brasil",
    category: "supremo_conselho",
    type: "Estatuto Nacional",
    description: "Estatuto constitutivo que rege a personalidade jurídica e representação da Ordem DeMolay em território brasileiro.",
    fileSize: "1.8 MB",
    date: "Oficial SCDB",
  },
  {
    id: "sc-03",
    title: "Código de Ética e Conduta Juvenil",
    category: "supremo_conselho",
    type: "Diretriz Moral",
    description: "Diretrizes de comportamento, decoro, integridade e convivência fraterna aplicadas a todos os membros e tios consultores.",
    fileSize: "980 KB",
    date: "Oficial SCDB",
  },
  {
    id: "sc-04",
    title: "Ficha Padrão de Indicação para Iniciação",
    category: "supremo_conselho",
    type: "Formulário Oficial",
    description: "Modelo oficial de proposta para ingresso de novos membros, com declarações e autorização formal dos pais.",
    fileSize: "450 KB",
    date: "DeMolay Brasil",
  },
  {
    id: "sc-05",
    title: "Manual de Cerimonial e Espaço Sagrado",
    category: "supremo_conselho",
    type: "Ritualística",
    description: "Instruções oficiais sobre a disposição do Templo, paramentos ritualísticos e condução solene dos trabalhos.",
    fileSize: "3.1 MB",
    date: "Ritualística SCDB",
  },

  // Documentos Capitulares (Por Gestão)
  {
    id: "cn-01",
    title: "Regimento Interno do Capítulo Professor Carvalho Neves Nº 500",
    category: "gestao",
    management: "Gestão XXIII (2025.2)",
    type: "Regimento Local",
    description: "Estatuto normativo local aprovado pelo Capítulo 500 e chancelado pelo Conselho Consultivo e Lojas Patrocinadoras.",
    fileSize: "1.2 MB",
    date: "Agosto 2025",
  },
  {
    id: "cn-02",
    title: "Ato Capitular nº 01/2025 — Nomeação de Oficiais e Comissões",
    category: "gestao",
    management: "Gestão XXIII (2025.2)",
    type: "Ato da Gestão",
    description: "Designação dos oficiais colaboradores, comissões de finanças, filantropia e sindicância da Gestão XXIII.",
    fileSize: "320 KB",
    date: "Agosto 2025",
  },
  {
    id: "cn-03",
    title: "Edital de Convocação Geral — Sessão Magna de Iniciação",
    category: "gestao",
    management: "Gestão XXIII (2025.2)",
    type: "Edital",
    description: "Convocatória oficial aos irmãos e convite aos tios maçons para a cerimônia solene no Templo da Caridade II nº 135.",
    fileSize: "280 KB",
    date: "Setembro 2025",
  },
  {
    id: "cn-04",
    title: "Prestação de Contas e Balancete Semestral",
    category: "gestao",
    management: "Gestão XXII (2025.1)",
    type: "Balancete",
    description: "Relatório financeiro, demonstração de receitas e despesas e parecer de auditoria do Conselho Consultivo da Gestão XXII.",
    fileSize: "850 KB",
    date: "Julho 2025",
  },
  {
    id: "cn-05",
    title: "Ato de Encerramento e Transmissão de Cargos — Gestão XXII",
    category: "gestao",
    management: "Gestão XXII (2025.1)",
    type: "Ato da Gestão",
    description: "Termo de encerramento da Gestão XXII liderada pelo Past MC Epaminondas Júnior e transferência à Gestão XXIII.",
    fileSize: "410 KB",
    date: "Julho 2025",
  },
];

export default function DocumentosPublicosPage() {
  const [activeTab, setActiveTab] = useState<"todos" | "supremo_conselho" | "gestao">("todos");
  const [selectedManagement, setSelectedManagement] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDocs = officialDocuments.filter((doc) => {
    const matchesTab = activeTab === "todos" || doc.category === activeTab;
    const matchesManagement =
      selectedManagement === "todas" || doc.management === selectedManagement || doc.category === "supremo_conselho";
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      doc.title.toLowerCase().includes(term) ||
      doc.type.toLowerCase().includes(term) ||
      doc.description.toLowerCase().includes(term);

    return matchesTab && matchesManagement && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5F1] text-gray-900 selection:bg-[#D9AA45] selection:text-white">
      <Header />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative bg-gradient-to-b from-[#064D32] to-[#087443] text-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-200 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Portal Público</span>
            </Link>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-[#D9AA45]/40 text-xs font-bold text-[#D9AA45] uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>Acervo Oficial & Legislação</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Documentos Capitulares & SCDB
            </h1>

            <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed">
              Consulte e baixe atos, editais capitulares divididos por gestão, regimento interno e a legislação oficial do Supremo Conselho DeMolay Brasil.
            </p>
          </div>
        </section>

        {/* ÁREA DE FILTROS & ABAS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
            {/* Abas */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab("todos")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "todos"
                    ? "bg-[#087443] text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                Todos os Documentos
              </button>
              <button
                onClick={() => setActiveTab("supremo_conselho")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "supremo_conselho"
                    ? "bg-[#087443] text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <Building className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Supremo Conselho (Gerais / Externos)</span>
              </button>
              <button
                onClick={() => setActiveTab("gestao")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "gestao"
                    ? "bg-[#087443] text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Documentos Capitulares (Por Gestão)</span>
              </button>
            </div>

            {/* Seletor de Gestão (caso veja documentos capitulares) */}
            {activeTab !== "supremo_conselho" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Gestão:</span>
                <select
                  value={selectedManagement}
                  onChange={(e) => setSelectedManagement(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#087443] cursor-pointer"
                >
                  <option value="todas">Todas as Gestões</option>
                  <option value="Gestão XXIII (2025.2)">Gestão XXIII (2025.2)</option>
                  <option value="Gestão XXII (2025.1)">Gestão XXII (2025.1)</option>
                </select>
              </div>
            )}
          </div>

          {/* Busca em Tempo Real */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, tipo de documento ou palavra-chave..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#087443] shadow-sm"
            />
          </div>

          {/* GRID DE DOCUMENTOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
                Nenhum documento encontrado com os critérios de busca selecionados.
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#087443]/10 text-[#087443] border border-[#087443]/20">
                        {doc.type}
                      </span>
                      <span className="text-[11px] font-mono text-gray-400 font-medium">
                        {doc.fileSize}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-gray-900 text-base leading-snug group-hover:text-[#087443] transition-colors">
                      {doc.title}
                    </h3>

                    {doc.management && (
                      <p className="text-[11px] font-bold text-[#D9AA45]">
                        {doc.management}
                      </p>
                    )}

                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                      {doc.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400 text-[11px]">{doc.date}</span>
                    <button
                      onClick={() => alert(`Download simulado do arquivo: ${doc.title}. Para baixar o documento oficial verificado, acesse com seu login institucional.`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#087443] hover:bg-[#064D32] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar PDF</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
