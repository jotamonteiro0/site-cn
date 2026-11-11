-- -------------------------------------------------------------
-- Unificação de Identificadores e Referência ao Capítulo 500
-- 1. Coluna de identificação do capítulo com valor padrão '500'
-- 2. Coluna oficial 'id_demolay' para unificação e eliminação de 'cid'
-- 3. Trigger bidirecional para manter compatibilidade absoluta sem quebrar o sistema
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

update public.members
set id_demolay = cid
where id_demolay is null and cid is not null;

-- 3. Trigger para manter id_demolay e cid estritamente sincronizados
create or replace function public.sync_member_id_demolay()
returns trigger language plpgsql as $$
begin
  if new.id_demolay is not null and (new.cid is null or new.cid = '') then
    new.cid := new.id_demolay;
  elsif new.cid is not null and (new.id_demolay is null or new.id_demolay = '') then
    new.id_demolay := new.cid;
  elsif new.id_demolay is not null and new.cid is not null and new.id_demolay <> new.cid then
    new.cid := new.id_demolay;
  end if;

  if new.chapter_number is null or new.chapter_number = '' then
    new.chapter_number := '500';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_member_id_demolay on public.members;
create trigger trg_sync_member_id_demolay
  before insert or update on public.members
  for each row
  execute function public.sync_member_id_demolay();

-- 4. Índices de performance
create index if not exists idx_members_id_demolay on public.members (id_demolay);
create index if not exists idx_members_chapter_number on public.members (chapter_number);
