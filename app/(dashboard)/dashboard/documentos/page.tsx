"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Upload,
  PlusCircle,
  Building,
  Shield,
  Search,
  ArrowLeft,
  Calendar,
  Lock,
  Globe,
  Trash2,
  CheckCircle2
} from "lucide-react";

interface DocumentRecord {
  id: string;
  title: string;
  description?: string;
  visibility: "public" | "members" | "staff";
  status: string;
  created_at: string;
  published_at?: string;
  category?: string;
  management?: string;
}

export default function DashboardDocumentosPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"todos" | "supremo_conselho" | "gestao">("todos");
  const [selectedManagement, setSelectedManagement] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const [newDoc, setNewDoc] = useState({
    title: "",
    description: "",
    classification: "gestao" as "supremo_conselho" | "gestao",
    management: "Gestão XXIII (2025.2)",
    docType: "Ato da Gestão",
    visibility: "members" as "public" | "members" | "staff",
  });

  const loadDocuments = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, description, visibility, status, created_at, published_at")
        .order("created_at", { ascending: false });

      if (data) {
        setDocuments(data as DocumentRecord[]);
      }
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title.trim()) return;

    setIsSaving(true);
    setSaveSuccessMsg("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .insert({
          chapter_id: "00000000-0000-0000-0000-000000000500",
          title: newDoc.title.trim(),
          description: newDoc.description.trim() + (newDoc.classification === "gestao" ? ` [${newDoc.management}]` : " [Supremo Conselho]"),
          visibility: newDoc.visibility,
          status: "published",
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setSaveSuccessMsg(`Documento "${newDoc.title}" publicado com sucesso!`);
      setIsModalOpen(false);
      setNewDoc({
        title: "",
        description: "",
        classification: "gestao",
        management: "Gestão XXIII (2025.2)",
        docType: "Ato da Gestão",
        visibility: "members",
      });

      await loadDocuments();
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Erro ao publicar documento:", err);
      alert("Erro ao publicar documento no banco.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      doc.title.toLowerCase().includes(term) ||
      (doc.description && doc.description.toLowerCase().includes(term));
    return matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in">
      {/* Header com Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar à Visão Geral</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Acervo de Documentos Oficiais & Atas</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Gestão de atos, editais, atas e resoluções capitulares por gestão e normas do Supremo Conselho
          </p>
        </div>

        {/* Botão de Publicação */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Publicar Documento</span>
        </button>
      </div>

      {/* FEEDBACK DE SALVAMENTO */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* PAINEL DE EXPLICAÇÃO DA ESTRUTURA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-[#D9AA45] font-bold">
            <Building className="w-4 h-4" />
            <span>Documentos do Supremo Conselho (Externos / Gerais)</span>
          </div>
          <p className="text-emerald-100/70 leading-relaxed">
            Regulamento Geral (RGD), Estatuto Nacional, Códigos de Ética e Manuais ritualísticos do DeMolay Brasil. São normas gerais que se aplicam a todos os períodos.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-bold">
            <Shield className="w-4 h-4" />
            <span>Documentos Capitulares (Separados por Gestão)</span>
          </div>
          <p className="text-emerald-100/70 leading-relaxed">
            Atos administrativos, Editais de Convocação, Atas de Sessões, Balancetes e Resoluções específicas de cada Mestre Conselheiro (Gestão XXIII, Gestão XXII, etc.).
          </p>
        </div>
      </div>

      {/* BUSCA */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-300" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar documento por título ou palavra-chave..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
        />
      </div>

      {/* LISTA DE DOCUMENTOS */}
      <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="py-12 text-center text-xs text-emerald-200/50">
            Nenhum documento registrado no banco ainda. Clique em <strong>&quot;Publicar Documento&quot;</strong> para cadastrar o primeiro ato ou edital.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-5 h-5 text-[#D9AA45]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-xs text-emerald-200/70 mt-0.5 line-clamp-1">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-emerald-300/70">
                      <span>Publicado em: {new Date(doc.created_at).toLocaleDateString("pt-BR")}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold">
                        {doc.visibility === "public" ? (
                          <>
                            <Globe className="w-3 h-3 text-[#D9AA45]" />
                            <span>Público no Site</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-emerald-400" />
                            <span>Apenas Membros</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                    {doc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: PUBLICAR DOCUMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#064D32] border border-white/20 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D9AA45]" />
              <h3 className="text-lg font-bold">Publicar Novo Documento Oficial</h3>
            </div>
            <p className="text-xs text-emerald-200/70">
              Cadastre atos, editais, atas ou regulamentos para visualização dos membros ou no portal público.
            </p>

            <form onSubmit={handleCreateDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Classificação do Documento *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDoc({ ...newDoc, classification: "gestao" })}
                    className={`p-2.5 rounded-lg border text-left font-semibold cursor-pointer transition-all ${
                      newDoc.classification === "gestao"
                        ? "bg-[#087443] border-[#D9AA45] text-white"
                        : "bg-black/20 border-white/10 text-emerald-200/60"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 mb-1 text-[#D9AA45]" />
                    <span>Documento Capitular (Por Gestão)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewDoc({ ...newDoc, classification: "supremo_conselho" })}
                    className={`p-2.5 rounded-lg border text-left font-semibold cursor-pointer transition-all ${
                      newDoc.classification === "supremo_conselho"
                        ? "bg-[#087443] border-[#D9AA45] text-white"
                        : "bg-black/20 border-white/10 text-emerald-200/60"
                    }`}
                  >
                    <Building className="w-3.5 h-3.5 mb-1 text-[#D9AA45]" />
                    <span>Supremo Conselho (Gerais / Externos)</span>
                  </button>
                </div>
              </div>

              {newDoc.classification === "gestao" && (
                <div>
                  <label className="block font-semibold mb-1 text-emerald-200">
                    Gestão Correspondente *
                  </label>
                  <select
                    value={newDoc.management}
                    onChange={(e) => setNewDoc({ ...newDoc, management: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
                  >
                    <option value="Gestão XXIII (2025.2)">Gestão XXIII (2025.2) — MC João Guilherme</option>
                    <option value="Gestão XXII (2025.1)">Gestão XXII (2025.1) — Past MC Epaminondas Jr</option>
                    <option value="Gestão XXI (2024.2)">Gestão XXI (2024.2) — Past MC Fábio Anicácio</option>
                    <option value="Gestão XXIV (2026.1)">Gestão XXIV (2026.1) — MC José Keltton</option>
                    <option value="Gestão XXV (2026.2)">Gestão XXV (2026.2) — MC Rafael Inácio</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Título do Documento *
                </label>
                <input
                  type="text"
                  required
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  placeholder="Ex: Ato Capitular nº 02/2025 — Comissão de Sindicância"
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Descrição Resumida
                </label>
                <textarea
                  rows={2}
                  value={newDoc.description}
                  onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                  placeholder="Explique resumidamente o objetivo ou assunto do documento..."
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Visibilidade de Acesso
                </label>
                <select
                  value={newDoc.visibility}
                  onChange={(e) => setNewDoc({ ...newDoc, visibility: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
                >
                  <option value="members">Apenas Membros Autenticados</option>
                  <option value="public">Público (Visível na página /documentos)</option>
                  <option value="staff">Restrito à Diretoria (Master e Escrivão)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Publicando..." : "Publicar Documento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
