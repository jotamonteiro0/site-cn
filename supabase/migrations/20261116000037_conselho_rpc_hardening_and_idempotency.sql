-- ==============================================================================
-- Migração 37: Ajustes Técnicos, Idempotência e Hardening do Conselho Consultivo
-- Capítulo Professor Carvalho Neves Nº 500
-- ==============================================================================
-- 1. Criação de índice único parcial em member_charges (financial_period_id, member_id)
--    garantindo idempotência física e proteção contra concorrência sem alterar histórico.
-- 2. Constraint de consistência de datas em conselho_membros (ended_at >= starts_at).
-- 3. Atualização cadastral da cobrança de Carlos André (ID 134106) para payer_type = 'demolay'.
-- 4. Reescrita da RPC generate_monthly_charges:
--    - Remoção da exceção individual por ID (m.id_demolay <> '102836');
--    - Classificação correta de pagador (demolay para não Maçons);
--    - Validação de unicidade e consistência da gestão ativa (sem LIMIT 1 cego);
--    - Checagem temporal estrita de vínculos (is_active, starts_at e ended_at);
--    - Inserção atômica com ON CONFLICT ... DO NOTHING;
--    - Restrição de execução a perfis administrativos (REVOKE anon/PUBLIC).
-- ==============================================================================

-- 1. PROTEÇÃO DE CONCORRÊNCIA E IDEMPOTÊNCIA EM COBRANÇAS
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_charges_period_member
ON public.member_charges (financial_period_id, member_id)
WHERE member_id IS NOT NULL;

-- 2. CONSISTÊNCIA TEMPORAL DE VÍNCULOS NO CONSELHO CONSULTIVO
ALTER TABLE public.conselho_membros
DROP CONSTRAINT IF EXISTS chk_conselho_membros_dates;

ALTER TABLE public.conselho_membros
ADD CONSTRAINT chk_conselho_membros_dates
CHECK (ended_at IS NULL OR ended_at >= starts_at);

-- 3. CLASSIFICAÇÃO CORRETA DE PAGADOR PARA CARLOS ANDRÉ (SÊNIOR DEMOLAY NÃO MAÇOM)
UPDATE public.member_charges
SET payer_type = 'demolay'
WHERE member_id = (SELECT id FROM public.members WHERE id_demolay = '134106')
  AND payer_type = 'macom';

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
  v_active_mgmt_count integer;
  v_count integer := 0;
  v_due_date date;
  v_desc_conselho text;
BEGIN
  -- 0. Autorização: Apenas administradores do capítulo ou service_role/postgres
  IF current_user NOT IN ('postgres', 'service_role') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.chapter_memberships
      WHERE user_id = auth.uid()
        AND chapter_id = p_chapter_id
        AND is_active = true
        AND role_code IN ('master', 'admin', 'tesoureiro', 'escrivao')
    ) AND NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND (
          raw_user_meta_data->>'id_demolay' IN ('127738', '102836')
          OR email IN ('joaomonteiro0@icloud.com', 'airton@carvalhoneves500.org.br')
        )
    ) THEN
      RAISE EXCEPTION 'Acesso negado: Somente administradores da Tesouraria e Masters podem gerar cobranças.';
    END IF;
  END IF;

  -- 1. Validação estrita e inequívoca da gestão ativa do capítulo
  SELECT count(*) INTO v_active_mgmt_count
  FROM public.managements
  WHERE chapter_id = p_chapter_id AND status = 'ativa';

  IF v_active_mgmt_count = 0 THEN
    RAISE EXCEPTION 'Capítulo % não possui nenhuma gestão com status ativo cadastrada.', p_chapter_id;
  ELSIF v_active_mgmt_count > 1 THEN
    RAISE EXCEPTION 'Capítulo % possui mais de uma gestão ativa (% gestões em duplicidade). Inconsistência de integridade.', p_chapter_id, v_active_mgmt_count;
  END IF;

  -- Seleciona a gestão ativa comprovadamente única
  SELECT id INTO v_mgmt_id
  FROM public.managements
  WHERE chapter_id = p_chapter_id AND status = 'ativa';

  -- 2. Vencimento padronizado no dia 28 e descrição institucional
  v_due_date := (p_year::text || '-' || LPAD(p_month::text, 2, '0') || '-28')::date;
  v_desc_conselho := 'Mensalidade Conselho Consultivo — ' || LPAD(p_month::text, 2, '0') || '/' || p_year::text;

  -- 3. Busca ou cria o período financeiro
  SELECT id INTO v_period_id
  FROM public.financial_periods
  WHERE chapter_id = p_chapter_id AND year = p_year AND month = p_month;

  IF v_period_id IS NULL THEN
    INSERT INTO public.financial_periods (chapter_id, year, month, status)
    VALUES (p_chapter_id, p_year, p_month, 'aberto')
    RETURNING id INTO v_period_id;
  END IF;

  -- 4. Insere mensalidade de R$ 25,00 para TODOS os integrantes ATIVOS do Conselho Consultivo
  -- A elegibilidade decorre EXCLUSIVAMENTE do vínculo ativo em conselho_membros.
  -- Carlos André é classificado fielmente como 'demolay' e Maçons como 'macom'.
  -- Proteção concorrente atômica via ON CONFLICT ... DO NOTHING.
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
    END,
    v_desc_conselho
  FROM public.conselho_membros cm
  JOIN public.members m ON m.id = cm.member_id
  WHERE cm.chapter_id = p_chapter_id
    AND cm.is_active = true
    AND cm.management_id = v_mgmt_id
    AND cm.starts_at <= v_due_date
    AND (cm.ended_at IS NULL OR cm.ended_at >= v_due_date)
    AND NOT EXISTS (
      SELECT 1 FROM public.member_charges mc
      WHERE mc.financial_period_id = v_period_id
        AND mc.member_id = m.id
    )
  ON CONFLICT (financial_period_id, member_id) WHERE member_id IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5. PERMISSÕES DE EXECUÇÃO RESTRITAS
REVOKE EXECUTE ON FUNCTION public.generate_monthly_charges(uuid, smallint, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_monthly_charges(uuid, smallint, smallint) TO authenticated, service_role;
