import { 
  Users, 
  Wallet, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  FileText, 
  PlusCircle,
  ArrowUpRight,
  ShieldAlert
} from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      title: "Membros Ativos",
      value: "38",
      subtext: "+2 iniciações este ano",
      icon: Users,
      trend: "up",
    },
    {
      title: "Taxa de Assiduidade",
      value: "91.4%",
      subtext: "Média das últimas 8 sessões",
      icon: TrendingUp,
      trend: "up",
    },
    {
      title: "Mensalidades em Dia",
      value: "84.2%",
      subtext: "32 pagos • 6 pendentes",
      icon: Wallet,
      trend: "neutral",
    },
    {
      title: "Próxima Reunião",
      value: "Domingo",
      subtext: "16/11 às 09:00 • Grau DeMolay",
      icon: Calendar,
      trend: "neutral",
    },
  ];

  const recentPayments = [
    { name: "João Guilherme Martins", date: "05/11/2026", amount: "R$ 50,00", status: "Pago", role: "Mestre Conselheiro" },
    { name: "José Keltton Cardoso", date: "04/11/2026", amount: "R$ 50,00", status: "Pago", role: "1º Conselheiro" },
    { name: "Rafael Inácio Morais", date: "03/11/2026", amount: "R$ 50,00", status: "Pago", role: "2º Conselheiro" },
    { name: "Carlos Eduardo Silva", date: "01/11/2026", amount: "R$ 50,00", status: "Pendente", role: "Membro Ativo" },
    { name: "Lucas Ferreira Lima", date: "28/10/2026", amount: "R$ 0,00", status: "Isento", role: "Sênior DeMolay" },
  ];

  const recentSessions = [
    { title: "Sessão Ordinária do Grau Iniciático", date: "01/11/2026", attendance: "34 / 38 (89%)", status: "Ata Publicada" },
    { title: "Sessão Magna de Eleição", date: "25/10/2026", attendance: "37 / 38 (97%)", status: "Ata Publicada" },
    { title: "Sessão Ordinária de Estudos", date: "18/10/2026", attendance: "33 / 38 (86%)", status: "Ata Publicada" },
  ];

  return (
    <div className="space-y-8">
      {/* Topo do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D9AA45]/20 text-[#D9AA45] border border-[#D9AA45]/40">
              Gestão XXIII • 2025.2 / 2026
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-300">Sistema Conectado</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Painel Geral do Capítulo
          </h1>
          <p className="text-sm text-emerald-200/70 mt-1">
            Capítulo Professor Carvalho Neves Nº 500 — Teresina/PI
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#087443] hover:bg-[#087443]/80 border border-[#D9AA45]/50 text-white font-semibold text-xs transition-all shadow-md">
            <PlusCircle className="w-4 h-4 text-[#D9AA45]" />
            <span>Fazer Chamada</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all">
            <FileText className="w-4 h-4 text-emerald-300" />
            <span>Nova Ata</span>
          </button>
        </div>
      </div>

      {/* Grade de Métricas (Glassmorphism Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:border-[#D9AA45]/50 transition-all shadow-lg group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-emerald-200/80 uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className="w-9 h-9 rounded-lg bg-[#087443]/40 border border-[#D9AA45]/30 flex items-center justify-center text-[#D9AA45] group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-emerald-200/60 font-medium">
                {stat.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conteúdo em Duas Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna 1 e 2: Tesouraria & Mensalidades */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="font-bold text-base text-white">
                  Controle de Mensalidades Recentes
                </h3>
              </div>
              <button className="text-xs text-[#D9AA45] hover:underline flex items-center gap-1 font-semibold">
                <span>Ver matriz completa</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-emerald-200/60 uppercase tracking-wider border-b border-white/5">
                    <th className="pb-3 font-semibold">Membro</th>
                    <th className="pb-3 font-semibold">Cargo / Função</th>
                    <th className="pb-3 font-semibold">Data</th>
                    <th className="pb-3 font-semibold">Valor</th>
                    <th className="pb-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {recentPayments.map((p, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 font-medium">{p.name}</td>
                      <td className="py-3.5 text-emerald-200/70">{p.role}</td>
                      <td className="py-3.5 text-emerald-200/60">{p.date}</td>
                      <td className="py-3.5 font-semibold text-emerald-100">{p.amount}</td>
                      <td className="py-3.5 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full font-semibold text-[10px] inline-flex items-center gap-1 ${
                            p.status === "Pago"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : p.status === "Pendente"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {p.status === "Pago" && <CheckCircle className="w-3 h-3" />}
                          {p.status === "Pendente" && <Clock className="w-3 h-3" />}
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Histórico de Sessões e Frequência */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#D9AA45]" />
                <h3 className="font-bold text-base text-white">
                  Últimas Sessões Realizadas
                </h3>
              </div>
              <button className="text-xs text-[#D9AA45] hover:underline flex items-center gap-1 font-semibold">
                <span>Ver livro de atas</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentSessions.map((session, sidx) => (
                <div
                  key={sidx}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-bold text-sm text-white mb-0.5">
                      {session.title}
                    </h4>
                    <p className="text-xs text-emerald-200/60">{session.date}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-emerald-100 font-semibold">
                      Quórum: {session.attendance}
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#087443]/50 text-white border border-[#D9AA45]/40">
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna 3: Avisos e Pendências Administrativas */}
        <div className="space-y-6">
          {/* Card de Alerta DeMolay Maioridade */}
          <div className="bg-gradient-to-br from-[#087443]/40 to-[#04281A] border border-[#D9AA45]/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#D9AA45]/20 border border-[#D9AA45] flex items-center justify-center text-[#D9AA45] shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Transição de Maioridade (21 anos)
                </h4>
                <p className="text-xs text-emerald-200/80 mt-1 leading-relaxed">
                  <strong>2 irmãos</strong> completam 21 anos neste semestre e farão transição para o quadro de <strong>Sênior DeMolay</strong>.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button className="text-xs font-semibold text-[#D9AA45] hover:underline">
                Visualizar membros afetados →
              </button>
            </div>
          </div>

          {/* Atalho de Documentos e Regimento */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="font-bold text-sm text-white border-b border-white/10 pb-2">
              Acervo de Documentos Oficiais
            </h4>
            <ul className="space-y-2.5 text-xs text-emerald-200/80">
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer">
                <span>Regimento Interno do Capítulo</span>
                <span className="text-[10px] text-[#D9AA45]">PDF (1.2 MB)</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer">
                <span>Planejamento Anual 2026</span>
                <span className="text-[10px] text-[#D9AA45]">PDF (840 KB)</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer">
                <span>Modelo de Recibo Oficial</span>
                <span className="text-[10px] text-[#D9AA45]">DOCX</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
