-- -------------------------------------------------------------
-- MIGRATION: RLS PARA MÓDULO DE TESOURARIA E PERÍODOS FINANCEIROS
-- 1. Políticas RLS para visualização e gestão de financial_periods
-- 2. Políticas RLS para contas, categorias, transações e demonstrativos financeiros
-- 3. Vinculação histórica de mensalidades a períodos vigentes
-- -------------------------------------------------------------

-- 1. Políticas de RLS para financial_periods
drop policy if exists "chapter members read financial periods" on public.financial_periods;
create policy "chapter members read financial periods"
  on public.financial_periods for select
  to authenticated
  using (is_chapter_member(chapter_id));

drop policy if exists "staff manage financial periods" on public.financial_periods;
create policy "staff manage financial periods"
  on public.financial_periods for all
  to authenticated
  using (has_chapter_role(chapter_id, array['master', 'tesoureiro']))
  with check (has_chapter_role(chapter_id, array['master', 'tesoureiro']));

-- 2. Políticas de RLS para financial_accounts
drop policy if exists "staff manage financial accounts" on public.financial_accounts;
create policy "staff manage financial accounts"
  on public.financial_accounts for all
  to authenticated
  using (has_chapter_role(chapter_id, array['master', 'tesoureiro']))
  with check (has_chapter_role(chapter_id, array['master', 'tesoureiro']));

-- 3. Políticas de RLS para financial_categories
drop policy if exists "chapter members read financial categories" on public.financial_categories;
create policy "chapter members read financial categories"
  on public.financial_categories for select
  to authenticated
  using (is_chapter_member(chapter_id));

drop policy if exists "staff manage financial categories" on public.financial_categories;
create policy "staff manage financial categories"
  on public.financial_categories for all
  to authenticated
  using (has_chapter_role(chapter_id, array['master', 'tesoureiro']))
  with check (has_chapter_role(chapter_id, array['master', 'tesoureiro']));

-- 4. Políticas de RLS para financial_transactions
drop policy if exists "staff manage financial transactions" on public.financial_transactions;
create policy "staff manage financial transactions"
  on public.financial_transactions for all
  to authenticated
  using (has_chapter_role(chapter_id, array['master', 'tesoureiro']))
  with check (has_chapter_role(chapter_id, array['master', 'tesoureiro']));

-- 5. Políticas de RLS para financial_statements
drop policy if exists "staff manage financial statements" on public.financial_statements;
create policy "staff manage financial statements"
  on public.financial_statements for all
  to authenticated
  using (has_chapter_role(chapter_id, array['master', 'tesoureiro']))
  with check (has_chapter_role(chapter_id, array['master', 'tesoureiro']));

-- 6. Políticas de RLS para chapter_fees
drop policy if exists "chapter members read chapter fees" on public.chapter_fees;
create policy "chapter members read chapter fees"
  on public.chapter_fees for select
  to authenticated
  using (is_chapter_member(chapter_id));

drop policy if exists "staff manage chapter fees" on public.chapter_fees;
create policy "staff manage chapter fees"
  on public.chapter_fees for all
  to authenticated
  using (has_chapter_role(chapter_id, array['master', 'tesoureiro']))
  with check (has_chapter_role(chapter_id, array['master', 'tesoureiro']));

-- 7. Vinculação de cobranças históricas a períodos financeiros
update public.member_charges mc
set financial_period_id = fp.id
from public.financial_periods fp
where mc.financial_period_id is null
  and extract(year from mc.due_date)::int = fp.year
  and extract(month from mc.due_date)::int = fp.month
  and fp.chapter_id = mc.chapter_id;

-- 8. Notifica o PostgREST para recarregar o schema cache
notify pgrst, 'reload schema';
