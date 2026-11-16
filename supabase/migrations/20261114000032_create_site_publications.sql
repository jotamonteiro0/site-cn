-- ==============================================================================
-- MIGRATION: 20261114000032_create_site_publications.sql
-- DESCRIÇÃO: Tabela institucional de publicações do site (CMS de Atividades)
--            e tabela de gerenciamento de fotografias oficiais dos Mestres Conselheiros.
-- AMBIENTE: Local (Documentação e conformidade técnica do Capítulo 500)
-- ==============================================================================

-- 1. TABELA DE PUBLICAÇÕES DO SITE (CMS INSTITUCIONAL)
CREATE TABLE IF NOT EXISTS public.site_publications (
  id TEXT PRIMARY KEY,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  photo_url TEXT,
  mc_name TEXT,
  management TEXT,
  ata_num TEXT,
  total_quorum INTEGER DEFAULT 0,
  demolays_present_count INTEGER DEFAULT 0,
  masons_present_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  original_post_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de performance para ordenação cronológica e filtros
CREATE INDEX IF NOT EXISTS idx_site_publications_status_starts_at 
  ON public.site_publications (status, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_publications_management 
  ON public.site_publications (management);

-- Habilitação estrita de RLS
ALTER TABLE public.site_publications ENABLE ROW LEVEL SECURITY;

-- Política 1: Leitura pública restrita a publicações ativas ('publicado')
DROP POLICY IF EXISTS "Allow public read published site_publications" ON public.site_publications;
CREATE POLICY "Allow public read published site_publications"
  ON public.site_publications
  FOR SELECT
  TO anon, authenticated
  USING (status = 'publicado');

-- Política 2: Controle total para Master e Diretoria Autorizada
DROP POLICY IF EXISTS "Allow master full access to site_publications" ON public.site_publications;
CREATE POLICY "Allow master full access to site_publications"
  ON public.site_publications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chapter_memberships cm
      WHERE cm.user_id = auth.uid()
        AND cm.role_code = 'master'
        AND cm.is_active = true
    )
    OR auth.uid() IN (
      SELECT u.id FROM auth.users u
      WHERE u.raw_user_meta_data->>'id_demolay' IN ('127738', '102836')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chapter_memberships cm
      WHERE cm.user_id = auth.uid()
        AND cm.role_code = 'master'
        AND cm.is_active = true
    )
    OR auth.uid() IN (
      SELECT u.id FROM auth.users u
      WHERE u.raw_user_meta_data->>'id_demolay' IN ('127738', '102836')
    )
  );

-- 2. TABELA DE FOTOGRAFIAS OFICIAIS DOS MESTRES CONSELHEIROS
CREATE TABLE IF NOT EXISTS public.management_mc_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  management_id UUID REFERENCES public.managements(id) ON DELETE CASCADE,
  management_code TEXT NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  member_id_demolay TEXT,
  member_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT uq_management_mc_photos_code UNIQUE (management_code)
);

CREATE INDEX IF NOT EXISTS idx_management_mc_photos_code 
  ON public.management_mc_photos (management_code);

ALTER TABLE public.management_mc_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read management_mc_photos" ON public.management_mc_photos;
CREATE POLICY "Allow public read management_mc_photos"
  ON public.management_mc_photos
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow master full access to management_mc_photos" ON public.management_mc_photos;
CREATE POLICY "Allow master full access to management_mc_photos"
  ON public.management_mc_photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chapter_memberships cm
      WHERE cm.user_id = auth.uid()
        AND cm.role_code = 'master'
        AND cm.is_active = true
    )
    OR auth.uid() IN (
      SELECT u.id FROM auth.users u
      WHERE u.raw_user_meta_data->>'id_demolay' IN ('127738', '102836')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chapter_memberships cm
      WHERE cm.user_id = auth.uid()
        AND cm.role_code = 'master'
        AND cm.is_active = true
    )
    OR auth.uid() IN (
      SELECT u.id FROM auth.users u
      WHERE u.raw_user_meta_data->>'id_demolay' IN ('127738', '102836')
    )
  );
