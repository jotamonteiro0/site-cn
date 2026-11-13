-- ==============================================================================
-- MIGRATION 20261112000026: BLINDAGEM DE PRIVACIDADE E VIEW SEGURA DO CENSO CAPITULAR
-- ==============================================================================
-- 1. Remove política permissiva que expunha linhas e colunas confidenciais da tabela members.
-- 2. Restringe a tabela base public.members exclusivamente para:
--    - Diretoria Capitular (Master e Escrivão) via política "staff members"
--    - O próprio membro autenticado em seu registro pessoal via "own member record"
-- 3. Cria a View Restrita public.members_public, expondo exclusivamente colunas
--    institucionais não-confidenciais (id, id_demolay, full_name, category, regularity,
--    masonic_lodge, photo_url, created_at). Colunas como email, phone, initiation_date,
--    demolay_degree_date e birth_date sequer existem nesta View.
-- ==============================================================================

-- 1. Remoção da política permissiva legada
drop policy if exists "chapter members read members directory" on public.members;

-- 2. Garantia das políticas restritas de RLS na tabela base public.members
drop policy if exists "staff members" on public.members;
create policy "staff members" on public.members for select to authenticated 
  using (has_chapter_role(chapter_id, array['master', 'escrivao']));

drop policy if exists "own member record" on public.members;
create policy "own member record" on public.members for select to authenticated 
  using (profile_id = (select auth.uid()));

-- 3. Criação da View Restrita public.members_public (Security Definer View)
create or replace view public.members_public with (security_invoker = false) as
select 
  id,
  chapter_id,
  id_demolay,
  full_name,
  category,
  regularity,
  masonic_lodge,
  photo_url,
  created_at
from public.members
where is_chapter_member(chapter_id) and is_active = true;

-- Concede acesso de consulta estritamente a usuários autenticados (sob o filtro is_chapter_member)
-- Usuários anônimos são expressamente revogados de qualquer acesso à view
revoke all on public.members_public from public, anon;
grant select on public.members_public to authenticated;

-- ==============================================================================
-- 4. HARDENING DE SEGURANÇA DAS FUNÇÕES AUXILIARES DE RLS (SET search_path = '')
-- Previne ataques de search_path poisoning e sequestro de resolução de objetos.
-- Todas as referências são estritamente qualificadas com seus schemas (public, auth).
-- ==============================================================================
create or replace function public.is_chapter_member(target_chapter uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.chapter_memberships
    where chapter_id = target_chapter
      and user_id = (select auth.uid())
      and is_active
  );
$$;

create or replace function public.has_chapter_role(target_chapter uuid, allowed_roles text[])
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.chapter_memberships
    where chapter_id = target_chapter
      and user_id = (select auth.uid())
      and is_active
      and role_code = any(allowed_roles)
  );
$$;

-- ==============================================================================
-- 5. BLINDAGEM DE PRIVILÉGIOS DE EXECUÇÃO SQL (LEAST PRIVILEGE)
-- Revoga privilégio EXECUTE de anon e PUBLIC nas funções auxiliares SECURITY DEFINER.
-- Concede EXECUTE estritamente a authenticated e service_role.
-- ==============================================================================
revoke execute on function public.is_chapter_member(uuid) from public, anon;
revoke execute on function public.has_chapter_role(uuid, text[]) from public, anon;

grant execute on function public.is_chapter_member(uuid) to authenticated, service_role;
grant execute on function public.has_chapter_role(uuid, text[]) to authenticated, service_role;

-- 6. Garantia de que políticas dependentes em tabelas correlatas restrinjam a avaliação a authenticated
drop policy if exists "staff chapter memberships" on public.chapter_memberships;
create policy "staff chapter memberships" on public.chapter_memberships for select to authenticated
  using (has_chapter_role(chapter_id, array['master'::text, 'escrivao'::text]));

drop policy if exists "chapter meetings" on public.meetings;
create policy "chapter meetings" on public.meetings for select to authenticated
  using (is_chapter_member(chapter_id));

drop policy if exists "staff manage meetings" on public.meetings;
create policy "staff manage meetings" on public.meetings for all to authenticated
  using (has_chapter_role(chapter_id, array['master'::text, 'escrivao'::text]))
  with check (has_chapter_role(chapter_id, array['master'::text, 'escrivao'::text]));

drop policy if exists "chapter members view attendance summary" on public.meeting_attendance;
create policy "chapter members view attendance summary" on public.meeting_attendance for select to authenticated
  using (exists (select 1 from meetings mt where mt.id = meeting_attendance.meeting_id and is_chapter_member(mt.chapter_id)));

drop policy if exists "staff attendance" on public.meeting_attendance;
create policy "staff attendance" on public.meeting_attendance for all to authenticated
  using (exists (select 1 from meetings mt where mt.id = meeting_attendance.meeting_id and has_chapter_role(mt.chapter_id, array['master'::text, 'escrivao'::text])))
  with check (exists (select 1 from meetings mt where mt.id = meeting_attendance.meeting_id and has_chapter_role(mt.chapter_id, array['master'::text, 'escrivao'::text])));

drop policy if exists "chapter members read meeting_types" on public.meeting_types;
create policy "chapter members read meeting_types" on public.meeting_types for select to authenticated
  using (is_chapter_member(chapter_id));

drop policy if exists "staff requests" on public.member_requests;
create policy "staff requests" on public.member_requests for all to authenticated
  using (has_chapter_role(chapter_id, array['master'::text, 'escrivao'::text, 'tesoureiro'::text]))
  with check (has_chapter_role(chapter_id, array['master'::text, 'escrivao'::text, 'tesoureiro'::text]));
