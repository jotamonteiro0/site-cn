"use client";

import { useState, useEffect, useMemo } from "react";
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
  Heart,
  Share2,
  UserCheck,
  Info,
  Camera
} from "lucide-react";

interface MemberData {
  id: string;
  cid: string;
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
  solicitante_cid?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
  data_emissao?: string;
  frequencia_porcentagem?: number | string;
  oficial_responsavel?: {
    nome?: string;
    cid?: string;
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

interface BirthdayItem {
  member_id: string;
  full_name: string;
  cid: string;
  birthday_formatted: string;
  birth_day: number;
  birth_month: number;
}

export default function MemberSelfServicePage() {
  const [currentMember, setCurrentMember] = useState<MemberData | null>(null);
  const [allMembers, setAllMembers] = useState<MemberData[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [attendances, setAttendances] = useState<Record<string, AttendanceItem>>({});
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [declarations, setDeclarations] = useState<IssuedDeclarationItem[]>([]);
  const [birthdays, setBirthdays] = useState<BirthdayItem[]>([]);

  // Filtros de Data de Assiduidade
  const [dateFilterStart, setDateFilterStart] = useState("2026-01-01");
  const [dateFilterEnd, setDateFilterEnd] = useState("2026-12-31");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  // Estado da UI
  const [activeTab, setActiveTab] = useState<"frequencia" | "reunioes" | "mensalidades" | "solicitacoes" | "aniversarios">("frequencia");
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

  // Modal Nova Solicitação ao Capítulo
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [requestTargetRole, setRequestTargetRole] = useState<"escrivao" | "tesoureiro" | "master">("escrivao");
  const [requestDescription, setRequestDescription] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Modal de Visualização de Declaração Emitida
  const [viewDeclaration, setViewDeclaration] = useState<IssuedDeclarationItem | null>(null);

  // 1. Carrega Dados
  useEffect(() => {
    requestAnimationFrame(() => {
      setCurrentDate(new Date());
    });
    async function loadData() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Carrega todos os membros (para switcher de teste ou identificação)
        const { data: memData } = await supabase
          .from("members")
          .select("id, cid, full_name, category, regularity, masonic_lodge, initiation_date, demolay_degree_date, birth_date, email, phone")
          .order("full_name", { ascending: true });

        if (memData && memData.length > 0) {
          const typedMembers = memData as MemberData[];
          setAllMembers(typedMembers);

          // Tenta encontrar o membro vinculado ao usuário logado
          let userMember = typedMembers.find((m) => m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase());
          if (!userMember) {
            // Se não encontrou por email direto, usa o primeiro DeMolay Ativo como padrão
            userMember = typedMembers.find((m) => m.category === "demolay_ativo") || typedMembers[0];
          }

          // Busca foto de perfil salva no Supabase profiles ou no cache local
          let profilePhoto: string | undefined = undefined;
          if (user) {
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

        // 2. Carrega Reuniões
        const { data: meetData } = await supabase
          .from("meetings")
          .select("id, title, starts_at, location, status, description")
          .order("starts_at", { ascending: true });
        if (meetData) setMeetings(meetData);

        // 3. Carrega Aniversariantes via view
        const { data: bData } = await supabase
          .from("view_member_birthdays")
          .select("member_id, full_name, cid, birthday_formatted, birth_day, birth_month")
          .order("birth_month", { ascending: true })
          .order("birth_day", { ascending: true });
        if (bData) setBirthdays(bData as BirthdayItem[]);

      } catch (err) {
        console.error("Erro ao carregar dados do membro:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Carrega dados específicos do membro selecionado
  useEffect(() => {
    if (!currentMember) return;

    async function loadMemberDetails() {
      try {
        const supabase = createClient();

        // A. Frequência / Presença
        const { data: attData } = await supabase
          .from("meeting_attendance")
          .select("id, meeting_id, status, rsvp_status, rsvp_notes")
          .eq("member_id", currentMember!.id);

        if (attData) {
          const map: Record<string, AttendanceItem> = {};
          attData.forEach((a) => {
            map[a.meeting_id] = a as AttendanceItem;
          });
          setAttendances(map);
        }

        // B. Mensalidades / Cobranças
        const { data: chgData } = await supabase
          .from("member_charges")
          .select("id, description, amount, due_date, status, paid_at, infinitepay_checkout_url, pix_qrcode_payload")
          .eq("member_id", currentMember!.id)
          .order("due_date", { ascending: false });

        if (chgData) {
          setCharges(chgData as ChargeItem[]);
        }

        // C. Solicitações
        const { data: reqData } = await supabase
          .from("member_requests")
          .select("id, protocol, target_role, status, description, created_at")
          .eq("requester_member_id", currentMember!.id)
          .order("created_at", { ascending: false });

        if (reqData) {
          setRequests(reqData as RequestItem[]);
        }

        // D. Declarações Oficiais Emitidas
        const { data: declData } = await supabase
          .from("issued_declarations")
          .select("id, declaration_type, verification_code, valid_until, created_at, period_start, period_end, content_data")
          .eq("member_id", currentMember!.id)
          .order("created_at", { ascending: false });

        if (declData) {
          setDeclarations(declData as IssuedDeclarationItem[]);
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

  // Próxima Reunião
  const nextMeeting = useMemo(() => {
    const today = currentDate ? currentDate.toISOString().substring(0, 10) : "2026-01-01";
    return meetings.find((m) => m.starts_at.substring(0, 10) >= today) || meetings[0] || null;
  }, [meetings, currentDate]);

  // RSVP da Próxima Reunião
  const nextMeetingAttendance = useMemo(() => {
    if (!nextMeeting) return null;
    return attendances[nextMeeting.id] || null;
  }, [nextMeeting, attendances]);

  // Handler: Confirmar Presença (RSVP)
  const handleConfirmPresence = async () => {
    if (!nextMeeting || !currentMember) return;
    setIsSubmittingRsvp(true);
    try {
      const supabase = createClient();
      const existing = attendances[nextMeeting.id];

      if (existing?.id) {
        await supabase
          .from("meeting_attendance")
          .update({
            rsvp_status: "confirmado",
            rsvp_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("meeting_attendance")
          .insert({
            meeting_id: nextMeeting.id,
            member_id: currentMember.id,
            rsvp_status: "confirmado",
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
          rsvp_status: "confirmado",
        },
      }));

      setFeedbackMsg("Presença confirmada com sucesso! O Capítulo conta com seu brilho na Coluna da Harmonia.");
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err) {
      console.error("Erro ao confirmar presença:", err);
      alert("Erro ao confirmar presença. Tente novamente.");
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

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

  // Handler: Emissão Instantânea de Declaração Oficial (PDF Automático)
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
          period_start: type === "frequencia" ? dateFilterStart : "2026-07-01",
          period_end: type === "frequencia" ? dateFilterEnd : "2026-12-31",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert("Erro ao emitir declaração: " + (data.error || "Tente novamente"));
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

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("membros")
            .getPublicUrl(filePath);

          const finalUrl = publicUrlData?.publicUrl || croppedDataUrl;
          if (user) {
            await supabase
              .from("profiles")
              .update({ avatar_path: finalUrl })
              .eq("id", user.id);
          }
        } else if (user) {
          await supabase
            .from("profiles")
            .update({ avatar_path: croppedDataUrl })
            .eq("id", user.id);
        }
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

  // Link para Adicionar ao Google Calendar
  const getGoogleCalendarUrl = (m?: MeetingItem | null) => {
    if (!m) return "#";
    const startDate = new Date(m.starts_at);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const formatGDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const datesStr = `${formatGDate(startDate)}/${formatGDate(endDate)}`;
    const text = encodeURIComponent(m.title);
    const details = encodeURIComponent("Sessão Oficial do Capítulo Professor Carvalho Neves Nº 500.\nLocal: A∴R∴L∴S∴ Caridade II nº 135.");
    const location = encodeURIComponent(m.location || "A∴R∴L∴S∴ Caridade II nº 135");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${datesStr}&details=${details}&location=${location}`;
  };

  // Link para Compartilhar RSVP no WhatsApp
  const getWhatsAppShareUrl = () => {
    if (!nextMeeting || !currentMember) return "#";
    const msg = encodeURIComponent(
      `*Capítulo Professor Carvalho Neves Nº 500*\n` +
      `Irmão *${currentMember.full_name}* (ID ${currentMember.cid}) confirmou presença na Sessão:\n` +
      `📅 *${new Date(nextMeeting.starts_at).toLocaleDateString("pt-BR")}*\n` +
      `🏛️ *${nextMeeting.title}*\n` +
      `📍 ${nextMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135"}\n\n` +
      `Nos vemos no Templo!`
    );
    return `https://api.whatsapp.com/send?text=${msg}`;
  };

  // Copiar PIX
  const handleCopyPix = () => {
    const pixPayload = selectedCharge?.pix_qrcode_payload || 
      "00020126580014br.gov.bcb.pix0136capitulo500teresina@demolaypi.org.br520400005303986540550.005802BR5925CAPITULO PROF CARVALHO NE6008TERESINA62070503***6304E8A2";
    navigator.clipboard.writeText(pixPayload);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-emerald-200/60 animate-pulse">
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

      {/* 1. Header do Perfil do Membro & Switcher de Demonstração */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064D32] via-[#04281A] to-[#021810] border border-[#D9AA45]/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D9AA45]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Foto de Perfil com Suporte a Upload e Efeito Glassmorphism */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#D9AA45] via-amber-200 to-[#087443] p-0.5 shadow-2xl overflow-hidden">
                <div className="w-full h-full rounded-2xl bg-[#04281A] flex items-center justify-center text-2xl font-bold text-[#D9AA45] overflow-hidden relative">
                  {currentMember?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentMember.photo_url}
                      alt={currentMember.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {currentMember?.full_name ? currentMember.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("") : "CN"}
                    </span>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center text-xs text-white font-semibold">
                      Enviando...
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Câmera Sobreposto */}
              <label
                htmlFor="profile-photo-input"
                className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-[#087443] hover:bg-[#D9AA45] text-white hover:text-[#04281A] border border-[#D9AA45]/50 shadow-lg cursor-pointer transition-all transform hover:scale-110 flex items-center justify-center backdrop-blur-md"
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
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/40 backdrop-blur-sm">
                  ID {currentMember?.cid || "000000"}
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

              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
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
                    {m.full_name} (ID {m.cid})
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
          onClick={() => setActiveTab("frequencia")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "frequencia"
              ? "bg-[#064D32] text-[#D9AA45] border-t-2 border-[#D9AA45]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Assiduidade & Frequência
        </button>

        <button
          onClick={() => setActiveTab("reunioes")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "reunioes"
              ? "bg-[#064D32] text-[#D9AA45] border-t-2 border-[#D9AA45]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Clock className="w-4 h-4" />
          Próxima Reunião
        </button>

        <button
          onClick={() => setActiveTab("mensalidades")}
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
          onClick={() => setActiveTab("solicitacoes")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "solicitacoes"
              ? "bg-[#064D32] text-[#D9AA45] border-t-2 border-[#D9AA45]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Solicitações & Ouvidoria
        </button>

        <button
          onClick={() => setActiveTab("aniversarios")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === "aniversarios"
              ? "bg-[#064D32] text-[#D9AA45] border-t-2 border-[#D9AA45]"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Heart className="w-4 h-4" />
          Aniversários do Capítulo
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
                  setDateFilterStart("2026-07-01");
                  setDateFilterEnd("2026-12-31");
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium transition-all"
              >
                Gestão 2026/2
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D9AA45]/20 hover:bg-[#D9AA45]/30 border border-[#D9AA45]/40 text-[#D9AA45] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                {isEmittingDecl ? "Emitindo..." : "Emitir Declaração de Frequência (PDF Automático)"}
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
                      <th className="py-3 px-4 text-center">Status</th>
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

      {/* ABA 2: PRÓXIMA REUNIÃO & RSVP */}
      {activeTab === "reunioes" && (
        <div className="space-y-6 animate-fade-in">
          {nextMeeting ? (
            <div className="bg-[#04281A]/90 border border-[#D9AA45]/30 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/40">
                      Próxima Sessão Capitular
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {new Date(nextMeeting.starts_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                    {nextMeeting.title}
                  </h2>
                  <p className="text-sm text-gray-300 mt-2 max-w-2xl">
                    {nextMeeting.description || "Sessão ordinária do Capítulo Professor Carvalho Neves Nº 500."}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-300">
                    <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
                      <Clock className="w-3.5 h-3.5 text-[#D9AA45]" />
                      {new Date(nextMeeting.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      {nextMeeting.location || "A∴R∴L∴S∴ Caridade II nº 135"}
                    </span>
                  </div>
                </div>

                {/* Status e Ações de Confirmação (RSVP) */}
                <div className="w-full md:w-auto bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-3">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                    Sua Confirmação de Presença
                  </p>

                  {nextMeetingAttendance?.rsvp_status === "confirmado" ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        Presença Confirmada!
                      </span>
                      <a
                        href={getWhatsAppShareUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#D9AA45] hover:underline flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3" />
                        Avisar no Grupo do WhatsApp
                      </a>
                    </div>
                  ) : nextMeetingAttendance?.rsvp_status === "justificado" ? (
                    <div className="flex flex-col items-center gap-1 text-center">
                      <span className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        Ausência Justificada
                      </span>
                      <p className="text-xs text-gray-400 italic max-w-xs mt-1">
                        &ldquo;{nextMeetingAttendance.rsvp_notes}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                      <button
                        onClick={handleConfirmPresence}
                        disabled={isSubmittingRsvp}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar Presença
                      </button>

                      <button
                        onClick={() => setIsRsvpModalOpen(true)}
                        disabled={isSubmittingRsvp}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        Justificar Ausência
                      </button>
                    </div>
                  )}

                  <a
                    href={getGoogleCalendarUrl(nextMeeting)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 mt-2 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#D9AA45]" />
                    Adicionar ao Google Agenda
                  </a>
                </div>
              </div>

              {/* Informação sobre Notificações */}
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-3 text-xs text-gray-400">
                <Info className="w-4 h-4 text-[#D9AA45] flex-shrink-0" />
                <span>
                  Lembrete automático enviado previamente via e-mail e nos canais oficiais do Capítulo para que todos os irmãos organizem seus paramentos.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-8 text-center text-gray-400">
              Nenhuma reunião cadastrada no calendário capitular no momento.
            </div>
          )}

          {/* Todas as Próximas Sessões do Calendário */}
          <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-base font-bold text-white mb-4">Calendário Geral de Sessões</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meetings.map((m) => (
                <div key={m.id} className="bg-black/30 border border-white/10 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono text-[#D9AA45]">
                      {new Date(m.starts_at).toLocaleDateString("pt-BR")} às {new Date(m.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">{m.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">{m.location || "A∴R∴L∴S∴ Caridade II nº 135"}</p>
                  </div>
                  <a
                    href={getGoogleCalendarUrl(m)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="Adicionar à Google Agenda"
                  >
                    <Calendar className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: MINHAS MENSALIDADES */}
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
              <button
                onClick={() => {
                  setSelectedCharge(charges.find(c => c.status !== "confirmado") || charges[0] || null);
                  setIsPayModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D9AA45] to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                Pagar com PIX / Cartão InfinitePay
              </button>

              <button
                onClick={() => handleGenerateDeclaration("quitacao_tesouraria")}
                disabled={isEmittingDecl}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-[#D9AA45]" />
                {isEmittingDecl ? "Emitindo..." : "Emitir Declaração de Quitação (PDF Automático)"}
              </button>
            </div>
          </div>

          {/* Cards de Métricas: Quais já paguei vs Pendentes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
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

            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30">
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

                        return (
                          <tr key={c.id} className="hover:bg-white/5 transition-colors">
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

      {/* ABA 5: CALENDÁRIO DE ANIVERSÁRIOS */}
      {activeTab === "aniversarios" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#04281A]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-400" />
                  Aniversariantes do Capítulo
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Celebre a vida e o laço fraternal de cada irmão e tio maçom do Capítulo 500.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/40">
                {birthdays.length} datas cadastradas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {birthdays.map((b) => (
                <div key={b.member_id} className="bg-black/30 border border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#064D32] to-[#087443] border border-[#D9AA45]/40 flex items-center justify-center font-mono font-bold text-xs text-[#D9AA45]">
                      {b.birthday_formatted}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white line-clamp-1">{b.full_name}</p>
                      <p className="text-[10px] text-gray-400">ID {b.cid}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
          <div className="ios-glass-card rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#D9AA45]" />
                Pagamento de Mensalidade
              </h3>
              <button onClick={() => setIsPayModalOpen(false)} className="text-gray-400 hover:text-white text-xs cursor-pointer">
                ✕
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">{selectedCharge?.description || "Mensalidade Capitular"}</p>
              <p className="text-3xl font-extrabold text-white mt-1">
                R$ {Number(selectedCharge?.amount || (currentMember?.category === "macom" ? 25 : 22)).toFixed(2).replace(".", ",")}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="my-5 p-4 rounded-xl bg-white flex flex-col items-center justify-center mx-auto w-52 h-52 shadow-inner">
              <div className="w-full h-full flex items-center justify-center text-center p-2">
                <QrCode className="w-36 h-36 text-black" />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCopyPix}
                className="w-full py-2.5 rounded-xl bg-[#D9AA45] hover:bg-amber-400 text-black text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {pixCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {pixCopied ? "Código PIX Copiado!" : "Copiar Código PIX Copia e Cola"}
              </button>

              <a
                href={selectedCharge?.infinitepay_checkout_url || "https://infinitepay.io"}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-[#D9AA45]" />
                Pagar com Cartão via InfinitePay
              </a>
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-4">
              Após o pagamento, o sistema e o Tesoureiro realizam a baixa para atualizar seu histórico de quitação.
            </p>
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
                    {viewDeclaration.content_data?.oficial_responsavel?.cid || "134104"}
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
                    {viewDeclaration.content_data?.solicitante_cid || currentMember?.cid}
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
                    ID Nº {viewDeclaration.content_data?.oficial_responsavel?.cid || "134104"}
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
                    {viewDeclaration.content_data?.oficial_responsavel?.cid || "148200"}
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
                    {viewDeclaration.content_data?.solicitante_cid || currentMember?.cid}
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
                    ID Nº {viewDeclaration.content_data?.oficial_responsavel?.cid || "148200"}
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
