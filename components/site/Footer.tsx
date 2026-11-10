import Link from "next/link";
import { Shield, MapPin, Mail, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#064D32] text-emerald-100 border-t border-[#087443]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-[#087443] border border-[#D9AA45]/50 flex items-center justify-center text-[#D9AA45]">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold text-white text-base">
                Capítulo Prof. Carvalho Neves Nº 500
              </span>
            </div>
            <p className="text-sm text-emerald-200/80 leading-relaxed max-w-md">
              Trabalhando pelo desenvolvimento de líderes e pela formação do caráter
              dos jovens por meio das Sete Virtudes Cardeais da Ordem DeMolay.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 border-b border-[#087443] pb-1 inline-block">
              Navegação
            </h4>
            <ul className="space-y-2 text-sm text-emerald-200/80">
              <li><Link href="/#historia" className="hover:text-[#D9AA45] transition-colors">História do Patrono</Link></li>
              <li><Link href="/#virtudes" className="hover:text-[#D9AA45] transition-colors">Sete Virtudes Cardeais</Link></li>
              <li><Link href="/gestoes" className="hover:text-[#D9AA45] transition-colors">Histórico de Gestões</Link></li>
              <li><Link href="/login" className="hover:text-[#D9AA45] transition-colors">Acesso ao Painel</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 border-b border-[#087443] pb-1 inline-block">
              Privacidade & Contato
            </h4>
            <ul className="space-y-2 text-sm text-emerald-200/80">
              <li><Link href="/privacidade" className="hover:text-[#D9AA45] transition-colors flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-[#D9AA45]" /><span>Política de Privacidade</span></Link></li>
              <li><Link href="/termos" className="hover:text-[#D9AA45] transition-colors">Termos de Uso</Link></li>
              <li className="pt-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D9AA45] shrink-0" />
                <span>Teresina, PI — Brasil</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#D9AA45] shrink-0" />
                <span className="truncate">capitulo500@demolaybrasil.org.br</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#D9AA45] text-xs font-bold">@</span>
                <a
                  href="https://instagram.com/cap.carvalhoneves500"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors underline decoration-white/20"
                >
                  cap.carvalhoneves500
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#087443]/50 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-300/70 gap-4">
          <p>© 2026 Capítulo Professor Carvalho Neves Nº 500. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade (LGPD)</Link>
            <span>•</span>
            <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D9AA45]"></span>
            <span className="hidden sm:inline">Portal Oficial</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
