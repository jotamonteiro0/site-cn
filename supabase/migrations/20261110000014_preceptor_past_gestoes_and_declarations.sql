-- ====================================================================
-- MIGRATION 20261110000014: 1º PRECEPTOR, GESTÕES ANTERIORES E REQUERIMENTOS
-- 1. Garante 1º Preceptor na Gestão 2026.2 vinculado ao Ir. Ryan Lima Cavalcante Maia
-- 2. Cadastra gestões passadas (encerradas) para consulta histórica da nominata
-- 3. Políticas e helpers para emissão direta de declarações pelo próprio membro
-- ====================================================================

-- 1. Inserção do 1º Preceptor na Gestão 2026.2
insert into public.management_positions (management_id, name, sort_order)
values ('00000000-0000-0000-0000-000000002026', '1º Preceptor', 16)
on conflict (management_id, name) do nothing;

-- Vinculação do Ir. Ryan Lima Cavalcante Maia (CID 148194)
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select m.id, p.id, '2026-07-01'
from public.members m, public.management_positions p
where m.cid = '148194'
  and p.management_id = '00000000-0000-0000-0000-000000002026'
  and p.name = '1º Preceptor'
on conflict (member_id, management_position_id, starts_on) do nothing;

-- 2. Cadastro das Gestões Históricas (Encerradas)
insert into public.managements (chapter_id, code, title, starts_on, ends_on, status)
values
  ('00000000-0000-0000-0000-000000000500', '2026.1', 'Gestão XXIV (2026.1)', '2026-01-01', '2026-06-30', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2025.2', 'Gestão XXIII (2025.2)', '2025-07-01', '2025-12-31', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2025.1', 'Gestão XXII (2025.1)', '2025-01-01', '2025-06-30', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2024.2', 'Gestão XXI (2024.2)', '2024-07-01', '2024-12-31', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2024.1', 'Gestão XX (2024.1)', '2024-01-01', '2024-06-30', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2023.2', 'Gestão XIX (2023.2)', '2023-07-01', '2023-12-31', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2018.2', 'Gestão XVIII (2018.2)', '2018-07-01', '2018-12-31', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2018.1', 'Gestão XVII (2018.1)', '2018-01-01', '2018-06-30', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2017.2', 'Gestão XVI (2017.2)', '2017-07-01', '2017-12-31', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2017.1', 'Gestão XV (2017.1)', '2017-01-01', '2017-06-30', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2015.1', 'Gestão XI (2015.1)', '2015-01-01', '2015-06-30', 'encerrada'),
  ('00000000-0000-0000-0000-000000000500', '2012.1', 'Gestão V (2012.1)', '2012-01-01', '2012-06-30', 'encerrada')
on conflict (chapter_id, code) do update set
  title = excluded.title,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  status = excluded.status;

-- 3. Permite que membros autenticados emitam sua própria declaração
create policy "Membro autenticado pode emitir declaracao propria"
  on public.issued_declarations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.members m
      where m.id = issued_declarations.member_id and (
        m.profile_id = auth.uid() or
        m.email = (select email from auth.users where id = auth.uid())
      )
    )
  );
