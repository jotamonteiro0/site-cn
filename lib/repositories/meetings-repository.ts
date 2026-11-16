import { createClient } from "@supabase/supabase-js";

export type MeetingStatus = "agendada" | "realizada" | "cancelada";

export interface CalendarMeetingRecord {
  id: string;
  chapter_id?: string;
  title: string;
  headline?: string;
  starts_at: string;
  ends_at?: string | null;
  location: string;
  description: string;
  status: MeetingStatus;
  category: string;
  management: string;
  complementary_info?: string | null;
  responsible_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  cancelled_at?: string | null;
}

export interface MeetingFilters {
  month?: number | null;
  year?: number | null;
  category?: string | null;
  management?: string | null;
  status?: string | null;
  search?: string | null;
}

export function parseMeetingCategory(rawTitle: string): string {
  if (!rawTitle) return "Sessão Ordinária";
  const lower = rawTitle.toLowerCase();
  if (lower.includes("entretenimento")) return "Entretenimento";
  if (lower.includes("magna de iniciação") || (lower.includes("iniciação") && !lower.includes("ordinária"))) return "Sessão Magna de Iniciação";
  if (lower.includes("magna de elevação") || (lower.includes("elevação") && !lower.includes("ordinária"))) return "Sessão Magna de Elevação";
  if (lower.includes("pública") || lower.includes("mães") || lower.includes("pais")) return "Cerimônia Pública";
  if (lower.includes("conselho")) return "Reunião do Conselho Consultivo";
  if (lower.includes("assembleia") || lower.includes("eleição")) return "Assembleia Geral";
  if (lower.includes("filantr")) return "Ação Filantrópica";
  if (lower.includes("magna")) return "Sessão Magna";
  return "Sessão Ordinária";
}

export function parseMeetingHeadline(rawTitle: string): string {
  if (!rawTitle) return "";
  if (rawTitle.includes("|")) {
    const parts = rawTitle.split("|");
    return parts.slice(1).join("|").trim();
  }
  return rawTitle.trim();
}

export function deriveManagementFromDate(isoDate: string): string {
  if (!isoDate) return "Gestão XXV (2026.2)";
  const ymd = isoDate.substring(0, 10);
  if (ymd >= "2027-02-01") return "Gestão XXVI (2027.1)";
  if (ymd >= "2026-08-01") return "Gestão XXV (2026.2)";
  if (ymd >= "2026-01-01") return "Gestão XXIV (2026.1)";
  if (ymd >= "2025-08-01") return "Gestão XXIII (2025.2)";
  if (ymd >= "2025-01-01") return "Gestão XXII (2025.1)";
  return "Gestão XXI (2024.2)";
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    return createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return null;
}

interface MeetingDbRow {
  id: string;
  chapter_id?: string | null;
  title?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  description?: string | null;
  status?: string | null;
  category?: string | null;
  management?: string | null;
  complementary_info?: string | null;
  responsible_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  cancelled_at?: string | null;
}

export function mapRowToMeeting(row: MeetingDbRow): CalendarMeetingRecord {
  const title = row.title || "Sessão Capitular";
  const category = row.category || parseMeetingCategory(title);
  const management = row.management || deriveManagementFromDate(row.starts_at);
  const ends_at = row.ends_at || null;

  return {
    id: row.id,
    chapter_id: row.chapter_id || "00000000-0000-0000-0000-000000000500",
    title,
    headline: parseMeetingHeadline(title),
    starts_at: row.starts_at,
    ends_at,
    location: row.location || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
    description: row.description || "",
    status: (row.status || "agendada") as MeetingStatus,
    category,
    management,
    complementary_info: row.complementary_info || null,
    responsible_id: row.responsible_id || null,
    created_by: row.created_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    cancelled_at: row.cancelled_at || null,
  };
}

export class MeetingsRepository {
  /**
   * Consulta todas as reuniões e eventos cadastrados no PostgreSQL.
   * Fonte exclusiva: PostgreSQL (public.meetings).
   */
  async getAll(filters?: MeetingFilters): Promise<CalendarMeetingRecord[]> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error(
        "[MeetingsRepository] Supabase Admin client indisponível. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. Nenhuma leitura de fallback em JSON foi realizada."
      );
    }

    const query = supabase
      .from("meetings")
      .select("id, chapter_id, title, starts_at, location, description, status, created_at, updated_at, cancelled_at")
      .order("starts_at", { ascending: true });

    if (filters?.status && filters.status !== "todas") {
      query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      const errCode = (error as { code?: string })?.code || "UNKNOWN";
      throw new Error(
        `[MeetingsRepository] Falha ao consultar reuniões no PostgreSQL ('public.meetings'): ${error.message} (Código: ${errCode}). Nenhuma leitura de fallback em JSON foi realizada.`
      );
    }

    let items = (data || []).map(mapRowToMeeting);

    // Filtros em memória para mês, ano, categoria, gestão e busca
    if (filters?.year) {
      items = items.filter((m) => new Date(m.starts_at).getFullYear() === filters.year);
    }
    if (filters?.month) {
      items = items.filter((m) => new Date(m.starts_at).getMonth() + 1 === filters.month);
    }
    if (filters?.category && filters.category !== "todas") {
      items = items.filter((m) => m.category.toLowerCase().includes(filters.category!.toLowerCase()));
    }
    if (filters?.management && filters.management !== "todas") {
      items = items.filter((m) => m.management.toLowerCase().includes(filters.management!.toLowerCase()));
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }

    return items;
  }

  /**
   * Consulta uma reunião específica pelo ID.
   */
  async getById(id: string): Promise<CalendarMeetingRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error(
        "[MeetingsRepository] Supabase Admin client indisponível. Nenhuma leitura de fallback em JSON foi realizada."
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return null;
    }

    const { data, error } = await supabase
      .from("meetings")
      .select("id, chapter_id, title, starts_at, location, description, status, created_at, updated_at, cancelled_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      const errCode = (error as { code?: string })?.code || "UNKNOWN";
      if (errCode === "22P02") return null;
      throw new Error(
        `[MeetingsRepository] Falha ao consultar reunião no PostgreSQL: ${error.message} (Código: ${errCode}). Nenhuma leitura de fallback em JSON foi realizada.`
      );
    }

    return data ? mapRowToMeeting(data) : null;
  }

  /**
   * Identifica a Próxima Reunião Oficial (Estritamente Futura e Não Cancelada).
   */
  async getNextMeeting(refTime?: number): Promise<CalendarMeetingRecord | null> {
    const all = await this.getAll({ status: "agendada" });
    const nowThreshold = refTime ?? Date.now();

    const future = all
      .filter((m) => {
        const mTime = new Date(m.starts_at).getTime();
        return mTime > nowThreshold && m.status === "agendada";
      })
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    return future[0] || null;
  }

  /**
   * Cadastra uma nova reunião ou evento no calendário oficial.
   * Valida obrigatoriedade, horário de término e duplicidade.
   */
  async create(data: {
    title: string;
    category?: string;
    management?: string;
    starts_at: string;
    ends_at?: string | null;
    location?: string;
    description?: string;
    complementary_info?: string | null;
    created_by?: string;
  }): Promise<CalendarMeetingRecord> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error(
        "[MeetingsRepository] Supabase Admin client indisponível. Nenhuma gravação em JSON foi realizada."
      );
    }

    if (!data.title?.trim()) {
      throw new Error("O título da reunião ou evento é obrigatório.");
    }
    if (!data.starts_at) {
      throw new Error("A data e horário de início da sessão são obrigatórios.");
    }

    const startsDate = new Date(data.starts_at);
    if (isNaN(startsDate.getTime())) {
      throw new Error("Data de início inválida.");
    }

    if (data.ends_at) {
      const endsDate = new Date(data.ends_at);
      if (isNaN(endsDate.getTime())) {
        throw new Error("Data de término inválida.");
      }
      if (endsDate.getTime() < startsDate.getTime()) {
        throw new Error("O horário de término não pode ser anterior ao horário de início.");
      }
    }

    // Prevenção de duplicidade acidental: checa se já existe evento com mesmo título e horário de início
    const { data: existing } = await supabase
      .from("meetings")
      .select("id")
      .eq("title", data.title.trim())
      .eq("starts_at", data.starts_at)
      .neq("status", "cancelada")
      .maybeSingle();

    if (existing) {
      throw new Error("Já existe uma reunião agendada com o mesmo título nesta data e horário.");
    }

    const payload = {
      chapter_id: "00000000-0000-0000-0000-000000000500",
      title: data.title.trim(),
      starts_at: data.starts_at,
      location: data.location?.trim() || "A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)",
      description: data.description?.trim() || "",
      status: "agendada",
      created_by: data.created_by || null,
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from("meetings")
      .insert(payload)
      .select()
      .single();

    if (error) {
      const errCode = (error as { code?: string })?.code || "UNKNOWN";
      throw new Error(
        `[MeetingsRepository] Falha ao cadastrar reunião no PostgreSQL: ${error.message} (Código: ${errCode}). Nenhuma operação de escrita em JSON foi realizada.`
      );
    }

    const record = mapRowToMeeting(inserted);
    if (data.category) record.category = data.category;
    if (data.management) record.management = data.management;
    if (data.ends_at) record.ends_at = data.ends_at;
    if (data.complementary_info) record.complementary_info = data.complementary_info;

    return record;
  }

  /**
   * Atualiza uma reunião existente.
   */
  async update(
    id: string,
    data: {
      title?: string;
      category?: string;
      management?: string;
      starts_at?: string;
      ends_at?: string | null;
      location?: string;
      description?: string;
      complementary_info?: string | null;
      status?: MeetingStatus;
    }
  ): Promise<CalendarMeetingRecord> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error(
        "[MeetingsRepository] Supabase Admin client indisponível. Nenhuma gravação em JSON foi realizada."
      );
    }

    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Reunião com ID ${id} não encontrada.`);
    }

    if (data.starts_at && data.ends_at) {
      const s = new Date(data.starts_at).getTime();
      const e = new Date(data.ends_at).getTime();
      if (e < s) {
        throw new Error("O horário de término não pode ser anterior ao horário de início.");
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.starts_at !== undefined) updatePayload.starts_at = data.starts_at;
    if (data.location !== undefined) updatePayload.location = data.location.trim();
    if (data.description !== undefined) updatePayload.description = data.description.trim();
    if (data.status !== undefined) {
      updatePayload.status = data.status;
      if (data.status === "cancelada") {
        updatePayload.cancelled_at = new Date().toISOString();
      } else {
        updatePayload.cancelled_at = null;
      }
    }

    const { data: updated, error } = await supabase
      .from("meetings")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const errCode = (error as { code?: string })?.code || "UNKNOWN";
      throw new Error(
        `[MeetingsRepository] Falha ao atualizar reunião no PostgreSQL: ${error.message} (Código: ${errCode}). Nenhuma operação de escrita em JSON foi realizada.`
      );
    }

    const record = mapRowToMeeting(updated);
    if (data.category) record.category = data.category;
    if (data.management) record.management = data.management;
    if (data.ends_at !== undefined) record.ends_at = data.ends_at;
    if (data.complementary_info !== undefined) record.complementary_info = data.complementary_info;

    return record;
  }

  /**
   * Cancela uma reunião preservando o histórico institucional (status = 'cancelada').
   */
  async cancel(id: string): Promise<CalendarMeetingRecord> {
    return this.update(id, { status: "cancelada" });
  }

  /**
   * Exclusão permanente de reunião (restrita).
   */
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error(
        "[MeetingsRepository] Supabase Admin client indisponível. Nenhuma exclusão em JSON foi realizada."
      );
    }

    // Limpa dependências relacionais litúrgicas para evitar erro 23503 de chave estrangeira
    await Promise.allSettled([
      supabase.from("meeting_attendance").delete().eq("meeting_id", id),
      supabase.from("meeting_agendas").delete().eq("meeting_id", id),
      supabase.from("meeting_media").delete().eq("meeting_id", id),
      supabase.from("meeting_tasks").delete().eq("meeting_id", id),
      supabase.from("meeting_minutes").delete().eq("meeting_id", id),
      supabase.from("meeting_visiting_masons").delete().eq("meeting_id", id),
      supabase.from("meeting_visiting_demolays").delete().eq("meeting_id", id),
    ]);

    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) {
      const errCode = (error as { code?: string })?.code || "UNKNOWN";
      throw new Error(
        `[MeetingsRepository] Falha ao excluir reunião no PostgreSQL: ${error.message} (Código: ${errCode}). Nenhuma operação de exclusão em JSON foi realizada.`
      );
    }

    return true;
  }
}

export const meetingsRepo = new MeetingsRepository();
