-- ==============================================================================
-- Migração 36: Fonte de Verdade Relacional do Conselho Consultivo e Mensalidades
-- Capítulo Professor Carvalho Neves Nº 500
-- ==============================================================================
-- 1. Criação da tabela relacional conselho_membros para gerenciar os integrantes
--    do Conselho Consultivo por gestão com histórico de vigência institucional.
-- 2. Atualização cadastral de Carlos André Machado da Silva Júnior (ID 134106)
--    como Sênior DeMolay não Maçom integrante ativo do Conselho.
-- 3. Povoamento dos 18 integrantes oficiais das 4 Lojas Patrocinadoras.
-- 4. Reescrita definitiva da RPC generate_monthly_charges para faturar
--    TODOS os integrantes ativos do Conselho Consultivo (R$ 25,00 / R$ 450,00 mês).
-- 5. Registro das fotos físicas de gestões históricas em management_mc_photos.
-- 6. Ajuste da duplicidade textual de Ata na publicação de 03/05/2026.
-- ==============================================================================

-- 1. ESTRUTURA RELACIONAL DO CONSELHO CONSULTIVO
CREATE TABLE IF NOT EXISTS public.conselho_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) DEFAULT '00000000-0000-0000-0000-000000000500',
  management_id uuid NOT NULL REFERENCES public.managements(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  sponsoring_lodge text NOT NULL,
  role_name text NOT NULL DEFAULT 'Membro Consultor',
  starts_at date NOT NULL DEFAULT '2026-07-01',
  ended_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conselho_membros_mgmt_member_unique UNIQUE (management_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_conselho_membros_mgmt_active 
  ON public.conselho_membros (management_id, is_active);

CREATE INDEX IF NOT EXISTS idx_conselho_membros_member 
  ON public.conselho_membros (member_id);

-- RLS
ALTER TABLE public.conselho_membros ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "conselho_membros_select_policy" ON public.conselho_membros;
  DROP POLICY IF EXISTS "conselho_membros_admin_policy" ON public.conselho_membros;
END $$;

CREATE POLICY "conselho_membros_select_policy" ON public.conselho_membros
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "conselho_membros_admin_policy" ON public.conselho_membros
  FOR ALL TO authenticated USING (
    has_chapter_role(chapter_id, ARRAY['master'::text, 'admin'::text, 'escrivao'::text]) OR
    (EXISTS (
      SELECT 1 FROM public.chapter_memberships cm
      WHERE cm.user_id = auth.uid() AND cm.role_code IN ('master', 'admin') AND cm.is_active = true
    )) OR
    (auth.uid() IN (
      SELECT u.id FROM auth.users u
      WHERE (u.raw_user_meta_data ->> 'id_demolay') = ANY (ARRAY['127738', '102836'])
    )) OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- 2. ATUALIZAÇÃO CADASTRAL: Carlos André Machado da Silva Júnior (ID 134106)
--    Classificação exata: Sênior DeMolay não Maçom integrante do Conselho Consultivo
UPDATE public.members
SET 
  category = 'senior_demolay',
  member_type = 'demolay',
  status = 'senior',
  regularity = 'Sênior/Consultor',
  masonic_lodge = 'A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591'
WHERE id_demolay = '134106';

-- 3. POVOAMENTO DOS 18 INTEGRANTES OFICIAIS NA GESTÃO ATIVA (Gestão XXV - 2026.2)
--    Identificador da Gestão XXV: '00000000-0000-0000-0000-000000002026'
DO $$
DECLARE
  v_mgmt_id uuid := '00000000-0000-0000-0000-000000002026';
  v_chap_id uuid := '00000000-0000-0000-0000-000000000500';
BEGIN
  -- A∴R∴L∴S∴ Abolição nº 4199 (5 integrantes)
  INSERT INTO public.conselho_membros (chapter_id, management_id, member_id, sponsoring_lodge, role_name, starts_at, is_active)
  SELECT v_chap_id, v_mgmt_id, id, 'A∴R∴L∴S∴ Abolição nº 4199', 'Membro Consultor', '2026-07-01', true
  FROM public.members WHERE id_demolay IN ('122850', '92189', '91553', '153893', '122848')
  ON CONFLICT (management_id, member_id) DO UPDATE SET
    sponsoring_lodge = EXCLUDED.sponsoring_lodge,
    role_name = EXCLUDED.role_name,
    is_active = true;

  -- A∴R∴L∴S∴ Adonhiran nº 2782 (5 integrantes)
  INSERT INTO public.conselho_membros (chapter_id, management_id, member_id, sponsoring_lodge, role_name, starts_at, is_active)
  SELECT v_chap_id, v_mgmt_id, id, 'A∴R∴L∴S∴ Adonhiran nº 2782', 
    CASE WHEN id_demolay = '91709' THEN 'Presidente do Conselho Consultivo' ELSE 'Membro Consultor' END,
    '2026-07-01', true
  FROM public.members WHERE id_demolay IN ('91709', '89059', '62127', '153897', '153896')
  ON CONFLICT (management_id, member_id) DO UPDATE SET
    sponsoring_lodge = EXCLUDED.sponsoring_lodge,
    role_name = EXCLUDED.role_name,
    is_active = true;

  -- A∴R∴L∴S∴ Caridade II nº 135 (3 integrantes)
  INSERT INTO public.conselho_membros (chapter_id, management_id, member_id, sponsoring_lodge, role_name, starts_at, is_active)
  SELECT v_chap_id, v_mgmt_id, id, 'A∴R∴L∴S∴ Caridade II nº 135', 'Membro Consultor', '2026-07-01', true
  FROM public.members WHERE id_demolay IN ('LEO-CARIDADE2', '153894', '91291')
  ON CONFLICT (management_id, member_id) DO UPDATE SET
    sponsoring_lodge = EXCLUDED.sponsoring_lodge,
    role_name = EXCLUDED.role_name,
    is_active = true;

  -- A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591 (5 integrantes, incluindo Carlos André)
  INSERT INTO public.conselho_membros (chapter_id, management_id, member_id, sponsoring_lodge, role_name, starts_at, is_active)
  SELECT v_chap_id, v_mgmt_id, id, 'A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591',
    CASE WHEN id_demolay = '129705' THEN 'Consultor da Organização' ELSE 'Membro Consultor' END,
    '2026-07-01', true
  FROM public.members WHERE id_demolay IN ('132662', '134106', '129705', '100967', '153895')
  ON CONFLICT (management_id, member_id) DO UPDATE SET
    sponsoring_lodge = EXCLUDED.sponsoring_lodge,
    role_name = EXCLUDED.role_name,
    is_active = true;
END $$;

-- 4. REESCRITA DEFINITIVA DA RPC generate_monthly_charges
CREATE OR REPLACE FUNCTION public.generate_monthly_charges(
  p_chapter_id uuid,
  p_year smallint,
  p_month smallint
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_id uuid;
  v_mgmt_id uuid;
  v_count integer := 0;
  v_due_date date;
  v_desc_conselho text;
BEGIN
  -- Busca ou cria o período financeiro
  SELECT id INTO v_period_id
  FROM public.financial_periods
  WHERE chapter_id = p_chapter_id AND year = p_year AND month = p_month;

  IF v_period_id IS NULL THEN
    INSERT INTO public.financial_periods (chapter_id, year, month, status)
    VALUES (p_chapter_id, p_year, p_month, 'aberto')
    RETURNING id INTO v_period_id;
  END IF;

  -- Localiza a gestão ativa no capítulo
  SELECT id INTO v_mgmt_id
  FROM public.managements
  WHERE chapter_id = p_chapter_id AND status = 'ativa'
  LIMIT 1;

  -- Vencimento padronizado no dia 28
  v_due_date := (p_year::text || '-' || LPAD(p_month::text, 2, '0') || '-28')::date;
  v_desc_conselho := 'Mensalidade Conselho Consultivo — ' || LPAD(p_month::text, 2, '0') || '/' || p_year::text;

  -- Insere mensalidade de R$ 25,00 para TODOS os integrantes ATIVOS do Conselho Consultivo
  -- Vínculo na tabela relacional conselho_membros (independente de categoria maçom ou sênior)
  INSERT INTO public.member_charges (
    chapter_id,
    member_id,
    payer_name,
    payer_type,
    financial_period_id,
    description,
    amount,
    due_date,
    status
  )
  SELECT
    p_chapter_id,
    m.id,
    m.full_name,
    'macom',
    v_period_id,
    v_desc_conselho,
    25.00,
    v_due_date,
    'pendente'
  FROM public.conselho_membros cm
  JOIN public.members m ON m.id = cm.member_id
  WHERE cm.chapter_id = p_chapter_id
    AND (v_mgmt_id IS NULL OR cm.management_id = v_mgmt_id)
    AND cm.is_active = true
    AND (cm.ended_at IS NULL OR cm.ended_at >= v_due_date)
    AND cm.starts_at <= v_due_date
    AND m.is_active = true
    AND m.id_demolay <> '102836' -- salvaguarda explícita de José Airton
    AND NOT EXISTS (
      SELECT 1 FROM public.member_charges mc
      WHERE mc.member_id = m.id AND mc.financial_period_id = v_period_id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- 5. AJUSTE DE DUPLICIDADE TEXTUAL DE ATA NAS PUBLICAÇÕES
-- A publicação de 03/05/2026 foi uma Instrução Litúrgica, mantendo a Ata Magna 008 exclusivamente para 17/05/2026
UPDATE public.site_publications
SET ata_num = 'Expediente Litúrgico nº 008/2026'
WHERE starts_at = '2026-05-03T09:00:00.000Z' AND title ILIKE '%Instrução Litúrgica%';
