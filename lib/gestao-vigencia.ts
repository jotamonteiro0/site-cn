/**
 * Regra Centralizada e Reutilizável de Vigência das Gestões Capitulares
 * Capítulo DeMolay Professor Carvalho Neves nº 500
 *
 * Princípios Institucionais Canônicos:
 * 1. Início Oficial da Gestão:
 *    - O Mestre Conselheiro informa a data oficial de sua instalação/posse solene.
 *    - Essa data é registrada no banco como início oficial (starts_on).
 *    - O sistema utiliza o registro oficial sem datas fixas espalhadas pelo código.
 *
 * 2. Encerramento da Gestão:
 *    - Acontece estritamente na data efetiva da Assembleia Capitular de encerramento realizada (ends_on).
 *    - A data prevista da Assembleia Capitular de encerramento (expected_close_date) é mantida
 *      SEPARADAMENTE da data efetiva.
 *    - A gestão permanece ativa até que seu encerramento seja formalmente registrado pelo procedimento
 *      administrativo autorizado.
 *    - A passagem de 6 meses NÃO encerra a gestão automaticamente.
 *    - A chegada de janeiro, por si só, NÃO encerra a gestão automaticamente.
 *    - Não se inventam datas de assembleia nem se presume que uma data prevista representa encerramento realizado.
 *
 * 3. Nova Gestão:
 *    - A posse do novo Mestre Conselheiro ocorre em janeiro, conforme o calendário institucional.
 *    - A data de instalação informada inicia oficialmente a nova gestão.
 *    - A ativação respeita o fluxo administrativo e as restrições de unicidade existentes.
 *    - Não se cria nem se ativa automaticamente uma nova gestão sem autorização administrativa.
 *
 * 4. Estados da Gestão:
 *    - Programada ("planejada"): instalação ainda não ocorreu.
 *    - Ativa ("ativa"): instalação ocorreu e o encerramento ainda não foi formalmente registrado.
 *    - Encerrada ("encerrada"): Assembleia Capitular de encerramento realizada e registrada.
 */

export type ManagementDbStatus = "planejada" | "ativa" | "encerrada";
export type ManagementInstitutionalState = "programada" | "ativa" | "encerrada";

export interface ManagementRecord {
  id: string;
  code: string;
  title?: string | null;
  theme?: string | null;
  photo_url?: string | null;
  starts_on: string; // Data oficial de instalação/posse
  expected_close_date?: string | null; // Data prevista da Assembleia de encerramento
  ends_on?: string | null; // Data efetiva da Assembleia de encerramento realizada
  status: ManagementDbStatus;
}

export interface ManagementVigenciaDescriptor {
  state: ManagementInstitutionalState;
  stateLabel: string;
  badgeClass: string;
  installationDate: string;
  formattedInstallationDate: string;
  expectedCloseDate: string | null;
  formattedExpectedCloseDate: string | null;
  actualCloseDate: string | null;
  formattedActualCloseDate: string | null;
  isCurrentlyActive: boolean;
  summaryDisplay: string;
}

/**
 * Formata datas civis no padrão brasileiro (DD/MM/YYYY) sem conversão UTC
 * que desloque o dia no fuso horário America/Sao_Paulo (UTC-3).
 */
export function formatCivilDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  // Se for YYYY-MM-DD ou começar com formato ISO
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  // Se já for DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  // Fallback seguro usando fuso de São Paulo
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * Formata uma data para string ISO civil YYYY-MM-DD respeitando o fuso local de São Paulo.
 */
export function formatCivilIso(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value || "2026";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";

  return `${y}-${m}-${d}`;
}

/**
 * Determina o estado institucional canônico da gestão.
 *
 * REGRA CRÍTICA DE PRESERVAÇÃO:
 * - A passagem de 6 meses NÃO encerra a gestão.
 * - A virada de ano/chegada de janeiro NÃO encerra a gestão.
 * - Uma gestão só se torna 'encerrada' após o registro formal de sua Assembleia de Encerramento.
 */
export function getManagementState(
  mgmt: Pick<ManagementRecord, "status" | "starts_on" | "ends_on">
): ManagementInstitutionalState {
  if (mgmt.status === "encerrada") {
    return "encerrada";
  }

  if (mgmt.status === "ativa") {
    // Se a gestão possui status = 'ativa', ela é categoricamente ATIVA.
    // Nem passagem de tempo nem datas previstas a encerram sem confirmação administrativa.
    return "ativa";
  }

  // mgmt.status === 'planejada'
  return "programada";
}

/**
 * Constrói o descritor completo de vigência institucional de uma gestão.
 */
export function getManagementVigenciaDescriptor(
  mgmt: ManagementRecord
): ManagementVigenciaDescriptor {
  const state = getManagementState(mgmt);
  const formattedInstallation = formatCivilDate(mgmt.starts_on);
  const formattedExpectedClose = formatCivilDate(mgmt.expected_close_date);
  const formattedActualClose = formatCivilDate(mgmt.ends_on);

  let stateLabel = "Gestão Ativa Vigente";
  let badgeClass = "selo-vidro-cn text-emerald-300 border-emerald-500/40";
  let summaryDisplay = `Desde ${formattedInstallation} (Gestão Vigente)`;

  if (state === "programada") {
    stateLabel = "Gestão Programada";
    badgeClass = "bg-blue-500/20 text-blue-300 border border-blue-500/40";
    summaryDisplay = `Instalação Oficial Prevista: ${formattedInstallation}`;
  } else if (state === "encerrada") {
    stateLabel = "Gestão Histórica Encerrada";
    badgeClass = "bg-gray-500/20 text-gray-300 border border-gray-500/40";
    summaryDisplay = `${formattedInstallation} a ${formattedActualClose || "Encerramento formal"}`;
  } else {
    // Ativa
    if (formattedExpectedClose) {
      summaryDisplay = `Desde ${formattedInstallation} (Assembleia de Encerramento prevista em ${formattedExpectedClose})`;
    } else {
      summaryDisplay = `Desde ${formattedInstallation} (em exercício pleno)`;
    }
  }

  return {
    state,
    stateLabel,
    badgeClass,
    installationDate: mgmt.starts_on,
    formattedInstallationDate: formattedInstallation,
    expectedCloseDate: mgmt.expected_close_date || null,
    formattedExpectedCloseDate: formattedExpectedClose || null,
    actualCloseDate: mgmt.ends_on || null,
    formattedActualCloseDate: formattedActualClose || null,
    isCurrentlyActive: state === "ativa",
    summaryDisplay,
  };
}

/**
 * Validação administrativa para criação de nova gestão.
 * Garante que a data de instalação informada pelo Mestre Conselheiro seja válida.
 */
export function validateManagementCreation(input: {
  code: string;
  title: string;
  starts_on: string;
  expected_close_date?: string | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.code || !input.code.trim()) {
    errors.push("O código da gestão (ex: 2027.1) é obrigatório.");
  }
  if (!input.title || !input.title.trim()) {
    errors.push("O título institucional da gestão (ex: Gestão XXVI) é obrigatório.");
  }
  if (!input.starts_on || !/^\d{4}-\d{2}-\d{2}$/.test(input.starts_on.trim())) {
    errors.push("A data oficial de instalação informada pelo Mestre Conselheiro é obrigatória no formato AAAA-MM-DD.");
  }

  if (input.expected_close_date && !/^\d{4}-\d{2}-\d{2}$/.test(input.expected_close_date.trim())) {
    errors.push("A data prevista da Assembleia Capitular de encerramento deve estar no formato AAAA-MM-DD.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
