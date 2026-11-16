"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Menu, 
  ExternalLink, 
  User, 
  LogOut
} from "lucide-react";

const roleDisplayMap: Record<string, { label: string; color: string }> = {
  master: { label: "Master (Admin)", color: "bg-[#C59B3F]/20 text-[#C59B3F] border-[#C59B3F]/40" },
  escrivao: { label: "Escrivão", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  tesoureiro: { label: "Tesoureiro", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  membro: { label: "Membro", color: "bg-white/10 text-emerald-200 border-white/20" },
};

export function DashboardHeader() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Membro");
  const [userRole, setUserRole] = useState<string>("membro");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [viewAsMember, setViewAsMember] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [profileRes, memberRes] = await Promise.all([
            supabase.from("profiles").select("full_name, avatar_path").eq("id", user.id).maybeSingle(),
            supabase.from("chapter_memberships").select("role_code").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
          ]);

          const profile = profileRes.data;
          const membership = memberRes.data;
          const cachedAvatar = typeof window !== "undefined" ? localStorage.getItem(`cn_member_avatar_${user.id}`) : null;

          const isPermanentMaster =
            user.user_metadata?.id_demolay === "127738" ||
            user.user_metadata?.id_demolay === "102836" ||
            user.email === "joaomonteiro0@icloud.com" ||
            user.email === "airton@carvalhoneves500.org.br" ||
            membership?.role_code === "master";

          const roleCode = isPermanentMaster ? "master" : (membership?.role_code || "membro");

          setUserName(profile?.full_name || (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Membro");
          setUserRole(roleCode);
          setAvatarPath(profile?.avatar_path || cachedAvatar);
        }
      } catch (err) {
        console.error("Erro ao carregar cabeçalho executivo:", err);
      }
    }

    fetchUserData();

    // Sincroniza foto de perfil
    const handleAvatarUpdate = () => {
      fetchUserData();
    };
    window.addEventListener("cn_avatar_updated", handleAvatarUpdate);

    // Sincroniza visão de membro
    const syncViewMode = () => {
      try {
        const stored = localStorage.getItem("cn_view_as_member");
        setViewAsMember(stored === "true");
      } catch {
        // ignore
      }
    };
    syncViewMode();
    window.addEventListener("cn_view_as_member_change", syncViewMode);

    return () => {
      window.removeEventListener("cn_avatar_updated", handleAvatarUpdate);
      window.removeEventListener("cn_view_as_member_change", syncViewMode);
    };
  }, []);

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cn_toggle_sidebar"));
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Erro ao deslogar:", err);
      setIsLoggingOut(false);
    }
  };

  const effectiveRole = viewAsMember ? "membro" : userRole;
  const roleInfo = roleDisplayMap[effectiveRole] || roleDisplayMap.membro;

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0B1F16]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Esquerda: Gatilho Mobile + Contexto Capitular */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggleSidebar}
          className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B3F]"
          aria-label="Alternar menu lateral"
        >
          <Menu className="w-5 h-5 text-emerald-300" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight">
              Capítulo Carvalho Neves Nº 500
            </span>
            <span className="text-white/20">•</span>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-[#087443]/25 text-emerald-300 border border-[#087443]/40">
            Gestão XXV (2026.2)
          </span>
        </div>
      </div>

      {/* Direita: Ações, Perfil e Logout */}
      <div className="flex items-center gap-3">
        {/* Atalho Ver Site */}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          title="Abrir o Portal Público em nova aba"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#C59B3F]" />
          <span>Ver Site</span>
        </Link>

        {/* Chip do Usuário Logado */}
        <Link
          href="/dashboard/perfil"
          className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B3F]"
          title="Acessar Meu Perfil"
        >
          <div className="w-8 h-8 rounded-full bg-[#087443] border border-[#C59B3F]/60 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
            {avatarPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPath}
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-emerald-200" />
            )}
          </div>

          <div className="hidden sm:block text-left">
            <span className="block text-xs font-bold text-white truncate max-w-[130px] leading-tight">
              {userName}
            </span>
            <span
              className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold border ${roleInfo.color} font-mono`}
            >
              {roleInfo.label}
            </span>
          </div>
        </Link>

        {/* Botão Sair Rápido */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className="p-2 rounded-lg text-red-300 hover:text-red-200 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer"
          title="Encerrar Sessão"
          aria-label="Encerrar Sessão"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
