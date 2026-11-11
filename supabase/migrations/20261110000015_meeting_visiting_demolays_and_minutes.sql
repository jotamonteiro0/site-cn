-- Migration: meeting_visiting_demolays and minutes
-- Date: 2026-11-10

create table if not exists public.meeting_visiting_demolays (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  id_demolay text not null,
  name text not null,
  chapter text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.meeting_visiting_demolays enable row level security;

create policy "Visualizacao de demolays visitantes por usuarios autenticados"
  on public.meeting_visiting_demolays for select
  to authenticated
  using (true);

create policy "Cadastro de demolays visitantes por usuarios autenticados"
  on public.meeting_visiting_demolays for insert
  to authenticated
  with check (true);

create policy "Remocao de demolays visitantes por usuarios autenticados"
  on public.meeting_visiting_demolays for delete
  to authenticated
  using (true);
