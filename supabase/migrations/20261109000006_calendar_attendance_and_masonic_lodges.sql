-- -------------------------------------------------------------
-- Calendário, Frequência e Lojas Maçônicas do Conselho Consultivo
-- -------------------------------------------------------------

-- 1. Coluna de Loja Maçônica no cadastro de membros
alter table public.members
  add column if not exists masonic_lodge text;

-- 2. Cadastro / Atualização das Lojas Maçônicas dos Tios Consultores
update public.members set masonic_lodge = 'A∴R∴L∴S∴ Abolição nº 4199' where id_demolay in ('122850', '92189', '91553', '153893') or cid in ('122850', '92189', '91553', '153893');
update public.members set masonic_lodge = 'A∴R∴L∴S∴ Adonhiran nº 2782' where id_demolay in ('91709', '89059', '62127', '153897', '153896') or cid in ('91709', '89059', '62127', '153897', '153896');
update public.members set masonic_lodge = 'A∴R∴L∴S∴ Caridade II nº 135' where id_demolay in ('153894', '91291') or cid in ('153894', '91291');
update public.members set masonic_lodge = 'A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591' where id_demolay in ('132662', '134106', '153895') or cid in ('132662', '134106', '153895');

-- Leonardo Rodrigues (Caridade II)
insert into public.members (chapter_id, id_demolay, cid, full_name, category, regularity, member_type, status, is_active, masonic_lodge)
values ('00000000-0000-0000-0000-000000000500', 'LEO-CARIDADE2', 'LEO-CARIDADE2', 'Leonardo Rodrigues', 'macom', 'Consultor', 'macom', 'ativo', true, 'A∴R∴L∴S∴ Caridade II nº 135')
on conflict (chapter_id, cid) do update set
  full_name = excluded.full_name,
  masonic_lodge = excluded.masonic_lodge,
  id_demolay = excluded.id_demolay;

-- 3. Tipos padrão de reuniões capitulares
insert into public.meeting_types (chapter_id, name)
values
  ('00000000-0000-0000-0000-000000000500', 'Sessão Ordinária do Grau Iniciático'),
  ('00000000-0000-0000-0000-000000000500', 'Sessão Ordinária do Grau DeMolay'),
  ('00000000-0000-0000-0000-000000000500', 'Sessão Magna de Iniciação'),
  ('00000000-0000-0000-0000-000000000500', 'Sessão Magna de Elevação'),
  ('00000000-0000-0000-0000-000000000500', 'Sessão Magna de Instalação e Posse'),
  ('00000000-0000-0000-0000-000000000500', 'Sessão Pública / Especial'),
  ('00000000-0000-0000-0000-000000000500', 'Reunião do Conselho Consultivo')
on conflict (chapter_id, name) do nothing;

-- 4. Políticas RLS
create policy "chapter members read meeting_types" on public.meeting_types
  for select using (is_chapter_member(chapter_id));

create policy "chapter members view attendance summary" on public.meeting_attendance
  for select using (exists (
    select 1 from public.meetings mt
    where mt.id = meeting_attendance.meeting_id and is_chapter_member(mt.chapter_id)
  ));
