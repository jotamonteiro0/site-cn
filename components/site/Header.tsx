import Link from "next/link";
import { Shield, Lock } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#064D32] text-white border-b border-[#087443]/50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Identificação Institucional */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-lg bg-[#087443] border border-[#D9AA45]/60 flex items-center justify-center text-[#D9AA45] shadow-inner group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs uppercase tracking-widest text-[#D9AA45] font-semibold">
              Ordem DeMolay
            </span>
            <span className="block text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-[#D9AA45] transition-colors">
              Capítulo Carvalho Neves Nº 500
            </span>
          </div>
        </Link>

        {/* Navegação Pública */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-emerald-100">
          <Link href="/" className="hover:text-[#D9AA45] transition-colors">
            Início
          </Link>
          <Link href="#historia" className="hover:text-[#D9AA45] transition-colors">
            História
          </Link>
          <Link href="#virtudes" className="hover:text-[#D9AA45] transition-colors">
            Ordem DeMolay
          </Link>
          <Link href="/gestoes" className="hover:text-[#D9AA45] transition-colors">
            Gestões
          </Link>
          <Link href="#contato" className="hover:text-[#D9AA45] transition-colors">
            Contato
          </Link>
        </nav>

        {/* Acesso Área Restrita */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#087443] text-white hover:bg-[#087443]/80 border border-[#D9AA45]/50 shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
          >
            <Lock className="w-4 h-4 text-[#D9AA45]" />
            <span>Área Restrita</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
