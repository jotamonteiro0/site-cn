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
  Calendar,
  Lock,
  Globe,
  BookOpen,
  Award,
  Sparkles,
  Download,
  ExternalLink
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

  const [newDoc, setNewDoc] = useState({
    title: "",
    description: "",
    management: "Gestão XXV (2026.2) — MC Rafael Inácio",
    docType: "Ato Administrativo",
  });

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
      list.push({
        id: `scdb-cer-${idx + 1}`,
        title,
        category: "scdb_cerimonias",
        type: "Cerimônia Pública SCDB",
        description: `Cerimonial público oficial padronizado pelo Supremo Conselho DeMolay Brasil.`,
        visibility: "members",
        date: "SCDB Oficial",
      });
    });

    // Manuais Gerais SCDB
    scdbGeneralManuals.forEach((m, idx) => {
      list.push({
        id: `scdb-man-${idx + 1}`,
        title: m.title,
        category: "scdb_gerais",
        type: m.type,
        description: m.description,
        visibility: "members",
        date: "Norma SCDB",
      });
    });

    // Documentos Capitulares de Gestões
    gestaoDocuments.forEach((doc) => {
      list.push(doc);
    });

    return list;
  }, []);

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

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublish || !newDoc.title.trim()) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("documents").insert({
        chapter_id: "00000000-0000-0000-0000-000000000500",
        title: newDoc.title.trim(),
        description: `${newDoc.description.trim()} [${newDoc.management}]`,
        visibility: "members",
        status: "published",
        published_at: new Date().toISOString(),
      });

      setSaveSuccessMsg(`Documento cadastrado com sucesso!`);
      setIsModalOpen(false);
      setNewDoc({
        title: "",
        description: "",
        management: "Gestão XXV (2026.2) — MC Rafael Inácio",
        docType: "Ato Administrativo",
      });
      setTimeout(() => setSaveSuccessMsg(""), 5000);
    } catch (err) {
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

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => {
                      alert(`Visualizando: ${doc.title}\n\nDocumento oficial disponibilizado pelo Capítulo Professor Carvalho Neves Nº 500.`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#D9AA45]" />
                    <span>Visualizar</span>
                  </button>

                  <button
                    onClick={() => {
                      alert(`Download do arquivo oficial iniciado: ${doc.title}.pdf`);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#D9AA45]/20 hover:bg-[#D9AA45]/30 border border-[#D9AA45]/40 text-[#D9AA45] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Baixar Arquivo PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO (APENAS MASTER E ESCRIVÃO) */}
      {isModalOpen && canPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#064D32] border border-white/20 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D9AA45]" />
              <h3 className="text-lg font-bold">Cadastrar Documento Capitular</h3>
            </div>
            <p className="text-xs text-emerald-200/70">
              Cadastre atos administrativos, editais e resoluções para o acervo oficial da gestão.
            </p>

            <form onSubmit={handleCreateDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Gestão Correspondente & MC *
                </label>
                <select
                  value={newDoc.management}
                  onChange={(e) => setNewDoc({ ...newDoc, management: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
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
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-200">
                  Descrição Resumida
                </label>
                <textarea
                  rows={3}
                  value={newDoc.description}
                  onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                  placeholder="Explique o teor ou assunto do documento..."
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
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
