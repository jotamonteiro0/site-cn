-- ==============================================================================
-- Migração 34: Regra Estrita de Mensalidades para Tios Maçons e Conselho Consultivo
-- Capítulo Professor Carvalho Neves Nº 500
-- ==============================================================================
-- Regra de Negócio Institucional:
-- 1. Tio Maçom SOMENTE deve pagar mensalidade quando fizer parte do Conselho Consultivo.
-- 2. Tios Maçons que não integram o Conselho Consultivo são ISENTOS de mensalidades.
-- 3. José Airton Rodrigues Galdino Júnior (ID 102836) é Sênior DeMolay e Maçom,
--    NÃO integra o Conselho Consultivo e, portanto, é ISENTO de mensalidade.
-- 4. A fonte oficial de verdade para determinar integrantes do Conselho Consultivo
--    é a designação em cargos do Conselho na Gestão Ativa (tabela member_management_positions
--    vinculada a management_positions do Conselho na gestão com status = 'ativa').
-- ==============================================================================

create or replace function public.generate_monthly_charges(
  p_chapter_id uuid,
  p_year smallint,
  p_month smallint
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_id uuid;
  v_count integer := 0;
  v_due_date date;
  v_desc_demolay text;
  v_desc_macom text;
begin
  -- Busca ou cria o período financeiro
  select id into v_period_id
  from public.financial_periods
  where chapter_id = p_chapter_id and year = p_year and month = p_month;

  if v_period_id is null then
    insert into public.financial_periods (chapter_id, year, month, status)
    values (p_chapter_id, p_year, p_month, 'aberto')
    returning id into v_period_id;
  end if;

  -- Vencimento padronizado no dia 28 (final do mês)
  v_due_date := (p_year::text || '-' || lpad(p_month::text, 2, '0') || '-28')::date;
  v_desc_demolay := 'Mensalidade DeMolay — ' || lpad(p_month::text, 2, '0') || '/' || p_year::text;
  v_desc_macom := 'Mensalidade Maçom (Conselho Consultivo) — ' || lpad(p_month::text, 2, '0') || '/' || p_year::text;

  -- 1. Insere cobrança de R$ 22,00 para cada DeMolay Ativo
  -- Exclui expressamente Sêniores e mantenedores permanentes não ativos (ex: ID 102836)
  insert into public.member_charges (
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
  select
    p_chapter_id,
    m.id,
    m.full_name,
    'demolay',
    v_period_id,
    v_desc_demolay,
    22.00,
    v_due_date,
    'pendente'
  from public.members m
  where m.chapter_id = p_chapter_id
    and m.category = 'demolay_ativo'
    and m.id_demolay <> '102836'
    and m.is_active = true
    and not exists (
      select 1 from public.member_charges mc
      where mc.member_id = m.id and mc.financial_period_id = v_period_id
    );

  -- 2. Insere cobrança de R$ 25,00 para integrantes do Conselho Consultivo (Tios Maçons e Seniores DeMolay)
  -- REGRA OBRIGATÓRIA: Somente integrantes ativos do Conselho Consultivo pagam mensalidade de conselheiro
  insert into public.member_charges (
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
  select
    p_chapter_id,
    m.id,
    m.full_name,
    case when m.category = 'senior_demolay' or m.member_type = 'senior' then 'senior' else 'macom' end,
    v_period_id,
    case when m.category = 'senior_demolay' or m.member_type = 'senior'
      then 'Mensalidade Sênior (Conselho Consultivo) — ' || lpad(p_month::text, 2, '0') || '/' || p_year::text
      else 'Mensalidade Maçom (Conselho Consultivo) — ' || lpad(p_month::text, 2, '0') || '/' || p_year::text
    end,
    25.00,
    v_due_date,
    'pendente'
  from public.members m
  where m.chapter_id = p_chapter_id
    and (m.category in ('macom', 'senior_demolay') or m.member_type in ('macom', 'senior'))
    and m.id_demolay <> '102836'
    and m.is_active = true
    and exists (
      -- Fonte da verdade: Vínculo ativo em cargo do Conselho Consultivo na gestão ativa
      select 1 from public.member_management_positions mmp
      join public.management_positions mp on mp.id = mmp.management_position_id
      join public.managements mg on mg.id = mp.management_id
      where mmp.member_id = m.id
        and mg.chapter_id = p_chapter_id
        and mg.status = 'ativa'
        and (
          mp.name ilike '%Conselho%' or
          mp.name ilike '%Consultor%' or
          mp.name in ('Presidente do Conselho Consultivo', 'Consultor da Organização')
        )
    )
    and not exists (
      select 1 from public.member_charges mc
      where mc.member_id = m.id and mc.financial_period_id = v_period_id
    );

  select count(*) into v_count
  from public.member_charges
  where financial_period_id = v_period_id;

  return v_count;
end;
$$;
