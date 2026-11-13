import Link from "next/link";
import { Shield, MapPin, Mail, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#052E1D] text-emerald-100 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#087443] border border-[#C59B3F]/40 flex items-center justify-center text-[#C59B3F] shadow-sm shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] uppercase tracking-widest text-[#C59B3F] font-bold font-mono leading-none">
                  Ordem DeMolay
                </span>
                <span className="font-bold text-white text-sm sm:text-base leading-tight block truncate">
                  Capítulo Professor Carvalho Neves Nº 500
                </span>
              </div>
            </div>
            <p className="text-sm text-emerald-200/80 leading-relaxed max-w-md font-light">
              Trabalhando pelo desenvolvimento de líderes e pela formação do caráter
              dos jovens por meio das Sete Virtudes Cardeais da Ordem DeMolay em Teresina - PI.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-widest mb-3 sm:mb-4 border-b border-white/10 pb-1.5 inline-block font-mono">
              Navegação
            </h4>
            <ul className="space-y-2.5 text-sm text-emerald-200/80">
              <li>
                <Link href="/#historia" className="hover:text-[#C59B3F] transition-colors">
                  História do Patrono
                </Link>
              </li>
              <li>
                <Link href="/#virtudes" className="hover:text-[#C59B3F] transition-colors">
                  Sete Virtudes Cardeais
                </Link>
              </li>
              <li>
                <Link href="/gestoes" className="hover:text-[#C59B3F] transition-colors">
                  Galeria de Gestões
                </Link>
              </li>
              <li>
                <Link href="/documentos" className="hover:text-[#C59B3F] transition-colors">
                  Acervo Documental
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#C59B3F] transition-colors">
                  Acesso ao Painel
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-widest mb-3 sm:mb-4 border-b border-white/10 pb-1.5 inline-block font-mono">
              Privacidade & Contato
            </h4>
            <ul className="space-y-2.5 text-sm text-emerald-200/80">
              <li>
                <Link
                  href="/privacidade"
                  className="hover:text-[#C59B3F] transition-colors flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-[#C59B3F] shrink-0" />
                  <span>Política de Privacidade (LGPD)</span>
                </Link>
              </li>
              <li>
                <Link href="/termos" className="hover:text-[#C59B3F] transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li className="pt-2 flex items-start gap-2 text-xs">
                <MapPin className="w-4 h-4 text-[#C59B3F] shrink-0 mt-0.5" />
                <span>A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI), Teresina/PI</span>
              </li>
              <li className="flex items-center gap-2 text-xs min-w-0">
                <Mail className="w-4 h-4 text-[#C59B3F] shrink-0" />
                <span className="break-all sm:break-normal text-[11px] sm:text-xs">capitulo500@demolaybrasil.org.br</span>
              </li>
              <li className="flex items-center gap-2 text-xs">
                <span className="text-[#C59B3F] font-bold">@</span>
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

        <div className="mt-10 sm:mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-300/70 gap-4 text-center sm:text-left">
          <p>© 2026 Capítulo Professor Carvalho Neves Nº 500. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
            <Link href="/privacidade" className="hover:text-white transition-colors">
              Privacidade (LGPD)
            </Link>
            <span>•</span>
            <Link href="/termos" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C59B3F]" />
            <span className="hidden sm:inline">Portal Oficial</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
