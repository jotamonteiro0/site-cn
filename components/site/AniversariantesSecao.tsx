"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Cake, Calendar, Sparkles, HeartHandshake } from "lucide-react";

interface BirthdayRecord {
  member_id: string;
  full_name: string;
  category: string;
  birthday_formatted: string;
  birth_day: number;
  birth_month: number;
}

const categoryDisplayMap: Record<string, { label: string; badge: string }> = {
  demolay_ativo: {
    label: "DeMolay Ativo",
    badge: "bg-[#087443]/15 text-[#087443] border-[#087443]/30",
  },
  macom: {
    label: "Consultor Maçom",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
  },
  senior_demolay: {
    label: "Sênior DeMolay",
    badge: "bg-blue-100 text-blue-900 border-blue-300",
  },
  irregular: {
    label: "Membro Capitular",
    badge: "bg-gray-100 text-gray-700 border-gray-300",
  },
};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function AniversariantesSecao() {
  const [birthdays, setBirthdays] = useState<BirthdayRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBirthdays() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("view_member_birthdays")
          .select("member_id, full_name, category, birthday_formatted, birth_day, birth_month")
          .order("birth_month", { ascending: true })
          .order("birth_day", { ascending: true });

        if (isMounted) {
          if (data && data.length > 0) {
            setBirthdays(data as BirthdayRecord[]);
          }
          const nowMonth = new Date().getMonth() + 1;
          setSelectedMonth(nowMonth);
          setCurrentMonth(nowMonth);
        }
      } catch (err) {
        console.error("Erro ao carregar aniversariantes do capítulo:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBirthdays();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentMonthBirthdays = useMemo(() => {
    return birthdays.filter((b) => b.birth_month === selectedMonth);
  }, [birthdays, selectedMonth]);

  const hasAnyBirthdays = birthdays.length > 0;

  return (
    <section id="aniversariantes" className="py-16 sm:py-20 bg-[#F4F7F4] border-t border-gray-200/80 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#087443] font-bold flex items-center gap-1.5">
              <Cake className="w-4 h-4 text-[#C59B3F]" />
              <span>Fraternidade & Celebração</span>
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2 sm:text-4xl">
              Aniversariantes do Capítulo
            </h2>
            <div className="w-16 h-1 bg-[#C59B3F] mt-4 rounded-full" />
            <p className="mt-3 text-sm text-gray-600 max-w-2xl leading-relaxed">
              Celebramos a vida e a jornada de cada irmão e tio consultor que fortalece
              as colunas do Capítulo Professor Carvalho Neves nº 500.
            </p>
          </div>

          {/* Seletor de Mês */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            <Calendar className="w-4 h-4 text-[#087443] ml-2 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-gray-800 pr-3 py-1.5 focus:outline-none cursor-pointer"
              aria-label="Selecionar mês de aniversários"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name} {currentMonth === idx + 1 ? "(Mês Atual)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Conteúdo dos Aniversariantes */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-500 font-mono">
            Consultando calendário fraternal de aniversários...
          </div>
        ) : hasAnyBirthdays && currentMonthBirthdays.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentMonthBirthdays.map((b) => {
              const catInfo = categoryDisplayMap[b.category] || categoryDisplayMap.demolay_ativo;
              return (
                <div
                  key={b.member_id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-sm hover:shadow-md transition-all flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#087443] to-[#0D9256] text-[#D9AA45] flex flex-col items-center justify-center font-mono font-bold shrink-0 shadow-sm border border-[#D9AA45]/30">
                    <span className="text-base leading-none">{String(b.birth_day).padStart(2, "0")}</span>
                    <span className="text-[10px] uppercase font-sans text-emerald-100 mt-0.5 leading-none">
                      {monthNames[b.birth_month - 1].substring(0, 3)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate leading-snug">
                      {b.full_name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${catInfo.badge}`}
                      >
                        {catInfo.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : hasAnyBirthdays && currentMonthBirthdays.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200/90 shadow-sm space-y-2 max-w-xl mx-auto">
            <Sparkles className="w-6 h-6 text-[#C59B3F] mx-auto" />
            <h3 className="text-sm font-bold text-gray-900">
              Nenhum aniversariante registrado em {monthNames[selectedMonth - 1]}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Consulte os demais meses no seletor acima para acompanhar as datas comemorativas
              dos irmãos e tios consultores do Capítulo 500.
            </p>
          </div>
        ) : (
          /* Estado Fraternal Institucional quando a Secretaria está atualizando o Censo */
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-[#087443]/10 text-[#087443] border border-[#087443]/20 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-6 h-6 text-[#087443]" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h3 className="text-sm font-bold text-gray-900">
                Calendário Fraternal de Aniversários do Capítulo
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                As datas comemorativas dos irmãos ativos, membros do Conselho Consultivo e
                sêniores são registradas e mantidas oficialmente pela Secretaria Capitular.
                Todos os laços de companheirismo e celebração fraterna são preservados sob a égide
                das Sete Virtudes Cardeais.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
