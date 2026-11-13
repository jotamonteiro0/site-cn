"use client";

import { Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSending(true);
    const form = e.currentTarget;
    setTimeout(() => {
      form.reset();
      setIsSending(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 6000);
    }, 400);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {submitted && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#087443] shrink-0" />
          <span>Mensagem institucional enviada com sucesso! A diretoria capitular retornará em breve.</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Seu Nome</label>
          <input
            type="text"
            required
            placeholder="Nome completo"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#087443]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Seu E-mail</label>
          <input
            type="email"
            required
            placeholder="seu.email@exemplo.com"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#087443]"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Assunto</label>
        <input
          type="text"
          required
          placeholder="Ex: Informações sobre ingresso de novos membros"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#087443]"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Mensagem</label>
        <textarea
          rows={4}
          required
          placeholder="Escreva sua mensagem aqui..."
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#087443]"
        />
      </div>
      <button
        type="submit"
        disabled={isSending}
        className="w-full py-3 px-6 rounded-lg bg-[#087443] hover:bg-[#065F36] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <span>{isSending ? "Enviando mensagem..." : "Enviar Mensagem"}</span>
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
