"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProfilePhotoCropper } from "@/components/ui/ProfilePhotoCropper";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wallet,
  Clock,
  FileText,
  MessageSquare,
  QrCode,
  ExternalLink,
  Shield,
  Award,
  Send,
  Printer,
  Copy,
  Check,
  CalendarCheck,
  UserCheck,
  User,
  Camera,
  Users,
  Download,
  MapPin,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { HISTORICAL_MEETINGS } from "@/lib/data/historicalMeetings";
import {
  generatePixCopiaECola,
  getPixQrCodeImageUrl,
  getInfinitePayCheckoutUrl,
  OFFICIAL_CHAPTER_PIX_KEY,
} from "@/lib/pix";

interface MemberData {
  id: string;
  id_demolay: string;
  full_name: string;
  category: "demolay_ativo" | "senior_demolay" | "macom" | "irregular";
  regularity?: string;
  masonic_lodge?: string;
  initiation_date?: string;
  demolay_degree_date?: string;
  birth_date?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
}

interface MeetingItem {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  status: string;
  description?: string;
  management?: string;
  ata_pdf_url?: string | null;
  ata_num?: string;
  livro_demolay_page?: string;
  livro_macom_page?: string;
  demolays_present_count?: number;
  masons_present_count?: number;
  total_quorum?: number;
  demolays_present?: string[];
  masons_present?: string[];
}

function deriveManagementFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (year === 2026 && month >= 7) return "Gestão XXV (2026.2)";
  if (year === 2026 && month < 7) return "Gestão XXIV (2026.1)";
  if (year === 2025 && month >= 7) return "Gestão XXIII (2025.2)";
  if (year === 2025 && month < 7) return "Gestão XXII (2025.1)";
  if (year >= 2027) return "Gestão XXVI (2027.1)";
  return "Gestão XXV (2026.2)";
}

interface AttendanceItem {
  id: string;
  meeting_id: string;
  status: "presente" | "ausente" | "justificado";
  rsvp_status?: "pendente" | "confirmado" | "justificado" | "recusado";
  rsvp_notes?: string;
}

interface ChargeItem {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: "pendente" | "aguardando_confirmacao" | "confirmado" | "recusado" | "cancelado" | "estornado";
  paid_at?: string;
  infinitepay_checkout_url?: string;
  pix_qrcode_payload?: string;
}

interface RequestItem {
  id: string;
  protocol: string;
  target_role?: string;
  status: string;
  description: string;
  created_at: string;
}

interface DeclarationContentData {
  solicitante_nome?: string;
  solicitante_id_demolay?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
  data_emissao?: string;
  frequencia_porcentagem?: number | string;
  oficial_responsavel?: {
    nome?: string;
    id_demolay?: string;
    cargo?: string;
  };
}

interface IssuedDeclarationItem {
  id: string;
  declaration_type: string;
  verification_code: string;
  valid_until: string;
  created_at: string;
  period_start?: string;
  period_end?: string;
  content_data?: DeclarationContentData;
}

export default function MemberSelfServicePage() {
  const [currentMember, setCurrentMember] = useState<MemberData | null>(null);
  const [allMembers, setAllMembers] = useState<MemberData[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [attendances, setAttendances] = useState<Record<string, AttendanceItem>>({});
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [declarations, setDeclarations] = useState<IssuedDeclarationItem[]>([]);
  const [selectedMeetingForQuorum, setSelectedMeetingForQuorum] = useState<MeetingItem | null>(null);

  // Filtros de Data de Assiduidade e Gestão Ativa (Instalação Oficial: 08/08/2026)
  const [dateFilterStart, setDateFilterStart] = useState("2026-08-08");
  const [dateFilterEnd, setDateFilterEnd] = useState("2026-12-31");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  // Múltiplas Mensalidades / Pagamento em Lote
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [isBatchPaying, setIsBatchPaying] = useState(false);
  const [batchPaymentData, setBatchPaymentData] = useState<{
    totalAmount: number;
    count: number;
    chargeIds: string[];
    descriptions: string[];
    pixPayload: string;
    pixQrCodeUrl: string;
    infinitePayUrl: string;
    txid: string;
  } | null>(null);
  const [isBatchPayModalOpen, setIsBatchPayModalOpen] = useState(false);
  const [batchPixCopied, setBatchPixCopied] = useState(false);

  // Estado da UI
  const [activeTab, setActiveTab] = useState<"frequencia" | "mensalidades" | "solicitacoes">("frequencia");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isCroppingPhoto, setIsCroppingPhoto] = useState(false);
  const [tempPhotoSrc, setTempPhotoSrc] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [duesFilter, setDuesFilter] = useState<"todas" | "pagas" | "pendentes">("todas");
  const [isEmittingDecl, setIsEmittingDecl] = useState(false);
  const [requestsFolderTab, setRequestsFolderTab] = useState<"declaracoes" | "solicitacoes">("declaracoes");

  // Modal RSVP Justificação
  const [isRsvpModalOpen, setIsRsvpModalOpen] = useState(false);
  const [rsvpNotes, setRsvpNotes] = useState("");
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);

  // Modal Pagamento PIX / InfinitePay
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<ChargeItem | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixKeyCopied, setPixKeyCopied] = useState(false);

  // Modal Nova Solicitação ao Capítulo
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [requestTargetRole, setRequestTargetRole] = useState<"escrivao" | "tesoureiro" | "master">("escrivao");
  const [requestDescription, setRequestDescription] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Modal de Visualização de Declaração Emitida
  const [viewDeclaration, setViewDeclaration] = useState<IssuedDeclarationItem | null>(null);

  // Sincronização de Aba com a URL (?tab=frequencia|mensalidades|solicitacoes)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const timer = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");
        if (tabParam && ["frequencia", "mensalidades", "solicitacoes"].includes(tabParam)) {
          setActiveTab(tabParam as "frequencia" | "mensalidades" | "solicitacoes");
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTabChange = (newTab: "frequencia" | "mensalidades" | "solicitacoes") => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", newTab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // 1. Carrega Dados
  useEffect(() => {
    requestAnimationFrame(() => {
      setCurrentDate(new Date());
    });
    async function loadData() {
      setIsLoading(true);
      try {
        const supabase = createClient();

        // 1. Carrega usuário, membros e reuniões em paralelo
        const [authRes, memRes, meetRes] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("members")
            .select("id, id_demolay, photo_url, full_name, category, regularity, masonic_lodge, initiation_date, demolay_degree_date, birth_date, email, phone")
            .order("full_name", { ascending: true }),
          supabase
            .from("meetings")
            .select("id, title, starts_at, location, status, description")
            .order("starts_at", { ascending: true }),
        ]);

        const user = authRes.data?.user;
        const memData = memRes.data;

        if (memData && memData.length > 0) {
          const typedMembers: MemberData[] = (memData as MemberData[]).map((m) => {
            if (m.id_demolay === "102836" || m.full_name === "Airton" || (m.full_name && m.full_name.toLowerCase().includes("airton"))) {
              return {
                ...m,
                id_demolay: "102836",
                full_name: "José Airton Rodrigues Galdino Júnior",
                category: "senior_demolay" as const,
                regularity: "Sênior DeMolay e Maçom",
                masonic_lodge: "A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591",
                email: "jarodriguesj1@gmail.com",
                birth_date: "2002-04-29",
              };
            }
            return m;
          });
          setAllMembers(typedMembers);

          // Tenta encontrar o membro vinculado ao usuário logado por id_demolay, email ou profile_id
          const userMetaId = user?.user_metadata?.id_demolay || user?.app_metadata?.id_demolay;
          const userEmail = user?.email?.toLowerCase();
          const userId = user?.id;

          let userMember = typedMembers.find((m) =>
            (userMetaId && m.id_demolay === userMetaId) ||
            (userEmail && m.email && m.email.toLowerCase() === userEmail) ||
            (userId && (m as unknown as { profile_id?: string }).profile_id === userId)
          );
          if (!userMember) {
            // Se não encontrou por correspondência direta, usa o primeiro DeMolay Ativo como padrão
            userMember = typedMembers.find((m) => m.category === "demolay_ativo") || typedMembers[0];
          }

          // Busca foto de perfil salva no Supabase (members.photo_url ou profiles.avatar_path) ou no cache local
          let profilePhoto: string | undefined = userMember.photo_url;
          if (!profilePhoto && user) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("avatar_path")
              .eq("id", user.id)
              .maybeSingle();
            if (prof?.avatar_path) profilePhoto = prof.avatar_path;
          }
          if (!profilePhoto && typeof window !== "undefined") {
            const cached = localStorage.getItem(`cn_member_avatar_${userMember.id}`);
            if (cached) profilePhoto = cached;
          }

          if (profilePhoto) {
            userMember.photo_url = profilePhoto;
          }

          setCurrentMember(userMember);
        }

        // 2. Processa Reuniões
        const meetData = meetRes.data;
        const baseMeetings = meetData && meetData.length > 0 ? meetData : HISTORICAL_MEETINGS;
        const enrichedMeetings: MeetingItem[] = baseMeetings.map((m) => {
          const hist = HISTORICAL_MEETINGS.find(
            (h) => h.id === m.id || h.starts_at.substring(0, 10) === m.starts_at.substring(0, 10)
          );
          return {
            ...m,
            management: hist?.management || deriveManagementFromDate(m.starts_at),
            status: m.status || hist?.status || "realizada",
            description: m.description || hist?.description,
            ata_pdf_url: hist?.ata_pdf_url || null,
            ata_num: hist?.ata_num || "Ata Oficial",
            livro_demolay_page: hist?.livro_demolay_page,
            livro_macom_page: hist?.livro_macom_page,
            demolays_present_count: hist?.demolays_present_count,
            masons_present_count: hist?.masons_present_count,
            total_quorum: hist?.total_quorum,
            demolays_present: hist?.demolays_present,
            masons_present: hist?.masons_present,
          };
        });

        setMeetings(enrichedMeetings);
      } catch (err) {
        console.error("Erro ao carregar dados do membro:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Carrega dados específicos do membro selecionado em Paralelo
  useEffect(() => {
    if (!currentMember) return;

    async function loadMemberDetails() {
      const member = currentMember;
      if (!member) return;
      try {
        const supabase = createClient();
        const memId = member.id;

        // Executa as consultas do membro em paralelo
        const [attRes, chgRes, reqRes, declRes] = await Promise.all([
          supabase
            .from("meeting_attendance")
            .select("id, meeting_id, status, rsvp_status, rsvp_notes")
            .eq("member_id", memId),
          supabase
            .from("member_charges")
            .select("id, description, amount, due_date, status, paid_at, infinitepay_checkout_url, pix_qrcode_payload")
            .eq("member_id", memId)
            .order("due_date", { ascending: false }),
          supabase
            .from("member_requests")
            .select("id, protocol, target_role, status, description, created_at")
            .eq("requester_member_id", memId)
            .order("created_at", { ascending: false }),
          supabase
            .from("issued_declarations")
            .select("id, declaration_type, verification_code, valid_until, created_at, period_start, period_end, content_data")
            .eq("member_id", memId)
            .order("created_at", { ascending: false }),
        ]);

        // A. Frequência / Presença
        if (attRes.data) {
          const map: Record<string, AttendanceItem> = {};
          attRes.data.forEach((a) => {
            map[a.meeting_id] = a as AttendanceItem;
          });
          setAttendances(map);
        }

        // B. Mensalidades / Cobranças
        if (chgRes.data) {
          // Salvaguarda institucional de isenção: José Airton (ID 102836) não possui cobranças no painel
          if (member.id_demolay === "102836") {
            setCharges([]);
          } else {
            setCharges((chgRes.data as ChargeItem[]) || []);
          }
        }

        // C. Solicitações
        if (reqRes.data) {
          setRequests(reqRes.data as RequestItem[]);
        }

        // D. Declarações Oficiais Emitidas
        if (declRes.data) {
          setDeclarations(declRes.data as IssuedDeclarationItem[]);
        }

      } catch (err) {
        console.error("Erro ao carregar detalhes do membro:", err);
      }
    }
    loadMemberDetails();
  }, [currentMember]);

  // Cálculos de Maioridade (21 Anos)
  const majorityInfo = useMemo(() => {
    if (!currentMember?.birth_date || !currentDate) return null;
    const birth = new Date(currentMember.birth_date);
    const majorityDate = new Date(birth);
    majorityDate.setFullYear(majorityDate.getFullYear() + 21);

    const now = currentDate;
    const diffTime = majorityDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isMajor = diffDays <= 0;

    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }

    return {
      age,
      majorityDate: majorityDate.toLocaleDateString("pt-BR"),
      diffDays,
      isMajor,
      turningSoon: !isMajor && diffDays <= 180,
    };
  }, [currentMember, currentDate]);

  // Filtro de Reuniões por Data para Assiduidade
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const d = m.starts_at.substring(0, 10);
      return d >= dateFilterStart && d <= dateFilterEnd;
    });
  }, [meetings, dateFilterStart, dateFilterEnd]);

  // Estatísticas de Presença
  const attendanceStats = useMemo(() => {
    let present = 0;
    let justified = 0;
    let absent = 0;

    filteredMeetings.forEach((m) => {
      const att = attendances[m.id];
      if (att?.status === "presente") present++;
      else if (att?.status === "justificado") justified++;
      else absent++;
    });

    const total = filteredMeetings.length;
    const effectivePresent = present + justified;
    const rate = total > 0 ? Math.round((effectivePresent / total) * 100) : 100;

    return {
      total,
      present,
      justified,
      absent,
      rate,
      isRegular: rate >= 75,
    };
  }, [filteredMeetings, attendances]);

  // Mensalidades Pendentes e Cálculo Dinâmico de Lote
  const pendingCharges = useMemo(() => charges.filter((c) => c.status !== "confirmado"), [charges]);

  const selectedTotalAmount = useMemo(() => {
    return charges
      .filter((c) => selectedChargeIds.includes(c.id))
      .reduce((acc, c) => acc + Number(c.amount || 0), 0);
  }, [charges, selectedChargeIds]);

  // Próxima Reunião
  const nextMeeting = useMemo(() => {
    const today = currentDate ? currentDate.toISOString().substring(0, 10) : "2026-01-01";
    return meetings.find((m) => m.starts_at.substring(0, 10) >= today) || meetings[0] || null;
  }, [meetings, currentDate]);

  // Handler: Justificar Ausência (RSVP)
  const handleJustifyPresence = async () => {
    if (!nextMeeting || !currentMember || !rsvpNotes.trim()) return;
    setIsSubmittingRsvp(true);
    try {
      const supabase = createClient();
      const existing = attendances[nextMeeting.id];

      if (existing?.id) {
        await supabase
          .from("meeting_attendance")
          .update({
            rsvp_status: "justificado",
            rsvp_notes: rsvpNotes.trim(),
            rsvp_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("meeting_attendance")
          .insert({
            meeting_id: nextMeeting.id,
            member_id: currentMember.id,
            rsvp_status: "justificado",
            rsvp_notes: rsvpNotes.trim(),
            rsvp_at: new Date().toISOString(),
            status: "ausente",
          });
      }

      setAttendances((prev) => ({
        ...prev,
        [nextMeeting.id]: {
          id: existing?.id || "temp",
          meeting_id: nextMeeting.id,
          status: existing?.status || "ausente",
          rsvp_status: "justificado",
          rsvp_notes: rsvpNotes.trim(),
        },
      }));

      setIsRsvpModalOpen(false);
      setRsvpNotes("");
      setFeedbackMsg("Justificativa de ausência enviada com sucesso à Comissão e ao Escrivão.");
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err) {
      console.error("Erro ao justificar presença:", err);
      alert("Erro ao enviar justificativa.");
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  // Handler: Criar Nova Solicitação
  const handleCreateRequest = async () => {
    if (!currentMember || !requestDescription.trim()) return;
    setIsSubmittingRequest(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("member_requests")
        .insert({
          chapter_id: "00000000-0000-0000-0000-000000000500",
          requester_member_id: currentMember.id,
          target_role: requestTargetRole,
          description: requestDescription.trim(),
          status: "aberta",
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setRequests((prev) => [data as RequestItem, ...prev]);
      }

      setIsNewRequestModalOpen(false);
      setRequestDescription("");
      setFeedbackMsg("Solicitação protocolada com sucesso! Você receberá atualizações no portal.");
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err) {
      console.error("Erro ao criar solicitação:", err);
      alert("Não foi possível enviar a solicitação.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Handler: Emissão Instantânea de Declaração Oficial (PDF Automático com validação de quitação)
  const handleGenerateDeclaration = async (type: "quitacao_tesouraria" | "frequencia") => {
    if (!currentMember) return;
    setIsEmittingDecl(true);
    try {
      const res = await fetch("/api/declarations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: currentMember.id,
          declaration_type: type,
          period_start: type === "frequencia" ? dateFilterStart : undefined,
          period_end: type === "frequencia" ? dateFilterEnd : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        const errorMsg = data.error || "Erro ao emitir declaração. Tente novamente.";
        alert(errorMsg);
        setFeedbackMsg(`Aviso: ${errorMsg}`);
        setTimeout(() => setFeedbackMsg(""), 7000);
        return;
      }

      if (data.declaration) {
        setDeclarations((prev) => [data.declaration, ...prev]);
        setViewDeclaration(data.declaration);
        setFeedbackMsg(
          `Declaração de ${
            type === "quitacao_tesouraria" ? "Quitação Financeira" : "Frequência"
          } gerada com sucesso! O documento oficial em PDF já está pronto para visualização e impressão.`
        );
        setTimeout(() => setFeedbackMsg(""), 6000);
      }
    } catch (err: unknown) {
      console.error("Erro ao gerar declaração:", err);
      alert("Falha de conexão ao emitir declaração.");
    } finally {
      setIsEmittingDecl(false);
    }
  };

  // Handler: Pagamento em Lote de Múltiplas Mensalidades
  const handleInitiateBatchPayment = async () => {
    if (selectedChargeIds.length === 0 || !currentMember) return;
    setIsBatchPaying(true);
    try {
      const res = await fetch("/api/charges/batch-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: currentMember.id,
          charge_ids: selectedChargeIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert("Erro ao gerar pagamento em lote: " + (data.error || "Tente novamente"));
        return;
      }
      setBatchPaymentData({
        totalAmount: data.total_amount,
        count: data.count,
        chargeIds: data.charge_ids,
        descriptions: data.descriptions,
        pixPayload: data.pix_copia_cola,
        pixQrCodeUrl: data.pix_qrcode_url,
        infinitePayUrl: data.infinitepay_url,
        txid: data.txid,
      });
      setIsBatchPayModalOpen(true);
    } catch (err) {
      console.error("Erro ao processar pagamento em lote:", err);
      alert("Falha de conexão ao gerar pagamento consolidado.");
    } finally {
      setIsBatchPaying(false);
    }
  };

  // Handler 1: Usuário seleciona foto do dispositivo -> Abre modal de ajuste (Instagram / WhatsApp)
  const handlePhotoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentMember) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("A imagem selecionada excede o limite de 15MB. Por favor, selecione uma foto menor.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Formato inválido. Aceitamos imagens JPG, PNG ou WEBP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTempPhotoSrc(reader.result as string);
      setIsCroppingPhoto(true);
    };
    reader.readAsDataURL(file);

    // Reseta o input para permitir selecionar a mesma imagem se quiser
    event.target.value = "";
  };

  // Handler 2: Usuário confirma o enquadramento circular no modal
  const handleSaveCroppedPhoto = async (croppedBlob: Blob, croppedDataUrl: string) => {
    if (!currentMember) return;

    setIsUploadingPhoto(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Salva localmente de imediato para feedback instantâneo na tela
      try {
        localStorage.setItem(`cn_member_avatar_${currentMember.id}`, croppedDataUrl);
      } catch {
        // ignore quota
      }

      setCurrentMember((prev) => (prev ? { ...prev, photo_url: croppedDataUrl } : null));

      // Caminho no bucket membros do Supabase em formato WebP otimizado
      const filePath = `${currentMember.id}/avatar-${Date.now()}.webp`;

      try {
        const { error: uploadError } = await supabase.storage
          .from("membros")
          .upload(filePath, croppedBlob, {
            contentType: "image/webp",
            upsert: true,
          });

        const finalUrl = !uploadError
          ? supabase.storage.from("membros").getPublicUrl(filePath).data.publicUrl
          : croppedDataUrl;

        // Persiste a foto no banco de dados tanto na tabela profiles quanto members
        if (user) {
          await supabase
            .from("profiles")
            .update({ avatar_path: finalUrl })
            .eq("id", user.id);
        }

        await supabase
          .from("members")
          .update({ photo_url: finalUrl })
          .eq("id", currentMember.id);
      } catch (storageErr) {
        console.warn("Storage upload fallback para perfil:", storageErr);
      }

      // Notifica componentes globais para sincronização de avatar
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cn_avatar_updated"));
      }

      setFeedbackMsg("Foto de perfil enquadrada e atualizada com sucesso!");
      setTimeout(() => setFeedbackMsg(""), 5000);
      setIsCroppingPhoto(false);
      setTempPhotoSrc(null);
    } catch (err: unknown) {
      console.error("Erro ao salvar foto de perfil:", err);
      alert("Ocorreu um erro ao carregar a foto de perfil.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Copiar PIX Oficial com valor exato da mensalidade e padrão Banco Central
  const handleCopyPix = () => {
    const pixPayload = selectedCharge
      ? generatePixCopiaECola({
          amount: Number(selectedCharge.amount || 22),
          txid: selectedCharge.id.replace(/-/g, "").substring(0, 20),
          description: selectedCharge.description,
        })
      : "00020126580014br.gov.bcb.pix0136capitulo500teresina@demolaypi.org.br520400005303986540522.005802BR5925CAPITULO CARVALHO NEVES 56008TERESINA62160512CN500M112026630490FE";
    navigator.clipboard.writeText(pixPayload);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-emerald-200/60 font-mono">
        Carregando dados capitulares do membro...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-center justify-between shadow-lg backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg("")} className="text-xs text-emerald-300 hover:underline">
            Fechar
          </button>
        </div>
      )}

      {/* 1. Header do Perfil do Membro & Switcher de Demonstração (Estilo Heráldico) */}
      <div className="card-heraldico-dark relative overflow-hidden rounded-2xl p-6 md:p-8 shadow-2xl border border-[#D9AA45]/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D9AA45]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Foto de Perfil com Suporte a Upload e Efeito Glassmorphism Circular */}
            <div className="relative group shrink-0">
              <div className="brasao-shimmer-container w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#D9AA45] via-amber-200 to-[#087443] p-0.5 shadow-2xl overflow-hidden">
                <div className="w-full h-full rounded-full bg-[#04281A] flex items-center justify-center text-2xl font-bold text-[#D9AA45] overflow-hidden relative">
                  {currentMember?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentMember.photo_url}
                      alt={currentMember.full_name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span>
                      {currentMember?.full_name ? currentMember.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("") : "CN"}
                    </span>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center text-xs text-white font-semibold rounded-full">
                      Enviando...
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Câmera Sobreposto */}
              <label
                htmlFor="profile-photo-input"
                className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[#087443] hover:bg-[#D9AA45] text-white hover:text-[#04281A] border border-[#D9AA45]/50 shadow-lg cursor-pointer transition-all transform hover:scale-110 flex items-center justify-center backdrop-blur-md"
                title="Alterar Foto de Perfil"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  id="profile-photo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoSelected}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="selo-vidro-cn px-3 py-0.5 rounded-full text-xs font-bold text-[#D9AA45] font-mono">
                  ID {currentMember?.id_demolay || "000000"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm">
                  {currentMember?.category === "demolay_ativo" ? "DeMolay Ativo" : currentMember?.category === "macom" ? "Tio Maçom" : "Sênior DeMolay"}
                </span>
                {currentMember?.demolay_degree_date && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-sm">
                    Grau DeMolay
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {currentMember?.full_name || "Carregando perfil..."}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-300">
                <span>Capítulo Professor Carvalho Neves Nº 500</span>
                <span className="text-white/30">•</span>
                <label
                  htmlFor="profile-photo-input"
                  className="inline-flex items-center gap-1.5 text-[#D9AA45] hover:text-amber-200 cursor-pointer font-medium hover:underline transition-colors"
                >
                  <Camera className="w-3 h-3" />
                  <span>{currentMember?.photo_url ? "Trocar foto de perfil" : "Adicionar foto de perfil"}</span>
                </label>
                <span className="text-white/30">•</span>
                <Link
                  href="/dashboard/perfil"
                  className="inline-flex items-center gap-1.5 text-[#D9AA45] hover:text-amber-200 font-medium hover:underline transition-colors"
                >
                  <User className="w-3 h-3" />
                  <span>Editar Perfil Completo (SISDM)</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Switcher para Administradores / Pré-visualização de Irmão */}
          {allMembers.length > 1 && (
            <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-1.5 bg-black/20 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#D9AA45]" />
                Ver Perfil de Outro Irmão (Admin):
              </label>
              <select
                value={currentMember?.id || ""}
                onChange={(e) => {
                  const m = allMembers.find((item) => item.id === e.target.value);
                  if (m) setCurrentMember(m);
                }}
                className="w-full md:w-64 bg-[#04281A] border border-[#D9AA45]/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D9AA45]"
              >
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} (ID {m.id_demolay})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 2. Banner de Transição de Maioridade (21 Anos) */}
        {majorityInfo && (
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[#D9AA45]">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Idade Atual</p>
                <p className="text-sm font-bold text-white">{majorityInfo.age} anos</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-emerald-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Data de Maioridade (21 Anos)</p>
                <p className="text-sm font-bold text-white">{majorityInfo.majorityDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                majorityInfo.isMajor
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : majorityInfo.turningSoon
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Transição Capitular</p>
                <p className={`text-sm font-bold ${
                  majorityInfo.isMajor
                    ? "text-purple-300"
                    : majorityInfo.turningSoon
                    ? "text-amber-300"
                    : "text-emerald-300"
                }`}>
                  {majorityInfo.isMajor
                    ? "Maioridade Atingida (Sênior DeMolay)"
                    : `${majorityInfo.diffDays} dias restantes`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => handleTabChange("frequencia")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "frequencia"
              ? "bg-[#064D32] text-[#D9AA45] border-t-2 border-[#D9AA45]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Frequência
        </button>

        <button
          onClick={() => handleTabChange("mensalidades")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "mensalidades"
              ? "bg-[#064D32] text-[#D9AA45] border-t-2 border-[#D9AA45]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Minhas Mensalidades
        </button>

        <button
          onClick={() => handleTabChange("solicitacoes")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "solicitacoes"
              ? "bg-[#064D32] text-[#D9AA45] border-t-2 border-[#D9AA45]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Solicitações & Ouvidoria
        </button>
      </div>

      {/* ABA 1: ASSIDUIDADE & FREQUÊNCIA INDIVIDUAL */}
      {activeTab === "frequencia" && (
        <div className="space-y-6 animate-fade-in">
          {/* Seletor de Período no Calendário */}
          <div className="bg-[#04281A]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#D9AA45]" />
                Taxa de Frequência Individual
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Escolha o intervalo de datas para calcular a assiduidade em todas as gestões.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-black/30 border border-white/10 px-3 py-1.5 rounded-xl">
                <span className="text-xs text-gray-400">De:</span>
                <input
                  type="date"
                  value={dateFilterStart}
                  onChange={(e) => setDateFilterStart(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 bg-black/30 border border-white/10 px-3 py-1.5 rounded-xl">
                <span className="text-xs text-gray-400">Até:</span>
                <input
                  type="date"
                  value={dateFilterEnd}
                  onChange={(e) => setDateFilterEnd(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none"
                />
              </div>

              <button
                onClick={() => {
                  setDateFilterStart("2026-08-08");
                  setDateFilterEnd("2026-12-31");
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium transition-all"
              >
                Gestão XXV (Vigente)
              </button>
            </div>
          </div>

          {/* Cards de Métricas da Frequência */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
              <p className="text-xs font-medium text-gray-400">Índice de Frequência</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-3xl font-extrabold ${attendanceStats.isRegular ? "text-emerald-400" : "text-amber-400"}`}>
                  {attendanceStats.rate}%
                </span>
                <span className="text-xs text-gray-400">
                  {attendanceStats.isRegular ? "Adimplente (≥ 75%)" : "Abaixo de 75%"}
                </span>
              </div>
            </div>

            <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
              <p className="text-xs font-medium text-gray-400">Presenças Confirmadas</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-white">{attendanceStats.present}</span>
                <span className="text-xs text-gray-400">de {attendanceStats.total} sessões</span>
              </div>
            </div>

            <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
              <p className="text-xs font-medium text-gray-400">Faltas Justificadas</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-amber-400">{attendanceStats.justified}</span>
                <span className="text-xs text-gray-400">abonadas</span>
              </div>
            </div>

            <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
              <p className="text-xs font-medium text-gray-400">Faltas Não Justificadas</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-rose-400">{attendanceStats.absent}</span>
                <span className="text-xs text-gray-400">ausências</span>
              </div>
            </div>
          </div>

          {/* Histórico das Reuniões no Período */}
          <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Sessões Realizadas no Período</h3>
              <button
                onClick={() => handleGenerateDeclaration("frequencia")}
                disabled={isEmittingDecl}
                className="btn-heraldico-vidro px-3.5 py-1.5 rounded-lg text-xs disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>{isEmittingDecl ? "Emitindo..." : "Emitir Declaração de Frequência (PDF Automático)"}</span>
              </button>
            </div>

            {filteredMeetings.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">Nenhuma sessão encontrada no intervalo de datas selecionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase bg-black/30 text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Sessão / Pauta</th>
                      <th className="py-3 px-4">Local</th>
                      <th className="py-3 px-4 text-center">Sua Presença</th>
                      <th className="py-3 px-4 text-center">Ata & Frequência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMeetings.map((m) => {
                      const att = attendances[m.id];
                      const isPresent = att?.status === "presente";
                      const isJustified = att?.status === "justificado";

                      return (
                        <tr key={m.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs text-gray-300">
                            {new Date(m.starts_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-white">{m.title}</p>
                            {m.description && <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-400">
                            {m.location || "A∴R∴L∴S∴ Caridade II nº 135"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <CheckCircle2 className="w-3 h-3" />
                                Presente
                              </span>
                            ) : isJustified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <AlertCircle className="w-3 h-3" />
                                Justificado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                <XCircle className="w-3 h-3" />
                                Ausente
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {m.ata_pdf_url && (
                                <a
                                  href={m.ata_pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#D9AA45]/20 hover:bg-[#D9AA45]/30 text-[#D9AA45] border border-[#D9AA45]/40 transition-colors shadow-sm cursor-pointer"
                                  title="Visualizar Ata Oficial assinada (PDF)"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Ata (PDF)</span>
                                </a>
                              )}
                              <button
                                onClick={() => setSelectedMeetingForQuorum(m)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20 transition-colors cursor-pointer"
                                title="Ver lista de presentes e quórum desta sessão"
                              >
                                <Users className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Quórum</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: MINHAS MENSALIDADES */}
      {activeTab === "mensalidades" && (
        <div className="space-y-6 animate-fade-in">
          {/* Status Geral das Mensalidades */}
          <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Controle de Mensalidades (DeMolay e Maçom)
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                {currentMember?.category === "macom" ? "R$ 25,00" : "R$ 22,00"}{" "}
                <span className="text-sm font-normal text-gray-300">
                  / mês ({currentMember?.category === "macom" ? "Tio Maçom" : "DeMolay Ativo"})
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Vencimento padrão todo dia 28 de cada mês (final de mês).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedChargeIds.length > 1 ? (
                <button
                  onClick={handleInitiateBatchPayment}
                  disabled={isBatchPaying}
                  className="btn-heraldico-ouro px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-lg active:scale-95"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pagar {selectedChargeIds.length} em Lote (R$ {selectedTotalAmount.toFixed(2).replace(".", ",")})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedCharge(charges.find(c => c.status !== "confirmado") || charges[0] || null);
                    setIsPayModalOpen(true);
                  }}
                  className="btn-heraldico-ouro px-5 py-2.5 rounded-xl text-xs"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pagar com PIX / Cartão InfinitePay</span>
                </button>
              )}

              <button
                onClick={() => handleGenerateDeclaration("quitacao_tesouraria")}
                disabled={isEmittingDecl}
                className="btn-heraldico-vidro px-4 py-2.5 rounded-xl text-xs disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-[#D9AA45]" />
                <span>{isEmittingDecl ? "Emitindo..." : "Emitir Declaração de Quitação (PDF Automático)"}</span>
              </button>
            </div>
          </div>

          {/* Lembrete / Alerta Chamativo para Pagamento em Lote */}
          {pendingCharges.length > 1 && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#04281A] to-emerald-950/40 border border-[#D9AA45]/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-xl bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/30 flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-[#D9AA45]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                    <span>💡 Pagamento em Lote Recomendado</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#D9AA45] text-black">
                      {pendingCharges.length} mensalidades pendentes
                    </span>
                  </h4>
                  <p className="text-xs text-amber-200/90 mt-1">
                    Você possui <strong>{pendingCharges.length} mensalidades pendentes</strong>. Selecione várias competências através das caixas de seleção na tabela abaixo para pagar tudo de uma única vez via Pix ou InfinitePay!
                  </p>
                </div>
              </div>
              {selectedChargeIds.length > 0 ? (
                <button
                  onClick={handleInitiateBatchPayment}
                  disabled={isBatchPaying}
                  className="btn-heraldico-ouro px-5 py-2.5 rounded-xl text-xs whitespace-nowrap cursor-pointer shadow-lg active:scale-95 flex-shrink-0"
                >
                  <QrCode className="w-4 h-4" />
                  <span>
                    {isBatchPaying
                      ? "Gerando Lote..."
                      : `Pagar ${selectedChargeIds.length} Selecionada(s) (R$ ${selectedTotalAmount.toFixed(2).replace(".", ",")})`}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setSelectedChargeIds(pendingCharges.map((c) => c.id))}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#D9AA45] border border-[#D9AA45]/30 text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  Selecionar Todas ({pendingCharges.length})
                </button>
              )}
            </div>
          )}

          {/* Cards de Métricas: Quais já paguei vs Pendentes (Estilo Heráldico Dark) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-heraldico-dark p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300">Mensalidades Quitadas</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-white mt-1">
                {charges.filter((c) => c.status === "confirmado").length}
              </p>
              <p className="text-[11px] text-emerald-200/70 mt-0.5">
                Total Pago: R${" "}
                {charges
                  .filter((c) => c.status === "confirmado")
                  .reduce((acc, c) => acc + Number(c.amount || 0), 0)
                  .toFixed(2)
                  .replace(".", ",")}
              </p>
            </div>

            <div className="card-heraldico-dark p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300">Mensalidades Pendentes</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-white mt-1">
                {charges.filter((c) => c.status !== "confirmado").length}
              </p>
              <p className="text-[11px] text-amber-200/70 mt-0.5">
                Total a Pagar: R${" "}
                {charges
                  .filter((c) => c.status !== "confirmado")
                  .reduce((acc, c) => acc + Number(c.amount || 0), 0)
                  .toFixed(2)
                  .replace(".", ",")}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Situação Financeira</span>
                <Shield className="w-4 h-4 text-[#D9AA45]" />
              </div>
              <p className="text-sm font-bold text-emerald-300 mt-2">
                {charges.filter((c) => c.status !== "confirmado").length === 0
                  ? "100% Em Dia (Adimplente)"
                  : "Possui mensalidade a quitar"}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Capítulo Professor Carvalho Neves Nº 500</p>
            </div>
          </div>

          {/* Filtros de Visualização */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <button
              onClick={() => setDuesFilter("todas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                duesFilter === "todas"
                  ? "bg-[#D9AA45] text-black"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Todas ({charges.length})
            </button>
            <button
              onClick={() => setDuesFilter("pagas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                duesFilter === "pagas"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-emerald-300 hover:bg-white/10"
              }`}
            >
              Já Pagas / Quitadas ({charges.filter((c) => c.status === "confirmado").length})
            </button>
            <button
              onClick={() => setDuesFilter("pendentes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                duesFilter === "pendentes"
                  ? "bg-amber-500 text-black"
                  : "bg-white/5 text-amber-300 hover:bg-white/10"
              }`}
            >
              Pendentes ({charges.filter((c) => c.status !== "confirmado").length})
            </button>
          </div>

          {/* Lista de Mensalidades Filtradas */}
          <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-base font-bold text-white mb-4">
              {duesFilter === "pagas"
                ? "Mensalidades que você já pagou"
                : duesFilter === "pendentes"
                ? "Mensalidades pendentes de regularização"
                : "Histórico Completo de Mensalidades"}
            </h3>

            {charges.filter((c) =>
              duesFilter === "pagas"
                ? c.status === "confirmado"
                : duesFilter === "pendentes"
                ? c.status !== "confirmado"
                : true
            ).length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                {duesFilter === "pagas"
                  ? "Nenhuma mensalidade paga registrada neste filtro."
                  : duesFilter === "pendentes"
                  ? "Parabéns! Todas as suas mensalidades estão em dia."
                  : "Nenhuma mensalidade gerada para este membro."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase bg-black/30 text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            pendingCharges.length > 0 &&
                            pendingCharges.every((c) => selectedChargeIds.includes(c.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChargeIds(pendingCharges.map((c) => c.id));
                            } else {
                              setSelectedChargeIds([]);
                            }
                          }}
                          aria-label="Selecionar todas as pendentes"
                          className="rounded border-white/20 bg-black/40 text-[#D9AA45] focus:ring-[#D9AA45] cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Descrição da Mensalidade</th>
                      <th className="py-3 px-4">Vencimento</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4 text-center">Status / Quitação</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {charges
                      .filter((c) =>
                        duesFilter === "pagas"
                          ? c.status === "confirmado"
                          : duesFilter === "pendentes"
                          ? c.status !== "confirmado"
                          : true
                      )
                      .map((c) => {
                        const isPaid = c.status === "confirmado";
                        const isSelected = selectedChargeIds.includes(c.id);

                        return (
                          <tr
                            key={c.id}
                            className={`transition-colors ${
                              isSelected ? "bg-[#D9AA45]/10 hover:bg-[#D9AA45]/15" : "hover:bg-white/5"
                            }`}
                          >
                            <td className="py-3.5 px-3 text-center">
                              {!isPaid ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedChargeIds((prev) => [...prev, c.id]);
                                    } else {
                                      setSelectedChargeIds((prev) => prev.filter((id) => id !== c.id));
                                    }
                                  }}
                                  aria-label={`Selecionar ${c.description}`}
                                  className="rounded border-white/20 bg-black/40 text-[#D9AA45] focus:ring-[#D9AA45] cursor-pointer"
                                />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-white">
                              {c.description}
                              {isPaid && (
                                <span className="block text-[11px] text-emerald-400/80 font-normal mt-0.5">
                                  ✓ Pagamento confirmado pelo Tesoureiro
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-gray-300">
                              {c.due_date ? new Date(c.due_date).toLocaleDateString("pt-BR") : "Dia 28"}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-sm font-bold text-white">
                              R$ {Number(c.amount).toFixed(2).replace(".", ",")}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isPaid ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    Quitada / Paga
                                  </span>
                                  <span className="text-[10px] text-emerald-300/70 mt-1">
                                    {c.paid_at
                                      ? `Baixa: ${new Date(c.paid_at).toLocaleDateString("pt-BR")}`
                                      : "Baixa Efetuada"}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <Clock className="w-3 h-3" />
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {!isPaid ? (
                                <button
                                  onClick={() => {
                                    setSelectedCharge(c);
                                    setIsPayModalOpen(true);
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#D9AA45]/20 hover:bg-[#D9AA45]/30 border border-[#D9AA45]/40 text-[#D9AA45] text-xs font-bold transition-all cursor-pointer"
                                >
                                  Pagar Agora
                                </button>
                              ) : (
                                <span className="text-xs text-emerald-400 font-semibold inline-flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Quitado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Barra de Ação de Pagamento em Lote */}
            {selectedChargeIds.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-black/60 border border-[#D9AA45]/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2 text-xs text-gray-200">
                  <span className="font-bold text-[#D9AA45]">
                    {selectedChargeIds.length} mensalidade(s) selecionada(s)
                  </span>
                  <span>•</span>
                  <span className="font-extrabold text-white text-sm">
                    Total: R$ {selectedTotalAmount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedChargeIds([])}
                    className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Limpar Seleção
                  </button>
                  <button
                    onClick={handleInitiateBatchPayment}
                    disabled={isBatchPaying}
                    className="btn-heraldico-ouro px-5 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{isBatchPaying ? "Processando..." : "Pagar Selecionadas em Lote"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: SOLICITAÇÕES AO CAPÍTULO & DOCUMENTOS */}
      {activeTab === "solicitacoes" && (
        <div className="space-y-6 animate-fade-in">
          {/* Card de Ação Rápida: Emissão Instantânea e Requerimentos */}
          <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D9AA45]" />
                Solicitação de Documentos & Ouvidoria
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl">
                Emita sua declaração oficial timbrada pronta em PDF com autenticação automática, ou protocole uma mensagem para a liderança capitular.
              </p>
            </div>

            {/* Botões diretos do que o irmão quer emitir */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => handleGenerateDeclaration("quitacao_tesouraria")}
                disabled={isEmittingDecl}
                className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/60 to-emerald-950/80 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all group cursor-pointer shadow-md disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5 text-[#D9AA45]" />
                </div>
                <h4 className="text-sm font-bold text-white">Declaração de Quitação</h4>
                <p className="text-[11px] text-emerald-200/70 mt-1">
                  PDF automático atestando quitação financeira com a Tesouraria.
                </p>
                <span className="inline-block mt-3 text-xs font-bold text-[#D9AA45]">
                  {isEmittingDecl ? "Emitindo PDF..." : "Emitir Agora →"}
                </span>
              </button>

              <button
                onClick={() => handleGenerateDeclaration("frequencia")}
                disabled={isEmittingDecl}
                className="p-4 rounded-xl bg-gradient-to-br from-blue-900/40 to-blue-950/80 border border-blue-500/30 hover:border-blue-400 text-left transition-all group cursor-pointer shadow-md disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <CalendarCheck className="w-5 h-5 text-blue-300" />
                </div>
                <h4 className="text-sm font-bold text-white">Declaração de Frequência</h4>
                <p className="text-[11px] text-blue-200/70 mt-1">
                  PDF automático do Escrivão com a taxa de assiduidade do período.
                </p>
                <span className="inline-block mt-3 text-xs font-bold text-[#D9AA45]">
                  {isEmittingDecl ? "Emitindo PDF..." : "Emitir Agora →"}
                </span>
              </button>

              <button
                onClick={() => {
                  setRequestTargetRole("master");
                  setIsNewRequestModalOpen(true);
                }}
                className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-white/20 text-left transition-all group cursor-pointer shadow-md"
              >
                <div className="w-9 h-9 rounded-lg bg-white/10 text-gray-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5 text-[#D9AA45]" />
                </div>
                <h4 className="text-sm font-bold text-white">Outro Requerimento</h4>
                <p className="text-[11px] text-gray-400 mt-1">
                  Envie uma mensagem ou solicitação avulsa à administração.
                </p>
                <span className="inline-block mt-3 text-xs font-bold text-emerald-300">
                  Abrir Mensagem →
                </span>
              </button>
            </div>
          </div>

          {/* PASTA DE CONTROLE DE DOCUMENTOS & REQUERIMENTOS */}
          <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="text-base font-bold text-white">
                  Pasta de Documentos e Requerimentos do Membro
                </h3>
              </div>

              {/* Alternador de Pastas */}
              <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setRequestsFolderTab("declaracoes")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    requestsFolderTab === "declaracoes"
                      ? "bg-[#D9AA45] text-black shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Declarações Emitidas ({declarations.length})
                </button>
                <button
                  onClick={() => setRequestsFolderTab("solicitacoes")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    requestsFolderTab === "solicitacoes"
                      ? "bg-[#D9AA45] text-black shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Mensagens & Protocolos ({requests.length})
                </button>
              </div>
            </div>

            {/* Conteúdo da Pasta 1: Declarações Oficiais em PDF */}
            {requestsFolderTab === "declaracoes" && (
              <div>
                {declarations.length === 0 ? (
                  <div className="py-10 text-center text-xs text-gray-400 space-y-2">
                    <p>Nenhuma declaração emitida ainda nesta pasta.</p>
                    <p className="text-[11px] text-emerald-300">
                      Clique em &quot;Declaração de Quitação&quot; ou &quot;Declaração de Frequência&quot; acima para gerar seu documento instantaneamente.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {declarations.map((d) => (
                      <div
                        key={d.id}
                        className="bg-black/30 border border-white/10 hover:border-[#D9AA45]/40 rounded-xl p-4 flex items-center justify-between gap-4 transition-all"
                      >
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {d.declaration_type === "quitacao_tesouraria"
                              ? "Quitação Financeira"
                              : "Declaração de Frequência"}
                          </span>
                          <p className="text-xs font-mono text-[#D9AA45] mt-1.5 font-bold">
                            {d.verification_code}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Emitido em: {new Date(d.created_at).toLocaleDateString("pt-BR")} • Válido por 90 dias
                          </p>
                        </div>

                        <button
                          onClick={() => setViewDeclaration(d)}
                          className="px-3.5 py-2 rounded-lg bg-[#D9AA45]/20 hover:bg-[#D9AA45]/30 border border-[#D9AA45]/40 text-[#D9AA45] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Abrir PDF</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da Pasta 2: Protocolos e Mensagens */}
            {requestsFolderTab === "solicitacoes" && (
              <div>
                {requests.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">
                    Você ainda não enviou mensagens ou requerimentos avulsos.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {requests.map((r) => (
                      <div
                        key={r.id}
                        className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#D9AA45]">
                              Protocolo {r.protocol}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-300 capitalize">
                              Assunto: Requerimento Administrativo
                            </span>
                          </div>
                          <p className="text-sm text-white mt-1 font-medium">{r.description}</p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            Aberto em: {new Date(r.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 capitalize">
                          {r.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: JUSTIFICAR AUSÊNCIA */}
      {isRsvpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="ios-glass-card rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Justificar Ausência na Reunião
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              Descreva o motivo da ausência para que o Escrivão registre sua justificativa fraternal.
            </p>

            <textarea
              value={rsvpNotes}
              onChange={(e) => setRsvpNotes(e.target.value)}
              placeholder="Ex: Compromisso acadêmico inadiável / viagem a trabalho..."
              rows={4}
              className="w-full mt-4 bg-white/[0.06] backdrop-blur-md border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
            />

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setIsRsvpModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:text-white cursor-pointer active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleJustifyPresence}
                disabled={isSubmittingRsvp || !rsvpNotes.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D9AA45] via-[#E5BC5C] to-[#D9AA45] hover:brightness-110 text-[#04281A] text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md active:scale-95"
              >
                {isSubmittingRsvp ? "Enviando..." : "Registrar Justificativa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAGAR MENSALIDADE PIX / INFINITEPAY */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="ios-glass-card rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#D9AA45]" />
                Pagamento de Mensalidade
              </h3>
              <button onClick={() => setIsPayModalOpen(false)} className="text-gray-400 hover:text-white text-xs cursor-pointer">
                ✕
              </button>
            </div>

            {/* Seletor de Mês / Mensalidade caso o membro tenha mais de uma pendente */}
            {charges.filter((c) => c.status !== "confirmado").length > 1 && (
              <div className="mt-3.5">
                <label className="text-[11px] text-emerald-200/80 font-semibold block mb-1">
                  Selecione o mês da mensalidade a quitar:
                </label>
                <select
                  value={selectedCharge?.id || ""}
                  onChange={(e) => {
                    const match = charges.find((c) => c.id === e.target.value);
                    if (match) setSelectedCharge(match);
                  }}
                  className="w-full bg-[#064D32] border border-emerald-500/40 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D9AA45] cursor-pointer"
                >
                  {charges
                    .filter((c) => c.status !== "confirmado")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.description} • R$ {Number(c.amount).toFixed(2).replace(".", ",")}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="mt-3 text-center">
              <p className="text-xs text-gray-300 font-medium">{selectedCharge?.description || "Mensalidade Capitular"}</p>
              <p className="text-3xl font-extrabold text-white mt-0.5">
                R$ {Number(selectedCharge?.amount || (currentMember?.category === "macom" ? 25 : 22)).toFixed(2).replace(".", ",")}
              </p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-[#D9AA45] border border-amber-500/40">
                Vencimento: {selectedCharge?.due_date ? new Date(selectedCharge.due_date).toLocaleDateString("pt-BR") : "Dia 28"}
              </span>
            </div>

            {/* QR Code Container com imagem real escaneável */}
            {(() => {
              const currentPixPayload = selectedCharge
                ? generatePixCopiaECola({
                    amount: Number(selectedCharge.amount || 22),
                    txid: selectedCharge.id.replace(/-/g, "").substring(0, 20),
                    description: selectedCharge.description,
                  })
                : "00020126580014br.gov.bcb.pix0136capitulo500teresina@demolaypi.org.br520400005303986540522.005802BR5925CAPITULO CARVALHO NEVES 56008TERESINA62160512CN500M112026630490FE";

              const qrUrl = getPixQrCodeImageUrl(currentPixPayload, 220);

              const infinitePayUrl =
                selectedCharge?.infinitepay_checkout_url ||
                getInfinitePayCheckoutUrl({
                  amount: Number(selectedCharge?.amount || 22),
                  chargeId: selectedCharge?.id,
                  description: selectedCharge?.description,
                });

              return (
                <>
                  <div className="my-3.5 p-3 rounded-2xl bg-white flex flex-col items-center justify-center mx-auto w-44 h-44 shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl}
                      alt="QR Code PIX Mensalidade"
                      className="w-36 h-36 object-contain rounded-lg"
                    />
                  </div>

                  {/* Chave PIX Direta Oficial */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 text-xs mb-3">
                    <div className="truncate">
                      <span className="text-[10px] text-gray-400 block">Chave PIX Oficial (E-mail):</span>
                      <span className="font-mono text-emerald-300 text-[11px] truncate block select-all">
                        {OFFICIAL_CHAPTER_PIX_KEY}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(OFFICIAL_CHAPTER_PIX_KEY);
                        setPixKeyCopied(true);
                        setTimeout(() => setPixKeyCopied(false), 2500);
                      }}
                      className="shrink-0 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#D9AA45] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {pixKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{pixKeyCopied ? "Copiada!" : "Copiar Chave"}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleCopyPix}
                      className="w-full py-2.5 rounded-xl bg-[#D9AA45] hover:bg-amber-400 text-black text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      {pixCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {pixCopied ? "Código PIX Copiado!" : "Copiar Código PIX Copia e Cola"}
                    </button>

                    <a
                      href={infinitePayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4 text-[#D9AA45]" />
                      Pagar via Cartão / Checkout InfinitePay
                    </a>
                  </div>
                </>
              );
            })()}

            <p className="text-[10px] text-emerald-200/70 text-center mt-3">
              Ao pagar pelo PIX ou InfinitePay, a conciliação é automática. O Tesoureiro acompanha todas as quitações no painel.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: PAGAMENTO EM LOTE CONSOLIDADO (PIX / INFINITEPAY) */}
      {isBatchPayModalOpen && batchPaymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="ios-glass-card rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#D9AA45]" />
                Quitação em Lote ({batchPaymentData.count} mensalidades)
              </h3>
              <button
                onClick={() => setIsBatchPayModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold mb-1">
                  Competências Selecionadas:
                </span>
                <ul className="space-y-1 text-emerald-200 max-h-28 overflow-y-auto pr-1">
                  {batchPaymentData.descriptions.map((desc, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D9AA45] flex-shrink-0" />
                      <span>{desc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-center pt-1">
                <p className="text-xs text-gray-300 font-medium">Valor Total Consolidado</p>
                <p className="text-3xl font-extrabold text-[#D9AA45] mt-0.5">
                  R$ {batchPaymentData.totalAmount.toFixed(2).replace(".", ",")}
                </p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {batchPaymentData.count} mensalidades agrupadas
                </span>
              </div>

              {/* QR Code Container */}
              <div className="my-2 p-3 rounded-2xl bg-white flex flex-col items-center justify-center mx-auto w-44 h-44 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={batchPaymentData.pixQrCodeUrl}
                  alt="QR Code PIX Lote"
                  className="w-36 h-36 object-contain rounded-lg"
                />
              </div>

              {/* Chave PIX Oficial */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 text-xs">
                <div className="truncate">
                  <span className="text-[10px] text-gray-400 block">Chave PIX Oficial (E-mail):</span>
                  <span className="font-mono text-emerald-300 text-[11px] truncate block select-all">
                    {OFFICIAL_CHAPTER_PIX_KEY}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(OFFICIAL_CHAPTER_PIX_KEY);
                    setPixKeyCopied(true);
                    setTimeout(() => setPixKeyCopied(false), 2500);
                  }}
                  className="shrink-0 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#D9AA45] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {pixKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{pixKeyCopied ? "Copiada!" : "Copiar Chave"}</span>
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(batchPaymentData.pixPayload);
                    setBatchPixCopied(true);
                    setTimeout(() => setBatchPixCopied(false), 3000);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#D9AA45] hover:bg-amber-400 text-black text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  {batchPixCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {batchPixCopied ? "Código PIX Copiado!" : "Copiar PIX Copia e Cola Consolidado"}
                </button>

                <a
                  href={batchPaymentData.infinitePayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4 text-[#D9AA45]" />
                  Pagar Lote via Cartão / Checkout InfinitePay
                </a>
              </div>

              <p className="text-[10px] text-emerald-200/70 text-center mt-2">
                Após a confirmação da transação pelo banco, todas as mensalidades selecionadas receberão baixa simultânea.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA SOLICITAÇÃO AVULSA AO CAPÍTULO */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in">
          <div className="ios-glass-card rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-[#D9AA45]" />
                Novo Requerimento / Ouvidoria
              </h3>
              <button onClick={() => setIsNewRequestModalOpen(false)} className="text-gray-400 hover:text-white text-xs cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold block mb-1.5">
                  Descreva seu Requerimento ou Mensagem ao Capítulo:
                </label>
                <textarea
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  placeholder="Escreva sua solicitação, dúvida ou mensagem à administração capitular..."
                  rows={5}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#D9AA45]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateRequest}
                  disabled={isSubmittingRequest || !requestDescription.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingRequest ? "Enviando..." : "Protocolar Solicitação"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR DECLARAÇÃO OFICIAL (PDF PRONTO COM MODELO EXATO) */}
      {viewDeclaration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-in fade-in overflow-y-auto">
          <div className="bg-white text-gray-900 border border-gray-300 rounded-2xl max-w-2xl w-full p-8 sm:p-12 shadow-2xl relative my-8 print:m-0 print:p-0 print:border-none print:shadow-none print:w-full">
            {/* Botão de Fechar na Tela */}
            <button
              onClick={() => setViewDeclaration(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black text-sm print:hidden p-1 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              ✕
            </button>

            {/* Timbre e Cabeçalho Oficial */}
            <div className="text-center pb-6 border-b-2 border-gray-900/80">
              <p className="text-xs uppercase tracking-widest font-bold text-gray-700">
                Ordem DeMolay • Supremo Conselho DeMolay Brasil
              </p>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 mt-1">
                CAPÍTULO PROFESSOR CARVALHO NEVES Nº 500
              </h2>
              <h3 className="text-base sm:text-lg font-serif font-extrabold tracking-wide text-gray-900 mt-2 uppercase border-t border-b border-gray-300 py-1.5 inline-block px-4">
                {viewDeclaration.declaration_type === "quitacao_tesouraria"
                  ? "DECLARAÇÃO DE QUITAÇÃO"
                  : "DECLARAÇÃO DE FREQUÊNCIA"}
              </h3>
            </div>

            {/* Texto Oficial Exato */}
            {viewDeclaration.declaration_type === "quitacao_tesouraria" ? (
              <div className="py-8 space-y-5 text-sm leading-relaxed text-justify text-gray-800 font-serif">
                <p>
                  Eu,{" "}
                  <strong>
                    {viewDeclaration.content_data?.oficial_responsavel?.nome || "Aloísio Oliveira Neto"}
                  </strong>
                  , portador do ID Nº{" "}
                  <strong>
                    {viewDeclaration.content_data?.oficial_responsavel?.id_demolay || "134104"}
                  </strong>
                  , Tesoureiro do Capítulo Professor Carvalho Neves Nº 500, com sede na cidade de Teresina-PI, localizado na Rua Senador Teodoro Pacheco Nº 882, Centro, Teresina-PI, CEP: 64001-060, venho, por meio desta, declarar para os devidos fins que:
                </p>

                <p>
                  O irmão{" "}
                  <strong className="text-gray-950">
                    {viewDeclaration.content_data?.solicitante_nome || currentMember?.full_name}
                  </strong>
                  , portador do ID Nº{" "}
                  <strong className="text-gray-950">
                    {viewDeclaration.content_data?.solicitante_id_demolay || currentMember?.id_demolay}
                  </strong>
                  , encontra-se quite com suas obrigações financeiras junto ao Capítulo Professor Carvalho Neves Nº 500, estando em dia com todas as contribuições e demais responsabilidades financeiras referentes ao período de{" "}
                  <strong>
                    {viewDeclaration.content_data?.periodo_inicio || "01/07/2026"}
                  </strong>{" "}
                  a{" "}
                  <strong>
                    {viewDeclaration.content_data?.periodo_fim || "31/12/2026"}
                  </strong>
                  .
                </p>

                <p>
                  Esta declaração é emitida para comprovação de quitação financeira do mencionado irmão, podendo ser utilizada conforme a necessidade do solicitante.
                </p>

                <p>
                  Atesto a veracidade das informações acima e me coloco à disposição para quaisquer esclarecimentos adicionais que se façam necessários.
                </p>

                <p className="text-right pt-2">
                  Teresina-PI,{" "}
                  <strong>
                    {viewDeclaration.content_data?.data_emissao ||
                      new Date(viewDeclaration.created_at).toLocaleDateString("pt-BR")}
                  </strong>
                </p>

                <div className="pt-8 text-center space-y-1">
                  <p className="font-semibold text-gray-700">Atenciosamente,</p>
                  <div className="w-64 h-px bg-gray-400 mx-auto mt-10 mb-2" />
                  <p className="font-bold text-gray-950">
                    {viewDeclaration.content_data?.oficial_responsavel?.nome || "Aloísio Oliveira Neto"}
                  </p>
                  <p className="text-xs text-gray-600">
                    ID Nº {viewDeclaration.content_data?.oficial_responsavel?.id_demolay || "134104"}
                  </p>
                  <p className="text-xs font-semibold text-gray-800">
                    Tesoureiro do Capítulo Professor Carvalho Neves Nº 500
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 space-y-5 text-sm leading-relaxed text-justify text-gray-800 font-serif">
                <p>
                  Eu,{" "}
                  <strong>
                    {viewDeclaration.content_data?.oficial_responsavel?.nome || "Waldecy Goncalves de Araujo Neto"}
                  </strong>
                  , portador do ID Nº{" "}
                  <strong>
                    {viewDeclaration.content_data?.oficial_responsavel?.id_demolay || "148200"}
                  </strong>
                  , Escrivão do Capítulo Professor Carvalho Neves Nº 500, com sede na cidade de Teresina-PI, localizado na Rua Senador Teodoro Pacheco Nº 882, Centro, Teresina-PI, CEP: 64001-060, venho, por meio desta, em atenção ao pedido do interessado, declarar para os devidos fins que:
                </p>

                <p>
                  O irmão{" "}
                  <strong className="text-gray-950">
                    {viewDeclaration.content_data?.solicitante_nome || currentMember?.full_name}
                  </strong>
                  , portador do ID Nº{" "}
                  <strong className="text-gray-950">
                    {viewDeclaration.content_data?.solicitante_id_demolay || currentMember?.id_demolay}
                  </strong>
                  , participou regularmente das atividades promovidas pelo Capítulo Professor Carvalho Neves Nº 500 durante o período de{" "}
                  <strong>
                    {viewDeclaration.content_data?.periodo_inicio || new Date(dateFilterStart).toLocaleDateString("pt-BR")}
                  </strong>{" "}
                  a{" "}
                  <strong>
                    {viewDeclaration.content_data?.periodo_fim || new Date(dateFilterEnd).toLocaleDateString("pt-BR")}
                  </strong>
                  , contabilizando uma frequência total de{" "}
                  <strong className="text-gray-950">
                    {viewDeclaration.content_data?.frequencia_porcentagem || attendanceStats.rate}%
                  </strong>{" "}
                  de frequência.
                </p>

                <p>
                  Esta declaração é emitida para comprovação de frequência do mencionado irmão e pode ser utilizada conforme a necessidade do solicitante.
                </p>

                <p>
                  Atesto a veracidade das informações acima e me coloco à disposição para quaisquer esclarecimentos adicionais que se façam necessários.
                </p>

                <p className="text-right pt-2">
                  Teresina-PI,{" "}
                  <strong>
                    {viewDeclaration.content_data?.data_emissao ||
                      new Date(viewDeclaration.created_at).toLocaleDateString("pt-BR")}
                  </strong>
                  .
                </p>

                <div className="pt-8 text-center space-y-1">
                  <p className="font-semibold text-gray-700">Atenciosamente,</p>
                  <div className="w-64 h-px bg-gray-400 mx-auto mt-10 mb-2" />
                  <p className="font-bold text-gray-950">
                    {viewDeclaration.content_data?.oficial_responsavel?.nome || "Waldecy Goncalves de Araujo Neto"}
                  </p>
                  <p className="text-xs text-gray-600">
                    ID Nº {viewDeclaration.content_data?.oficial_responsavel?.id_demolay || "148200"}
                  </p>
                  <p className="text-xs font-semibold text-gray-800">
                    Escrivão do Capítulo Professor Carvalho Neves Nº 500
                  </p>
                </div>
              </div>
            )}

            {/* Rodapé e Autenticação */}
            <div className="pt-6 border-t border-gray-300 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
              <div>
                <p className="text-gray-500 text-[10px] uppercase">Código de Autenticação Digital:</p>
                <p className="font-bold text-gray-900 text-xs">
                  {viewDeclaration.verification_code}
                </p>
                <p className="text-[10px] text-gray-500">
                  Emitido digitalmente via Sistema Integrado Carvalho Neves Nº 500
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold flex items-center gap-2 hover:bg-black transition-all cursor-pointer print:hidden shadow"
              >
                <Printer className="w-4 h-4 text-[#D9AA45]" />
                <span>Imprimir / Salvar em PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUÓRUM, FREQUÊNCIA E ATA DA REUNIÃO */}
      {selectedMeetingForQuorum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay">
          <div className="ios-glass-card max-w-2xl w-full p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono text-[#D9AA45]">
                  {new Date(selectedMeetingForQuorum.starts_at).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">{selectedMeetingForQuorum.title}</h3>
                <p className="text-xs text-emerald-200/80 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{selectedMeetingForQuorum.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)"}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedMeetingForQuorum(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Banner da Ata Oficial se disponível */}
            {selectedMeetingForQuorum.ata_pdf_url && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-[#04281A] border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3 h-3 text-[#D9AA45]" />
                      Ata Oficial no Acervo
                    </span>
                    <h4 className="text-xs font-bold text-white">
                      {selectedMeetingForQuorum.ata_num || "Ata da Sessão Registrada"}
                    </h4>
                    <p className="text-[11px] text-emerald-200/80">
                      Documento assinado digitalmente disponível para consulta e download.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <a
                    href={selectedMeetingForQuorum.ata_pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-[#D9AA45] hover:bg-amber-400 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visualizar (PDF)</span>
                  </a>
                  <a
                    href={selectedMeetingForQuorum.ata_pdf_url}
                    download
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </a>
                </div>
              </div>
            )}

            {/* Resumo do Quórum */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">DeMolays</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">
                  {selectedMeetingForQuorum.demolays_present_count || (selectedMeetingForQuorum.demolays_present ? selectedMeetingForQuorum.demolays_present.length : "—")}
                </p>
                <p className="text-[10px] text-gray-400">presentes</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tios Maçons</p>
                <p className="text-xl font-extrabold text-[#D9AA45] mt-1">
                  {selectedMeetingForQuorum.masons_present_count || (selectedMeetingForQuorum.masons_present ? selectedMeetingForQuorum.masons_present.length : "—")}
                </p>
                <p className="text-[10px] text-gray-400">presentes</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Quórum Total</p>
                <p className="text-xl font-extrabold text-white mt-1">
                  {selectedMeetingForQuorum.total_quorum || "—"}
                </p>
                <p className="text-[10px] text-gray-400">irmãos</p>
              </div>
            </div>

            {/* Páginas do Livro Oficial */}
            {(selectedMeetingForQuorum.livro_demolay_page || selectedMeetingForQuorum.livro_macom_page) && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono p-3 rounded-xl bg-black/30 border border-white/10">
                {selectedMeetingForQuorum.livro_demolay_page && (
                  <span className="text-emerald-300">
                    📘 Livro Presença DeMolay: <strong>Pág. {selectedMeetingForQuorum.livro_demolay_page}</strong>
                  </span>
                )}
                {selectedMeetingForQuorum.livro_macom_page && (
                  <span className="text-purple-300">
                    🏛️ Livro Presença Maçons: <strong>Pág. {selectedMeetingForQuorum.livro_macom_page}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Listagem Nominal dos Irmãos Presentes */}
            {selectedMeetingForQuorum.demolays_present && selectedMeetingForQuorum.demolays_present.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-between">
                  <span>DeMolays Presentes</span>
                  <span className="text-gray-400 font-normal">{selectedMeetingForQuorum.demolays_present.length} membros</span>
                </h4>
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMeetingForQuorum.demolays_present.map((name, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-200 border border-emerald-500/30 text-[11px]">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Listagem Nominal dos Maçons Presentes */}
            {selectedMeetingForQuorum.masons_present && selectedMeetingForQuorum.masons_present.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#D9AA45] flex items-center justify-between">
                  <span>Tios Maçons / Conselho Presentes</span>
                  <span className="text-gray-400 font-normal">{selectedMeetingForQuorum.masons_present.length} tios</span>
                </h4>
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 max-h-36 overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMeetingForQuorum.masons_present.map((name, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-200 border border-amber-500/30 text-[11px]">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Deliberações e Descrição */}
            {selectedMeetingForQuorum.description && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 space-y-1">
                <span className="font-bold text-white block">Pauta e Deliberações da Sessão:</span>
                <p className="leading-relaxed">{selectedMeetingForQuorum.description}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedMeetingForQuorum(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTE E CORTE DE FOTO DE PERFIL (WHATSAPP / INSTAGRAM STYLE) */}
      {isCroppingPhoto && tempPhotoSrc && (
        <ProfilePhotoCropper
          imageSrc={tempPhotoSrc}
          onCancel={() => {
            setIsCroppingPhoto(false);
            setTempPhotoSrc(null);
          }}
          onCropComplete={handleSaveCroppedPhoto}
          isSaving={isUploadingPhoto}
        />
      )}
    </div>
  );
}
