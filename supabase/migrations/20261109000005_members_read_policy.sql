-- Permite que qualquer membro ativo do Capítulo visualize o quadro de membros
create policy "chapter members read members directory" on public.members
  for select using (is_chapter_member(chapter_id));
