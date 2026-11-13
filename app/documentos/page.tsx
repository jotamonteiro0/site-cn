"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { authenticGestaoDocuments, GestaoDocumentRecord } from "@/lib/data/historicalGestaoDocs";
import { authenticAtasDocuments, AtaDocumentRecord } from "@/lib/data/historicalAtasDocs";
import { scdbGeneralManuals, scdbPublicCeremonies } from "@/lib/data/scdbDocs";
import {
  FileText,
  Download,
  Building,
  Shield,
  Search,
  ArrowLeft,
  ExternalLink,
  BookOpen,
  Sparkles,
  Calendar
} from "lucide-react";

interface PublicDocItem {
  id: string;
  title: string;
  category: "scdb" | "gestao" | "atas";
  management?: string;
  type: string;
  description: string;
  date: string;
  fileName: string;
  downloadUrl: string;
}

export default function DocumentosPublicosPage() {
  const [activeTab, setActiveTab] = useState<"todos" | "scdb" | "gestao" | "atas">("todos");
  const [selectedManagement, setSelectedManagement] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");

  // Constrói catálogo oficial público sem dados fictícios
  const publicCatalog = useMemo<PublicDocItem[]>(() => {
    const list: PublicDocItem[] = [];

    // 1. Manuais e Legislação do Supremo Conselho DeMolay Brasil (SCDB)
    scdbGeneralManuals.forEach((m, idx) => {
      list.push({
        id: `scdb-man-${idx + 1}`,
        title: m.title,
        category: "scdb",
        type: m.type,
        description: m.description,
        date: "SCDB Oficial",
        fileName: m.fileName,
        downloadUrl: `/api/documents/${encodeURIComponent(m.fileName)}`,
      });
    });

    // 2. Cerimônias Públicas Oficiais do SCDB
    scdbPublicCeremonies.slice(0, 10).forEach((cer, idx) => {
      const fileName = `${cer}.pdf`;
      list.push({
        id: `scdb-cer-${idx + 1}`,
        title: cer,
        category: "scdb",
        type: "Cerimônia Pública SCDB",
        description: "Cerimonial público oficial padronizado pelo Supremo Conselho DeMolay Brasil.",
        date: "Norma SCDB",
        fileName,
        downloadUrl: `/api/documents/${encodeURIComponent(fileName)}`,
      });
    });

    // 3. Documentos Capitulares Autênticos das Gestões
    authenticGestaoDocuments.forEach((doc: GestaoDocumentRecord) => {
      list.push({
        id: doc.id,
        title: doc.title,
        category: "gestao",
        management: doc.management,
        type: doc.type,
        description: doc.description,
        date: doc.date,
        fileName: doc.fileName,
        downloadUrl: `/api/documents/${encodeURIComponent(doc.fileName)}`,
      });
    });

    // 4. Atas Oficiais das Reuniões e Sessões Solenes
    authenticAtasDocuments.forEach((doc: AtaDocumentRecord) => {
      list.push({
        id: doc.id,
        title: doc.title,
        category: "atas",
        management: doc.management,
        type: doc.type,
        description: doc.description,
        date: doc.date,
        fileName: doc.fileName,
        downloadUrl: `/api/documents/${encodeURIComponent(doc.fileName)}`,
      });
    });

    return list;
  }, []);

  const filteredDocs = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return publicCatalog.filter((doc) => {
      // Filtro de Aba
      if (activeTab === "scdb" && doc.category !== "scdb") return false;
      if (activeTab === "gestao" && doc.category !== "gestao") return false;
      if (activeTab === "atas" && doc.category !== "atas") return false;

      // Filtro de Gestão (aplica tanto em Atas quanto em Documentos de Gestão)
      if (
        selectedManagement !== "todas" &&
        doc.management &&
        doc.management !== selectedManagement
      ) {
        return false;
      }

      // Filtro de Busca
      if (term) {
        const matchesTitle = doc.title.toLowerCase().includes(term);
        const matchesType = doc.type.toLowerCase().includes(term);
        const matchesDesc = doc.description.toLowerCase().includes(term);
        const matchesMgmt = doc.management?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesType && !matchesDesc && !matchesMgmt) return false;
      }

      return true;
    });
  }, [publicCatalog, activeTab, selectedManagement, searchTerm]);

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
              <span>Acervo Oficial & Documentos Capitulares</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Documentos Capitulares, Atas & SCDB
            </h1>

            <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed">
              Consulte e baixe atos administrativos, editais capitulares e atas organizadas por gestão, além da legislação oficial e manuais do Supremo Conselho DeMolay Brasil.
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
                Todos ({publicCatalog.length})
              </button>
              <button
                onClick={() => setActiveTab("scdb")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "scdb"
                    ? "bg-[#087443] text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <Building className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Supremo Conselho (Manuais & Cerimônias)</span>
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
                <span>Documentos da Gestão ({authenticGestaoDocuments.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("atas")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "atas"
                    ? "bg-[#087443] text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Atas Capitulares ({authenticAtasDocuments.length})</span>
              </button>
            </div>

            {/* Seletor de Gestão (visível em todas as abas capitulares) */}
            {activeTab !== "scdb" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Gestão / MC:</span>
                <select
                  value={selectedManagement}
                  onChange={(e) => setSelectedManagement(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#087443] cursor-pointer"
                >
                  <option value="todas">Todas as Gestões</option>
                  <option value="Gestão XXV (2026.2)">Gestão XXV (2026.2) — MC Rafael Inácio</option>
                  <option value="Gestão XXIV (2026.1)">Gestão XXIV (2026.1) — MC José Keltton</option>
                  <option value="Gestão XXIII (2025.2)">Gestão XXIII (2025.2) — MC João Guilherme</option>
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
              placeholder="Buscar por título, tipo de documento, gestão ou palavra-chave..."
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
                        PDF Oficial
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
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#087443] hover:bg-[#064D32] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Visualizar</span>
                      </a>
                      <a
                        href={`${doc.downloadUrl}?download=1`}
                        download={doc.fileName}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors shadow-sm cursor-pointer border border-gray-300"
                      >
                        <Download className="w-3.5 h-3.5 text-[#D9AA45]" />
                        <span>Baixar</span>
                      </a>
                    </div>
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
