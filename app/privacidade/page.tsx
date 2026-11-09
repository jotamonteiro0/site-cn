import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Shield, Lock, FileText, ArrowLeft, Mail, Users, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade e Proteção de Dados (LGPD) | Capítulo Carvalho Neves Nº 500",
  description: "Diretrizes de privacidade, tratamento de dados de menores e conformidade com a LGPD no Sistema CN.",
};

export default function PrivacidadePage() {
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
            <Shield className="w-3.5 h-3.5 text-[#D9AA45]" />
            <span>Conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#04281A] tracking-tight">
            Política de Privacidade e Proteção de Dados
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
              1. Identificação do Controlador
            </h2>
            <p>
              O <strong>Capítulo Professor Carvalho Neves Nº 500</strong> da Ordem DeMolay, com sede em Teresina - PI, patrocinado pela A∴R∴L∴S∴ Caridade II nº 135, atua como controlador dos dados pessoais tratados através da plataforma oficial <strong>Sistema CN (site-cn)</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#04281A] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D9AA45]"></span>
              2. Finalidade e Minimização de Dados
            </h2>
            <p>
              Os dados coletados pelo Sistema CN destinam-se <strong>exclusivamente</strong> à gestão administrativa, fraterna e documental do Capítulo. Coletamos apenas os dados estritamente indispensáveis:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm text-gray-600">
              <li><strong>Dados de identificação:</strong> Nome completo, ID DeMolay, e-mail e data de nascimento.</li>
              <li><strong>Dados associativos e ritualísticos:</strong> Grau, histórico de cargos capitulares e livro de presença/assiduidade em sessões.</li>
              <li><strong>Gestão financeira capitular:</strong> Registro de contribuições mensais estatutárias (mensalidades) e emissão de recibos.</li>
              <li><strong>Mídia institucional:</strong> Retratos oficiais de Mestres Conselheiros para a galeria histórica de gestões.</li>
            </ul>
          </section>

          <section className="space-y-3 p-5 rounded-2xl bg-amber-50/60 border border-amber-200/60">
            <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D9AA45]" />
              3. Tratamento de Dados de Menores de Idade (Art. 14 da LGPD)
            </h2>
            <p className="text-amber-950/90 text-sm leading-relaxed">
              Como organização voltada para jovens entre 12 e 21 anos, o Capítulo Carvalho Neves Nº 500 realiza o tratamento de dados de adolescentes em estrita observância ao <strong>melhor interesse do menor</strong>. O ingresso na Ordem DeMolay pressupõe autorização e consentimento formal prévio dos pais ou responsáveis legais na ficha de iniciação capitular.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#04281A] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#087443]" />
              4. Não Compartilhamento Comercial
            </h2>
            <p>
              O Capítulo Professor Carvalho Neves Nº 500 <strong>jamais vende, aluga ou compartilha dados pessoais</strong> com empresas de publicidade, marketing ou terceiros comerciais. Os dados são acessíveis somente pela diretoria administrativa competente (Mestre Conselheiro, Escrivão, Tesoureiro e Conselho Consultivo).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#04281A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#087443]" />
              5. Segurança e Armazenamento
            </h2>
            <p>
              Os dados são armazenados em infraestrutura de banco de dados relacional com criptografia de ponta a ponta e políticas de controle de acesso por cargo (<strong>Row Level Security - RLS</strong>). Nenhuma senha é armazenada em texto simples; todas são criptografadas com funções hash criptográficas de padrão internacional.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#04281A] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#087443]" />
              6. Direitos do Titular (Art. 18 da LGPD)
            </h2>
            <p>
              Todo membro ou seu responsável legal tem o direito de solicitar confirmação de tratamento, acesso aos seus dados, correção de informações incompletas ou revogação de consentimento, mediante requerimento à Secretaria ou ao Conselho Consultivo do Capítulo.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-gray-100">
            <h2 className="text-lg font-bold text-[#04281A] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#D9AA45]" />
              7. Canal de Atendimento e DPO
            </h2>
            <p className="text-sm">
              Para dúvidas, solicitações ou esclarecimentos relativos ao tratamento de seus dados pessoais, entre em contato diretamente com a nossa administração:
            </p>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm">
              <p><strong>Encarregado / Canal Oficial:</strong> Secretaria e Conselho Consultivo — Capítulo Carvalho Neves Nº 500</p>
              <p><strong>E-mail:</strong> <a href="mailto:capitulo500@demolaybrasil.org.br" className="text-[#087443] font-semibold hover:underline">capitulo500@demolaybrasil.org.br</a></p>
              <p><strong>Localização:</strong> Teresina, Piauí — Brasil</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
