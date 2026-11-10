"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  PlusCircle,
  Building,
  Shield,
  Search,
  ArrowLeft,
  Lock,
  BookOpen,
  Award,
  Sparkles,
  Download,
  Upload,
  Info,
  Paperclip,
  Trash2,
  Printer
} from "lucide-react";

interface DocumentRecord {
  id: string;
  title: string;
  category: "scdb_cerimonias" | "scdb_gerais" | "gestao";
  management?: string;
  mcName?: string;
  type: string;
  description: string;
  visibility: "public" | "members" | "staff";
  date: string;
  downloadUrl?: string;
}

// 1. Acervo Completo do SCDB (Cerimônias Públicas e Manuais Oficiais)
const scdbPublicCeremonies = [
  "Instruções gerais para todas as cerimônias públicas",
  "Cerimônia De Instalação Do Conselho Consultivo",
  "Cerimônia Da Luz",
  "Cerimônia De Recepção De Grande Mestre",
  "Investidura Chevalier",
  "Investidura Chevalier (Singular)",
  "Investidura Na Cruz De Honra",
  "Investidura Na Cruz De Honra (Singular)",
  "Cerimônia Das Flores",
  "Cerimônia Fúnebre - Em Memória",
  "Cerimônia De Instalação De Oficiais",
  "Cerimônia De Instalação De Oficiais Em Ordem Inversa",
  "Apresentação De Visitantes",
  "Investidura à Legião De Honra",
  "Investidura à Legião De Honra (Singular)",
  "Cerimônia Da Maioridade",
  "Cerimônia Da Maioridade (Singular)",
  "Cerimônia Em Memória Para Adultos",
  "Cerimônia Das Nove Horas",
  "Cerimônia Do Representante DeMolay",
  "Cerimônia Do Representante DeMolay (Singular)",
  "Cerimônia Do Abraço",
  "Cerimônia De Apresentação De Visitantes Ilustres",
  "Tributo Aos Maçons",
  "Abertura E Encerramento De Cerimônias Públicas Da Ordem DeMolay",
  "Abertura e Encerramento De Congressos DeMolay",
  "Cerimônia De Instalação Do Supremo Conselho",
  "Cerimônia De Instalação Do Mestre Conselheiro Nacional E Mestre Conselheiro Nacional Adjunto",
  "Cerimônia De Instalação Do Grande Conselho Estadual-Distrital",
  "Cerimônia De Instalação Do MCE-Distrital e do MCE-Distrital Adjunto",
  "Cerimônia De Instalação De Oficial Executivo",
  "Cerimônia De Instalação Do Mestre Conselheiro Regional",
  "Pin De Membro DeMolay",
  "Cerimônia Dos Pais",
  "Uma Lição Histórica",
  "Cerimônia Do Emblema",
  "Tributo às Mães",
  "Cerimônia De Homenagem à Bandeira Nacional - Ordem Dos Escudeiros",
  "Cerimônia Do Dia Das Mães - Ordem Dos Escudeiros",
  "Cerimônia Do Dia Dos Pais - Ordem Dos Escudeiros",
  "Cerimônia Antes que Seja Tarde"
];

const scdbGeneralManuals = [
  {
    title: "Serviço de Instalação do Clube de Mães e Amigos",
    description: "Normas, ritual de posse e diretrizes de apoio fraterno do Clube de Mães e Amigos do Capítulo.",
    type: "Manual Institucional",
  },
  {
    title: "Vade Mecum DeMolay",
    description: "Compêndio oficial com a legislação, estatuto, regulamento geral e orientações administrativas nacionais.",
    type: "Legislação & Normas",
  },
  {
    title: "Supremas Instruções",
    description: "Instruções normativas e decretos regulamentares emitidos pelo Supremo Conselho DeMolay Brasil.",
    type: "Instruções Normativas",
  },
  {
    title: "Plano Pedagógico",
    description: "Diretrizes educacionais, trilhas de liderança, virtudes e formação continuada da juventude DeMolay.",
    type: "Diretriz Educacional",
  },
];

// 2. Documentos Capitulares (Atos, Editais e Relatórios por Gestão e Nome do MC)
const gestaoDocuments: DocumentRecord[] = [
  {
    id: "g25-01",
    title: "Ato Capitular nº 01/2026 — Nomeação da Nominata e Oficiais Colaboradores",
    category: "gestao",
    management: "Gestão XXV (2026.2)",
    mcName: "MC Rafael Inácio",
    type: "Ato Administrativo",
    description: "Nomeação oficial dos 22 oficiais e comissões permanentes sob a liderança do MC Rafael Inácio do Nascimento de Morais.",
    visibility: "members",
    date: "Julho 2026",
  },
  {
    id: "g25-02",
    title: "Edital de Convocação Geral — Sessão Solene de Instalação e Posse",
    category: "gestao",
    management: "Gestão XXV (2026.2)",
    mcName: "MC Rafael Inácio",
    type: "Edital de Convocação",
    description: "Convocatória capitular a todos os membros ativos, seniores e conselho consultivo para a posse da Gestão XXV.",
    visibility: "members",
    date: "Julho 2026",
  },
  {
    id: "g24-01",
    title: "Ato Capitular nº 01/2026 — Transmissão e Calendário da Gestão XXIV",
    category: "gestao",
    management: "Gestão XXIV (2026.1)",
    mcName: "MC José Keltton",
    type: "Ato Administrativo",
    description: "Planejamento semestral e designação de oficiais sob liderança do MC José Keltton da Silva Cardoso Viana.",
    visibility: "members",
    date: "Janeiro 2026",
  },
  {
    id: "g24-02",
    title: "Relatório de Atividades e Balancete Financeiro Semestral — Gestão XXIV",
    category: "gestao",
    management: "Gestão XXIV (2026.1)",
    mcName: "MC José Keltton",
    type: "Balancete & Relatório",
    description: "Prestação de contas e relatório filantrópico aprovado pelo Conselho Consultivo da Gestão XXIV.",
    visibility: "members",
    date: "Junho 2026",
  },
  {
    id: "g23-01",
    title: "Regimento Interno do Capítulo Professor Carvalho Neves Nº 500",
    category: "gestao",
    management: "Gestão XXIII (2025.2)",
    mcName: "MC João Guilherme",
    type: "Regimento Interno",
    description: "Estatuto normativo local revisado e promulgado sob a liderança do MC João Guilherme Martins Lopes Monteiro.",
    visibility: "members",
    date: "Agosto 2025",
  },
  {
    id: "g23-02",
    title: "Ato Capitular nº 01/2025 — Nomeação de Oficiais e Comissões de Sindicância",
    category: "gestao",
    management: "Gestão XXIII (2025.2)",
    mcName: "MC João Guilherme",
    type: "Ato Administrativo",
    description: "Estruturação das comissões permanentes de finanças, filantropia e sindicância da Gestão XXIII.",
    visibility: "members",
    date: "Agosto 2025",
  },
  {
    id: "g23-03",
    title: "Edital de Convocação — Sessão Magna de Iniciação da Gestão XXIII",
    category: "gestao",
    management: "Gestão XXIII (2025.2)",
    mcName: "MC João Guilherme",
    type: "Edital",
    description: "Convocatória magna para a iniciação de novos irmãos no Capítulo Carvalho Neves.",
    visibility: "members",
    date: "Setembro 2025",
  },
  {
    id: "g22-01",
    title: "Prestação de Contas Semestral e Balancete — Gestão XXII",
    category: "gestao",
    management: "Gestão XXII (2025.1)",
    mcName: "Past MC Epaminondas Júnior",
    type: "Balancete",
    description: "Demonstrativo financeiro e relatório de encerramento da Gestão XXII liderada pelo Past MC Epaminondas Jr.",
    visibility: "members",
    date: "Julho 2025",
  },
  {
    id: "g21-01",
    title: "Relatório de Gestão e Livro de Presenças — Gestão XXI",
    category: "gestao",
    management: "Gestão XXI (2024.2)",
    mcName: "Past MC Fábio Anicácio",
    type: "Relatório Administrativo",
    description: "Registros de sessões, balanço patrimonial e histórico da Gestão XXI liderada pelo Past MC Fábio Anicácio.",
    visibility: "members",
    date: "Dezembro 2024",
  },
];

export default function DashboardDocumentosPage() {
  const [userRole, setUserRole] = useState<string>("membro");
  const [activeTab, setActiveTab] = useState<"todos" | "cerimonias" | "manuais" | "gestoes">("todos");
  const [selectedManagement, setSelectedManagement] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<DocumentRecord[]>([]);
  const [showGuide, setShowGuide] = useState(true);

  // Anexos customizados por ID de documento (armazenados em localStorage e Supabase)
  const [attachments, setAttachments] = useState<Record<string, string>>({});
  // IDs de documentos excluídos pelo Master
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  // Documento selecionado para visualização/impressão oficial
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);

  const [newDoc, setNewDoc] = useState({
    title: "",
    description: "",
    management: "Gestão XXV (2026.2) — MC Rafael Inácio",
    docType: "Ato Administrativo",
  });

  // Carrega preferências e dados locais persistidos
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const savedAttachments = localStorage.getItem("cn_doc_attachments");
        if (savedAttachments) {
          setAttachments(JSON.parse(savedAttachments));
        }
        const savedDeleted = localStorage.getItem("cn_deleted_doc_ids");
        if (savedDeleted) {
          setDeletedIds(JSON.parse(savedDeleted));
        }
        const savedUploaded = localStorage.getItem("cn_custom_uploaded_docs");
        if (savedUploaded) {
          setUploadedDocs(JSON.parse(savedUploaded));
        }
      } catch {
        // localStorage indisponível ou quota excedida
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // 1. Identifica permissão do usuário
  useEffect(() => {
    async function loadRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: membership } = await supabase
            .from("chapter_memberships")
            .select("role_code")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

          if (membership?.role_code) {
            setUserRole(membership.role_code);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar papel do usuário:", err);
      }
    }
    loadRole();
  }, []);

  // Membro não publica documento; somente administração (Master e Escrivão)
  const canPublish = userRole === "master" || userRole === "escrivao";

  // Monta catálogo consolidado
  const allCatalog = useMemo(() => {
    const list: DocumentRecord[] = [];

    // Cerimônias Públicas SCDB
    scdbPublicCeremonies.forEach((title, idx) => {
      const id = `scdb-cer-${idx + 1}`;
      list.push({
        id,
        title,
        category: "scdb_cerimonias",
        type: "Cerimônia Pública SCDB",
        description: `Cerimonial público oficial padronizado pelo Supremo Conselho DeMolay Brasil.`,
        visibility: "members",
        date: "SCDB Oficial",
        downloadUrl: attachments[id],
      });
    });

    // Manuais Gerais SCDB
    scdbGeneralManuals.forEach((m, idx) => {
      const id = `scdb-man-${idx + 1}`;
      list.push({
        id,
        title: m.title,
        category: "scdb_gerais",
        type: m.type,
        description: m.description,
        visibility: "members",
        date: "Norma SCDB",
        downloadUrl: attachments[id],
      });
    });

    // Documentos Capitulares de Gestões
    gestaoDocuments.forEach((doc) => {
      list.push({
        ...doc,
        downloadUrl: attachments[doc.id] || doc.downloadUrl,
      });
    });

    // Documentos recém-enviados
    uploadedDocs.forEach((doc) => {
      list.unshift({
        ...doc,
        downloadUrl: attachments[doc.id] || doc.downloadUrl,
      });
    });

    // Filtra documentos excluídos pelo Master
    return list.filter((doc) => !deletedIds.includes(doc.id));
  }, [uploadedDocs, attachments, deletedIds]);

  const filteredDocs = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return allCatalog.filter((doc) => {
      // Filtro de Aba
      if (activeTab === "cerimonias" && doc.category !== "scdb_cerimonias") return false;
      if (activeTab === "manuais" && doc.category !== "scdb_gerais") return false;
      if (activeTab === "gestoes" && doc.category !== "gestao") return false;

      // Filtro de Gestão
      if (
        activeTab === "gestoes" &&
        selectedManagement !== "todas" &&
        doc.management !== selectedManagement
      ) {
        return false;
      }

      // Filtro de Busca
      if (term) {
        const matchesTitle = doc.title.toLowerCase().includes(term);
        const matchesDesc = doc.description?.toLowerCase().includes(term);
        const matchesMgmt = doc.management?.toLowerCase().includes(term);
        const matchesMC = doc.mcName?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesDesc && !matchesMgmt && !matchesMC) return false;
      }

      return true;
    });
  }, [allCatalog, activeTab, selectedManagement, searchTerm]);

  // Handler: Master anexa ou substitui arquivo de documento existente
  const handleAttachFileToDoc = async (docId: string, file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      alert("O arquivo excede o limite de 20MB. Por favor, envie um documento menor.");
      return;
    }

    try {
      const supabase = createClient();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `anexos/${docId}_${Date.now()}_${sanitizedName}`;

      let publicUrl = "";
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(storagePath, file, { upsert: true });

      if (!upErr) {
        const { data: pUrl } = supabase.storage
          .from("documentos")
          .getPublicUrl(storagePath);
        publicUrl = pUrl?.publicUrl || "";
      } else {
        console.warn("Storage fallback na vinculação de anexo:", upErr);
        publicUrl = URL.createObjectURL(file);
      }

      const updated = { ...attachments, [docId]: publicUrl };
      setAttachments(updated);
      try {
        localStorage.setItem("cn_doc_attachments", JSON.stringify(updated));
      } catch {
        // quota
      }

      if (viewingDoc && viewingDoc.id === docId) {
        setViewingDoc({ ...viewingDoc, downloadUrl: publicUrl });
      }

      setSaveSuccessMsg(`Arquivo oficial PDF anexado ao documento com sucesso!`);
      setTimeout(() => setSaveSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Erro ao anexar arquivo ao documento:", err);
      alert("Falha ao anexar arquivo ao documento.");
    }
  };

  // Handler: Master exclui documento existente do acervo
  const handleDeleteDoc = async (doc: DocumentRecord) => {
    if (userRole !== "master") {
      alert("Apenas o Mestre Conselheiro pode excluir documentos do acervo.");
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente excluir o documento "${doc.title}" do acervo capitular?\nEsta ação removerá o registro para todos os membros.`
    );
    if (!confirmed) return;

    try {
      const supabase = createClient();
      await supabase.from("documents").delete().eq("title", doc.title);
    } catch (err) {
      console.warn("Aviso ao remover documento do banco:", err);
    }

    const newDeleted = [...deletedIds, doc.id];
    setDeletedIds(newDeleted);
    try {
      localStorage.setItem("cn_deleted_doc_ids", JSON.stringify(newDeleted));
    } catch {
      // quota
    }

    // Se estiver em uploadedDocs, remove do estado e storage
    setUploadedDocs((prev) => {
      const filtered = prev.filter((d) => d.id !== doc.id);
      try {
        localStorage.setItem("cn_custom_uploaded_docs", JSON.stringify(filtered));
      } catch {
        // quota
      }
      return filtered;
    });

    if (viewingDoc?.id === doc.id) {
      setViewingDoc(null);
    }

    setSaveSuccessMsg(`Documento "${doc.title}" excluído com sucesso do acervo.`);
    setTimeout(() => setSaveSuccessMsg(""), 5000);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublish || !newDoc.title.trim()) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      let fileUrl = "";

      if (docFile) {
        const sanitizedName = docFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `gestoes/${Date.now()}_${sanitizedName}`;
        try {
          const { error: upErr } = await supabase.storage
            .from("documentos")
            .upload(storagePath, docFile, { upsert: true });

          if (!upErr) {
            const { data: pUrl } = supabase.storage
              .from("documentos")
              .getPublicUrl(storagePath);
            fileUrl = pUrl?.publicUrl || "";
          }
        } catch (stErr) {
          console.warn("Upload de storage fallback:", stErr);
        }
      }

      await supabase.from("documents").insert({
        chapter_id: "00000000-0000-0000-0000-000000000500",
        title: newDoc.title.trim(),
        description: `${newDoc.description.trim()} [${newDoc.management}]`,
        visibility: "members",
        status: "published",
        published_at: new Date().toISOString(),
      });

      const newRecord: DocumentRecord = {
        id: `custom-doc-${Date.now()}`,
        title: newDoc.title.trim(),
        category: "gestao",
        management: newDoc.management,
        type: newDoc.docType,
        description: newDoc.description.trim() || "Documento oficial submetido ao acervo capitular.",
        visibility: "members",
        date: new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        downloadUrl: fileUrl,
      };

      setUploadedDocs((prev) => {
        const updated = [newRecord, ...prev];
        try {
          localStorage.setItem("cn_custom_uploaded_docs", JSON.stringify(updated));
        } catch {
          // quota
        }
        return updated;
      });

      setSaveSuccessMsg(`Documento cadastrado com sucesso! Disponível no acervo para todos os membros.`);
      setIsModalOpen(false);
      setDocFile(null);
      setNewDoc({
        title: "",
        description: "",
        management: "Gestão XXV (2026.2) — MC Rafael Inácio",
        docType: "Ato Administrativo",
      });
      setTimeout(() => setSaveSuccessMsg(""), 5000);
    } catch (err: unknown) {
      console.error("Erro ao cadastrar documento:", err);
      alert("Erro ao cadastrar documento.");
    } finally {
      setIsSaving(false);
    }
  };

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
            <BookOpen className="w-7 h-7 text-[#D9AA45]" />
            <span>Acervo de Documentos</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Cerimônias públicas e manuais do SCDB e documentos capitulares organizados por gestão e Mestre Conselheiro
          </p>
        </div>

        {/* Membro não publica documento; apenas Master e Escrivão */}
        {canPublish && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs transition-all shadow-md cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Cadastrar Documento</span>
          </button>
        )}
      </div>

      {/* FEEDBACK DE SALVAMENTO */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* BANNER GUIA COM GLASSMORPHISM: ONDE SUBIR DOCUMENTOS */}
      {showGuide && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#064D32]/70 backdrop-blur-xl border border-[#D9AA45]/30 shadow-xl space-y-3 relative overflow-hidden animate-in fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5 text-[#D9AA45]">
              <Info className="w-5 h-5 shrink-0" />
              <h2 className="text-sm font-bold text-white">
                Onde e Como Subir Documentos para Serem Visualizados?
              </h2>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              Fechar aviso
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-emerald-100/90 leading-relaxed">
            <div className="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <span className="font-bold text-[#D9AA45] block">1. Pelo Próprio Painel</span>
              <p>
                Use o botão <strong>&ldquo;Cadastrar Documento&rdquo;</strong> acima. Você pode anexar qualquer arquivo PDF oficial. O documento fica disponível instantaneamente no acervo de todos os membros.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <span className="font-bold text-[#D9AA45] block">2. No Supabase Storage</span>
              <p>
                No painel Supabase, acesse <strong>Storage &gt; bucket &ldquo;documentos&rdquo;</strong> (para atas, editais e resoluções) ou <strong>&ldquo;declaracoes&rdquo;</strong>.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <span className="font-bold text-[#D9AA45] block">3. Arquivos Estáticos no Código</span>
              <p>
                Documentos fixos ou manuais do SCDB podem ser salvos na pasta <strong>public/documentos/</strong> do projeto para acesso direto sem autenticação.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RESUMO DOS ACERVOS DISPONÍVEIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#D9AA45] flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              Cerimônias Públicas SCDB
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D9AA45]/20 text-[#D9AA45]">
              {scdbPublicCeremonies.length} cerimônias
            </span>
          </div>
          <p className="text-emerald-100/70 text-[11px] leading-relaxed">
            Todas as cerimônias abertas ao público, comissão e convidados homologadas pelo Supremo Conselho.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Building className="w-4 h-4" />
              Manuais & Normas SCDB
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
              {scdbGeneralManuals.length} manuais
            </span>
          </div>
          <p className="text-emerald-100/70 text-[11px] leading-relaxed">
            Vade Mecum DeMolay, Supremas Instruções, Plano Pedagógico e Clube de Mães e Amigos.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Documentos por Gestão
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300">
              {gestaoDocuments.length} atos e editais
            </span>
          </div>
          <p className="text-emerald-100/70 text-[11px] leading-relaxed">
            Atos administrativos, editais e relatórios classificados por respectiva gestão e nome do MC.
          </p>
        </div>
      </div>

      {/* FILTROS POR ABA E BUSCA */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Abas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab("todos")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "todos"
                  ? "bg-[#D9AA45] text-black shadow"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Todos ({allCatalog.length})
            </button>
            <button
              onClick={() => setActiveTab("cerimonias")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "cerimonias"
                  ? "bg-[#D9AA45] text-black shadow"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Cerimônias Públicas ({scdbPublicCeremonies.length})
            </button>
            <button
              onClick={() => setActiveTab("manuais")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "manuais"
                  ? "bg-[#D9AA45] text-black shadow"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Manuais & Normas ({scdbGeneralManuals.length})
            </button>
            <button
              onClick={() => setActiveTab("gestoes")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "gestoes"
                  ? "bg-[#D9AA45] text-black shadow"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Documentos por Gestão & MC ({gestaoDocuments.length})
            </button>
          </div>

          {/* Filtro específico de gestão quando na aba de gestões */}
          {activeTab === "gestoes" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Gestão / MC:</span>
              <select
                value={selectedManagement}
                onChange={(e) => setSelectedManagement(e.target.value)}
                className="bg-[#064D32] border border-emerald-500/40 rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
              >
                <option value="todas">Todas as Gestões</option>
                <option value="Gestão XXV (2026.2)">Gestão XXV (2026.2) — MC Rafael Inácio</option>
                <option value="Gestão XXIV (2026.1)">Gestão XXIV (2026.1) — MC José Keltton</option>
                <option value="Gestão XXIII (2025.2)">Gestão XXIII (2025.2) — MC João Guilherme</option>
                <option value="Gestão XXII (2025.1)">Gestão XXII (2025.1) — Past MC Epaminondas Jr</option>
                <option value="Gestão XXI (2024.2)">Gestão XXI (2024.2) — Past MC Fábio Anicácio</option>
              </select>
            </div>
          )}
        </div>

        {/* Campo de Busca */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-300" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome da cerimônia, manual, gestão ou nome do MC..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
          />
        </div>
      </div>

      {/* LISTAGEM DE DOCUMENTOS */}
      <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="py-12 text-center text-xs text-emerald-200/60">
            Nenhum documento encontrado para o critério selecionado.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    doc.category === "scdb_cerimonias"
                      ? "bg-amber-500/10 text-[#D9AA45] border border-[#D9AA45]/30"
                      : doc.category === "scdb_gerais"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                      : "bg-blue-500/10 text-blue-300 border border-blue-500/30"
                  }`}>
                    {doc.category === "scdb_cerimonias" ? (
                      <Award className="w-5 h-5 text-[#D9AA45]" />
                    ) : doc.category === "scdb_gerais" ? (
                      <Building className="w-5 h-5 text-emerald-300" />
                    ) : (
                      <Shield className="w-5 h-5 text-blue-300" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        doc.category === "scdb_cerimonias"
                          ? "bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/40"
                          : doc.category === "scdb_gerais"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                      }`}>
                        {doc.type}
                      </span>

                      {doc.management && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-emerald-200">
                          {doc.management}
                        </span>
                      )}

                      {doc.mcName && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/30 text-[#D9AA45] border border-white/10">
                          {doc.mcName}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-xs text-emerald-200/70 mt-1 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                      <span>Origem: {doc.date}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-300">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span>Acesso Membro</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* Botão Visualizar Documento */}
                  <button
                    onClick={() => setViewingDoc(doc)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#D9AA45]" />
                    <span>Visualizar</span>
                  </button>

                  {/* Botão Abrir ou Emitir PDF */}
                  <button
                    onClick={() => {
                      if (doc.downloadUrl) {
                        window.open(doc.downloadUrl, "_blank");
                      } else {
                        setViewingDoc(doc);
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-[#D9AA45]/20 hover:bg-[#D9AA45]/30 border border-[#D9AA45]/40 text-[#D9AA45] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer backdrop-blur-sm"
                    title={doc.downloadUrl ? "Abrir PDF anexado" : "Emitir e Imprimir Documento Oficial em PDF"}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  {/* Funções do Master: Anexar Documento Existente e Excluir */}
                  {userRole === "master" && (
                    <>
                      <label
                        htmlFor={`attach-input-${doc.id}`}
                        className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        title="Anexar ou substituir arquivo PDF deste documento"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden md:inline">
                          {doc.downloadUrl ? "Substituir PDF" : "Anexar PDF"}
                        </span>
                        <input
                          id={`attach-input-${doc.id}`}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAttachFileToDoc(doc.id, file);
                          }}
                        />
                      </label>

                      <button
                        onClick={() => handleDeleteDoc(doc)}
                        className="px-2.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        title="Excluir documento do acervo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Excluir</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE VISUALIZAÇÃO E EMISSÃO DE PDF OFICIAL (CLIENT-SIDE PRINT / PDF) */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#04281A] border border-[#D9AA45]/40 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 text-white my-8 print-area">
            {/* Header Timbre Oficial Capitular */}
            <div className="text-center pb-4 border-b border-white/10 space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#087443] border border-[#D9AA45] text-[#D9AA45] mb-1 shadow-lg">
                <Shield className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black tracking-wide uppercase text-white">
                Capítulo Professor Carvalho Neves Nº 500
              </h2>
              <p className="text-xs text-[#D9AA45] font-semibold">
                Ordem DeMolay • Supremo Conselho DeMolay Brasil (SCDB)
              </p>
              <p className="text-[11px] text-emerald-200/70">
                Patrocinado pela A∴R∴L∴S∴ Caridade II nº 135 • Oriente de Floriano - PI
              </p>
            </div>

            {/* Identificação do Documento */}
            <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/40">
                  {viewingDoc.type}
                </span>
                <span className="text-xs text-emerald-200/70 font-mono">
                  {viewingDoc.date}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                {viewingDoc.title}
              </h3>
              {viewingDoc.management && (
                <p className="text-xs text-[#D9AA45] font-semibold">
                  {viewingDoc.management} {viewingDoc.mcName ? `— ${viewingDoc.mcName}` : ""}
                </p>
              )}
            </div>

            {/* Conteúdo / Descrição */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/10 text-xs text-emerald-100/90 leading-relaxed space-y-3">
              <p className="font-semibold text-white">Resumo e Diretrizes Oficiais:</p>
              <p>{viewingDoc.description}</p>
              {viewingDoc.category === "scdb_cerimonias" && (
                <p className="text-[11px] text-emerald-200/70 italic">
                  Cerimônia pública oficial aprovada pelo SCDB. O texto ritualístico completo é protegido pelas normas da Ordem DeMolay e ministrado conforme os padrões litúrgicos capitulares.
                </p>
              )}
            </div>

            {/* Arquivo PDF Anexo */}
            {viewingDoc.downloadUrl ? (
              <div className="p-3.5 rounded-xl bg-emerald-900/30 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Paperclip className="w-4 h-4 text-[#D9AA45]" />
                  <span>Arquivo PDF oficial vinculado a este documento.</span>
                </div>
                <a
                  href={viewingDoc.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Abrir Arquivo PDF</span>
                </a>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-emerald-200/70">
                <p>
                  Documento oficial registrado no acervo capitular. Utilize a opção abaixo para emitir e imprimir diretamente em folha A4 com o timbre capitular.
                </p>
              </div>
            )}

            {/* Rodapé e Ações do Modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 no-print">
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                {userRole === "master" && (
                  <label
                    htmlFor="modal-attach-file"
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#D9AA45]" />
                    <span>{viewingDoc.downloadUrl ? "Substituir PDF" : "Anexar PDF"}</span>
                    <input
                      id="modal-attach-file"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && viewingDoc) {
                          handleAttachFileToDoc(viewingDoc.id, file);
                        }
                      }}
                    />
                  </label>
                )}

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#D9AA45] hover:bg-[#e3b64f] text-[#04281A] font-bold text-xs cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar em PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO COM GLASSMORPHISM E UPLOAD DE PDF (APENAS MASTER E ESCRIVÃO) */}
      {isModalOpen && canPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#04281A]/95 backdrop-blur-2xl border border-[#D9AA45]/40 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D9AA45]" />
              <h3 className="text-lg font-bold">Cadastrar Documento Capitular</h3>
            </div>
            <p className="text-xs text-emerald-200/70">
              Cadastre e anexe atas administrativas, editais, resoluções e regulamentos para o acervo oficial.
            </p>

            <form onSubmit={handleCreateDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Gestão Correspondente & MC *
                </label>
                <select
                  value={newDoc.management}
                  onChange={(e) => setNewDoc({ ...newDoc, management: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
                >
                  <option value="Gestão XXV (2026.2) — MC Rafael Inácio">Gestão XXV (2026.2) — MC Rafael Inácio</option>
                  <option value="Gestão XXIV (2026.1) — MC José Keltton">Gestão XXIV (2026.1) — MC José Keltton</option>
                  <option value="Gestão XXIII (2025.2) — MC João Guilherme">Gestão XXIII (2025.2) — MC João Guilherme</option>
                  <option value="Gestão XXII (2025.1) — Past MC Epaminondas Jr">Gestão XXII (2025.1) — Past MC Epaminondas Jr</option>
                  <option value="Gestão XXI (2024.2) — Past MC Fábio Anicácio">Gestão XXI (2024.2) — Past MC Fábio Anicácio</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Título do Documento *
                </label>
                <input
                  type="text"
                  required
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  placeholder="Ex: Ato Capitular nº 02/2026 — Comissão Eleitoral"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Anexar Arquivo Oficial (PDF)
                </label>
                <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-black/40 border border-dashed border-[#D9AA45]/40 hover:border-[#D9AA45] text-white cursor-pointer transition-colors text-xs">
                  <Upload className="w-4 h-4 text-[#D9AA45]" />
                  <span className="truncate">
                    {docFile ? docFile.name : "Clique para selecionar o PDF do seu computador..."}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {docFile && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-300 mt-1">
                    <span className="truncate">PDF selecionado: {docFile.name} ({(docFile.size / 1024).toFixed(0)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setDocFile(null)}
                      className="text-rose-400 hover:text-rose-200 cursor-pointer ml-2"
                    >
                      Remover
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-emerald-200/60 mt-1">
                  O arquivo será armazenado com segurança no bucket <strong>documentos</strong> do sistema.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Descrição Resumida
                </label>
                <textarea
                  rows={2}
                  value={newDoc.description}
                  onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                  placeholder="Explique o teor ou assunto do documento..."
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
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
                  {isSaving ? "Cadastrando..." : "Cadastrar Documento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
