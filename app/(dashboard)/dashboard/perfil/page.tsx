"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  User,
  Shield,
  Lock,
  Phone,
  Mail,
  MapPin,
  Heart,
  Briefcase,
  GraduationCap,
  Users,
  Award,
  KeyRound,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building,
  Share2,
  Download,
  RefreshCw
} from "lucide-react";

interface MemberProfile {
  id: string;
  full_name: string;
  id_demolay: string | null;
  birth_date: string | null;
  cpf: string | null;
  rg: string | null;
  blood_type: string | null;
  blood_donor: boolean;
  bone_marrow_donor: boolean;
  organ_donor: boolean;
  education_level: string | null;
  profession: string | null;
  mother_name: string | null;
  father_name: string | null;
  father_is_mason: boolean;
  email: string | null;
  alternative_email: string | null;
  phone: string | null;
  alternative_phone: string | null;
  commercial_phone: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_facebook: string | null;
  address_cep: string | null;
  address_city: string | null;
  address_state: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  photo_url: string | null;
  cover_photo_url: string | null;
  category: string;
  regularity: string | null;
  masonic_lodge: string | null;
  initiation_date: string | null;
  demolay_degree_date: string | null;
  chapter_number: string;
}

interface PositionItem {
  id: string;
  position_code: string;
  position_name: string;
  management?: {
    id: string;
    name: string;
    term: string;
    year: number;
  };
}

export default function MemberProfilePage() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [isMaster, setIsMaster] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Estado dos formulários editáveis
  const [formData, setFormData] = useState<Partial<MemberProfile>>({});
  
  // Troca de senha
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Upload de fotos
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Busca do perfil no backend
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/member/profile");
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao carregar perfil.");
      }

      setProfile(data.member);
      setFormData(data.member);
      setIsMaster(Boolean(data.is_master));
      setPositions(data.positions || []);
    } catch (err) {
      console.error("Erro ao consultar perfil:", err);
      setErrorMsg(err instanceof Error ? err.message : "Falha ao carregar dados do perfil.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await fetch("/api/member/profile");
        const data = await res.json();
        if (!isMounted) return;
        if (!res.ok || data.error) {
          throw new Error(data.error || "Erro ao carregar perfil.");
        }
        setProfile(data.member);
        setFormData(data.member);
        setIsMaster(Boolean(data.is_master));
        setPositions(data.positions || []);
      } catch (err) {
        if (!isMounted) return;
        console.error("Erro ao consultar perfil:", err);
        setErrorMsg(err instanceof Error ? err.message : "Falha ao carregar dados do perfil.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Consulta automática de CEP via ViaCEP
  const handleCepBlur = async () => {
    const rawCep = (formData.address_cep || "").replace(/\D/g, "");
    if (rawCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const cepData = await res.json();
        if (!cepData.erro) {
          setFormData((prev) => ({
            ...prev,
            address_street: cepData.logradouro || prev.address_street,
            address_neighborhood: cepData.bairro || prev.address_neighborhood,
            address_city: cepData.localidade || prev.address_city,
            address_state: cepData.uf || prev.address_state,
          }));
        }
      } catch {
        // Ignora erro do ViaCEP
      }
    }
  };

  // Upload de Foto de Perfil
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("A imagem selecionada excede o limite de 10MB.");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const supabase = createClient();
      const filePath = `${profile.id}/avatar-${Date.now()}.${file.name.split(".").pop() || "png"}`;
      const { error: uploadError } = await supabase.storage.from("membros").upload(filePath, file, {
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from("membros").getPublicUrl(filePath).data.publicUrl;

      // Salva imediatamente na API
      const res = await fetch("/api/member/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profile.id, photo_url: publicUrl }),
      });

      if (!res.ok) throw new Error("Falha ao salvar URL da foto no perfil.");

      setProfile((prev) => (prev ? { ...prev, photo_url: publicUrl } : null));
      setFormData((prev) => ({ ...prev, photo_url: publicUrl }));
      setSaveSuccessMsg("Foto de perfil atualizada com sucesso!");
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Erro no upload de foto:", err);
      alert("Não foi possível carregar a imagem. Tente novamente.");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  // Upload de Foto de Capa
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("A imagem de capa excede o limite de 10MB.");
      return;
    }

    setIsUploadingCover(true);
    try {
      const supabase = createClient();
      const filePath = `${profile.id}/cover-${Date.now()}.${file.name.split(".").pop() || "png"}`;
      const { error: uploadError } = await supabase.storage.from("membros").upload(filePath, file, {
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from("membros").getPublicUrl(filePath).data.publicUrl;

      const res = await fetch("/api/member/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profile.id, cover_photo_url: publicUrl }),
      });

      if (!res.ok) throw new Error("Falha ao salvar URL da capa no perfil.");

      setProfile((prev) => (prev ? { ...prev, cover_photo_url: publicUrl } : null));
      setFormData((prev) => ({ ...prev, cover_photo_url: publicUrl }));
      setSaveSuccessMsg("Foto de capa atualizada com sucesso!");
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Erro no upload de capa:", err);
      alert("Não foi possível carregar a foto de capa. Tente novamente.");
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  // Salvar alterações cadastrais
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setErrorMsg("");
    setSaveSuccessMsg("");

    try {
      const res = await fetch("/api/member/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile.id,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao salvar alterações.");
      }

      setProfile(data.member);
      setFormData(data.member);
      setSaveSuccessMsg("Dados cadastrais homologados e atualizados com sucesso no sistema!");
      setTimeout(() => setSaveSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  // Alterar Senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("A confirmação da senha não confere.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/member/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao atualizar senha.");
      }

      setPasswordMsg("Sua senha foi alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMsg(""), 5000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-emerald-200/60 font-mono animate-pulse">
        Carregando perfil cadastral oficial do membro...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Perfil não encontrado</h2>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          {errorMsg || "Não foi possível carregar as informações do seu perfil DeMolay."}
        </p>
        <Link href="/dashboard" className="btn-heraldico-vidro inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Início</span>
        </Link>
      </div>
    );
  }

  // Verifica se a data de nascimento já é imutável
  const isBirthDateImmutable = Boolean(profile.birth_date && !isMaster);

  return (
    <div className="space-y-8 animate-in fade-in max-w-5xl mx-auto pb-20">
      {/* HEADER DE NAVEGAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/membro"
              className="text-xs text-emerald-300/80 hover:text-white flex items-center gap-1 font-mono transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Painel do Membro</span>
            </Link>
            <span className="text-white/30 text-xs">•</span>
            <span className="text-xs text-[#D9AA45] font-mono">Autoatendimento SISDM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <User className="w-7 h-7 text-[#D9AA45]" />
            <span>Meu Perfil Cadastral</span>
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1 font-light">
            Consulte, complete e mantenha seus dados cadastrais, familiares e de contato atualizados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isMaster && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#D9AA45] text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <Shield className="w-4 h-4" />
              <span>Modo Master Ativo</span>
            </span>
          )}
          <button
            type="button"
            onClick={loadProfile}
            disabled={isLoading}
            className="btn-heraldico-vidro px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            title="Recarregar dados do servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Recarregar</span>
          </button>
          <Link
            href="/dashboard/membro"
            className="btn-heraldico-vidro px-4 py-2 rounded-xl text-xs font-semibold"
          >
            <span>Ver Mensalidades & Frequência</span>
          </Link>
        </div>
      </div>

      {/* FEEDBACK MENSAGENS */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 shadow-md animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5 shadow-md animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SEÇÃO J: FOTO DE CAPA E AVATAR COM DESIGN HERALDICO */}
      <div className="card-heraldico-dark rounded-2xl overflow-hidden border border-white/10 shadow-xl">
        {/* Banner de Capa */}
        <div className="relative w-full h-44 sm:h-56 bg-gradient-to-r from-[#0C1D14] via-[#052E1D] to-[#0A1A11] overflow-hidden">
          {profile.cover_photo_url ? (
            <Image
              src={profile.cover_photo_url}
              alt="Capa do perfil"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <Shield className="w-32 h-32 text-[#D9AA45]" />
            </div>
          )}

          {/* Botão Alterar Capa */}
          <label className="absolute top-4 right-4 z-10 btn-heraldico-vidro px-3 py-1.5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5 bg-black/60 backdrop-blur-md hover:bg-black/80">
            {isUploadingCover ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5 text-[#D9AA45]" />
            )}
            <span>{isUploadingCover ? "Enviando..." : "Alterar Capa"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              disabled={isUploadingCover}
              className="hidden"
            />
          </label>
        </div>

        {/* Informações de Perfil e Avatar */}
        <div className="p-6 pt-0 sm:flex sm:items-end sm:justify-between relative">
          <div className="sm:flex sm:items-end sm:gap-6 -mt-16 sm:-mt-20">
            {/* Foto de Perfil */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-[#0C1D14] border-4 border-[#08140E] shadow-2xl shrink-0 group">
              {profile.photo_url ? (
                <Image
                  src={profile.photo_url}
                  alt={profile.full_name}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-400">
                  <User className="w-12 h-12" />
                </div>
              )}

              {/* Botão Sobreposto na Foto */}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity backdrop-blur-xs">
                {isUploadingPhoto ? (
                  <RefreshCw className="w-5 h-5 animate-spin mb-1 text-[#D9AA45]" />
                ) : (
                  <Camera className="w-5 h-5 mb-1 text-[#D9AA45]" />
                )}
                <span>Alterar Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>

            {/* Nome e Badges */}
            <div className="mt-4 sm:mt-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="selo-vidro-cn px-2.5 py-0.5 rounded text-[10px] font-bold text-[#D9AA45] uppercase tracking-wider font-mono">
                  ID DeMolay: {profile.id_demolay || "Cadastrado"}
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                  {profile.category === "macom"
                    ? "Tio Maçom Consultor"
                    : profile.category === "senior_demolay"
                    ? "Sênior DeMolay"
                    : "DeMolay Ativo"}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/30 font-mono">
                  {profile.regularity || "Regular"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {profile.full_name}
              </h2>
              <p className="text-xs text-emerald-200/70 font-light flex items-center gap-2">
                <span>Capítulo Professor Carvalho Neves nº 500</span>
                <span>•</span>
                <span>Teresina/PI</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FORMULÁRIO PRINCIPAL COM TODAS AS SEÇÕES */}
      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* ========================================================= */}
        {/* SEÇÃO A: DADOS PESSOAIS                                  */}
        {/* ========================================================= */}
        <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-white/10 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#D9AA45]" />
              <span>A. Dados Pessoais</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-200/60">Seção Cadastral Obrigatória</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Nome Completo (IMUTÁVEL PARA MEMBRO) */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Nome Completo *</span>
                {!isMaster && (
                  <span className="text-[10px] text-amber-300/80 font-normal flex items-center gap-1 lowercase">
                    <Lock className="w-3 h-3 text-[#D9AA45]" />
                    imutável
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={!isMaster}
                  value={formData.full_name || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                    !isMaster
                      ? "bg-black/40 border-white/10 text-gray-300 cursor-not-allowed"
                      : "bg-[#08140E] border-white/20 text-white focus:ring-2 focus:ring-[#D9AA45]"
                  }`}
                />
                {!isMaster && (
                  <Lock className="w-3.5 h-3.5 text-white/30 absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            {/* ID DeMolay (IMUTÁVEL PARA MEMBRO) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>ID DeMolay *</span>
                {!isMaster && (
                  <span className="text-[10px] text-amber-300/80 font-normal flex items-center gap-1 lowercase">
                    <Lock className="w-3 h-3 text-[#D9AA45]" />
                    imutável
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={!isMaster}
                  value={formData.id_demolay || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, id_demolay: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold ${
                    !isMaster
                      ? "bg-black/40 border-white/10 text-gray-300 cursor-not-allowed"
                      : "bg-[#08140E] border-white/20 text-white focus:ring-2 focus:ring-[#D9AA45]"
                  }`}
                />
                {!isMaster && (
                  <Lock className="w-3.5 h-3.5 text-white/30 absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            {/* Data de Nascimento (IMUTÁVEL UMA VEZ CADASTRADA) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Data de Nascimento *</span>
                {isBirthDateImmutable ? (
                  <span className="text-[10px] text-amber-300/80 font-normal flex items-center gap-1 lowercase">
                    <Lock className="w-3 h-3 text-[#D9AA45]" />
                    homologada
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-normal lowercase">preenchimento inicial</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="date"
                  disabled={isBirthDateImmutable}
                  value={formData.birth_date ? new Date(formData.birth_date).toISOString().substring(0, 10) : ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, birth_date: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${
                    isBirthDateImmutable
                      ? "bg-black/40 border-white/10 text-gray-300 cursor-not-allowed"
                      : "bg-[#08140E] border-white/20 text-white focus:ring-2 focus:ring-[#D9AA45]"
                  }`}
                />
                {isBirthDateImmutable && (
                  <Lock className="w-3.5 h-3.5 text-white/30 absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {!isBirthDateImmutable && (
                <p className="text-[10px] text-emerald-400/80 mt-0.5">
                  Atenção: uma vez informada e salva, a data é fixada no banco de dados.
                </p>
              )}
            </div>

            {/* CPF */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                CPF
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, cpf: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            {/* RG */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                RG / Órgão Emissor
              </label>
              <input
                type="text"
                placeholder="Ex: 0.000.000 SSP/PI"
                value={formData.rg || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, rg: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            {/* Tipo Sanguíneo */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-red-400" />
                <span>Tipo Sanguíneo</span>
              </label>
              <select
                value={formData.blood_type || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, blood_type: e.target.value || null }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              >
                <option value="">Não informado</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            {/* Escolaridade */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Escolaridade</span>
              </label>
              <select
                value={formData.education_level || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, education_level: e.target.value || null }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              >
                <option value="">Selecione...</option>
                <option value="Ensino Fundamental Incompleto">Ensino Fundamental Incompleto</option>
                <option value="Ensino Fundamental Completo">Ensino Fundamental Completo</option>
                <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                <option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option>
                <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                <option value="Pós-Graduação / Especialização">Pós-Graduação / Especialização</option>
                <option value="Mestrado">Mestrado</option>
                <option value="Doutorado">Doutorado</option>
              </select>
            </div>

            {/* Profissão */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-300" />
                <span>Profissão / Ocupação</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Estudante, Engenheiro, etc."
                value={formData.profession || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, profession: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>
          </div>

          {/* Doadores: Sangue, Medula, Órgãos */}
          <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-[#D9AA45]/40 transition-colors">
              <input
                type="checkbox"
                checked={Boolean(formData.blood_donor)}
                onChange={(e) => setFormData((prev) => ({ ...prev, blood_donor: e.target.checked }))}
                className="w-4 h-4 rounded text-[#D9AA45] focus:ring-[#D9AA45] bg-[#08140E] border-white/20"
              />
              <span className="text-xs text-emerald-100 font-medium">Doador de Sangue</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-[#D9AA45]/40 transition-colors">
              <input
                type="checkbox"
                checked={Boolean(formData.bone_marrow_donor)}
                onChange={(e) => setFormData((prev) => ({ ...prev, bone_marrow_donor: e.target.checked }))}
                className="w-4 h-4 rounded text-[#D9AA45] focus:ring-[#D9AA45] bg-[#08140E] border-white/20"
              />
              <span className="text-xs text-emerald-100 font-medium">Doador de Medula</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-[#D9AA45]/40 transition-colors">
              <input
                type="checkbox"
                checked={Boolean(formData.organ_donor)}
                onChange={(e) => setFormData((prev) => ({ ...prev, organ_donor: e.target.checked }))}
                className="w-4 h-4 rounded text-[#D9AA45] focus:ring-[#D9AA45] bg-[#08140E] border-white/20"
              />
              <span className="text-xs text-emerald-100 font-medium">Doador de Órgãos</span>
            </label>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEÇÃO B: DADOS FAMILIARES                                */}
        {/* ========================================================= */}
        <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-white/10 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D9AA45]" />
              <span>B. Dados Familiares</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-200/60">Responsáveis e Filiação</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Nome da Mãe ou Responsável
              </label>
              <input
                type="text"
                placeholder="Nome completo da mãe"
                value={formData.mother_name || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, mother_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Nome do Pai ou Responsável
              </label>
              <input
                type="text"
                placeholder="Nome completo do pai"
                value={formData.father_name || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, father_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-[#D9AA45]/40 transition-colors max-w-sm">
              <input
                type="checkbox"
                checked={Boolean(formData.father_is_mason)}
                onChange={(e) => setFormData((prev) => ({ ...prev, father_is_mason: e.target.checked }))}
                className="w-4 h-4 rounded text-[#D9AA45] focus:ring-[#D9AA45] bg-[#08140E] border-white/20"
              />
              <span className="text-xs text-emerald-100 font-medium">Pai ou Responsável é Maçom</span>
            </label>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEÇÃO C & D: DADOS DEMOLAY & MINHAS ORGANIZAÇÕES         */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* C. Dados DeMolay */}
          <div className="card-heraldico-dark p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#D9AA45]" />
                <span>C. Dados DeMolay</span>
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/10">
                <span className="text-gray-400">Capítulo Atual:</span>
                <span className="font-bold text-white">Prof. Carvalho Neves nº 500</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/10">
                <span className="text-gray-400">Situação Litúrgica:</span>
                <span className="font-bold text-emerald-300 font-mono">{profile.regularity || "Regular"}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/10">
                <span className="text-gray-400">Data de Iniciação:</span>
                <span className="font-bold text-white font-mono">
                  {profile.initiation_date
                    ? new Date(profile.initiation_date).toLocaleDateString("pt-BR")
                    : "Preservada em Ata"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/10">
                <span className="text-gray-400">Grau DeMolay:</span>
                <span className="font-bold text-white font-mono">
                  {profile.demolay_degree_date
                    ? new Date(profile.demolay_degree_date).toLocaleDateString("pt-BR")
                    : "Conferido"}
                </span>
              </div>
            </div>
          </div>

          {/* D. Minhas Organizações */}
          <div className="card-heraldico-dark p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-[#D9AA45]" />
                <span>D. Minhas Organizações</span>
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-white">Capítulo Prof. Carvalho Neves nº 500</strong>
                  <span className="text-[10px] text-[#D9AA45] font-mono font-bold">Principal</span>
                </div>
                <p className="text-[11px] text-gray-400">SCODRFB • Grande Capítulo Estadual do Piauí</p>
              </div>

              {profile.masonic_lodge && (
                <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-white">{profile.masonic_lodge}</strong>
                    <span className="text-[10px] text-emerald-400 font-mono">Patrocinadora</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Potência Maçônica Regular</p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-white">DeMolay Brasil (SCDB)</strong>
                  <span className="text-[10px] text-emerald-300 font-mono">Supremo Conselho</span>
                </div>
                <p className="text-[11px] text-gray-400">Federação Nacional DeMolay</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEÇÃO E: HISTÓRICO DE CARGOS                             */}
        {/* ========================================================= */}
        <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D9AA45]" />
              <span>E. Histórico de Cargos e Gestões</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-200/60">Trajetória Capitular</span>
          </div>

          {positions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {positions.map((pos) => (
                <div key={pos.id} className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-1">
                  <span className="text-[10px] text-[#D9AA45] font-mono uppercase font-bold block">
                    {pos.management?.name || "Gestão Capitular"}
                  </span>
                  <h4 className="text-xs font-bold text-white">{pos.position_name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {pos.management?.term || "Oficial em exercício"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-gray-400">
              Nenhum cargo passado registrado na nominata histórica. Cargos ativos são atribuídos pelo Mestre Conselheiro.
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* SEÇÃO F: DADOS DE CONTATO                                */}
        {/* ========================================================= */}
        <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-white/10 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#D9AA45]" />
              <span>F. Dados de Contato</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-200/60">Comunicação Oficial</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-300" />
                <span>E-mail Principal</span>
              </label>
              <input
                type="email"
                disabled
                value={profile.email || ""}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-gray-300 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                E-mail Alternativo
              </label>
              <input
                type="email"
                placeholder="Ex: secundario@email.com"
                value={formData.alternative_email || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, alternative_email: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#D9AA45]" />
                <span>Telefone Preferencial (WhatsApp)</span>
              </label>
              <input
                type="tel"
                placeholder="(86) 90000-0000"
                value={formData.phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Telefone Alternativo
              </label>
              <input
                type="tel"
                placeholder="(86) 90000-0000"
                value={formData.alternative_phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, alternative_phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Telefone Comercial
              </label>
              <input
                type="tel"
                placeholder="(86) 3000-0000"
                value={formData.commercial_phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, commercial_phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEÇÃO G: REDES SOCIAIS                                   */}
        {/* ========================================================= */}
        <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-white/10 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#D9AA45]" />
              <span>G. Redes Sociais</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-200/60">Perfis Sociais</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Instagram (@usuario)
              </label>
              <input
                type="text"
                placeholder="@seuperfil"
                value={formData.social_instagram || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, social_instagram: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                LinkedIn (URL)
              </label>
              <input
                type="text"
                placeholder="https://linkedin.com/in/..."
                value={formData.social_linkedin || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, social_linkedin: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Facebook (URL)
              </label>
              <input
                type="text"
                placeholder="https://facebook.com/..."
                value={formData.social_facebook || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, social_facebook: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEÇÃO H: ENDEREÇO COM AUTOPREENCHIMENTO VIA CEP          */}
        {/* ========================================================= */}
        <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-white/10 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#D9AA45]" />
              <span>H. Endereço Residencial</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-200/60">Busca Automática via CEP</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                CEP
              </label>
              <input
                type="text"
                placeholder="64000-000"
                value={formData.address_cep || ""}
                onBlur={handleCepBlur}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_cep: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Logradouro (Rua / Av.)
              </label>
              <input
                type="text"
                placeholder="Rua / Avenida..."
                value={formData.address_street || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_street: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Número
              </label>
              <input
                type="text"
                placeholder="Ex: 123"
                value={formData.address_number || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_number: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Complemento
              </label>
              <input
                type="text"
                placeholder="Apto, Bloco..."
                value={formData.address_complement || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_complement: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Bairro
              </label>
              <input
                type="text"
                placeholder="Bairro"
                value={formData.address_neighborhood || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_neighborhood: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Cidade
              </label>
              <input
                type="text"
                placeholder="Cidade"
                value={formData.address_city || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_city: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                UF
              </label>
              <input
                type="text"
                maxLength={2}
                placeholder="PI"
                value={formData.address_state || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_state: e.target.value.toUpperCase() }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs font-mono font-bold text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>
          </div>
        </div>

        {/* BOTÃO FLUTUANTE / PRINCIPAL DE SALVAR DADOS */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/dashboard/membro"
            className="btn-heraldico-vidro px-5 py-2.5 rounded-xl text-xs font-semibold"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="btn-heraldico-ouro px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{isSaving ? "Gravando no Supabase..." : "Salvar Alterações do Perfil"}</span>
          </button>
        </div>
      </form>

      {/* ========================================================= */}
      {/* SEÇÃO I: SEGURANÇA — ALTERAÇÃO DE SENHA                   */}
      {/* ========================================================= */}
      <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-white/10 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#D9AA45]" />
            <span>I. Segurança da Conta & Troca de Senha</span>
          </h3>
          <span className="text-[11px] font-mono text-emerald-200/60">Criptografia Forte</span>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
          {passwordMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{passwordMsg}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Nova Senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-200 uppercase tracking-wider font-mono">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08140E] border border-white/20 text-xs text-white placeholder-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-[#D9AA45]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="btn-heraldico-vidro px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isChangingPassword ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#D9AA45]" />
            ) : (
              <KeyRound className="w-4 h-4 text-[#D9AA45]" />
            )}
            <span>{isChangingPassword ? "Atualizando..." : "Atualizar Minha Senha"}</span>
          </button>
        </form>
      </div>

      {/* ========================================================= */}
      {/* SEÇÃO K: CERTIFICADO DE REGULARIDADE                     */}
      {/* ========================================================= */}
      <div className="card-heraldico-dark p-6 sm:p-7 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#D9AA45]" />
            <span>K. Certificado de Regularidade & Declarações</span>
          </h3>
          <span className="text-[11px] font-mono text-emerald-200/60">Validação Autêntica</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/30 border border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Regularidade Homologada
              </span>
              <span className="text-xs text-gray-400">• Exercício 2026.2</span>
            </div>
            <h4 className="text-sm font-bold text-white">Declaração de Quitação & Regularidade Litúrgica</h4>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Documento oficial em PDF emitido pelo Capítulo com código de verificação autêntico.
            </p>
          </div>

          <Link
            href="/dashboard/membro"
            className="btn-heraldico-ouro px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Acessar Declarações Oficiais</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
