import {
  mcPhotosRepo,
  type ManagementMCPhoto,
} from "./repositories/mc-photos-repository";

export type { ManagementMCPhoto };

/**
 * Consulta todas as fotografias oficiais cadastradas
 */
export async function getAllMCPhotos(): Promise<ManagementMCPhoto[]> {
  return mcPhotosRepo.getAll();
}

/**
 * Consulta uma fotografia pelo código ou número romano da gestão
 */
export async function getMCPhotoByCode(code: string): Promise<ManagementMCPhoto | null> {
  return mcPhotosRepo.getByCode(code);
}

/**
 * Salva ou atualiza a fotografia oficial de uma gestão
 */
export async function saveMCPhoto(photo: {
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
  return mcPhotosRepo.save(photo);
}

/**
 * Exclui a fotografia oficial de uma gestão
 */
export async function deleteMCPhoto(code: string): Promise<boolean> {
  return mcPhotosRepo.delete(code);
}
