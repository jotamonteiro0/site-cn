-- ====================================================================
-- MIGRATION 20261110000011: CORREÇÃO DAS MENSALIDADES E DATAS DE VENCIMENTO
-- DeMolay Ativo: R$ 22,00
-- Tio Maçom / Consultor: R$ 25,00
-- Vencimento Padrão: Todo dia 28 de cada mês (final do mês)
-- ====================================================================

-- 1. Atualiza tabela de taxas do capítulo (chapter_fees)
update public.chapter_fees
set amount = 22.00
where chapter_id = '00000000-0000-0000-0000-000000000500'
  and payer_type = 'demolay'
  and name ilike '%mensalidade%';

insert into public.chapter_fees (chapter_id, name, payer_type, amount, starts_on, is_active)
values
  ('00000000-0000-0000-0000-000000000500', 'Mensalidade Tio Maçom', 'macom', 25.00, '2025-01-01', true)
on conflict do nothing;

-- 2. Adiciona colunas para InfinitePay e Webhook se não existirem
alter table public.member_charges add column if not exists infinitepay_transaction_id text;
alter table public.member_charges add column if not exists payment_method text default 'pix';

-- 3. Atualiza função de geração mensal de cobranças
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

  -- Insere cobrança de R$ 22,00 para cada DeMolay Ativo
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
  on conflict (member_id, financial_period_id, description)
  do update set
    amount = 22.00,
    due_date = excluded.due_date;

  -- Insere cobrança de R$ 25,00 para cada Tio Maçom
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
  on conflict (member_id, financial_period_id, description)
  do update set
    amount = 25.00,
    due_date = excluded.due_date;

  select count(*) into v_count
  from public.member_charges
  where financial_period_id = v_period_id;

  return v_count;
end;
$$;

-- 4. Atualiza as cobranças de Novembro/2026 já geradas
update public.member_charges
set
  amount = 22.00,
  due_date = '2026-11-28',
  description = 'Mensalidade DeMolay — 11/2026'
where payer_type = 'demolay'
  and description ilike '%11/2026%';

-- 5. Executa a geração para Novembro/2026 para incluir os Maçons (R$ 25,00) e DeMolays (R$ 22,00)
select public.generate_monthly_charges(
  '00000000-0000-0000-0000-000000000500'::uuid,
  2026::smallint,
  11::smallint
);
