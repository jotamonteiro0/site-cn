-- -------------------------------------------------------------
-- MIGRATION: PROTEÇÃO CONTRA EXCLUSÃO DE MESES E IDEMPOTÊNCIA
-- 1. Impede a exclusão de períodos financeiros que contêm lançamentos
-- 2. Impede a exclusão de mensalidades já quitadas e confirmadas
-- 3. Previne duplicações em generate_monthly_charges
-- -------------------------------------------------------------

-- 1. Trigger de proteção contra exclusão de períodos com mensalidades
create or replace function public.prevent_delete_populated_period()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.member_charges where financial_period_id = old.id) then
    raise exception 'Operação não permitida: Não é possível apagar um período financeiro que possui mensalidades vinculadas.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_delete_populated_period on public.financial_periods;
create trigger trg_prevent_delete_populated_period
before delete on public.financial_periods
for each row execute function public.prevent_delete_populated_period();

-- 2. Trigger de proteção contra exclusão de mensalidades quitadas
create or replace function public.prevent_delete_confirmed_charge()
returns trigger language plpgsql as $$
begin
  if old.status = 'confirmado' then
    raise exception 'Operação não permitida: Não é possível excluir uma mensalidade já quitada e confirmada.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_delete_confirmed_charge on public.member_charges;
create trigger trg_prevent_delete_confirmed_charge
before delete on public.member_charges
for each row execute function public.prevent_delete_confirmed_charge();

-- 3. Atualiza generate_monthly_charges com verificação estrita de unicidade
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
  v_desc_macom := 'Mensalidade Maçom — ' || lpad(p_month::text, 2, '0') || '/' || p_year::text;

  -- Insere cobrança de R$ 22,00 para cada DeMolay Ativo caso ainda não possua cobrança no período
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
    and m.is_active = true
    and not exists (
      select 1 from public.member_charges mc
      where mc.member_id = m.id and mc.financial_period_id = v_period_id
    );

  -- Insere cobrança de R$ 25,00 para cada Tio Maçom caso ainda não possua cobrança no período
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
    'macom',
    v_period_id,
    v_desc_macom,
    25.00,
    v_due_date,
    'pendente'
  from public.members m
  where m.chapter_id = p_chapter_id
    and m.category = 'macom'
    and m.is_active = true
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
