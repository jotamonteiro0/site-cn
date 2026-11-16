-- ==============================================================================
-- Migration 38: conselho_temporal_history_and_charge_modalities.sql
--
-- 1. conselho_membros: Substitui a constraint estática UNIQUE (management_id, member_id)
--    por um índice parcial exclusivo para vínculos ativos:
--    uq_conselho_membros_mgmt_member_active ON (management_id, member_id) WHERE is_active = true.
--    Permite múltiplos períodos de mandato históricos (reingresso) sem sobrescrever dados.
--
-- 2. member_charges: Remove o índice restritivo uq_member_charges_period_member
--    que impedia múltiplas modalidades legítimas na mesma competência (ex: Taxa de Iniciação,
--    Taxa de Elevação, Eventos). A unicidade e idempotência de cada modalidade é
--    assegurada pela constraint nativa UNIQUE (member_id, financial_period_id, description).
--
-- 3. public.generate_monthly_charges:
--    - Proteção de concorrência na criação de financial_periods (ON CONFLICT DO NOTHING).
--    - Autorização interna SECURITY DEFINER baseada em auth.jwt() do PostgREST.
--    - Validação de que o caller pertence à administração do p_chapter_id informado.
--    - Inserção com ON CONFLICT (member_id, financial_period_id, description) DO NOTHING.
-- ==============================================================================

-- 1. Ajuste em conselho_membros para suporte pleno a histórico e reingresso
ALTER TABLE public.conselho_membros
  DROP CONSTRAINT IF EXISTS conselho_membros_mgmt_member_unique;

ALTER TABLE public.conselho_membros
  DROP CONSTRAINT IF EXISTS uq_conselho_membros_mgmt_member;

DROP INDEX IF EXISTS public.uq_conselho_membros_mgmt_member_active;

CREATE UNIQUE INDEX uq_conselho_membros_mgmt_member_active
  ON public.conselho_membros (management_id, member_id)
  WHERE is_active = true;

-- 2. Ajuste em member_charges para suporte pleno a múltiplas modalidades legítimas
DROP INDEX IF EXISTS public.uq_member_charges_period_member;

-- 3. Atualização robusta e concorrente da stored procedure generate_monthly_charges
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
  v_active_mgmt_count integer;
  v_count integer := 0;
  v_due_date date;
  v_desc_conselho text;
BEGIN
  -- 0. Autorização interna rigorosa (SECURITY DEFINER hardening)
  -- Valida o papel e a identidade do usuário da sessão HTTP / PostgREST (auth.jwt())
  -- Usuários com role 'authenticated' ou 'anon' DEVEM ter autorização administrativa no capítulo
  IF coalesce((auth.jwt() ->> 'role'), '') IN ('authenticated', 'anon') THEN
    IF NOT (
      EXISTS (
        SELECT 1 FROM public.chapter_memberships
        WHERE user_id = auth.uid()
          AND chapter_id = p_chapter_id
          AND is_active = true
          AND role_code IN ('master', 'admin', 'tesoureiro', 'escrivao')
      )
      OR (
        p_chapter_id = '00000000-0000-0000-0000-000000000500'::uuid
        AND EXISTS (
          SELECT 1 FROM auth.users
          WHERE id = auth.uid()
            AND (
              raw_user_meta_data->>'id_demolay' IN ('127738', '102836')
              OR email IN ('joaomonteiro0@icloud.com', 'airton@carvalhoneves500.org.br')
            )
        )
      )
    ) THEN
      RAISE EXCEPTION 'Acesso negado: Somente administradores da Tesouraria e Masters podem gerar cobranças para este capítulo.';
    END IF;
  END IF;

  -- 1. Validação estrita da gestão ativa (elimina LIMIT 1 cego)
  SELECT count(*) INTO v_active_mgmt_count
  FROM public.managements
  WHERE chapter_id = p_chapter_id AND status = 'ativa';

  IF v_active_mgmt_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma gestao ativa encontrada para o capitulo %.', p_chapter_id;
  ELSIF v_active_mgmt_count > 1 THEN
    RAISE EXCEPTION 'Multiplas gestoes ativas (%) encontradas para o capitulo %.', v_active_mgmt_count, p_chapter_id;
  END IF;

  SELECT id INTO v_mgmt_id
  FROM public.managements
  WHERE chapter_id = p_chapter_id AND status = 'ativa';

  -- 2. Vencimento padronizado no dia 28 e descrição institucional
  v_due_date := (p_year::text || '-' || LPAD(p_month::text, 2, '0') || '-28')::date;
  v_desc_conselho := 'Mensalidade Conselho Consultivo — ' || LPAD(p_month::text, 2, '0') || '/' || p_year::text;

  -- 3. Busca ou cria o período financeiro de forma atômica e concorrente
  SELECT id INTO v_period_id
  FROM public.financial_periods
  WHERE chapter_id = p_chapter_id AND year = p_year AND month = p_month;

  IF v_period_id IS NULL THEN
    INSERT INTO public.financial_periods (chapter_id, year, month, status)
    VALUES (p_chapter_id, p_year, p_month, 'aberto')
    ON CONFLICT (chapter_id, year, month) DO NOTHING
    RETURNING id INTO v_period_id;

    IF v_period_id IS NULL THEN
      SELECT id INTO v_period_id
      FROM public.financial_periods
      WHERE chapter_id = p_chapter_id AND year = p_year AND month = p_month;
    END IF;
  END IF;

  -- 4. Inserção de R$ 25,00 para os integrantes ATIVOS do Conselho Consultivo
  -- Elegibilidade decorre EXCLUSIVAMENTE do vínculo ativo em conselho_membros.
  -- Classificação: Sênior DeMolay = 'demolay', Maçom = 'macom'.
  -- Idempotência e concorrência garantidas pela constraint nativa (member_id, financial_period_id, description).
  INSERT INTO public.member_charges (
    chapter_id,
    member_id,
    financial_period_id,
    amount,
    due_date,
    status,
    payer_name,
    payer_type,
    description
  )
  SELECT
    p_chapter_id,
    m.id,
    v_period_id,
    25.00,
    v_due_date,
    'pendente',
    m.full_name,
    CASE 
      WHEN m.category = 'macom' THEN 'macom'
      ELSE 'demolay'
    END AS payer_type,
    v_desc_conselho
  FROM public.conselho_membros cm
  JOIN public.members m ON m.id = cm.member_id
  WHERE cm.chapter_id = p_chapter_id
    AND cm.management_id = v_mgmt_id
    AND cm.is_active = true
    AND cm.starts_at <= v_due_date
    AND (cm.ended_at IS NULL OR cm.ended_at >= v_due_date)
  ON CONFLICT (member_id, financial_period_id, description) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Permissões de execução rigorosamente delimitadas
REVOKE EXECUTE ON FUNCTION public.generate_monthly_charges(uuid, smallint, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_monthly_charges(uuid, smallint, smallint) TO authenticated, service_role;
