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
    { label: "Contato", href: "/#contato" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#064D32] text-white border-b border-[#087443]/50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Identificação Institucional */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#087443] border border-[#D9AA45]/60 flex items-center justify-center text-[#D9AA45] shadow-inner group-hover:scale-105 transition-transform shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="block text-[10px] sm:text-xs uppercase tracking-widest text-[#D9AA45] font-semibold leading-none mb-1">
              Ordem DeMolay
            </span>
            <span className="block text-sm sm:text-base lg:text-lg font-bold tracking-tight text-white group-hover:text-[#D9AA45] transition-colors leading-tight">
              Capítulo Carvalho Neves Nº 500
            </span>
          </div>
        </Link>

        {/* Navegação Pública Desktop */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm font-medium text-emerald-100">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className="hover:text-[#D9AA45] transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Área de Membro Desktop + Botão Hamburger Mobile */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-[#087443] text-white hover:bg-[#087443]/80 border border-[#D9AA45]/50 shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
          >
            <Lock className="w-3.5 h-3.5 text-[#D9AA45]" />
            <span>Área de Membro</span>
          </Link>

          {/* Botão Mobile Menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menu Aberto Mobile */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#04281A] border-b border-[#087443] px-4 pt-3 pb-6 space-y-2 shadow-2xl animate-in slide-in-from-top-2">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-emerald-100 hover:bg-[#087443] hover:text-[#D9AA45] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#087443] text-white font-semibold text-sm border border-[#D9AA45]/50 shadow-md"
            >
              <Lock className="w-4 h-4 text-[#D9AA45]" />
              <span>Área de Membro</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
