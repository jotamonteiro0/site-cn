"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Shield, 
  LayoutDashboard, 
  Wallet, 
  ClipboardCheck, 
  Users, 
  UserCircle, 
  ExternalLink, 
  LogOut, 
  Eye, 
  Menu, 
  X,
  ChevronRight,
  FileText
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
  master: "Master / Admin",
  escrivao: "Escrivão",
  tesoureiro: "Tesoureiro",
  membro: "Membro",
};

export function Sidebar({ user: initialUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(initialUser || null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewAsMember, setViewAsMember] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_path")
            .eq("id", user.id)
            .maybeSingle();

          const { data: membership } = await supabase
            .from("chapter_memberships")
            .select("role_code")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

          setCurrentUser({
            id: user.id,
            email: user.email,
            fullName: profile?.full_name || (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Membro",
            roleCode: membership?.role_code || "membro",
            avatarPath: profile?.avatar_path,
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

  const navigation = [
    { name: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
    { name: "Calendário & Chamada", href: "/dashboard/chamada", icon: ClipboardCheck },
    { name: "Quadro de Membros", href: "/dashboard/membros", icon: Users },
    { name: "Conselho Consultivo", href: "/dashboard/conselho", icon: Shield },
    { name: "Documentos & Atas", href: "/dashboard/documentos", icon: FileText },
    { name: "Tesouraria", href: "/dashboard/tesouraria", icon: Wallet, badge: "Em breve" },
  ];

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

  const getInitials = (name?: string) => {
    if (!name) return "CN";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const currentRole = currentUser?.roleCode || "master";
  const displayName = currentUser?.fullName || "Carregando...";

  return (
    <>
      {/* Botão Mobile Hamburger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 rounded-lg bg-[#064D32] border border-white/20 text-white shadow-lg backdrop-blur-md"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Overlay Mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-[#04281A]/95 backdrop-blur-xl border-r border-white/10 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Topo: Identificação do Capítulo */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#087443] border border-[#D9AA45]/60 flex items-center justify-center text-[#D9AA45] shadow-md group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-widest text-[#D9AA45] font-bold">
                Capítulo Nº 500
              </span>
              <span className="block text-sm font-bold text-white tracking-tight leading-tight">
                Carvalho Neves
              </span>
            </div>
          </Link>

          {/* Alternador Master "Ver como Membro" */}
          <div className="mt-5 p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-[#D9AA45]" />
              <span className="text-xs text-emerald-200">Ver como Membro</span>
            </div>
            <button
              onClick={() => setViewAsMember(!viewAsMember)}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                viewAsMember ? "bg-[#D9AA45]" : "bg-white/20"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  viewAsMember ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#087443] text-white shadow-md border border-[#D9AA45]/40"
                    : "text-emerald-100/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#D9AA45]" : "text-emerald-300"}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && !isActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-[#D9AA45] border border-[#D9AA45]/30">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4 text-[#D9AA45]" />}
              </Link>
            );
          })}
        </nav>

        {/* Rodapé: Perfil Logado & Ações */}
        <div className="p-4 border-t border-white/10 space-y-3">
          {/* Cartão de Identificação do Membro */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#087443] border border-[#D9AA45] flex items-center justify-center font-bold text-white text-xs">
              {getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {displayName}
              </p>
              <p className="text-[10px] text-[#D9AA45] font-medium truncate">
                {viewAsMember ? "Visualizando como Membro" : `Perfil: ${roleLabels[currentRole] || currentRole}`}
              </p>
            </div>
          </div>

          {/* Links de Ação: Ver Site e Sair */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Site</span>
            </Link>
            <button
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
    </>
  );
}
