-- ==============================================================================
-- Migration 40: conselho_rpc_chapter_500_scope_enforcement.sql
--
-- 1. Delimitação Universal de Escopo Institucional (Capítulo 500 Exclusivo):
--    - Bloqueia universalmente qualquer execução da RPC public.generate_monthly_charges
--      com p_chapter_id diferente de '00000000-0000-0000-0000-000000000500'.
--    - A restrição é aplicada antes e independentemente de qualquer branch privilegiado
--      (service_role ou session_user = 'postgres'), eliminando qualquer possibilidade
--      de operações fora do escopo institucional autorizado.
--
-- 2. Preserva integralmente:
--    - Modelo fail-closed estrito estabelecido na Migration 39.
--    - Validação relacional RBAC para usuários autenticados via public.chapter_memberships.
--    - Exclusão estrita do cargo de Escrivão da autorização financeira.
--    - Regra de mensalidades de R$ 25,00 para os 18 integrantes ativos de conselho_membros.
--    - 382 cobranças históricas existentes intactas.
-- ==============================================================================

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
  v_req_role text;
  v_period_id uuid;
  v_mgmt_id uuid;
  v_active_mgmt_count integer;
  v_count integer := 0;
  v_due_date date;
  v_desc_conselho text;
BEGIN
  -- -1. Delimitação estrita de escopo institucional do sistema (Capítulo 500 exclusivo)
  -- Nenhuma chamada, mesmo sob service_role ou postgres superuser, pode operar fora do Capítulo 500.
  IF p_chapter_id IS NULL OR p_chapter_id <> '00000000-0000-0000-0000-000000000500'::uuid THEN
    RAISE EXCEPTION 'Acesso negado: Este sistema e exclusivo do Capitulo Professor Carvalho Neves nº 500 (chapter_id invalido: %).', p_chapter_id;
  END IF;

  -- 0. Autorização estrita e fail-closed (SECURITY DEFINER hardening)
  v_req_role := coalesce(nullif(current_setting('role', true), 'none'), (auth.jwt() ->> 'role'), '');

  IF v_req_role = 'service_role' OR (session_user = 'postgres' AND v_req_role = '') THEN
    -- Acesso administrativo autorizado exclusivamente para rotinas internas do Capítulo 500
    NULL;
  ELSIF v_req_role = 'authenticated' AND auth.uid() IS NOT NULL THEN
    -- Validação estrita de autorização do usuário no capítulo informado via RBAC canônico
    -- Sem IDs ou e-mails hardcoded no código
    IF NOT (
      EXISTS (
        SELECT 1 FROM public.chapter_memberships
        WHERE user_id = auth.uid()
          AND chapter_id = p_chapter_id
          AND is_active = true
          AND role_code IN ('master', 'admin', 'tesoureiro')
      )
      OR EXISTS (
        SELECT 1
        FROM public.member_management_positions mmp
        JOIN public.management_positions mp ON mp.id = mmp.management_position_id
        JOIN public.managements mg ON mg.id = mp.management_id
        JOIN public.members m ON m.id = mmp.member_id
        WHERE mg.chapter_id = p_chapter_id
          AND mg.status = 'ativa'
          AND m.profile_id = auth.uid()
          AND mp.name IN ('Tesoureiro', 'Mestre Conselheiro')
      )
    ) THEN
      RAISE EXCEPTION 'Acesso negado: Somente administradores da Tesouraria e Masters podem gerar cobranças para este capítulo.';
    END IF;
  ELSE
    -- Padrão fail-closed: qualquer outro caminho (anon, JWT ausente fora de superuser, uid nulo, role desconhecida, etc.)
    RAISE EXCEPTION 'Acesso negado: Somente administradores da Tesouraria e Masters podem gerar cobranças para este capítulo.';
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
