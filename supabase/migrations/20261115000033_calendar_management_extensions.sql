-- ==============================================================================
-- MIGRATION: 20261115000033_calendar_management_extensions.sql
-- PROJETO: site-cn — Capítulo DeMolay Professor Carvalho Neves nº 500
-- OBJETIVO: Extensões institucionais do Calendário de Gestão (public.meetings)
-- CLASSIFICAÇÃO: PREPARADO (Versionamento local sem aplicação remota não autorizada)
-- ==============================================================================

-- 1. Extensões de colunas na tabela public.meetings para suporte pleno ao Gerenciamento Administrativo
alter table public.meetings add column if not exists ends_at timestamptz;
alter table public.meetings add column if not exists category text default 'Sessão Ordinária';
alter table public.meetings add column if not exists management text default 'Gestão XXV (2026.2)';
alter table public.meetings add column if not exists complementary_info text;
alter table public.meetings add column if not exists updated_by uuid references public.profiles(id);

-- 2. Restrição de consistência temporal: término não pode ser anterior ao início
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'meetings_ends_at_check'
  ) then
    alter table public.meetings add constraint meetings_ends_at_check check (ends_at is null or ends_at >= starts_at);
  end if;
end $$;

-- 3. Índices de alta performance para consulta do calendário e próxima sessão
create index if not exists idx_meetings_calendar_lookup
  on public.meetings (chapter_id, starts_at, status);

create index if not exists idx_meetings_management
  on public.meetings (chapter_id, management);

-- 4. Comentários explicativos da modelagem
comment on column public.meetings.ends_at is 'Horário previsto para encerramento da sessão capitular';
comment on column public.meetings.category is 'Categoria litúrgica ou institucional (Sessão Ordinária, Magna, Cerimônia Pública, etc.)';
comment on column public.meetings.management is 'Gestão capitular de vinculação (ex: Gestão XXV (2026.2))';
comment on column public.meetings.complementary_info is 'Instruções de convocação, traje litúrgico e notas administrativas adicionais';
comment on column public.meetings.cancelled_at is 'Data e horário em que o cancelamento formal foi registrado no sistema';

-- 5. Preservação de Políticas de Segurança RLS
-- Leituras permitidas a todos os membros autenticados do Capítulo:
-- create policy "chapter meetings" on public.meetings for select to authenticated using (is_chapter_member(chapter_id));
--
-- Mutação restrita à Diretoria (Master e Escrivão):
-- create policy "staff manage meetings" on public.meetings for all to authenticated
--   using (has_chapter_role(chapter_id, array['master'::text, 'escrivao'::text]))
--   with check (has_chapter_role(chapter_id, array['master'::text, 'escrivao'::text]));
