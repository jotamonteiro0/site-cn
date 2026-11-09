import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Shield, BookOpen, ArrowLeft, CheckCircle2, UserCheck, Scale } from "lucide-react";

export const metadata = {
  title: "Termos de Uso do Sistema CN | Capítulo Professor Carvalho Neves Nº 500",
  description: "Termos e condições de uso da plataforma institucional e administrativa do Capítulo Carvalho Neves Nº 500.",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5F1] text-gray-900 selection:bg-[#D9AA45] selection:text-white">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#04281A] hover:text-[#087443] bg-white px-3.5 py-1.5 rounded-full border border-gray-200 mb-8 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#D9AA45]" />
          <span>Voltar ao Portal Público</span>
        </Link>

        {/* Cabeçalho */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#087443]/10 border border-[#087443]/20 text-[#087443] text-xs font-bold uppercase tracking-widest mb-4">
            <BookOpen className="w-3.5 h-3.5 text-[#D9AA45]" />
            <span>Regulamento de Uso do Sistema Integrado</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#04281A] tracking-tight">
            Termos e Condições de Uso
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Última atualização: 09 de novembro de 2026 • Versão 1.0 Oficial
          </p>
        </div>

        {/* Conteúdo Institucional */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200 shadow-sm space-y-8 text-sm sm:text-base text-gray-700 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#04281A] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D9AA45]"></span>
              1. Natureza do Sistema e Aceite
            </h2>
            <p>
              O <strong>Sistema CN</strong> é a plataforma oficial de gestão administrativa e comunicação do <strong>Capítulo Professor Carvalho Neves Nº 500</strong> da Ordem DeMolay. Ao acessar o portal ou entrar no painel administrativo, o usuário concorda plenamente com estes Termos de Uso e com os preceitos estatutários da Ordem.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#04281A] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#087443]" />
              2. Elegibilidade e Acesso
            </h2>
            <p>
              O acesso às áreas restritas do painel administrativo é concedido exclusivamente a:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-gray-600">
              <li>Membros ativos e regulares do Capítulo (Iniciáticos e DeMolays);</li>
              <li>Seniores DeMolays vinculados aos trabalhos capitulares;</li>
              <li>Membros do Conselho Consultivo e Maçons da Loja Patrocinadora (A∴R∴L∴S∴ Caridade II nº 135).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#04281A] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#087443]" />
              3. Segurança das Credenciais
            </h2>
            <p>
              O login por ID DeMolay e senha é estritamente pessoal e intransferível. O membro é responsável por manter a confidencialidade de sua senha, devendo notificar imediatamente a Diretoria caso suspeite de uso indevido de sua conta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#04281A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#087443]" />
              4. Gestão Financeira e Mensalidades Associativas
            </h2>
            <p>
              As mensalidades registradas no sistema constituem contribuições associativas estatutárias para o custeio das atividades capitulares, filantrópicas e de manutenção. O sistema disponibiliza recibos e comprovantes para garantir total transparência aos membros e seus responsáveis legais.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#04281A] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#D9AA45]" />
              5. Foro e Legislação
            </h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial pelo Código Civil e pela Lei Geral de Proteção de Dados (LGPD). Fica eleito o foro da Comarca de Teresina, Estado do Piauí, para dirimir eventuais controvérsias.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
