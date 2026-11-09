"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ChevronRight
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [viewAsMember, setViewAsMember] = useState(false);

  const navigation = [
    { name: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tesouraria", href: "/dashboard#tesouraria", icon: Wallet, badge: "6 pendentes" },
    { name: "Frequência & Atas", href: "/dashboard#frequencia", icon: ClipboardCheck },
    { name: "Quadro de Membros", href: "/dashboard#membros", icon: Users },
    { name: "Meu Perfil", href: "/dashboard#perfil", icon: UserCircle },
  ];

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
              JG
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                MC João Guilherme
              </p>
              <p className="text-[10px] text-[#D9AA45] font-medium truncate">
                {viewAsMember ? "Visualizando como Membro" : "Perfil: Master / Admin"}
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
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors border border-red-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
