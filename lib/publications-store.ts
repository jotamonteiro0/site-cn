import {
  publicationsRepo,
  cleanupOrphanPhoto as repoCleanupOrphanPhoto,
  type SitePublication,
  type PublicationStatus,
} from "./repositories/publications-repository";

export type { SitePublication, PublicationStatus };
export { repoCleanupOrphanPhoto as cleanupOrphanPhoto };

/**
 * Consulta todas as publicações (publicado, rascunho, arquivado)
 */
export async function getAllPublications(filters?: {
  status?: PublicationStatus | null;
  management?: string | null;
  search?: string | null;
}): Promise<SitePublication[]> {
  return publicationsRepo.getAll(filters);
}

/**
 * Consulta pública: exclusivamente publicações ativas ('publicado')
 */
export async function getPublishedPublications(
  cursor = 0,
  limit = 4
): Promise<{ items: SitePublication[]; nextCursor: number | null; hasMore: boolean; total: number }> {
  return publicationsRepo.getPublished(cursor, limit);
}

/**
 * Consulta uma publicação por ID
 */
export async function getPublicationById(id: string): Promise<SitePublication | null> {
  return publicationsRepo.getById(id);
}

/**
 * Cadastra uma nova publicação
 */
export async function createPublication(
  data: Omit<SitePublication, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<SitePublication> {
  return publicationsRepo.create(data);
}

/**
 * Atualiza uma publicação existente
 */
export async function updatePublication(
  id: string,
  data: Partial<Omit<SitePublication, "id" | "created_at">>
): Promise<SitePublication | null> {
  return publicationsRepo.update(id, data);
}

/**
 * Altera status da publicação
 */
export async function changePublicationStatus(
  id: string,
  status: PublicationStatus
): Promise<SitePublication | null> {
  return publicationsRepo.update(id, { status });
}

/**
 * Exclui permanentemente uma publicação
 */
export async function deletePublication(id: string): Promise<boolean> {
  return publicationsRepo.delete(id);
}
