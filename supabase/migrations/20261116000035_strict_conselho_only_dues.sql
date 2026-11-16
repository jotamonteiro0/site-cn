-- ==============================================================================
-- Migração 35: Regra Estrita Institucional de Mensalidades — Tesouraria CN
-- Capítulo Professor Carvalho Neves Nº 500
-- ==============================================================================
-- REGRA INSTITUCIONAL DEFINITIVA:
-- SOMENTE OS MAÇONS QUE PERTENCEM AO CONSELHO CONSULTIVO PAGAM A MENSALIDADE.
-- 1. Maçons que integram efetivamente o Conselho Consultivo e possuem vínculo ativo:
--    devem constar na relação de mensalidades (R$ 25,00 / vencimento dia 28).
-- 2. Maçons que não integram o Conselho Consultivo: NÃO devem constar.
-- 3. DeMolays Ativos: NÃO devem constar.
-- 4. Seniores DeMolay: NÃO devem constar.
-- 5. Membros irregulares ou inativos: NÃO devem constar.
-- 6. José Airton Rodrigues Galdino Júnior (ID 102836): NÃO recebe mensalidade.
-- 7. Histórico financeiro: preservação integral de todos os 382 registros existentes.
-- ==============================================================================

-- 1. Atualização do cadastro de José Airton no PostgreSQL (caso ainda não consolidado)
UPDATE public.members
SET 
  full_name = 'José Airton Rodrigues Galdino Júnior',
  category = 'senior_demolay',
  member_type = 'demolay',
  status = 'senior',
  regularity = 'Sênior',
  masonic_lodge = 'A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591'
WHERE id_demolay = '102836' OR id = 'f9893a64-cf27-43c2-bd0f-617091c00ee5';

-- 2. Nova RPC generate_monthly_charges
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
  v_count integer := 0;
  v_due_date date;
  v_desc_macom text;
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

  -- Vencimento padronizado no dia 28 (final do mês)
  v_due_date := (p_year::text || '-' || LPAD(p_month::text, 2, '0') || '-28')::date;
  v_desc_macom := 'Mensalidade Maçom (Conselho Consultivo) — ' || LPAD(p_month::text, 2, '0') || '/' || p_year::text;

  -- Insere mensalidade de R$ 25,00 EXCLUSIVAMENTE para Maçons que integram o Conselho Consultivo
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
    v_desc_macom,
    25.00,
    v_due_date,
    'pendente'
  FROM public.members m
  WHERE m.chapter_id = p_chapter_id
    AND m.category = 'macom'
    AND m.is_active = true
    AND m.id_demolay <> '102836'
    AND EXISTS (
      -- Fonte oficial de verdade: Vínculo ativo em cargo do Conselho Consultivo na gestão ativa
      SELECT 1 FROM public.member_management_positions mmp
      JOIN public.management_positions mp ON mp.id = mmp.management_position_id
      JOIN public.managements mg ON mg.id = mp.management_id
      WHERE mmp.member_id = m.id
        AND mg.chapter_id = p_chapter_id
        AND mg.status = 'ativa'
        AND (
          mp.name ILIKE '%Conselho%' OR
          mp.name ILIKE '%Consultor%' OR
          mp.name IN ('Presidente do Conselho Consultivo', 'Consultor da Organização')
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.member_charges mc
      WHERE mc.member_id = m.id AND mc.financial_period_id = v_period_id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;
