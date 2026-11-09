import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#021810] via-[#04281A] to-[#063B26] text-white flex">
      {/* Sidebar Lateral Persistente */}
      <Sidebar />

      {/* Conteúdo Principal do Painel com offset para a Sidebar no desktop */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
