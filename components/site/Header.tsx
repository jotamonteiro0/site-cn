"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Lock, Menu, X } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Página Inicial", href: "/" },
    { label: "História", href: "/#historia" },
    { label: "Ordem DeMolay", href: "/#virtudes" },
    { label: "Galeria de MC's", href: "/gestoes" },
    { label: "Documentos", href: "/documentos" },
    { label: "Contato", href: "/#contato" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#052E1D] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        {/* Identificação Institucional */}
        <Link
          href="/"
          className="flex items-center gap-2.5 sm:gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B3F] rounded-lg p-1 min-w-0"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#087443] border border-[#C59B3F]/40 flex items-center justify-center text-[#C59B3F] shadow-sm group-hover:border-[#C59B3F] transition-colors shrink-0">
            <Shield className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] sm:text-xs uppercase tracking-widest text-[#C59B3F] font-bold leading-none mb-1 font-mono truncate">
              Ordem DeMolay
            </span>
            <span className="block text-xs sm:text-base lg:text-lg font-bold tracking-tight text-white group-hover:text-[#C59B3F] transition-colors leading-tight truncate">
              Capítulo Carvalho Neves Nº 500
            </span>
          </div>
        </Link>

        {/* Navegação Pública Desktop */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium text-emerald-100 shrink-0">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className="hover:text-[#C59B3F] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:text-[#C59B3F] py-1"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Área de Membro Desktop + Botão Hamburger Mobile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-[#087443] text-white hover:bg-[#065F36] border border-[#C59B3F]/40 shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B3F]"
          >
            <Lock className="w-3.5 h-3.5 text-[#C59B3F]" />
            <span>Área de Membro</span>
          </Link>

          {/* Botão Mobile Menu */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 sm:p-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B3F] cursor-pointer"
            aria-label={mobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>
      </div>

      {/* Menu Aberto Mobile / Tablet */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#042416] border-b border-white/15 px-4 pt-3 pb-6 space-y-1.5 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#C59B3F] font-bold border-b border-white/10 mb-2">
            Navegação Capitular
          </div>
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-3 px-3.5 rounded-xl text-sm font-medium text-emerald-100 hover:bg-[#087443] hover:text-white active:bg-[#065F36] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-white/10 mt-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#087443] hover:bg-[#065F36] text-white font-semibold text-sm border border-[#C59B3F]/40 shadow-sm transition-colors"
            >
              <Lock className="w-4 h-4 text-[#C59B3F]" />
              <span>Acessar Área de Membro</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
