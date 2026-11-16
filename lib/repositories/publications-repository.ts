import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export type PublicationStatus = "publicado" | "rascunho" | "arquivado";

export interface SitePublication {
  id: string;
  chapter_id?: string;
  title: string;
  description: string;
  starts_at: string;
  location?: string;
  photo_url?: string | null;
  status: PublicationStatus;
  mc_name?: string;
  management?: string;
  ata_num?: string;
  total_quorum?: number;
  demolays_present_count?: number;
  masons_present_count?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  original_post_url?: string | null;
  // Atributos históricos complementares
  ata_pdf_url?: string | null;
  livro_demolay_page?: string;
  livro_macom_page?: string;
  demolays_absent_count?: number;
  demolays_present?: string[];
  demolays_absent?: string[];
  masons_present?: string[];
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

/**
 * Limpeza de foto órfã ao substituir ou excluir publicação
 */
export async function cleanupOrphanPhoto(photoUrl: string | null | undefined): Promise<void> {
  if (!photoUrl) return;

  if (photoUrl.startsWith("/uploads/")) {
    const admin = getSupabaseAdmin();
    if (admin) {
      try {
        const { data, error } = await admin
          .from("site_publications")
          .select("id")
          .eq("photo_url", photoUrl);
        if (!error && (!data || data.length === 0)) {
          const filePath = path.join(process.cwd(), "public", photoUrl.replace(/^\//, ""));
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch {}
          }
        }
      } catch {}
    }
  }

  if (photoUrl.includes("/storage/v1/object/public/atividades/")) {
    const admin = getSupabaseAdmin();
    if (admin) {
      try {
        const parts = photoUrl.split("/storage/v1/object/public/atividades/");
        if (parts.length === 2) {
          await admin.storage.from("atividades").remove([parts[1]]);
        }
      } catch {}
    }
  }
}

export class PublicationsRepository {
  /**
   * Consulta todas as publicações (publicado, rascunho, arquivado)
   * Fonte exclusiva: PostgreSQL (public.site_publications).
   * Sem fallback operacional para JSON.
   */
  async getAll(filters?: {
    status?: PublicationStatus | null;
    management?: string | null;
    search?: string | null;
  }): Promise<SitePublication[]> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        "[PublicationsRepository] Supabase Admin client não configurado (SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL ausente). PostgreSQL é a fonte exclusiva. Operação abortada sem fallback para JSON."
      );
    }

    let query = admin.from("site_publications").select("*");
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.management) query = query.ilike("management", `%${filters.management}%`);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      query = query.or(
        `title.ilike.%${s}%,description.ilike.%${s}%,location.ilike.%${s}%,mc_name.ilike.%${s}%,ata_num.ilike.%${s}%`
      );
    }

    const { data, error } = await query.order("starts_at", { ascending: false });
    if (error) {
      const errCode = error.code || (error.message?.includes("does not exist") ? "42P01" : "DB_ERROR");
      throw new Error(
        `[PublicationsRepository] Falha ao consultar PostgreSQL ('public.site_publications'): ${error.message} (Código: ${errCode}). Tabela ausente ou banco inacessível. Nenhuma leitura de fallback em JSON foi realizada.`
      );
    }

    return (data || []) as SitePublication[];
  }

  /**
   * Consulta pública: exclusivamente publicações com status 'publicado'
   * Fonte exclusiva: PostgreSQL (public.site_publications).
   * Sem fallback operacional para JSON.
   */
  async getPublished(cursor = 0, limit = 4): Promise<{
    items: SitePublication[];
    nextCursor: number | null;
    hasMore: boolean;
    total: number;
  }> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        "[PublicationsRepository] Supabase Admin client não configurado. PostgreSQL é a fonte exclusiva. Operação abortada sem fallback para JSON."
      );
    }

    const { data, count, error } = await admin
      .from("site_publications")
      .select("*", { count: "exact" })
      .eq("status", "publicado")
      .order("starts_at", { ascending: false })
      .range(cursor, cursor + limit - 1);

    if (error) {
      const errCode = error.code || (error.message?.includes("does not exist") ? "42P01" : "DB_ERROR");
      throw new Error(
        `[PublicationsRepository] Falha ao consultar publicações no PostgreSQL ('public.site_publications'): ${error.message} (Código: ${errCode}). Tabela ausente ou banco inacessível. Nenhuma leitura de fallback em JSON foi realizada.`
      );
    }

    const items = (data || []) as SitePublication[];
    const total = count ?? items.length;
    const endIndex = cursor + limit;
    return {
      items,
      nextCursor: endIndex < total ? endIndex : null,
      hasMore: endIndex < total,
      total,
    };
  }

  /**
   * Consulta por ID
   * Fonte exclusiva: PostgreSQL (public.site_publications).
   * Sem fallback operacional para JSON.
   */
  async getById(id: string): Promise<SitePublication | null> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        "[PublicationsRepository] Supabase Admin client não configurado. PostgreSQL é a fonte exclusiva. Operação abortada sem fallback para JSON."
      );
    }

    const { data, error } = await admin
      .from("site_publications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      const errCode = error.code || (error.message?.includes("does not exist") ? "42P01" : "DB_ERROR");
      throw new Error(
        `[PublicationsRepository] Falha ao consultar publicação por ID no PostgreSQL ('public.site_publications'): ${error.message} (Código: ${errCode}). Operação abortada sem fallback para JSON.`
      );
    }

    return (data as SitePublication) || null;
  }

  /**
   * Criação de nova publicação
   * Gravação exclusiva: PostgreSQL (public.site_publications).
   * NENHUM fallback para JSON.
   */
  async create(
    data: Omit<SitePublication, "id" | "created_at" | "updated_at"> & { id?: string }
  ): Promise<SitePublication> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        "[PublicationsRepository] Supabase Admin client não configurado. Gravação abortada: nenhuma gravação em fallback JSON foi realizada."
      );
    }

    const now = new Date().toISOString();
    const id = data.id || `pub-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const newPublication: SitePublication = {
      ...data,
      id,
      photo_url: data.photo_url || null,
      status: data.status || "publicado",
      original_post_url: data.original_post_url || null,
      total_quorum:
        data.total_quorum ?? ((data.demolays_present_count || 0) + (data.masons_present_count || 0)),
      demolays_present_count: data.demolays_present_count || 0,
      masons_present_count: data.masons_present_count || 0,
      created_at: now,
      updated_at: now,
    };

    const { data: inserted, error } = await admin
      .from("site_publications")
      .insert({
        id: newPublication.id,
        title: newPublication.title,
        description: newPublication.description,
        starts_at: newPublication.starts_at,
        location: newPublication.location,
        photo_url: newPublication.photo_url,
        mc_name: newPublication.mc_name,
        management: newPublication.management,
        ata_num: newPublication.ata_num,
        total_quorum: newPublication.total_quorum,
        demolays_present_count: newPublication.demolays_present_count,
        masons_present_count: newPublication.masons_present_count,
        status: newPublication.status,
        original_post_url: newPublication.original_post_url,
        created_at: newPublication.created_at,
        updated_at: newPublication.updated_at,
      })
      .select()
      .single();

    if (error) {
      const errCode = error.code || (error.message?.includes("does not exist") ? "42P01" : "DB_ERROR");
      throw new Error(
        `[PublicationsRepository] Falha na gravação no PostgreSQL ('public.site_publications'): ${error.message} (Código: ${errCode}). Nenhuma operação de escrita em JSON foi realizada.`
      );
    }

    return (inserted || newPublication) as SitePublication;
  }

  /**
   * Atualização de publicação
   * Gravação exclusiva: PostgreSQL (public.site_publications).
   * NENHUM fallback para JSON.
   */
  async update(
    id: string,
    data: Partial<Omit<SitePublication, "id" | "created_at">>
  ): Promise<SitePublication | null> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        "[PublicationsRepository] Supabase Admin client não configurado. Atualização abortada: nenhuma gravação em fallback JSON foi realizada."
      );
    }

    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: SitePublication = {
      ...existing,
      ...data,
      updated_at: now,
    };

    if (
      data.demolays_present_count !== undefined ||
      data.masons_present_count !== undefined
    ) {
      const dm = data.demolays_present_count ?? existing.demolays_present_count ?? 0;
      const mas = data.masons_present_count ?? existing.masons_present_count ?? 0;
      updated.total_quorum = dm + mas;
    }

    const { data: result, error } = await admin
      .from("site_publications")
      .update({
        title: updated.title,
        description: updated.description,
        starts_at: updated.starts_at,
        location: updated.location,
        photo_url: updated.photo_url,
        mc_name: updated.mc_name,
        management: updated.management,
        ata_num: updated.ata_num,
        total_quorum: updated.total_quorum,
        demolays_present_count: updated.demolays_present_count,
        masons_present_count: updated.masons_present_count,
        status: updated.status,
        original_post_url: updated.original_post_url,
        updated_at: updated.updated_at,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const errCode = error.code || (error.message?.includes("does not exist") ? "42P01" : "DB_ERROR");
      throw new Error(
        `[PublicationsRepository] Falha na atualização no PostgreSQL ('public.site_publications'): ${error.message} (Código: ${errCode}). Nenhuma operação de escrita em JSON foi realizada.`
      );
    }

    return (result || updated) as SitePublication;
  }

  /**
   * Exclusão permanente com limpeza de imagem
   * Gravação exclusiva: PostgreSQL (public.site_publications).
   * NENHUM fallback para JSON.
   */
  async delete(id: string): Promise<boolean> {
    const admin = getSupabaseAdmin();
    if (!admin) {
      throw new Error(
        "[PublicationsRepository] Supabase Admin client não configurado. Exclusão abortada: nenhuma exclusão em fallback JSON foi realizada."
      );
    }

    const target = await this.getById(id);
    if (!target) return false;

    const { error } = await admin.from("site_publications").delete().eq("id", id);
    if (error) {
      const errCode = error.code || (error.message?.includes("does not exist") ? "42P01" : "DB_ERROR");
      throw new Error(
        `[PublicationsRepository] Falha na exclusão no PostgreSQL ('public.site_publications'): ${error.message} (Código: ${errCode}). Nenhuma operação de exclusão em JSON foi realizada.`
      );
    }

    if (target.photo_url) {
      cleanupOrphanPhoto(target.photo_url).catch(() => {});
    }

    return true;
  }
}

export const publicationsRepo = new PublicationsRepository();
