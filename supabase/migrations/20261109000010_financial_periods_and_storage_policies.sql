-- ============================================================================
-- MIGRATION: SEED DE PERÍODOS FINANCEIROS, POLÍTICAS DE STORAGE E GERAÇÃO DE MENSALIDADES
-- ============================================================================

-- 1. Políticas de Leitura e Gestão para Buckets Privados do Storage
create policy "authenticated read private buckets"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('membros', 'documentos', 'comprovantes', 'solicitacoes', 'declaracoes'));

create policy "authenticated staff delete objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('membros', 'documentos', 'comprovantes', 'solicitacoes', 'declaracoes')
    and (owner_id = auth.uid()::text or exists (
      select 1 from public.chapter_memberships cm
      where cm.user_id = auth.uid() and cm.is_active and cm.role_code in ('master', 'escrivao', 'tesoureiro')
    ))
  );

-- 2. Seed dos Períodos Financeiros de 2025 e 2026 para o Capítulo 500
insert into public.financial_periods (chapter_id, year, month, status)
values
  ('00000000-0000-0000-0000-000000000500', 2025, 1, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 2, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 3, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 4, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 5, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 6, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 7, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 8, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 9, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 10, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 11, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2025, 12, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 1, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 2, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 3, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 4, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 5, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 6, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 7, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 8, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 9, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 10, 'fechado'),
  ('00000000-0000-0000-0000-000000000500', 2026, 11, 'aberto'),
  ('00000000-0000-0000-0000-000000000500', 2026, 12, 'aberto')
on conflict (chapter_id, year, month) do nothing;

-- 3. Procedure para Gerar Mensalidades de R$ 50,00 para todos os DeMolays Ativos
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
  v_desc text;
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

  v_due_date := (p_year::text || '-' || lpad(p_month::text, 2, '0') || '-10')::date;
  v_desc := 'Mensalidade Capitular — ' || lpad(p_month::text, 2, '0') || '/' || p_year::text;

  -- Insere cobrança de R$ 50,00 para cada DeMolay Ativo
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
    v_desc,
    50.00,
    v_due_date,
    'pendente'
  from public.members m
  where m.chapter_id = p_chapter_id
    and m.category = 'demolay_ativo'
    and m.is_active = true
  on conflict (member_id, financial_period_id, description) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
