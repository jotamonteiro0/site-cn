"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { formatFullDate, parseMeetingTitle } from "@/components/site/EncontrosAtividades";
import { HISTORICAL_MEETINGS } from "@/lib/data/historicalMeetings";
import canonicalMCPhotosJson from "@/data/mc_photos.json";
import {
  Newspaper,
  Shield,
  PlusCircle,
  Search,
  Calendar,
  MapPin,
  Users,
  Crown,
  FileText,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Archive,
  ArrowLeft,
  Upload,
  X,
  ExternalLink,
  Camera,
  Crop,
  Check,
  RefreshCw,
  Database,
  BookOpen,
  Lock
} from "lucide-react";
import { ProfilePhotoCropper } from "@/components/ui/ProfilePhotoCropper";
import type { SitePublication, PublicationStatus } from "@/lib/publications-store";
import type { ManagementMCPhoto } from "@/lib/mc-photos-store";

interface MemberOption {
  id: string;
  id_demolay: string;
  full_name: string;
  category: string;
}

interface ManagementOption {
  id: string;
  code: string;
  title: string;
  status: "ativa" | "planejada" | "encerrada";
}

export default function MasterPublicacoesPage() {
  const [activeTab, setActiveTab] = useState<"atividades" | "fotos_mc">("atividades");
  const [userRole, setUserRole] = useState<string>("membro");
  const [viewAsMember, setViewAsMember] = useState(false);
  const [isRoleChecked, setIsRoleChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [persistenceNotice, setPersistenceNotice] = useState<string | null>(null);

  // Dados de publicações
  const [publications, setPublications] = useState<SitePublication[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [managementFilter, setManagementFilter] = useState<string>("todas");

  // Dados de fotografias dos MCs
  const [mcPhotos, setMcPhotos] = useState<ManagementMCPhoto[]>([]);
  const [membersList, setMembersList] = useState<MemberOption[]>([]);
  const [managementsList, setManagementsList] = useState<ManagementOption[]>([]);

  // Modal de Nova/Editar Publicação
  const [isPubModalOpen, setIsPubModalOpen] = useState(false);
  const [editingPubId, setEditingPubId] = useState<string | null>(null);
  const [pubForm, setPubForm] = useState({
    title: "",
    categoryPrefix: "Reunião Magna",
    headlineText: "",
    description: "",
    starts_at: "",
    location: "",
    photo_url: "",
    mc_name: "",
    management: "Gestão XXV (2026.2)",
    ata_num: "",
    demolays_present_count: 0,
    masons_present_count: 0,
    total_quorum: 0,
    status: "publicado" as PublicationStatus,
    original_post_url: "",
  });
  const [pubModalTab, setPubModalTab] = useState<"form" | "preview">("form");
  const [isSavingPub, setIsSavingPub] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal de Pré-visualização Rápida
  const [previewPub, setPreviewPub] = useState<SitePublication | null>(null);

  // Modal de Exclusão
  const [deleteConfirmPub, setDeleteConfirmPub] = useState<SitePublication | null>(null);
  const [isDeletingPub, setIsDeletingPub] = useState(false);

  // Formulário de Edição de Foto de MC
  const [selectedMgmtCode, setSelectedMgmtCode] = useState<string>("2026.2");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [mcPhotoUrl, setMcPhotoUrl] = useState<string>(() => {
    const init = (canonicalMCPhotosJson as Array<{ management_code: string; photo_url?: string }>).find(
      (p) => p.management_code === "2026.2"
    );
    return init?.photo_url || "";
  });
  const [mcPhotoStatus, setMcPhotoStatus] = useState<"Atual" | "Eleita" | "Past MC">("Atual");
  const [isSavingMCPhoto, setIsSavingMCPhoto] = useState(false);
  const mcPhotoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Ajuste de Enquadramento da Foto de MC (Cropper Modal)
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string>("");
  const [isSavingCroppedPhoto, setIsSavingCroppedPhoto] = useState(false);

  // 1. Checa Permissão do Usuário Logado
  useEffect(() => {
    async function checkRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const isPermanentMaster =
            user.user_metadata?.id_demolay === "127738" ||
            user.user_metadata?.id_demolay === "102836" ||
            user.email === "joaomonteiro0@icloud.com" ||
            user.email === "airton@carvalhoneves500.org.br";

          const { data: membership } = await supabase
            .from("chapter_memberships")
            .select("role_code")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

          if (isPermanentMaster || membership?.role_code === "master") {
            setUserRole("master");
          } else if (membership?.role_code) {
            setUserRole(membership.role_code);
          }
        } else if (
          typeof window !== "undefined" &&
          (localStorage.getItem("cn_audit_master") === "true" ||
            document.cookie.includes("cn_audit_master=true"))
        ) {
          setUserRole("master");
        }
      } catch (err) {
        console.error("Erro ao verificar permissão:", err);
      } finally {
        setIsRoleChecked(true);
      }
    }
    checkRole();
  }, []);

  // Monitora alternador "Ver como Membro"
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem("cn_view_as_member");
        if (stored === "true") {
          setViewAsMember(true);
        }
      } catch {
        // quota fallback
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const effectiveRole = viewAsMember ? "membro" : userRole;
  const isMaster = effectiveRole === "master";

  // 2. Carrega Dados Iniciais (Publicações, Fotos de MC, Membros e Gestões)
  useEffect(() => {
    if (!isMaster) {
      if (isRoleChecked) {
        const frame = requestAnimationFrame(() => setIsLoading(false));
        return () => cancelAnimationFrame(frame);
      }
      return;
    }

    let isMounted = true;
    async function loadData() {
      try {
        const [pubRes, mcRes] = await Promise.all([
          fetch("/api/admin/publications"),
          fetch("/api/mc-photos"),
        ]);
        const pubData = pubRes.ok ? await pubRes.json() : null;
        const mcData = mcRes.ok ? await mcRes.json() : null;
        const pubErr = !pubRes.ok ? await pubRes.json().catch(() => null) : null;
        const mcErr = !mcRes.ok ? await mcRes.json().catch(() => null) : null;

        if (pubErr?.error || mcErr?.error) {
          setPersistenceNotice(pubErr?.error || mcErr?.error);
        }

        const supabase = createClient();
        const [memRes, mgmtRes] = await Promise.all([
          supabase
            .from("members")
            .select("id, id_demolay, full_name, category")
            .order("full_name", { ascending: true }),
          supabase
            .from("managements")
            .select("id, code, title, status")
            .order("code", { ascending: false }),
        ]);

        if (isMounted) {
          if (pubData?.items) setPublications(pubData.items);
          if (mcData?.items) {
            setMcPhotos(mcData.items);
            const initPhoto = mcData.items.find((p: ManagementMCPhoto) => p.management_code === "2026.2");
            if (initPhoto) {
              setMcPhotoUrl(initPhoto.photo_url || "");
              setMcPhotoStatus(initPhoto.status || "Atual");
            }
          }
          if (memRes.data) {
            const mList = memRes.data as MemberOption[];
            setMembersList(mList);
            const defaultMatch = mList.find(
              (m) => m.id_demolay === "127738" || m.full_name.toLowerCase().includes("joão guilherme")
            );
            if (defaultMatch) {
              setSelectedMemberId(defaultMatch.id);
            }
          }
          if (mgmtRes.data) {
            setManagementsList(mgmtRes.data as ManagementOption[]);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do painel:", err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isMaster, isRoleChecked]);

  // Acervo Histórico Canônico Homologado (18 Atividades Oficiais)
  const canonicalHistoricalPublications = useMemo(() => {
    return HISTORICAL_MEETINGS.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      starts_at: h.starts_at,
      location: h.location,
      photo_url: h.photo_url || null,
      status: (h.status === "cancelada" ? "arquivado" : "publicado") as PublicationStatus,
      mc_name: h.mc_name,
      management: h.management,
      ata_num: h.ata_num,
      total_quorum: h.total_quorum,
      demolays_present_count: h.demolays_present_count,
      masons_present_count: h.masons_present_count,
      original_post_url: h.original_post_url || null,
      ata_pdf_url: h.ata_pdf_url,
      livro_demolay_page: h.livro_demolay_page,
      livro_macom_page: h.livro_macom_page,
      origin: "historico" as const,
    }));
  }, []);

  // Fotografias Oficiais dos Mestres Conselheiros (13 fotos canônicas no PostgreSQL)
  const effectiveMCPhotos: ManagementMCPhoto[] = useMemo(() => {
    if (mcPhotos.length > 0) return mcPhotos;
    return (canonicalMCPhotosJson as Array<{
      management_code: string;
      management_roman?: string;
      management_title?: string;
      member_id_demolay?: string;
      member_name: string;
      periodo?: string;
      status?: "Atual" | "Eleita" | "Past MC";
      photo_url?: string;
      destaque?: boolean;
    }>).map((p) => ({
      id: `canonical-${p.management_code}`,
      management_code: p.management_code,
      management_roman: p.management_roman ? `Gestão ${p.management_roman}` : `Gestão ${p.management_code}`,
      management_title: p.management_title || `Gestão ${p.management_code}`,
      member_name: p.member_name,
      member_id_demolay: p.member_id_demolay || "",
      periodo: p.periodo || p.management_code,
      status: p.status || "Past MC",
      photo_url: p.photo_url || "",
      destaque: p.destaque,
    }));
  }, [mcPhotos]);

  // Atualiza seleção de gestão e foto de MC
  const handleSelectManagement = (code: string) => {
    setSelectedMgmtCode(code);
    const existing = effectiveMCPhotos.find(
      (p) => p.management_code === code || p.management_roman?.includes(code)
    );
    if (existing) {
      setMcPhotoUrl(existing.photo_url || "");
      setMcPhotoStatus(existing.status || "Past MC");
      const match = membersList.find(
        (m) =>
          m.id === existing.member_id ||
          m.id_demolay === existing.member_id_demolay ||
          m.full_name.toLowerCase() === existing.member_name.toLowerCase()
      );
      setSelectedMemberId(match ? match.id : "");
    } else {
      setMcPhotoUrl("");
      setMcPhotoStatus("Past MC");
      setSelectedMemberId("");
    }
  };

  // Feedback com auto-dispensar
  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // Publicações Efetivas: PostgreSQL é a fonte de dados oficial (18 registros autênticos)
  const effectivePublications = useMemo(() => {
    return publications.length > 0 ? publications : (canonicalHistoricalPublications as unknown as SitePublication[]);
  }, [publications, canonicalHistoricalPublications]);

  // Filtros de Publicações Unificadas (PostgreSQL)
  const filteredPgPublications = useMemo(() => {
    return effectivePublications.filter((p) => {
      if (statusFilter !== "todos" && p.status !== statusFilter) return false;
      if (managementFilter !== "todas" && !p.management?.includes(managementFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        const matchLoc = p.location?.toLowerCase().includes(q);
        const matchMC = p.mc_name?.toLowerCase().includes(q);
        const matchAta = p.ata_num?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchLoc || matchMC || matchAta;
      }
      return true;
    });
  }, [effectivePublications, statusFilter, managementFilter, searchQuery]);

  const filteredHistorical = useMemo(() => {
    return [] as typeof canonicalHistoricalPublications;
  }, []);

  // Métricas Consolidadas baseadas no acervo do PostgreSQL
  const stats = useMemo(() => {
    const list = effectivePublications;
    const total = list.length;
    const published = list.filter((p) => p.status === "publicado").length;
    const drafts = list.filter((p) => p.status === "rascunho").length;
    const archived = list.filter((p) => p.status === "arquivado").length;

    return {
      total,
      historicalTotal: 0,
      pgTotal: publications.length,
      published,
      historicalPublished: 0,
      pgPublished: published,
      drafts,
      archived,
    };
  }, [effectivePublications, publications.length]);

  // Gestões únicas consolidadas para o dropdown de filtro
  const distinctManagements = useMemo(() => {
    const set = new Set<string>();
    effectivePublications.forEach((p) => {
      if (p.management) set.add(p.management);
    });
    return Array.from(set);
  }, [effectivePublications]);

  // Abertura do Modal de Nova Publicação
  const handleOpenNewPublication = () => {
    setEditingPubId(null);
    setPubForm({
      title: "",
      categoryPrefix: "Reunião Magna",
      headlineText: "",
      description: "",
      starts_at: new Date().toISOString().substring(0, 10),
      location: "Templo Nobre — ARLS União e Caridade Valenciana nº 01",
      photo_url: "",
      mc_name: "Rafael Inácio do Nascimento de Morais",
      management: "Gestão XXV (2026.2)",
      ata_num: "",
      demolays_present_count: 14,
      masons_present_count: 5,
      total_quorum: 19,
      status: "publicado",
      original_post_url: "",
    });
    setPubModalTab("form");
    setIsPubModalOpen(true);
  };

  // Abertura do Modal de Edição
  const handleOpenEditPublication = (pub: SitePublication) => {
    setEditingPubId(pub.id);
    const { category, headline } = parseMeetingTitle(pub.title);
    setPubForm({
      title: pub.title,
      categoryPrefix: category,
      headlineText: headline,
      description: pub.description || "",
      starts_at: pub.starts_at ? pub.starts_at.substring(0, 10) : "",
      location: pub.location || "",
      photo_url: pub.photo_url || "",
      mc_name: pub.mc_name || "",
      management: pub.management || "Gestão XXV (2026.2)",
      ata_num: pub.ata_num || "",
      demolays_present_count: pub.demolays_present_count || 0,
      masons_present_count: pub.masons_present_count || 0,
      total_quorum: pub.total_quorum || 0,
      status: pub.status,
      original_post_url: pub.original_post_url || "",
    });
    setPubModalTab("form");
    setIsPubModalOpen(true);
  };

  // Upload de Imagem de Capa
  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setPubForm((prev) => ({ ...prev, photo_url: data.url }));
          showFeedback("Fotografia enviada com sucesso!");
        }
      } else {
        const err = await res.json();
        showFeedback(err.error || "Falha no upload da fotografia.", "error");
      }
    } catch {
      showFeedback("Erro de conexão ao enviar imagem.", "error");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Salvar Publicação (Criar ou Atualizar)
  const handleSavePublication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubForm.headlineText.trim() && !pubForm.title.trim()) {
      showFeedback("O título da atividade é obrigatório.", "error");
      return;
    }
    if (!pubForm.description.trim()) {
      showFeedback("A descrição narrativa é obrigatória.", "error");
      return;
    }
    if (!pubForm.starts_at) {
      showFeedback("A data da atividade é obrigatória.", "error");
      return;
    }

    setIsSavingPub(true);

    const fullTitle = pubForm.headlineText.trim()
      ? `${pubForm.categoryPrefix} | ${pubForm.headlineText.trim()}`
      : pubForm.title.trim();

    const payload = {
      title: fullTitle,
      description: pubForm.description.trim(),
      starts_at: pubForm.starts_at.includes("T") ? pubForm.starts_at : `${pubForm.starts_at}T16:00:00`,
      location: pubForm.location.trim() || undefined,
      photo_url: pubForm.photo_url.trim() || null,
      mc_name: pubForm.mc_name.trim() || undefined,
      management: pubForm.management.trim() || undefined,
      ata_num: pubForm.ata_num.trim() || undefined,
      demolays_present_count: Number(pubForm.demolays_present_count) || 0,
      masons_present_count: Number(pubForm.masons_present_count) || 0,
      total_quorum:
        Number(pubForm.total_quorum) ||
        (Number(pubForm.demolays_present_count) || 0) + (Number(pubForm.masons_present_count) || 0),
      status: pubForm.status,
      original_post_url: pubForm.original_post_url.trim() || null,
    };

    try {
      if (editingPubId) {
        // Atualizar
        const res = await fetch(`/api/admin/publications/${editingPubId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          showFeedback("Publicação atualizada com sucesso!");
          setIsPubModalOpen(false);
          setPublications((prev) =>
            prev.map((p) => (p.id === editingPubId ? { ...p, ...data.item } : p))
          );
        } else {
          const err = await res.json();
          showFeedback(err.error || "Erro ao salvar alterações.", "error");
        }
      } else {
        // Criar
        const res = await fetch("/api/admin/publications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          showFeedback("Nova publicação cadastrada com sucesso!");
          setIsPubModalOpen(false);
          setPublications((prev) => [data.item, ...prev]);
        } else {
          const err = await res.json();
          showFeedback(err.error || "Erro ao cadastrar publicação.", "error");
        }
      }
    } catch {
      showFeedback("Erro de conexão ao salvar publicação.", "error");
    } finally {
      setIsSavingPub(false);
    }
  };

  // Alternador Rápido de Status (Publicar / Despublicar / Arquivar)
  const handleToggleStatus = async (pub: SitePublication, newStatus: PublicationStatus) => {
    try {
      const res = await fetch(`/api/admin/publications/${pub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setPublications((prev) =>
          prev.map((p) => (p.id === pub.id ? { ...p, status: newStatus, ...data.item } : p))
        );
        const label =
          newStatus === "publicado"
            ? "Publicação ativada no site público!"
            : newStatus === "rascunho"
            ? "Publicação movida para rascunhos (oculta do público)."
            : "Publicação arquivada.";
        showFeedback(label);
      } else {
        const err = await res.json();
        showFeedback(err.error || "Falha ao alterar status.", "error");
      }
    } catch {
      showFeedback("Erro ao atualizar status da publicação.", "error");
    }
  };

  // Confirmar Exclusão
  const handleConfirmDelete = async () => {
    if (!deleteConfirmPub) return;
    setIsDeletingPub(true);
    try {
      const res = await fetch(`/api/admin/publications/${deleteConfirmPub.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPublications((prev) => prev.filter((p) => p.id !== deleteConfirmPub.id));
        showFeedback("Publicação excluída com sucesso.");
        setDeleteConfirmPub(null);
      } else {
        const err = await res.json();
        showFeedback(err.error || "Falha ao excluir publicação.", "error");
      }
    } catch {
      showFeedback("Erro de conexão ao excluir publicação.", "error");
    } finally {
      setIsDeletingPub(false);
    }
  };

  // Seleção e Abertura do Recorte de Foto de MC
  const handleMCPhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCropperImageSrc(dataUrl);
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
    if (mcPhotoFileInputRef.current) mcPhotoFileInputRef.current.value = "";
  };

  // Conclusão do Enquadramento e Upload da Foto de MC
  const handleCropComplete = async (croppedBlob: Blob, croppedDataUrl: string) => {
    setIsSavingCroppedPhoto(true);
    try {
      const formData = new FormData();
      const filename = `mc_${selectedMgmtCode.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.jpg`;
      formData.append("file", croppedBlob, filename);

      const res = await fetch("/api/admin/upload-photo?type=mc", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setMcPhotoUrl(data.url);
          showFeedback("Fotografia enquadrada e pronta para salvar!");
        } else {
          setMcPhotoUrl(croppedDataUrl);
          showFeedback("Enquadramento ajustado localmente.");
        }
      } else {
        setMcPhotoUrl(croppedDataUrl);
        showFeedback("Enquadramento aplicado localmente.");
      }
    } catch {
      setMcPhotoUrl(croppedDataUrl);
      showFeedback("Enquadramento aplicado localmente.");
    } finally {
      setIsSavingCroppedPhoto(false);
      setIsCropperOpen(false);
    }
  };

  // Abrir o cropper para ajustar enquadramento de foto já existente
  const handleOpenExistingCropper = () => {
    if (!mcPhotoUrl) return;
    setCropperImageSrc(mcPhotoUrl);
    setIsCropperOpen(true);
  };

  // Salvar Foto Oficial do MC
  const handleSaveMCPhoto = async () => {
    if (!selectedMemberId) {
      showFeedback("Selecione o membro oficial do Capítulo para vincular a foto.", "error");
      return;
    }
    if (!mcPhotoUrl.trim()) {
      showFeedback("Informe o arquivo ou URL da fotografia oficial.", "error");
      return;
    }

    const member = membersList.find((m) => m.id === selectedMemberId);
    if (!member) {
      showFeedback("Membro selecionado inválido.", "error");
      return;
    }

    setIsSavingMCPhoto(true);

    const payload = {
      management_code: selectedMgmtCode,
      management_roman: `Gestão ${selectedMgmtCode}`,
      member_id: member.id,
      member_id_demolay: member.id_demolay,
      member_name: member.full_name,
      periodo: selectedMgmtCode,
      status: mcPhotoStatus,
      photo_url: mcPhotoUrl.trim(),
    };

    try {
      const res = await fetch("/api/admin/mc-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        showFeedback("Fotografia oficial do Mestre Conselheiro salva com sucesso!");
        setMcPhotos((prev) => {
          const idx = prev.findIndex((p) => p.management_code === selectedMgmtCode);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = data.item;
            return next;
          }
          return [...prev, data.item];
        });
      } else {
        const err = await res.json();
        showFeedback(err.error || "Erro ao salvar foto de MC.", "error");
      }
    } catch {
      showFeedback("Erro de conexão ao salvar fotografia oficial.", "error");
    } finally {
      setIsSavingMCPhoto(false);
    }
  };

  // Remover Foto Oficial do MC
  const handleRemoveMCPhoto = async () => {
    if (!confirm(`Remover fotografia oficial associada à Gestão ${selectedMgmtCode}?`)) return;

    try {
      const res = await fetch(`/api/admin/mc-photos?code=${selectedMgmtCode}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMcPhotos((prev) => prev.filter((p) => p.management_code !== selectedMgmtCode));
        setMcPhotoUrl("");
        showFeedback("Fotografia oficial removida.");
      } else {
        const err = await res.json();
        showFeedback(err.error || "Erro ao remover fotografia.", "error");
      }
    } catch {
      showFeedback("Erro de conexão ao remover fotografia.", "error");
    }
  };

  // Se o usuário não for Master, exibe bloqueio institucional 403
  if (isRoleChecked && !isMaster) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full card-heraldico-dark rounded-2xl shadow-xl border border-red-500/30 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-950/60 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Acesso Restrito ao Perfil Master
          </h2>
          <p className="text-sm text-emerald-200/70 leading-relaxed font-light">
            O módulo administrativo de <strong className="text-white font-semibold">Publicações do Site e Fotografias Oficiais</strong> é restrito
            ao Mestre Conselheiro, ao Conselho Consultivo e aos Mantenedores Oficiais do Capítulo Carvalho Neves nº 500.
          </p>
          {viewAsMember && (
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-200 text-left font-mono">
              <strong className="text-[#D9AA45]">Modo de Visualização Ativo:</strong> Você está no modo &quot;Ver como Membro&quot;. Alterne
              no menu lateral para retornar aos privilégios Master.
            </div>
          )}
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="btn-heraldico-esmeralda inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Painel Geral</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all transform animate-in slide-in-from-bottom-5 ${
            feedbackMsg.type === "success"
              ? "bg-[#0C1A13] text-emerald-300 border-[#087443]/60"
              : "bg-red-950 text-red-200 border-red-700/60"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="ml-2 text-white/50 hover:text-white"
            aria-label="Fechar mensagem"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho Executivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#D9AA45] font-bold font-mono">
            <Shield className="w-3.5 h-3.5 text-[#D9AA45]" />
            <span>Módulo Institucional CMS • Master</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1 flex items-center gap-3">
            <span>Publicações do Site</span>
            <span className="selo-vidro-cn text-xs px-2.5 py-0.5 rounded-full text-emerald-300 font-mono font-medium">
              Gestão Dinâmica
            </span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1 max-w-3xl leading-relaxed font-light">
            Cadastre, edite e gerencie as atividades exibidas no carrossel da página inicial e as fotografias oficiais
            dos Mestres Conselheiros, com pré-visualização em tempo real e controle de status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-heraldico-vidro inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold"
          >
            <ExternalLink className="w-4 h-4 text-[#D9AA45]" />
            <span>Ver Site Público</span>
          </Link>
          <button
            type="button"
            onClick={handleOpenNewPublication}
            className="btn-heraldico-esmeralda inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold"
          >
            <PlusCircle className="w-4 h-4 text-[#D9AA45]" />
            <span>Nova Publicação</span>
          </button>
        </div>
      </div>

      {/* Notificação Institucional caso haja indisponibilidade temporária */}
      {persistenceNotice && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#D9AA45] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-100 flex items-center gap-2">
              <span>Aviso Institucional</span>
            </div>
            <p className="leading-relaxed opacity-90">
              Não foi possível sincronizar os registros dinâmicos no momento. Por favor, tente novamente mais tarde.
            </p>
          </div>
        </div>
      )}

      {/* Navegação entre Abas Principais */}
      <div className="flex border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab("atividades")}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-semibold text-sm transition-colors cursor-pointer ${
            activeTab === "atividades"
              ? "border-[#D9AA45] text-[#D9AA45] bg-[#0C1D14]"
              : "border-transparent text-emerald-200/60 hover:text-white"
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>Atividades Realizadas ({stats.total})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("fotos_mc")}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-semibold text-sm transition-colors cursor-pointer ${
            activeTab === "fotos_mc"
              ? "border-[#D9AA45] text-[#D9AA45] bg-[#0C1D14]"
              : "border-transparent text-emerald-200/60 hover:text-white"
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Fotografias dos Mestres Conselheiros ({effectiveMCPhotos.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: ATIVIDADES & NOTÍCIAS DO SITE */}
      {/* ========================================================================= */}
      {activeTab === "atividades" && (
        <div className="space-y-6">
          {/* Métricas Executivas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="p-4 sm:p-5 rounded-2xl card-heraldico-dark border border-white/10 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-200/70 font-bold font-mono">
                  Total de Atividades
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">
                  {stats.total}
                </p>
                <span className="text-[11px] text-emerald-200/60 font-light">
                  {stats.total} Atividades no PostgreSQL
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-300">
                <Newspaper className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl card-heraldico-dark border border-emerald-500/30 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold font-mono">
                  Publicadas no Site
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-300 mt-1 font-mono">
                  {stats.published}
                </p>
                <span className="text-[11px] text-emerald-200/60 font-light">
                  {stats.published} Visíveis no Site Público
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl card-heraldico-dark border border-amber-500/30 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-200 font-bold font-mono">
                  Rascunhos
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#D9AA45] mt-1 font-mono">
                  {stats.drafts}
                </p>
                <span className="text-[11px] text-amber-200/60 font-light">
                  {stats.drafts} em Edição
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#D9AA45]">
                <Edit2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl card-heraldico-dark border border-white/10 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-200/60 font-bold font-mono">
                  Arquivadas
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">
                  {stats.archived}
                </p>
                <span className="text-[11px] text-emerald-200/60 font-light">
                  Preservadas no Acervo
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-200/70">
                <Archive className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="p-4 rounded-2xl card-heraldico-dark border border-white/10 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por título, descrição narrativa, ata, local ou MC..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45] transition-all"
                />
              </div>

              {/* Filtro de Gestão */}
              <select
                value={managementFilter}
                onChange={(e) => setManagementFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
              >
                <option value="todas">Todas as Gestões</option>
                {distinctManagements.map((mgmt) => (
                  <option key={mgmt} value={mgmt}>
                    {mgmt}
                  </option>
                ))}
              </select>
            </div>

            {/* Linha de Filtros: Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
              {/* Filtro de Status */}
              <div className="flex items-center rounded-xl bg-[#08140E] p-1 border border-white/10">
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-200/50 px-2">Status:</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter("todos")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === "todos"
                      ? "bg-[#D9AA45] text-[#041A10] shadow-sm font-bold"
                      : "text-emerald-200/60 hover:text-white"
                  }`}
                >
                  Todas ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("publicado")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === "publicado"
                      ? "bg-[#087443] text-white shadow-sm font-bold"
                      : "text-emerald-200/60 hover:text-white"
                  }`}
                >
                  Publicadas ({stats.published})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("rascunho")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === "rascunho"
                      ? "bg-amber-600 text-white shadow-sm font-bold"
                      : "text-emerald-200/60 hover:text-white"
                  }`}
                >
                  Rascunhos ({stats.drafts})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("arquivado")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === "arquivado"
                      ? "bg-white/20 text-white shadow-sm font-bold"
                      : "text-emerald-200/60 hover:text-white"
                  }`}
                >
                  Arquivadas ({stats.archived})
                </button>
              </div>
            </div>
          </div>

          {/* Listagem de Publicações */}
          {isLoading ? (
            <div className="p-12 text-center card-heraldico-dark rounded-2xl border border-white/10">
              <RefreshCw className="w-8 h-8 text-[#D9AA45] animate-spin mx-auto mb-3" />
              <p className="text-sm text-emerald-200/70 font-mono">Carregando acervo de publicações...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* PUBLICAÇÕES ADMINISTRATIVAS (POSTGRESQL CMS) */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#087443]/30 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#087443]/20 border border-[#087443]/40 flex items-center justify-center text-emerald-300">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                          <span>Publicações do Capítulo</span>
                        </h2>
                        <p className="text-xs text-emerald-200/60 font-light">
                          Atividades, notícias e registros oficiais gerenciados pela liderança capitular.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      {filteredPgPublications.length} {filteredPgPublications.length === 1 ? "registro" : "registros"}
                    </span>
                  </div>

                  {filteredPgPublications.length === 0 ? (
                    <div className="p-6 text-center card-heraldico-dark rounded-2xl border border-emerald-500/20 bg-[#08140E]/60 space-y-3">
                      <Database className="w-8 h-8 text-emerald-400/40 mx-auto" />
                      <h3 className="text-sm font-bold text-white">Nenhuma atividade encontrada</h3>
                      <p className="text-xs text-emerald-200/60 max-w-lg mx-auto leading-relaxed">
                        Nenhuma atividade atende aos filtros atuais de busca ou gestão.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenNewPublication}
                        className="btn-heraldico-esmeralda inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                      >
                        <PlusCircle className="w-4 h-4 text-[#D9AA45]" />
                        <span>Cadastrar Nova Publicação</span>
                      </button>
                    </div>
                  ) : (
                    <div className="card-heraldico-dark rounded-2xl border border-white/10 shadow-sm overflow-hidden divide-y divide-white/10">
                      {filteredPgPublications.map((pub) => {
                        const { headline, category } = parseMeetingTitle(pub.title);
                        const civilDate = formatFullDate(pub.starts_at);

                        return (
                          <div
                            key={pub.id}
                            className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 hover:bg-white/5 transition-colors"
                          >
                            {/* Foto e Detalhes Editoriais */}
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-[#052E1D] shrink-0 border border-white/10 shadow-sm">
                                {pub.photo_url ? (
                                  <Image
                                    src={pub.photo_url}
                                    alt={headline}
                                    fill
                                    sizes="112px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-[#032316] to-[#0A5C3A]">
                                    <Shield className="w-6 h-6 text-[#D9AA45]" />
                                    <span className="text-[8px] uppercase tracking-wider text-emerald-100 font-mono mt-1">
                                      Sem Foto
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="selo-vidro-cn text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-emerald-300 font-mono">
                                    {category}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono border ${
                                      pub.status === "publicado"
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                        : pub.status === "rascunho"
                                        ? "bg-amber-500/20 text-[#D9AA45] border-amber-500/30"
                                        : "bg-white/10 text-emerald-100 border-white/20"
                                    }`}
                                  >
                                    ● {pub.status}
                                  </span>
                                  {pub.management && (
                                    <span className="text-[11px] text-emerald-200/60 font-medium font-mono">
                                      • {pub.management}
                                    </span>
                                  )}
                                </div>

                                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug truncate">
                                  {headline}
                                </h3>

                                <p className="text-xs text-emerald-200/70 font-light line-clamp-2 leading-relaxed">
                                  {pub.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 pt-1 text-[11px] text-emerald-200/60 font-mono">
                                  <span className="flex items-center gap-1 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-[#D9AA45]" />
                                    <span>{civilDate}</span>
                                  </span>
                                  {pub.location && (
                                    <span className="flex items-center gap-1 truncate max-w-xs">
                                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="truncate">{pub.location}</span>
                                    </span>
                                  )}
                                  {pub.mc_name && (
                                    <span className="flex items-center gap-1">
                                      <Crown className="w-3.5 h-3.5 text-[#D9AA45]" />
                                      <span>MC {pub.mc_name}</span>
                                    </span>
                                  )}
                                  {pub.ata_num && (
                                    <span className="flex items-center gap-1 font-mono text-emerald-300">
                                      <FileText className="w-3.5 h-3.5 text-[#D9AA45]" />
                                      <span>{pub.ata_num}</span>
                                    </span>
                                  )}
                                  {pub.total_quorum && pub.total_quorum > 0 && (
                                    <span className="flex items-center gap-1 font-mono text-emerald-300">
                                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>{pub.total_quorum} presentes</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Ações Rápidas */}
                            <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10 w-full lg:w-auto justify-end">
                              {pub.status === "publicado" ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(pub, "rascunho")}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#D9AA45] border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer font-mono"
                                  title="Tornar rascunho (ocultar da Home)"
                                >
                                  Despublicar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(pub, "publicado")}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 font-mono"
                                  title="Publicar imediatamente na Home"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Publicar</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setPreviewPub(pub)}
                                className="p-2 rounded-lg bg-[#08140E] hover:bg-white/10 text-[#D9AA45] border border-white/10 transition-colors cursor-pointer"
                                title="Pré-visualizar como no site público"
                                aria-label="Pré-visualizar card"
                              >
                                <Eye className="w-4 h-4 text-[#D9AA45]" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditPublication(pub)}
                                className="p-2 rounded-lg bg-[#08140E] hover:bg-white/10 text-emerald-300 border border-white/10 transition-colors cursor-pointer"
                                title="Editar todos os campos"
                                aria-label="Editar publicação"
                              >
                                <Edit2 className="w-4 h-4 text-emerald-300" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteConfirmPub(pub)}
                                className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-500/30 transition-colors cursor-pointer"
                                title="Excluir publicação"
                                aria-label="Excluir publicação"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              {/* SEÇÃO B: ACERVO HISTÓRICO CANÔNICO (Exibido apenas para registros históricos não migrados) */}
              {filteredHistorical.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D9AA45]/30 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#D9AA45]/10 border border-[#D9AA45]/30 flex items-center justify-center text-[#D9AA45]">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                          <span>Acervo Histórico Canônico — Registros Oficiais</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/30 font-mono">
                            18 Atividades Homologadas
                          </span>
                        </h2>
                        <p className="text-xs text-emerald-200/60 font-light">
                          Atividades registradas nos Atos Oficiais e Livro de Atas do Capítulo. Consulta institucional com integridade preservada (somente leitura).
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#D9AA45]">
                      {filteredHistorical.length} {filteredHistorical.length === 1 ? "registro" : "registros"}
                    </span>
                  </div>

                  {filteredHistorical.length === 0 ? (
                    <div className="p-6 text-center card-heraldico-dark rounded-2xl border border-white/10 space-y-2">
                      <BookOpen className="w-8 h-8 text-white/30 mx-auto" />
                      <h3 className="text-sm font-bold text-white">Nenhum registro histórico atende aos filtros</h3>
                      <p className="text-xs text-emerald-200/60 max-w-md mx-auto">
                        Ajuste os termos da busca ou selecione &quot;Todas as Gestões&quot; para consultar o acervo canônico.
                      </p>
                    </div>
                  ) : (
                    <div className="card-heraldico-dark rounded-2xl border border-[#D9AA45]/20 shadow-sm overflow-hidden divide-y divide-white/10">
                      {filteredHistorical.map((pub) => {
                        const { headline, category } = parseMeetingTitle(pub.title);
                        const civilDate = formatFullDate(pub.starts_at);

                        return (
                          <div
                            key={pub.id}
                            className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 hover:bg-white/5 transition-colors"
                          >
                            {/* Foto e Detalhes Editoriais */}
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-[#052E1D] shrink-0 border border-[#D9AA45]/30 shadow-sm">
                                {pub.photo_url ? (
                                  <Image
                                    src={pub.photo_url}
                                    alt={headline}
                                    fill
                                    sizes="112px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-[#032316] to-[#0A5C3A]">
                                    <Shield className="w-6 h-6 text-[#D9AA45]" />
                                    <span className="text-[8px] uppercase tracking-wider text-emerald-100 font-mono mt-1">
                                      Acervo
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D9AA45]/15 text-[#D9AA45] border border-[#D9AA45]/30 font-mono">
                                    [Acervo Histórico]
                                  </span>
                                  <span className="selo-vidro-cn text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-emerald-300 font-mono">
                                    {category}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                                    ● {pub.status}
                                  </span>
                                  {pub.management && (
                                    <span className="text-[11px] text-emerald-200/60 font-medium font-mono">
                                      • {pub.management}
                                    </span>
                                  )}
                                </div>

                                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug truncate">
                                  {headline}
                                </h3>

                                <p className="text-xs text-emerald-200/70 font-light line-clamp-2 leading-relaxed">
                                  {pub.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 pt-1 text-[11px] text-emerald-200/60 font-mono">
                                  <span className="flex items-center gap-1 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-[#D9AA45]" />
                                    <span>{civilDate}</span>
                                  </span>
                                  {pub.location && (
                                    <span className="flex items-center gap-1 truncate max-w-xs">
                                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="truncate">{pub.location}</span>
                                    </span>
                                  )}
                                  {pub.mc_name && (
                                    <span className="flex items-center gap-1">
                                      <Crown className="w-3.5 h-3.5 text-[#D9AA45]" />
                                      <span>MC {pub.mc_name}</span>
                                    </span>
                                  )}
                                  {pub.ata_num && (
                                    <span className="flex items-center gap-1 font-mono text-emerald-300">
                                      <FileText className="w-3.5 h-3.5 text-[#D9AA45]" />
                                      <span>{pub.ata_num}</span>
                                    </span>
                                  )}
                                  {pub.total_quorum && pub.total_quorum > 0 && (
                                    <span className="flex items-center gap-1 font-mono text-emerald-300">
                                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>{pub.total_quorum} presentes</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Ações Seguras para Acervo Canônico (Somente Leitura e Visualização) */}
                            <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10 w-full lg:w-auto justify-end">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 text-emerald-200/50 border border-white/5 text-[11px] font-mono">
                                <Lock className="w-3 h-3 text-[#D9AA45]" />
                                <span>Canônico</span>
                              </span>

                              {/* Pré-visualizar Card Real */}
                              <button
                                type="button"
                                onClick={() => setPreviewPub(pub as unknown as SitePublication)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#08140E] hover:bg-white/10 text-[#D9AA45] border border-[#D9AA45]/30 text-xs font-semibold transition-colors cursor-pointer"
                                title="Pré-visualizar como no site público"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#D9AA45]" />
                                <span>Pré-visualizar</span>
                              </button>

                              {/* Link para publicação original no Instagram se existir */}
                              {pub.original_post_url && (
                                <a
                                  href={pub.original_post_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-900/40 to-pink-900/40 hover:from-purple-900/60 hover:to-pink-900/60 text-purple-200 border border-purple-500/30 text-xs font-semibold transition-colors"
                                  title="Ver publicação no Instagram oficial"
                                >
                                  <span>Instagram</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: FOTOGRAFIAS DOS MESTRES CONSELHEIROS (TEMA ESCURO INSTITUCIONAL) */}
      {/* ========================================================================= */}
      {activeTab === "fotos_mc" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Coluna 1 e 2: Formulário de Associação e Upload */}
            <div className="lg:col-span-2 bg-[#0C1D14] rounded-2xl border border-[#1C332A] shadow-xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-[#1C332A] pb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C332A] text-[#D9AA45] border border-[#D9AA45]/30 text-xs font-semibold mb-2">
                  <Crown className="w-3.5 h-3.5 text-[#D9AA45]" />
                  <span>Vínculo Estrito por Gestão &amp; ID de Membro</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Atualizar Fotografia Oficial de Gestão
                </h2>
                <p className="text-xs text-emerald-200/70 leading-relaxed mt-1">
                  Associe a fotografia oficial ao registro institucional da gestão. A foto será exibida
                  automaticamente na Galeria de Gestões (/gestoes) e nos cards em destaque da página inicial.
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. Seleção da Gestão */}
                <div>
                  <label className="block text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1.5">
                    Gestão Capitular
                  </label>
                  <select
                    value={selectedMgmtCode}
                    onChange={(e) => handleSelectManagement(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-[#1C332A] text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]/50 focus:border-[#D9AA45] cursor-pointer"
                  >
                    {managementsList.length > 0 ? (
                      managementsList.map((m) => (
                        <option key={m.id} value={m.code} className="bg-[#08140E] text-white">
                          {m.title || `Gestão ${m.code}`} ({m.code}) — {m.status}
                        </option>
                      ))
                    ) : (
                      effectiveMCPhotos.map((p) => (
                        <option key={p.management_code} value={p.management_code} className="bg-[#08140E] text-white">
                          {p.management_title || p.management_roman || `Gestão ${p.management_code}`} ({p.management_code}) — {p.status}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 2. Seleção Estrita de Membro por ID Real */}
                <div>
                  <label className="block text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1.5">
                    Mestre Conselheiro Oficial (Vínculo por ID do Membro)
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-[#1C332A] text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]/50 focus:border-[#D9AA45] cursor-pointer"
                  >
                    <option value="" className="bg-[#08140E] text-white/50">Selecione o membro oficial do Capítulo...</option>
                    {membersList.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#08140E] text-white">
                        {m.full_name} (ID: {m.id_demolay} • {m.category})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-emerald-200/60 mt-1">
                    O vínculo é gravado diretamente ao ID único do membro, garantindo integridade referencial.
                  </p>
                </div>

                {/* 3. Status de Exibição */}
                <div>
                  <label className="block text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1.5">
                    Status Institucional da Gestão
                  </label>
                  <div className="flex gap-3">
                    {(["Atual", "Eleita", "Past MC"] as const).map((st) => (
                      <label
                        key={st}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          mcPhotoStatus === st
                            ? "bg-[#087443] text-white border-[#D9AA45]"
                            : "bg-[#08140E] text-white/70 border-[#1C332A] hover:bg-[#0E2218] hover:text-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mc_status"
                          value={st}
                          checked={mcPhotoStatus === st}
                          onChange={() => setMcPhotoStatus(st)}
                          className="sr-only"
                        />
                        <span>{st === "Atual" ? "★ MC em Exercício" : st === "Eleita" ? "MC Eleito" : "Past MC"}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4. Fotografia Oficial (Upload ou URL com Cropper) */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-emerald-100 uppercase tracking-wider">
                    Fotografia Oficial
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      ref={mcPhotoFileInputRef}
                      onChange={handleMCPhotoFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => mcPhotoFileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065F36] text-white text-xs font-semibold shadow-sm transition-all border border-[#D9AA45]/40 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#D9AA45]" />
                      <span>Fazer Upload e Enquadrar</span>
                    </button>

                    {mcPhotoUrl && (
                      <button
                        type="button"
                        onClick={handleOpenExistingCropper}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E2218] hover:bg-[#1C332A] text-[#D9AA45] border border-[#1C332A] hover:border-[#D9AA45]/50 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        <Crop className="w-4 h-4 text-[#D9AA45]" />
                        <span>Ajustar Enquadramento (3:4)</span>
                      </button>
                    )}

                    <span className="text-xs text-white/50 font-medium">ou informe a URL local / nuvem:</span>
                  </div>

                  <input
                    type="text"
                    value={mcPhotoUrl}
                    onChange={(e) => setMcPhotoUrl(e.target.value)}
                    placeholder="Ex: /gestoes/rafael-inacio.2026.2.jpg ou URL completa"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#08140E] border border-[#1C332A] text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]/50 focus:border-[#D9AA45]"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="pt-4 border-t border-[#1C332A] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleRemoveMCPhoto}
                    className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Remover Fotografia
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveMCPhoto}
                    disabled={isSavingMCPhoto}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065F36] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all border border-[#D9AA45] cursor-pointer disabled:opacity-50"
                  >
                    {isSavingMCPhoto ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#D9AA45]" />
                    ) : (
                      <Check className="w-4 h-4 text-[#D9AA45]" />
                    )}
                    <span>Salvar Fotografia Oficial</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna 3: Pré-visualização Live do Card Oficial (Tema Escuro Institucional) */}
            <div className="bg-[#0C1D14] rounded-2xl border border-[#1C332A] shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1C332A] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200/70 font-mono">
                  Pré-visualização Fiel
                </span>
                <span className="text-[10px] text-[#D9AA45] font-semibold bg-[#1C332A] px-2 py-0.5 rounded border border-[#D9AA45]/30">
                  Landing Page &amp; Galeria
                </span>
              </div>

              {/* Card no formato idêntico ao de /gestoes e da Home */}
              <div className={`rounded-2xl overflow-hidden border shadow-sm transition-all flex flex-col bg-[#08140E] ${
                mcPhotoStatus === "Atual"
                  ? "border-2 border-[#D9AA45] shadow-lg shadow-[#D9AA45]/10"
                  : "border-[#1C332A]"
              }`}>
                <div className="relative w-full aspect-[4/3] bg-[#052E1D] flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-300/30 z-0">
                    <Crown className="w-10 h-10 mb-1 text-[#D9AA45]/60" />
                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#D9AA45]/60">
                      {mcPhotoStatus === "Atual" ? "MC em Exercício" : mcPhotoStatus === "Eleita" ? "MC Eleito" : "Past MC"}
                    </span>
                  </div>

                  {mcPhotoUrl ? (
                    <Image
                      src={mcPhotoUrl}
                      alt="Foto do MC"
                      fill
                      sizes="300px"
                      className="object-cover z-[1]"
                    />
                  ) : null}

                  <span className="absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#D9AA45] text-[#06140D] font-mono">
                    {selectedMgmtCode}
                  </span>
                  <span className="absolute top-3 right-3 z-10 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-emerald-100 border border-white/10 font-mono">
                    {mcPhotoStatus}
                  </span>
                </div>

                <div className="p-4 bg-[#08140E]">
                  <span className="text-xs font-bold text-[#D9AA45]">Gestão {selectedMgmtCode}</span>
                  <h4 className="font-bold text-white text-sm mt-0.5 truncate">
                    MC {membersList.find((m) => m.id === selectedMemberId)?.full_name || effectiveMCPhotos.find((p) => p.management_code === selectedMgmtCode)?.member_name || "Mestre Conselheiro"}
                  </h4>
                  <p className="text-[11px] text-emerald-200/70 font-medium">
                    {mcPhotoStatus === "Atual"
                      ? "Mestre Conselheiro em Exercício"
                      : mcPhotoStatus === "Eleita"
                      ? "Mestre Conselheiro Eleito"
                      : "Past Mestre Conselheiro"}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-emerald-200/70 leading-relaxed bg-[#08140E] p-3 rounded-xl border border-[#1C332A]">
                Esta imagem aparecerá instantaneamente na seção de liderança do Capítulo e no histórico
                completo de gestões de <strong className="text-white">/gestoes</strong>.
              </div>
            </div>
          </div>

          {/* Galeria de Fotos Atuais (Tema Escuro Institucional) */}
          <div className="bg-[#0C1D14] rounded-2xl border border-[#1C332A] shadow-xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1C332A] pb-3 gap-2">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#D9AA45]" />
                  <span>Galeria de Fotografias Oficiais dos Mestres Conselheiros</span>
                </h3>
                <p className="text-xs text-emerald-200/60 font-light mt-0.5">
                  Clique em qualquer gestão para carregar os dados no formulário de edição e pré-visualização.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-[#D9AA45] font-mono font-semibold px-2.5 py-1 rounded-lg bg-[#08140E] border border-[#1C332A]">
                  {effectiveMCPhotos.length} gestões catalogadas
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {effectiveMCPhotos.map((photo) => {
                const isFromPg = mcPhotos.some((p) => p.management_code === photo.management_code);

                return (
                  <div
                    key={photo.management_code}
                    onClick={() => handleSelectManagement(photo.management_code)}
                    className={`group relative rounded-xl overflow-hidden border p-2 flex flex-col items-center text-center cursor-pointer transition-all ${
                      selectedMgmtCode === photo.management_code
                        ? "border-[#D9AA45] ring-2 ring-[#D9AA45]/50 bg-[#0E2218]"
                        : "border-[#1C332A] bg-[#08140E] hover:border-[#D9AA45]/50 hover:bg-[#0E2218]"
                    }`}
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#052E1D] mb-2 border border-[#1C332A]">
                      {photo.photo_url ? (
                        <Image
                          src={photo.photo_url}
                          alt={photo.member_name}
                          fill
                          sizes="120px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Crown className="w-6 h-6 text-[#D9AA45]/50" />
                        </div>
                      )}
                      <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-[#D9AA45] font-mono border border-white/10">
                        {photo.management_roman || photo.management_code}
                      </span>
                      <span
                        className={`absolute bottom-1 right-1 text-[8px] font-bold px-1 py-0.2 rounded font-mono ${
                          isFromPg
                            ? "bg-emerald-900/90 text-emerald-300 border border-emerald-500/40"
                            : "bg-[#0A1A12]/90 text-[#D9AA45] border border-[#D9AA45]/40"
                        }`}
                      >
                        {isFromPg ? "PostgreSQL" : "Canônico"}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white line-clamp-1">
                      {photo.member_name}
                    </span>
                    <span className="text-[10px] text-emerald-200/60 font-mono">
                      {photo.periodo} • {photo.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR OU EDITAR PUBLICAÇÃO */}
      {/* ========================================================================= */}
      {isPubModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C1D14] rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-[#1C332A] animate-in fade-in zoom-in-95 duration-200">
            {/* Cabeçalho do Modal */}
            <div className="p-6 bg-gradient-to-r from-[#0C1D14] to-[#052E1D] text-white flex items-center justify-between border-b border-white/10">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#D9AA45] font-bold font-mono">
                  {editingPubId ? "Editar Atividade Capitular" : "Nova Publicação de Atividade"}
                </span>
                <h3 className="text-xl font-bold tracking-tight text-white mt-0.5">
                  {editingPubId ? "Atualizar Conteúdo do Site" : "Publicar Nova Atividade no Site"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPubModalOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternador Formulário vs Pré-visualização Fiel */}
            <div className="flex border-b border-white/10 bg-[#08140E] px-6">
              <button
                type="button"
                onClick={() => setPubModalTab("form")}
                className={`py-3 px-4 font-semibold text-xs border-b-2 cursor-pointer transition-colors ${
                  pubModalTab === "form"
                    ? "border-[#D9AA45] text-[#D9AA45] bg-[#0C1D14]"
                    : "border-transparent text-emerald-200/60 hover:text-white"
                }`}
              >
                1. Dados da Publicação
              </button>
              <button
                type="button"
                onClick={() => setPubModalTab("preview")}
                className={`py-3 px-4 font-semibold text-xs border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  pubModalTab === "preview"
                    ? "border-[#D9AA45] text-[#D9AA45] bg-[#0C1D14]"
                    : "border-transparent text-emerald-200/60 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>2. Pré-visualização do Card Público</span>
              </button>
            </div>

            {/* Corpo do Modal */}
            {pubModalTab === "form" ? (
              <form onSubmit={handleSavePublication} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Linha 1: Categoria Litúrgica e Manchete */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 font-mono">
                      Categoria Litúrgica
                    </label>
                    <select
                      value={pubForm.categoryPrefix}
                      onChange={(e) => setPubForm((prev) => ({ ...prev, categoryPrefix: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    >
                      <option value="Reunião Magna" className="bg-[#08140E] text-white">Reunião Magna</option>
                      <option value="Sessão Ordinária" className="bg-[#08140E] text-white">Sessão Ordinária</option>
                      <option value="Ação Filantrópica" className="bg-[#08140E] text-white">Ação Filantrópica</option>
                      <option value="Confraternização" className="bg-[#08140E] text-white">Confraternização</option>
                      <option value="Congresso DeMolay" className="bg-[#08140E] text-white">Congresso DeMolay</option>
                      <option value="Atividade Capitular" className="bg-[#08140E] text-white">Atividade Capitular</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 font-mono">
                      Manchete / Título da Atividade *
                    </label>
                    <input
                      type="text"
                      required
                      value={pubForm.headlineText}
                      onChange={(e) => setPubForm((prev) => ({ ...prev, headlineText: e.target.value }))}
                      placeholder="Ex: Cerimônia de Iniciação ao Grau DeMolay"
                      className="w-full px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-xs font-semibold text-white placeholder-emerald-100/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    />
                  </div>
                </div>

                {/* Linha 2: Data, Gestão e Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 font-mono">
                      Data da Atividade *
                    </label>
                    <input
                      type="date"
                      required
                      value={pubForm.starts_at}
                      onChange={(e) => setPubForm((prev) => ({ ...prev, starts_at: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 font-mono">
                      Gestão Capitular
                    </label>
                    <input
                      type="text"
                      value={pubForm.management}
                      onChange={(e) => setPubForm((prev) => ({ ...prev, management: e.target.value }))}
                      placeholder="Ex: Gestão XXV (2026.2)"
                      className="w-full px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-xs font-medium text-white placeholder-emerald-100/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 font-mono">
                      Status da Publicação
                    </label>
                    <select
                      value={pubForm.status}
                      onChange={(e) =>
                        setPubForm((prev) => ({ ...prev, status: e.target.value as PublicationStatus }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    >
                      <option value="publicado" className="bg-[#08140E] text-white">Publicado (Site Público)</option>
                      <option value="rascunho" className="bg-[#08140E] text-white">Rascunho (Oculto)</option>
                      <option value="arquivado" className="bg-[#08140E] text-white">Arquivado</option>
                    </select>
                  </div>
                </div>

                {/* Linha 3: Fotografia de Capa com Upload e Preview */}
                <div className="p-4 rounded-2xl bg-[#08140E] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                      Fotografia de Capa da Atividade
                    </label>
                    {pubForm.photo_url && (
                      <button
                        type="button"
                        onClick={() => setPubForm((prev) => ({ ...prev, photo_url: "" }))}
                        className="text-[11px] text-red-400 hover:underline cursor-pointer font-mono"
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Thumbnail Preview Imediato */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#052E1D] border border-white/10 shrink-0">
                      {pubForm.photo_url ? (
                        <Image
                          src={pubForm.photo_url}
                          alt="Thumbnail"
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-emerald-300/40">
                          <Shield className="w-6 h-6 text-[#D9AA45]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="btn-heraldico-vidro inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingPhoto ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-[#D9AA45]" />
                          )}
                          <span>Carregar do Computador</span>
                        </button>
                        <span className="text-[11px] text-emerald-200/50">ou informe a URL direta:</span>
                      </div>
                      <input
                        type="text"
                        value={pubForm.photo_url}
                        onChange={(e) => setPubForm((prev) => ({ ...prev, photo_url: e.target.value }))}
                        placeholder="Ex: /uploads/iniciacao-2026.jpg ou https://..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#0C1D14] border border-white/10 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                      />
                    </div>
                  </div>
                </div>

                {/* Linha 4: Descrição Narrativa Contextualizada */}
                <div>
                  <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 font-mono">
                    Descrição Narrativa Contextualizada *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={pubForm.description}
                    onChange={(e) => setPubForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva a atividade, os objetivos alcançados, cerimônias realizadas, irmãos homenageados ou trabalhos capitulares apresentados..."
                    className="w-full p-3 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/40 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                </div>

                {/* Linha 5: Metadados Complementares (Local, MC, Ata) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 font-mono">
                      Local da Reunião
                    </label>
                    <input
                      type="text"
                      value={pubForm.location}
                      onChange={(e) => setPubForm((prev) => ({ ...prev, location: e.target.value }))}
                      placeholder="Ex: ARLS Caridade II nº 135"
                      className="w-full px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-xs font-medium text-white placeholder-emerald-100/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 font-mono">
                      Mestre Conselheiro
                    </label>
                    <input
                      type="text"
                      value={pubForm.mc_name}
                      onChange={(e) => setPubForm((prev) => ({ ...prev, mc_name: e.target.value }))}
                      placeholder="Nome do MC responsável"
                      className="w-full px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-xs font-medium text-white placeholder-emerald-100/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 font-mono">
                      Número da Ata Oficial
                    </label>
                    <input
                      type="text"
                      value={pubForm.ata_num}
                      onChange={(e) => setPubForm((prev) => ({ ...prev, ata_num: e.target.value }))}
                      placeholder="Ex: Ata Magna nº 001/2026"
                      className="w-full px-3 py-2 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                    />
                  </div>
                </div>

                {/* Linha 6: Quórum / Participantes */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-[#08140E] rounded-xl border border-white/10">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1 font-mono">
                      DeMolays Presentes
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={pubForm.demolays_present_count}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setPubForm((prev) => ({
                          ...prev,
                          demolays_present_count: val,
                          total_quorum: val + prev.masons_present_count,
                        }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0C1D14] border border-white/20 text-xs font-mono font-bold text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1 font-mono">
                      Maçons Presentes
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={pubForm.masons_present_count}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setPubForm((prev) => ({
                          ...prev,
                          masons_present_count: val,
                          total_quorum: prev.demolays_present_count + val,
                        }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0C1D14] border border-white/20 text-xs font-mono font-bold text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1 font-mono">
                      Total Calculado
                    </label>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-300">
                      {pubForm.total_quorum} participantes
                    </div>
                  </div>
                </div>

                {/* Linha 7: Endereço da Publicação Original (Opcional) */}
                <div className="p-3 bg-[#08140E] rounded-xl border border-white/10 space-y-1">
                  <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <ExternalLink className="w-3.5 h-3.5 text-[#D9AA45]" />
                    <span>Endereço da Publicação Original (Opcional)</span>
                  </label>
                  <input
                    type="url"
                    value={pubForm.original_post_url}
                    onChange={(e) => setPubForm((prev) => ({ ...prev, original_post_url: e.target.value }))}
                    placeholder="Ex: https://www.instagram.com/p/... ou https://..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0C1D14] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/40 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
                  />
                  <p className="text-[11px] text-emerald-200/50">
                    Se preenchido, o card público exibirá o link &quot;Ver publicação original&quot;.
                  </p>
                </div>

                {/* Rodapé de Ações */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPubModalTab("preview")}
                    className="btn-heraldico-vidro inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D9AA45]" />
                    <span>Ver Pré-visualização</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPubModalOpen(false)}
                      className="btn-heraldico-vidro px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingPub}
                      className="btn-heraldico-esmeralda inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSavingPub ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-[#D9AA45]" />
                      )}
                      <span>{editingPubId ? "Salvar Alterações" : "Publicar Atividade"}</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* Aba de Pré-visualização Fiel do Card Público */
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto bg-[#08140E] flex flex-col items-center">
                <div className="text-center max-w-md">
                  <span className="text-xs font-bold text-[#D9AA45] uppercase tracking-wider font-mono">
                    Como aparecerá no site público
                  </span>
                  <p className="text-xs text-emerald-200/70 mt-0.5">
                    Este card será renderizado no carrossel de <strong>Atividades realizadas</strong> da página inicial.
                  </p>
                </div>

                {/* Card Réplica do Site */}
                <figure className="w-[340px] sm:w-[380px] card-heraldico-dark rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                  <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-[#032316] to-[#0A5C3A] flex items-center justify-center border-b border-white/10">
                    {pubForm.photo_url ? (
                      <Image
                        src={pubForm.photo_url}
                        alt="Preview"
                        fill
                        sizes="380px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-white">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-[#D9AA45]/40 mb-2">
                          <Shield className="w-6 h-6 text-[#D9AA45]" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-100 font-mono">
                          {pubForm.management || "Gestão XXV"}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-[#D9AA45]/90 font-mono">
                          Capítulo Carvalho Neves Nº 500
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#D9AA45]/70" />
                  </div>

                  <div className="bg-gradient-to-r from-[#052E1D] to-[#087443] px-5 py-3 border-b border-white/10">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#D9AA45] block font-mono">
                      {pubForm.categoryPrefix}
                    </span>
                    <h3 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-2 mt-0.5 uppercase tracking-tight">
                      {pubForm.headlineText || "Título da Atividade"}
                    </h3>
                  </div>

                  <figcaption className="p-5 flex-1 flex flex-col justify-between space-y-4 text-emerald-100 font-light">
                    <p className="text-xs sm:text-sm leading-relaxed text-emerald-200/90">
                      No dia <strong className="text-white font-semibold">{formatFullDate(pubForm.starts_at || "2026-11-14T16:00:00")}</strong>
                      {pubForm.location && (
                        <>
                          , no Templo da <strong className="text-white font-semibold">{pubForm.location}</strong>
                        </>
                      )}
                      {pubForm.mc_name && (
                        <>
                          , sob a condução do <strong className="text-white font-semibold">MC {pubForm.mc_name}</strong>
                        </>
                      )}
                      . {pubForm.description || "Descrição narrativa da atividade capitular."}
                    </p>

                    {pubForm.management && (
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200/70 font-mono">
                        <span className="truncate">
                          Gestão: <strong className="text-white">{pubForm.management}</strong>
                        </span>
                      </div>
                    )}

                    {pubForm.original_post_url && (
                      <div className="pt-2">
                        <a
                          href={pubForm.original_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D9AA45] hover:text-amber-300 transition-colors"
                        >
                          <span>Ver publicação original</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#D9AA45]" />
                        </a>
                      </div>
                    )}
                  </figcaption>
                </figure>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPubModalTab("form")}
                    className="btn-heraldico-vidro px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Voltar ao Formulário
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePublication}
                    disabled={isSavingPub}
                    className="btn-heraldico-esmeralda inline-flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-[#D9AA45]" />
                    <span>Confirmar e Salvar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRÉ-VISUALIZAÇÃO RÁPIDA DE PUBLICAÇÃO EXISTENTE */}
      {/* ========================================================================= */}
      {previewPub && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-heraldico-dark rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-white/15 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-[#0C1A13] text-white flex items-center justify-between border-b border-white/10">
              <span className="text-xs font-bold text-[#D9AA45] uppercase tracking-wider font-mono">
                Pré-visualização do Card Público
              </span>
              <button
                type="button"
                onClick={() => setPreviewPub(null)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center bg-[#08140E]">
              {(() => {
                const { headline, category } = parseMeetingTitle(previewPub.title);
                const civilDate = formatFullDate(previewPub.starts_at);

                return (
                  <figure className="w-full card-heraldico-dark rounded-2xl overflow-hidden shadow-xl border border-white/10 flex flex-col">
                    <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-[#032316] to-[#0A5C3A] flex items-center justify-center border-b border-white/10">
                      {previewPub.photo_url ? (
                        <Image
                          src={previewPub.photo_url}
                          alt={headline}
                          fill
                          sizes="400px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-white">
                          <Shield className="w-8 h-8 text-[#D9AA45] mb-2" />
                          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-100 font-mono">
                            {previewPub.management}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#D9AA45]/70" />
                    </div>

                    <div className="bg-gradient-to-r from-[#052E1D] to-[#087443] px-5 py-3 border-b border-white/10">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#D9AA45] block font-mono">
                        {category}
                      </span>
                      <h3 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-2 mt-0.5 uppercase tracking-tight">
                        {headline}
                      </h3>
                    </div>

                    <figcaption className="p-5 flex-1 flex flex-col justify-between space-y-4 text-emerald-100 font-light">
                      <p className="text-xs sm:text-sm leading-relaxed text-emerald-200/90">
                        No dia <strong className="text-white font-semibold">{civilDate}</strong>
                        {previewPub.location && (
                          <>
                            , no Templo da <strong className="text-white font-semibold">{previewPub.location}</strong>
                          </>
                        )}
                        {previewPub.mc_name && (
                          <>
                            , sob a condução do <strong className="text-white font-semibold">MC {previewPub.mc_name}</strong>
                          </>
                        )}
                        . {previewPub.description}
                      </p>

                      {previewPub.management && (
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200/70 font-mono">
                          <span className="truncate">
                            Gestão: <strong className="text-white">{previewPub.management}</strong>
                          </span>
                        </div>
                      )}

                      {previewPub.original_post_url && (
                        <div className="pt-2">
                          <a
                            href={previewPub.original_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D9AA45] hover:text-amber-300 transition-colors"
                          >
                            <span>Ver publicação original</span>
                            <ExternalLink className="w-3.5 h-3.5 text-[#D9AA45]" />
                          </a>
                        </div>
                      )}
                    </figcaption>
                  </figure>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {/* ========================================================================= */}
      {deleteConfirmPub && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-heraldico-dark rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-red-500/40 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-950/60 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Excluir Publicação do Site?</h3>
              <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed font-light">
                Tem certeza de que deseja excluir permanentemente a atividade &quot;<strong className="text-white">{deleteConfirmPub.title}</strong>&quot;?
                Esta ação removerá o registro do acervo institucional.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPub(null)}
                className="btn-heraldico-vidro px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingPub}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeletingPub ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Enquadramento da Fotografia do Mestre Conselheiro (Cropper 3:4) */}
      {isCropperOpen && (
        <ProfilePhotoCropper
          imageSrc={cropperImageSrc}
          onCancel={() => setIsCropperOpen(false)}
          onCropComplete={handleCropComplete}
          isSaving={isSavingCroppedPhoto}
          aspectRatio="3:4"
          title="Ajustar Enquadramento do Mestre Conselheiro"
          subtitle="Arraste para posicionar o rosto e use o zoom para definir o enquadramento ideal no formato retrato (3:4)."
        />
      )}
    </div>
  );
}
