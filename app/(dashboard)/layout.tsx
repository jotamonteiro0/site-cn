import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#08140E] bg-institucional-dark text-white flex">
      {/* Sidebar Lateral Persistente */}
      <Sidebar />

      {/* Conteúdo Principal do Painel com offset para a Sidebar no desktop */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
