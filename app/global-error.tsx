"use client";

import { useEffect } from "react";
import { ShieldAlert, RefreshCw, Home } from "lucide-react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro global capturado pelo App Router:", error);
  }, [error]);

  const handleRecover = () => {
    const msg = (error?.message || "").toLowerCase();
    const isNetworkOrChunkFailure =
      msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("chunk") ||
      msg.includes("loading");

    if (typeof window !== "undefined" && isNetworkOrChunkFailure) {
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <html lang="pt-BR" className="h-full">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          backgroundColor: "#08140E",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
        className="min-h-full flex flex-col items-center justify-center bg-[#08140E] text-white p-6 font-sans antialiased"
      >
        <div
          style={{
            maxWidth: "448px",
            width: "100%",
            backgroundColor: "rgba(5, 46, 29, 0.92)",
            border: "1px solid rgba(217, 170, 69, 0.45)",
            borderRadius: "16px",
            padding: "32px 24px",
            textAlign: "center",
            boxSizing: "border-box",
          }}
          className="max-w-md w-full bg-[#052E1D]/90 border border-[#D9AA45]/40 rounded-2xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md"
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 20px auto",
              borderRadius: "9999px",
              backgroundColor: "rgba(8, 116, 67, 0.3)",
              border: "1px solid rgba(217, 170, 69, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#D9AA45",
            }}
            className="w-14 h-14 mx-auto rounded-full bg-[#087443]/30 border border-[#D9AA45]/60 flex items-center justify-center text-[#D9AA45] mb-5 shadow-inner"
          >
            <ShieldAlert style={{ width: 28, height: 28 }} className="w-7 h-7" />
          </div>

          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#D9AA45",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
            className="selo-vidro-cn px-3 py-1 rounded-full text-[11px] font-bold text-[#D9AA45] uppercase tracking-wider font-mono"
          >
            Capítulo Professor Carvalho Neves Nº 500
          </span>

          <h1
            style={{ fontSize: "22px", fontWeight: 700, margin: "16px 0 8px 0", color: "#FFFFFF" }}
            className="text-xl sm:text-2xl font-bold text-white mt-4 mb-2 tracking-tight"
          >
            Falha temporária ao carregar a página
          </h1>

          <p
            style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(209, 250, 229, 0.85)", marginBottom: "24px" }}
            className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed mb-6"
          >
            Ocorreu uma instabilidade transitória na conexão ou na atualização da sessão. Por favor, recarregue a página ou retorne ao início.
          </p>

          <div
            style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={handleRecover}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "12px",
                backgroundColor: "#087443",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "12px",
                border: "1px solid rgba(217, 170, 69, 0.5)",
                cursor: "pointer",
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065F36] text-white font-semibold text-xs border border-[#D9AA45]/50 shadow-md transition-all cursor-pointer"
            >
              <RefreshCw style={{ width: 14, height: 14, color: "#D9AA45" }} className="w-3.5 h-3.5 text-[#D9AA45]" />
              <span>Recarregar página</span>
            </button>

            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  window.location.href = "/";
                }
              }}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                color: "#A7F3D0",
                fontWeight: 600,
                fontSize: "12px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                cursor: "pointer",
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-200 font-semibold text-xs border border-white/20 transition-all cursor-pointer"
            >
              <Home style={{ width: 14, height: 14 }} className="w-3.5 h-3.5" />
              <span>Página inicial</span>
            </button>
          </div>

          {error?.digest && (
            <p className="mt-6 text-[10px] text-emerald-300/40 font-mono">
              Código de rastreamento: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
