"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProfilePhotoCropper } from "@/components/ui/ProfilePhotoCropper";
import { 
  Shield, 
  LayoutDashboard, 
  Wallet, 
  ClipboardCheck, 
  Users, 
  ExternalLink, 
  LogOut, 
  Eye, 
  X,
  FileText,
  UserCheck,
  Crown,
  Camera,
  type LucideIcon
} from "lucide-react";

export interface DashboardUser {
  id: string;
  email?: string;
  fullName: string;
  roleCode: string;
  avatarPath?: string | null;
}

interface SidebarProps {
  user?: DashboardUser | null;
}

const roleLabels: Record<string, string> = {
  master: "Master (Administrador)",
  escrivao: "Escrivão",
  tesoureiro: "Tesoureiro",
  membro: "Membro",
};

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

const navigation: readonly NavItem[] = [
  { name: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
  { name: "Meu Autoatendimento", href: "/dashboard/membro", icon: UserCheck },
  { name: "Gestões & Nominata", href: "/dashboard/nominata", icon: Crown },
  { name: "Atas & Chamada da Reunião", href: "/dashboard/chamada", icon: ClipboardCheck },
  { name: "Quadro de Membros", href: "/dashboard/membros", icon: Users },
  { name: "Conselho Consultivo", href: "/dashboard/conselho", icon: Shield },
  { name: "Documentos", href: "/dashboard/documentos", icon: FileText },
  { name: "Tesouraria", href: "/dashboard/tesouraria", icon: Wallet },
] as const;

export function Sidebar({ user: initialUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(initialUser || null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewAsMember, setViewAsMember] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCroppingPhoto, setIsCroppingPhoto] = useState(false);
  const [tempPhotoSrc, setTempPhotoSrc] = useState<string | null>(null);
  const [isSavingCrop, setIsSavingCrop] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener("cn_toggle_sidebar", handleToggle);
    return () => window.removeEventListener("cn_toggle_sidebar", handleToggle);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem("cn_view_as_member");
        if (stored === "true") {
          setViewAsMember(true);
        }
      } catch {
        // storage quota fallback
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [profileRes, membershipRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name, avatar_path")
              .eq("id", user.id)
              .maybeSingle(),
            supabase
              .from("chapter_memberships")
              .select("role_code")
              .eq("user_id", user.id)
              .eq("is_active", true)
              .maybeSingle(),
          ]);

          const profile = profileRes.data;
          const membership = membershipRes.data;

          const cachedAvatar = typeof window !== "undefined" ? localStorage.getItem(`cn_member_avatar_${user.id}`) : null;

          const isPermanentMaster =
            user.user_metadata?.id_demolay === "127738" ||
            user.user_metadata?.id_demolay === "102836" ||
            user.email === "joaomonteiro0@icloud.com" ||
            user.email === "airton@carvalhoneves500.org.br" ||
            membership?.role_code === "master";

          const roleCode = isPermanentMaster ? "master" : (membership?.role_code || "membro");

          setCurrentUser({
            id: user.id,
            email: user.email,
            fullName: profile?.full_name || (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Membro",
            roleCode,
            avatarPath: profile?.avatar_path || cachedAvatar,
          });
        }
      } catch (err) {
        console.error("Erro ao carregar dados do usuário na Sidebar:", err);
      }
    }

    if (!initialUser) {
      loadUser();
    }
  }, [initialUser]);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Erro ao encerrar sessão:", err);
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    const handleAvatarUpdate = () => {
      if (currentUser?.id) {
        const cached = localStorage.getItem(`cn_member_avatar_${currentUser.id}`);
        if (cached) {
          setCurrentUser((prev) => (prev ? { ...prev, avatarPath: cached } : null));
        }
      }
    };
    window.addEventListener("cn_avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("cn_avatar_updated", handleAvatarUpdate);
  }, [currentUser?.id]);

  const handleSidebarAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("A imagem selecionada excede 15MB. Por favor, escolha uma foto menor.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setTempPhotoSrc(reader.result as string);
      setIsCroppingPhoto(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveCroppedAvatar = async (croppedBlob: Blob, croppedDataUrl: string) => {
    if (!currentUser) return;
    setIsSavingCrop(true);
    try {
      try {
        localStorage.setItem(`cn_member_avatar_${currentUser.id}`, croppedDataUrl);
      } catch {
        // storage quota fallback
      }
      setCurrentUser((prev) => (prev ? { ...prev, avatarPath: croppedDataUrl } : null));

      const supabase = createClient();
      const filePath = `${currentUser.id}/avatar-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("membros")
        .upload(filePath, croppedBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      const finalUrl = !uploadError
        ? supabase.storage.from("membros").getPublicUrl(filePath).data.publicUrl
        : croppedDataUrl;

      await supabase
        .from("profiles")
        .update({ avatar_path: finalUrl })
        .eq("id", currentUser.id);

      await supabase
        .from("members")
        .update({ photo_url: finalUrl })
        .eq("profile_id", currentUser.id);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cn_avatar_updated"));
      }

      setIsCroppingPhoto(false);
      setTempPhotoSrc(null);
    } catch (err) {
      console.error("Erro ao salvar foto de perfil:", err);
      alert("Erro ao salvar foto de perfil.");
    } finally {
      setIsSavingCrop(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "CN";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const currentRole = currentUser?.roleCode || "membro";
  const effectiveRole = viewAsMember ? "membro" : currentRole;
  const displayName = currentUser?.fullName || "Carregando...";

  const allowedNavigation = useMemo(() => {
    return navigation.filter((item) => {
      if (
        item.href === "/dashboard" ||
        item.href === "/dashboard/membro" ||
        item.href === "/dashboard/nominata" ||
        item.href === "/dashboard/documentos"
      ) {
        return true;
      }
      if (effectiveRole === "master") {
        return true;
      }
      if (effectiveRole === "escrivao") {
        return ["/dashboard/chamada", "/dashboard/membros"].includes(item.href);
      }
      if (effectiveRole === "tesoureiro") {
        return ["/dashboard/tesouraria", "/dashboard/membros"].includes(item.href);
      }
      return false;
    });
  }, [effectiveRole]);

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-[#0C1A13] border-r border-white/10 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Topo: Identificação do Capítulo e Botão Fechar no Mobile */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="brasao-shimmer-container w-10 h-10 rounded-lg bg-[#087443] border border-[#C59B3F]/60 flex items-center justify-center text-[#C59B3F] shadow-sm">
                <Shield className="w-5 h-5 text-[#C59B3F]" />
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-widest text-[#C59B3F] font-black font-mono">
                  Capítulo Nº 500
                </span>
                <span className="block text-sm font-bold text-white tracking-tight leading-tight">
                  Carvalho Neves
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10"
              aria-label="Fechar menu lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alternador Master "Ver como Membro" */}
          <div className="mt-5 p-2.5 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-[#C59B3F]" />
              <span className="text-xs text-emerald-200 font-medium">Ver como Membro</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextState = !viewAsMember;
                setViewAsMember(nextState);
                try {
                  localStorage.setItem("cn_view_as_member", String(nextState));
                  window.dispatchEvent(new Event("cn_view_as_member_change"));
                } catch {
                  // ignore
                }
              }}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                viewAsMember ? "bg-[#C59B3F]" : "bg-white/20"
              }`}
              aria-label="Alternar modo de visualização como membro"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  viewAsMember ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Links de Navegação Filtrados por Permissão */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allowedNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#087443] text-white border-l-4 border-l-[#C59B3F] shadow-sm"
                    : "text-emerald-100/75 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#C59B3F]" : "text-emerald-300/80"}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && !isActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-[#C59B3F] border border-[#C59B3F]/30 font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Rodapé: Perfil Logado & Ações */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#06140D]/60">
          {/* Cartão de Identificação do Membro */}
          <div className="p-3 rounded-lg bg-[#0B1F16] border border-white/10 hover:border-[#C59B3F]/40 transition-colors flex items-center gap-3 group">
            {/* Avatar com Botão de Upload de Foto Instantâneo */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#087443] border border-[#C59B3F]/60 flex items-center justify-center font-bold text-white text-xs overflow-hidden shadow-sm">
                {currentUser?.avatarPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatarPath}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(displayName)
                )}
              </div>
              <label
                htmlFor="sidebar-photo-input"
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#C59B3F] hover:bg-[#D4AF37] text-[#052E1D] shadow-sm cursor-pointer transition-colors flex items-center justify-center"
                title="Adicionar ou alterar foto de perfil"
              >
                <Camera className="w-2.5 h-2.5" />
                <input
                  id="sidebar-photo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSidebarAvatarSelect}
                  className="hidden"
                />
              </label>
            </div>

            <Link
              href="/dashboard/membro"
              onClick={() => setIsOpen(false)}
              className="flex-1 min-w-0"
              title="Acessar Meu Perfil e Autoatendimento"
            >
              <p className="text-xs font-bold text-white truncate">
                {displayName}
              </p>
              <p className="text-[10px] text-[#C59B3F] font-semibold truncate font-mono">
                {viewAsMember ? "Ver como Membro" : (roleLabels[currentRole] || currentRole)}
              </p>
            </Link>
          </div>

          {/* Links de Ação: Ver Site e Sair */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-200 hover:text-white border border-white/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#C59B3F]" />
              <span>Ver Site</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors border border-red-500/20 disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? "Saindo..." : "Sair"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MODAL: AJUSTAR FOTO DE PERFIL */}
      {isCroppingPhoto && tempPhotoSrc && (
        <ProfilePhotoCropper
          imageSrc={tempPhotoSrc}
          onCancel={() => {
            setIsCroppingPhoto(false);
            setTempPhotoSrc(null);
          }}
          onCropComplete={handleSaveCroppedAvatar}
          isSaving={isSavingCrop}
        />
      )}
    </>
  );
}
