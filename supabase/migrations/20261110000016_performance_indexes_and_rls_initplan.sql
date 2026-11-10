-- Migração 16: Otimização de Performance, Índices de Chaves Estrangeiras e InitPlan de RLS

-- 1. Otimização de Funções Helper RLS com (select auth.uid())
create or replace function public.is_chapter_member(target_chapter uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from chapter_memberships
    where chapter_id = target_chapter
      and user_id = (select auth.uid())
      and is_active
  );
$$;

create or replace function public.has_chapter_role(target_chapter uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from chapter_memberships
    where chapter_id = target_chapter
      and user_id = (select auth.uid())
      and is_active
      and role_code = any(allowed_roles)
  );
$$;

-- 2. Índices B-tree Críticos para Chaves Estrangeiras e Filtros Frequentes
create index if not exists idx_chapter_memberships_user_id on public.chapter_memberships (user_id);
create index if not exists idx_chapter_memberships_chapter_role on public.chapter_memberships (chapter_id, role_code, is_active);

create index if not exists idx_members_chapter_cid on public.members (chapter_id, cid);
create index if not exists idx_members_profile_id on public.members (profile_id);
create index if not exists idx_members_category_active on public.members (category, is_active);

create index if not exists idx_meetings_chapter_starts on public.meetings (chapter_id, starts_at);
create index if not exists idx_meeting_attendance_meeting_id on public.meeting_attendance (meeting_id);
create index if not exists idx_meeting_attendance_member_id on public.meeting_attendance (member_id);
create index if not exists idx_meeting_visiting_masons_meeting_id on public.meeting_visiting_masons (meeting_id);
create index if not exists idx_meeting_visiting_demolays_meeting_id on public.meeting_visiting_demolays (meeting_id);

create index if not exists idx_member_charges_member_id on public.member_charges (member_id);
create index if not exists idx_member_charges_period_id on public.member_charges (financial_period_id);
create index if not exists idx_member_charges_status_due on public.member_charges (status, due_date);

create index if not exists idx_issued_declarations_member_id on public.issued_declarations (member_id);
create index if not exists idx_member_requests_requester on public.member_requests (requester_member_id);
create index if not exists idx_member_requests_chapter_status on public.member_requests (chapter_id, status);

create index if not exists idx_managements_chapter_status on public.managements (chapter_id, status);
create index if not exists idx_management_positions_mgmt on public.management_positions (management_id);
create index if not exists idx_member_mgmt_positions_member on public.member_management_positions (member_id);
create index if not exists idx_member_mgmt_positions_pos on public.member_management_positions (management_position_id);

-- 3. Atualização de Políticas RLS para Usar Subselect Caching (InitPlan)
do $$
begin
  -- profiles
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='own profile') then
    alter policy "own profile" on public.profiles using (id = (select auth.uid()));
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='update own profile') then
    alter policy "update own profile" on public.profiles using (id = (select auth.uid())) with check (id = (select auth.uid()));
  end if;

  -- chapter_memberships
  if exists (select 1 from pg_policies where schemaname='public' and tablename='chapter_memberships' and policyname='own membership') then
    alter policy "own membership" on public.chapter_memberships using (user_id = (select auth.uid()));
  end if;

  -- members
  if exists (select 1 from pg_policies where schemaname='public' and tablename='members' and policyname='own member record') then
    alter policy "own member record" on public.members using (profile_id = (select auth.uid()));
  end if;

  -- meeting_attendance
  if exists (select 1 from pg_policies where schemaname='public' and tablename='meeting_attendance' and policyname='own attendance') then
    alter policy "own attendance" on public.meeting_attendance using (
      exists(select 1 from public.members m where m.id = meeting_attendance.member_id and m.profile_id = (select auth.uid()))
    );
  end if;

  -- member_requests
  if exists (select 1 from pg_policies where schemaname='public' and tablename='member_requests' and policyname='own requests') then
    alter policy "own requests" on public.member_requests using (
      exists(select 1 from public.members m where m.id = member_requests.requester_member_id and m.profile_id = (select auth.uid()))
    );
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='member_requests' and policyname='create own requests') then
    alter policy "create own requests" on public.member_requests with check (
      exists(select 1 from public.members m where m.id = member_requests.requester_member_id and m.profile_id = (select auth.uid()) and m.chapter_id = member_requests.chapter_id)
    );
  end if;

  -- notifications
  if exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='own notifications') then
    alter policy "own notifications" on public.notifications using (profile_id = (select auth.uid()));
  end if;

  -- member_charges
  if exists (select 1 from pg_policies where schemaname='public' and tablename='member_charges' and policyname='Membro visualiza suas proprias cobrancas') then
    alter policy "Membro visualiza suas proprias cobrancas" on public.member_charges using (
      exists(select 1 from public.members m where m.id = member_charges.member_id and m.profile_id = (select auth.uid()))
    );
  end if;

  -- issued_declarations
  if exists (select 1 from pg_policies where schemaname='public' and tablename='issued_declarations' and policyname='Membro visualiza suas proprias declaracoes') then
    alter policy "Membro visualiza suas proprias declaracoes" on public.issued_declarations using (
      exists(select 1 from public.members m where m.id = issued_declarations.member_id and m.profile_id = (select auth.uid()))
    );
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='issued_declarations' and policyname='Membro autenticado pode emitir declaracao propria') then
    alter policy "Membro autenticado pode emitir declaracao propria" on public.issued_declarations with check (
      exists(select 1 from public.members m where m.id = issued_declarations.member_id and m.profile_id = (select auth.uid()))
    );
  end if;
end $$;
