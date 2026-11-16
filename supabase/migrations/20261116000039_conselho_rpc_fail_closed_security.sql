-- ==============================================================================
-- Migration 39: conselho_rpc_fail_closed_security.sql
--
-- 1. Elimina risco de autorização fail-open em public.generate_monthly_charges:
--    - Adota padrão estritamente fail-closed (bloqueia qualquer chamada sem credencial explícita).
--    - Rejeita chamadas com JWT nulo ou inválido em conexões PostgREST/web.
--    - Rejeita chamadas com auth.uid() nulo ou claim 'role' inesperado.
--    - Rejeita manipulação de p_chapter_id para capítulos aos quais o usuário não pertence.
--
-- 2. Integração Canônica com RBAC Oficial:
--    - Remove listas estáticas hardcoded de IDs DeMolay e e-mails do corpo da função.
--    - Consulta exclusivamente a fonte oficial de verdade: public.chapter_memberships
--      (onde João Guilherme [ID 127738] e José Airton [ID 102836] possuem role_code = 'master')
--      e a ocupação executiva de Tesoureiro/Mestre Conselheiro na gestão ativa do capítulo.
--
-- 3. Delimitação de Menor Privilégio:
--    - Remove a permissão indevida de 'escrivao' para geração financeira,
--      restringindo a autorização estritamente a 'master', 'admin' e 'tesoureiro'
--      em estrita consonância com as RLS policies de member_charges e financial_periods.
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
  -- 0. Autorização estrita e fail-closed (SECURITY DEFINER hardening)
  v_req_role := coalesce(nullif(current_setting('role', true), 'none'), (auth.jwt() ->> 'role'), '');

  IF v_req_role = 'service_role' OR (session_user = 'postgres' AND v_req_role = '') THEN
    -- Acesso administrativo autorizado (sistema/manutenção interna ou service_role)
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
