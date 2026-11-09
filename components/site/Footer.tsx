import { Shield, MapPin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#064D32] text-emerald-100 border-t border-[#087443]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-[#087443] border border-[#D9AA45]/50 flex items-center justify-center text-[#D9AA45]">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold text-white text-base">
                Capítulo Prof. Carvalho Neves Nº 500
              </span>
            </div>
            <p className="text-sm text-emerald-200/80 leading-relaxed">
              Trabalhando pelo desenvolvimento de líderes e pela formação do caráter
              dos jovens por meio das Sete Virtudes Cardeais da Ordem DeMolay.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 border-b border-[#087443] pb-1 inline-block">
              Navegação
            </h4>
            <ul className="space-y-2 text-sm text-emerald-200/80">
              <li><a href="#historia" className="hover:text-[#D9AA45] transition-colors">História do Patrono</a></li>
              <li><a href="#virtudes" className="hover:text-[#D9AA45] transition-colors">Sete Virtudes Cardeais</a></li>
              <li><a href="/gestoes" className="hover:text-[#D9AA45] transition-colors">Histórico de Gestões</a></li>
              <li><a href="/login" className="hover:text-[#D9AA45] transition-colors">Acesso ao Painel de Gestão</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 border-b border-[#087443] pb-1 inline-block">
              Contato Institucional
            </h4>
            <ul className="space-y-2 text-sm text-emerald-200/80">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D9AA45] shrink-0" />
                <span>Teresina, Piauí — Brasil</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#D9AA45] shrink-0" />
                <span>capitulo500@demolaybrasil.org.br</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#087443]/50 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-300/70 gap-4">
          <p>© 2026 Capítulo Professor Carvalho Neves Nº 500. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#D9AA45]"></span>
            <span>Portal Institucional & Sistema de Gestão</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
