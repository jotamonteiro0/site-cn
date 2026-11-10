-- ============================================================================
-- MIGRATION: BACKEND COMPLETO DO SISTEMA CN (CAPÍTULO PROFESSOR CARVALHO NEVES Nº 500)
-- 1. Financeiro, InfinitePay, Mensalidades e Taxas do GCE
-- 2. Categorias e Políticas de Documentos Oficiais
-- 3. Categorias de Solicitações (Ouvidoria direcionada a MC, PCC, Escrivão, Tesoureiro)
-- 4. Sistema de Emissão de Declarações (Frequência e Quitação)
-- 5. Views de Maioridade aos 21 anos e Calendário de Aniversários
-- 6. Função de Frequência Individual por Período
-- 7. Permissões de RSVP para Membros
-- ============================================================================

-- 1. FINANCEIRO & INFINITEPAY
-- Contas financeiras padrão do Capítulo
insert into public.financial_accounts (chapter_id, name, account_type, is_active)
values
  ('00000000-0000-0000-0000-000000000500', 'Caixa Geral Capitular', 'caixa', true),
  ('00000000-0000-0000-0000-000000000500', 'Conta InfinitePay (PIX / Cartão)', 'banco', true)
on conflict (chapter_id, name) do nothing;

-- Categorias de Receitas e Despesas
insert into public.financial_categories (chapter_id, name, category_type)
values
  ('00000000-0000-0000-0000-000000000500', 'Mensalidade Capitular', 'receita'),
  ('00000000-0000-0000-0000-000000000500', 'Taxa de Iniciação', 'receita'),
  ('00000000-0000-0000-0000-000000000500', 'Taxa de Elevação', 'receita'),
  ('00000000-0000-0000-0000-000000000500', 'Doações & Patrocínios', 'receita'),
  ('00000000-0000-0000-0000-000000000500', 'Repasse GCE / Regularização Estadual', 'despesa'),
  ('00000000-0000-0000-0000-000000000500', 'Manutenção e Conservação de Templo', 'despesa'),
  ('00000000-0000-0000-0000-000000000500', 'Lanches & Confraternizações', 'despesa'),
  ('00000000-0000-0000-0000-000000000500', 'Filantropia & Ações Sociais', 'despesa')
on conflict (chapter_id, name, category_type) do nothing;

-- Tabela de Taxas Vigentes
insert into public.chapter_fees (chapter_id, name, payer_type, amount, starts_on, is_active)
values
  ('00000000-0000-0000-0000-000000000500', 'Mensalidade DeMolay Ativo', 'demolay', 50.00, '2025-01-01', true),
  ('00000000-0000-0000-0000-000000000500', 'Taxa de Regularidade GCE (Anual)', 'demolay', 120.00, '2025-01-01', true)
on conflict do nothing;

-- Campos adicionais para InfinitePay e PIX em member_charges
alter table public.member_charges add column if not exists infinitepay_checkout_url text;
alter table public.member_charges add column if not exists pix_qrcode_payload text;
alter table public.member_charges add column if not exists pix_qrcode_image text;
alter table public.member_charges add column if not exists paid_at timestamptz;

-- Permissões de RLS para Finanças
create policy "Tesoureiro e Master gerenciam cobrancas"
  on public.member_charges for all
  to authenticated
  using (has_chapter_role(chapter_id, array['master', 'tesoureiro']))
  with check (has_chapter_role(chapter_id, array['master', 'tesoureiro']));

create policy "Membro visualiza suas proprias cobrancas"
  on public.member_charges for select
  to authenticated
  using (exists (
    select 1 from public.members m
    where m.id = member_charges.member_id and m.profile_id = auth.uid()
  ));

create policy "Membro pode anexar comprovante de pagamento"
  on public.payment_proofs for insert
  to authenticated
  with check (true);

create policy "Membros autorizados visualizam comprovantes"
  on public.payment_proofs for select
  to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.payments p
      where p.id = payment_proofs.payment_id
      and has_chapter_role(p.chapter_id, array['master', 'tesoureiro'])
    )
  );


-- 2. DOCUMENTOS OFICIAIS & ATAS
insert into public.document_categories (chapter_id, name, is_public)
values
  ('00000000-0000-0000-0000-000000000500', 'Atos da Gestão', false),
  ('00000000-0000-0000-0000-000000000500', 'Editais & Convocatórias', true),
  ('00000000-0000-0000-0000-000000000500', 'Atas de Sessões', false),
  ('00000000-0000-0000-0000-000000000500', 'Ofícios & Circulares', false),
  ('00000000-0000-0000-0000-000000000500', 'Regimento Interno & Estatuto', true)
on conflict (chapter_id, name) do nothing;

create policy "Membros autenticados leem documentos do capitulo"
  on public.documents for select
  to authenticated
  using (true);

create policy "Master e Escrivao gerenciam documentos"
  on public.documents for all
  to authenticated
  using (has_chapter_role(chapter_id, array['master', 'escrivao']))
  with check (has_chapter_role(chapter_id, array['master', 'escrivao']));

create policy "Membros autenticados leem versoes de documentos"
  on public.document_versions for select
  to authenticated
  using (true);

create policy "Master e Escrivao gerenciam versoes de documentos"
  on public.document_versions for all
  to authenticated
  using (exists (
    select 1 from public.documents d
    where d.id = document_versions.document_id
    and has_chapter_role(d.chapter_id, array['master', 'escrivao'])
  ))
  with check (exists (
    select 1 from public.documents d
    where d.id = document_versions.document_id
    and has_chapter_role(d.chapter_id, array['master', 'escrivao'])
  ));


-- 3. CATEGORIAS DE SOLICITAÇÃO (OUVIDORIA DIRECIONADA)
insert into public.request_categories (chapter_id, name, target_role)
values
  ('00000000-0000-0000-0000-000000000500', 'Solicitação de Declaração de Frequência', 'escrivao'),
  ('00000000-0000-0000-0000-000000000500', 'Solicitação de Declaração de Quitação com a Tesouraria', 'tesoureiro'),
  ('00000000-0000-0000-0000-000000000500', 'Orientação Fraternal / Assunto Pessoal (MC e PCC)', 'master'),
  ('00000000-0000-0000-0000-000000000500', 'Sugestão ou Proposta de Pauta Capitular', 'master')
on conflict (chapter_id, name) do nothing;


-- 4. EMISSÃO DE DECLARAÇÕES OFICIAIS (FREQUÊNCIA E QUITAÇÃO)
create table if not exists public.issued_declarations (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id),
  member_id uuid not null references public.members(id),
  declaration_type text not null check(declaration_type in ('frequencia', 'quitacao_tesouraria')),
  verification_code text not null unique default ('CN-DECL-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8))),
  issued_by uuid references public.profiles(id),
  period_start date,
  period_end date,
  content_data jsonb not null default '{}'::jsonb,
  storage_path text,
  valid_until date not null default (current_date + interval '90 days'),
  created_at timestamptz not null default now()
);

alter table public.issued_declarations enable row level security;

create policy "Membro visualiza suas proprias declaracoes"
  on public.issued_declarations for select
  to authenticated
  using (
    has_chapter_role(chapter_id, array['master', 'escrivao', 'tesoureiro'])
    or exists (
      select 1 from public.members m
      where m.id = issued_declarations.member_id and m.profile_id = auth.uid()
    )
  );

create policy "Staff emite declaracoes"
  on public.issued_declarations for insert
  to authenticated
  with check (has_chapter_role(chapter_id, array['master', 'escrivao', 'tesoureiro']));


-- 5. VIEWS DE MAIORIDADE E ANIVERSÁRIOS
-- View para controle de maioridade (21 anos do DeMolay)
create or replace view public.view_member_majority_status as
select
  m.id as member_id,
  m.cid,
  m.full_name,
  m.category,
  m.birth_date,
  case
    when m.birth_date is null then null
    else date_part('year', age(current_date, m.birth_date))::int
  end as current_age,
  case
    when m.birth_date is null then null
    else (m.birth_date + interval '21 years')::date
  end as majority_date,
  case
    when m.birth_date is null then null
    when (m.birth_date + interval '21 years')::date <= current_date then true
    else false
  end as is_major,
  case
    when m.birth_date is null then null
    when (m.birth_date + interval '21 years')::date > current_date
     and (m.birth_date + interval '21 years')::date <= (current_date + interval '180 days') then true
    else false
  end as turning_major_soon
from public.members m
where m.is_active = true;

-- View para Calendário de Aniversários
create or replace view public.view_member_birthdays as
select
  m.id as member_id,
  m.cid,
  m.full_name,
  m.category,
  m.birth_date,
  to_char(m.birth_date, 'DD/MM') as birthday_formatted,
  extract(day from m.birth_date)::int as birth_day,
  extract(month from m.birth_date)::int as birth_month
from public.members m
where m.is_active = true and m.birth_date is not null
order by extract(month from m.birth_date), extract(day from m.birth_date);


-- 6. FUNÇÃO DE CÁLCULO DE FREQUÊNCIA INDIVIDUAL POR PERÍODO
create or replace function public.get_member_attendance_summary(
  p_member_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns table (
  total_meetings bigint,
  present_count bigint,
  justified_count bigint,
  absent_count bigint,
  attendance_percentage numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_present bigint;
  v_justified bigint;
  v_absent bigint;
  v_percent numeric;
begin
  select count(mt.id)
  into v_total
  from public.meetings mt
  where (p_start_date is null or mt.starts_at >= p_start_date)
    and (p_end_date is null or mt.starts_at <= p_end_date)
    and mt.status in ('agendada', 'realizada');

  select
    count(case when ma.status = 'presente' then 1 end),
    count(case when ma.status = 'justificado' then 1 end),
    count(case when ma.status = 'ausente' then 1 end)
  into v_present, v_justified, v_absent
  from public.meeting_attendance ma
  join public.meetings mt on mt.id = ma.meeting_id
  where ma.member_id = p_member_id
    and (p_start_date is null or mt.starts_at >= p_start_date)
    and (p_end_date is null or mt.starts_at <= p_end_date);

  if v_total > 0 then
    v_percent := round((v_present::numeric / v_total::numeric) * 100, 1);
  else
    v_percent := 0.0;
  end if;

  return query select v_total, v_present, v_justified, v_absent, v_percent;
end;
$$;


-- 7. PERMISSÕES DE RSVP PARA MEMBROS
create policy "Membro pode atualizar seu proprio RSVP"
  on public.meeting_attendance for update
  to authenticated
  using (exists (
    select 1 from public.members m
    where m.id = meeting_attendance.member_id and m.profile_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.members m
    where m.id = meeting_attendance.member_id and m.profile_id = auth.uid()
  ));
