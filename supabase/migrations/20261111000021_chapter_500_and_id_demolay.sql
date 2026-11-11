-- -------------------------------------------------------------
-- Unificação de Identificadores e Referência ao Capítulo 500
-- 1. Coluna de identificação do capítulo com valor padrão '500'
-- 2. Coluna oficial 'id_demolay' para unificação e integridade
-- -------------------------------------------------------------

-- 1. Adiciona chapter_number com valor padrão 500 para todos os membros
alter table public.members
  add column if not exists chapter_number text not null default '500';

update public.members
set chapter_number = '500'
where chapter_number is distinct from '500';

-- 2. Adiciona id_demolay no cadastro de membros para unificação definitiva
alter table public.members
  add column if not exists id_demolay text;

-- 3. Índices de performance
create index if not exists idx_members_id_demolay on public.members (id_demolay);
create index if not exists idx_members_chapter_number on public.members (chapter_number);
