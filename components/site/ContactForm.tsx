"use client";

import { Send } from "lucide-react";
import { useState } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {submitted && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium animate-in fade-in">
          Mensagem institucional enviada com sucesso! Retornaremos em breve.
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
        className="w-full py-3 px-6 rounded-lg bg-[#087443] hover:bg-[#064D32] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>Enviar Mensagem</span>
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
