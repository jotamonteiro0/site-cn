import { createClient } from "@supabase/supabase-js";

export interface ManagementMCPhoto {
  management_code: string; // Ex: "2026.2" ou "XXV"
  management_roman: string; // Ex: "XXV"
  management_title: string; // Ex: "Gestão XXV"
  member_id?: string; // UUID real do membro
  member_id_demolay?: string; // ID DeMolay oficial
  member_name: string; // Nome oficial do MC
  periodo: string; // "2026.2", "2027.1", etc.
  status: "Atual" | "Eleita" | "Past MC";
  photo_url: string;
  destaque?: boolean;
  updated_at?: string;
  updated_by?: string;
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

export class MCPhotosRepository {
  /**
   * Consulta todas as fotografias oficiais de MCs
   * Fonte exclusiva: PostgreSQL (public.management_mc_photos).
   * Sem fallback operacional para JSON.
   */
  async getAll(): Promise<ManagementMCPhoto[]> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        "[MCPhotosRepository] Supabase Admin client não configurado (SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL ausente). PostgreSQL é a fonte exclusiva. Operação abortada sem fallback para JSON."
      );
    }

    const { data, error } = await admin
      .from("management_mc_photos")
      .select("*")
      .order("management_code", { ascending: false });

    if (error) {
      const errCode = error.code || (error.message?.includes("does not exist") ? "42P01" : "DB_ERROR");
      throw new Error(
        `[MCPhotosRepository] Falha ao consultar PostgreSQL ('public.management_mc_photos'): ${error.message} (Código: ${errCode}). Tabela ausente ou banco inacessível. Nenhuma leitura de fallback em JSON foi realizada.`
      );
    }

    return (data || []) as ManagementMCPhoto[];
  }

  /**
   * Consulta uma fotografia pelo código ou número romano da gestão
   * Fonte exclusiva: PostgreSQL (public.management_mc_photos).
   * Sem fallback operacional para JSON.
   */
  async getByCode(code: string): Promise<ManagementMCPhoto | null> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        "[MCPhotosRepository] Supabase Admin client não configurado. PostgreSQL é a fonte exclusiva. Operação abortada sem fallback para JSON."
      );
    }

    const { data, error } = await admin
      .from("management_mc_photos")
      .select("*")
      .or(`management_code.eq.${code},management_roman.eq.${code}`)
      .maybeSingle();

    if (error) {
      const errCode = error.code || (error.message?.includes("does not exist") ? "42P01" : "DB_ERROR");
      throw new Error(
        `[MCPhotosRepository] Falha ao consultar fotografia no PostgreSQL ('public.management_mc_photos'): ${error.message} (Código: ${errCode}). Operação abortada sem fallback para JSON.`
      );
    }

    return (data as ManagementMCPhoto) || null;
  }

  /**
   * Salva ou atualiza a fotografia oficial no PostgreSQL
   * Gravação exclusiva: PostgreSQL (public.management_mc_photos e public.managements).
   * NENHUM fallback para JSON.
   */
  async save(photo: {
    management_code: string;
    management_roman?: string;
    management_title?: string;
    member_id?: string;
    member_id_demolay?: string;
    member_name: string;
    photo_url: string;
    periodo?: string;
    status?: "Atual" | "Eleita" | "Past MC";
    updated_by?: string;
  }): Promise<ManagementMCPhoto> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        "[MCPhotosRepository] Supabase Admin client não configurado. Gravação abortada: nenhuma gravação em fallback JSON foi realizada."
      );
    }

    const now = new Date().toISOString();
    const payload = {
      management_code: photo.management_code,
      management_roman: photo.management_roman || photo.management_code,
      management_title: photo.management_title || `Gestão ${photo.management_code}`,
      member_id: photo.member_id || null,
      member_id_demolay: photo.member_id_demolay || null,
      member_name: photo.member_name,
      periodo: photo.periodo || photo.management_code,
      status: photo.status || "Past MC",
      photo_url: photo.photo_url,
      updated_at: now,
      updated_by: photo.updated_by,
    };

    const { data, error } = await admin
      .from("management_mc_photos")
      .upsert(payload, { onConflict: "management_code" })
      .select()
      .single();

    if (error) {
      const errCode = error.code || (error.message?.includes("does not exist") ? "42P01" : "DB_ERROR");
      throw new Error(
        `[MCPhotosRepository] Falha ao salvar no PostgreSQL ('public.management_mc_photos'): ${error.message} (Código: ${errCode}). Nenhuma operação de escrita em JSON foi realizada.`
      );
    }

    // Sincronização secundária com managements.photo_url
    try {
      await admin
        .from("managements")
        .update({ photo_url: photo.photo_url })
        .eq("code", photo.management_code);
    } catch {}

    return (data || payload) as ManagementMCPhoto;
  }

  /**
   * Exclui fotografia oficial no PostgreSQL
   * Operação exclusiva: PostgreSQL (public.management_mc_photos).
   * NENHUM fallback para JSON.
   */
  async delete(code: string): Promise<boolean> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        "[MCPhotosRepository] Supabase Admin client não configurado. Exclusão abortada: nenhuma exclusão em fallback JSON foi realizada."
      );
    }

    const { error } = await admin
      .from("management_mc_photos")
      .delete()
      .eq("management_code", code);

    if (error) {
      const errCode = error.code || (error.message?.includes("does not exist") ? "42P01" : "DB_ERROR");
      throw new Error(
        `[MCPhotosRepository] Falha ao excluir no PostgreSQL ('public.management_mc_photos'): ${error.message} (Código: ${errCode}). Nenhuma operação de exclusão em JSON foi realizada.`
      );
    }

    return true;
  }
}

export const mcPhotosRepo = new MCPhotosRepository();
