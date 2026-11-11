-- Migration: visiting masons, member degrees, updated lodge assignments, and meeting rsvp
-- Date: 2026-11-09

-- 1. Graus DeMolay adicionais na tabela de membros
alter table public.members add column if not exists demolay_degree_date date;

-- 2. Atualizar Lojas Maçônicas oficiais informadas
update public.members
set masonic_lodge = 'A∴R∴L∴S∴ Abolição nº 4199'
where id_demolay = '122848' or cid = '122848';

update public.members
set masonic_lodge = 'A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591'
where id_demolay in ('100967', '129705') or cid in ('100967', '129705');

-- 3. Padronizar local padrão das reuniões para A∴R∴L∴S∴ Caridade II nº 135
update public.meetings
set location = 'A∴R∴L∴S∴ Caridade II nº 135'
where location ilike '%caridade%';

-- 4. Tabela de Maçons Visitantes por Reunião
create table if not exists public.meeting_visiting_masons (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  cim text not null,
  name text not null,
  masonic_lodge text not null,
  potency text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.meeting_visiting_masons enable row level security;

create policy "Visualizacao de visitantes por usuarios autenticados"
  on public.meeting_visiting_masons for select
  to authenticated
  using (true);

create policy "Cadastro de visitantes por usuarios autenticados"
  on public.meeting_visiting_masons for insert
  to authenticated
  with check (true);

create policy "Remocao de visitantes por usuarios autenticados"
  on public.meeting_visiting_masons for delete
  to authenticated
  using (true);

-- 5. Campos de Confirmação de Presença (RSVP)
alter table public.meeting_attendance add column if not exists rsvp_status text default 'pendente' check (rsvp_status in ('pendente', 'confirmado', 'justificado', 'recusado'));
alter table public.meeting_attendance add column if not exists rsvp_notes text;
alter table public.meeting_attendance add column if not exists rsvp_at timestamptz;

-- 6. Garantir permissões de inserção de novo membro pelo Master/Oficiais
create policy "Membros autenticados podem inserir novos membros"
  on public.members for insert
  to authenticated
  with check (true);

create policy "Membros autenticados podem atualizar membros"
  on public.members for update
  to authenticated
  using (true);
