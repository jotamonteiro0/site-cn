-- -------------------------------------------------------------
-- Camada de Retrocompatibilidade e Zero-Downtime Migration
-- 1. Garante que colunas 'cid' e 'id_demolay' coexistam em sincronia
-- 2. Evita qualquer quebra de clientes antigos, builds em cache ou novas versões
-- -------------------------------------------------------------

-- 1. Garante coluna cid em public.members sincronizada com id_demolay
alter table public.members
  add column if not exists cid text;

update public.members
set cid = id_demolay
where cid is distinct from id_demolay;

create or replace function public.sync_members_id_demolay_compat()
returns trigger language plpgsql as $$
begin
  if new.id_demolay is not null and (new.cid is null or new.cid <> new.id_demolay) then
    new.cid := new.id_demolay;
  elsif new.cid is not null and (new.id_demolay is null or new.id_demolay <> new.cid) then
    new.id_demolay := new.cid;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_members_id_demolay_compat on public.members;
create trigger trg_sync_members_id_demolay_compat
before insert or update on public.members
for each row execute function public.sync_members_id_demolay_compat();

-- 2. Garante coluna cid em public.meeting_visiting_demolays
alter table public.meeting_visiting_demolays
  add column if not exists cid text;

update public.meeting_visiting_demolays
set cid = id_demolay
where cid is distinct from id_demolay;

create or replace function public.sync_meeting_visiting_demolays_compat()
returns trigger language plpgsql as $$
begin
  if new.id_demolay is not null and (new.cid is null or new.cid <> new.id_demolay) then
    new.cid := new.id_demolay;
  elsif new.cid is not null and (new.id_demolay is null or new.id_demolay <> new.cid) then
    new.id_demolay := new.cid;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_meeting_visiting_demolays_compat on public.meeting_visiting_demolays;
create trigger trg_sync_meeting_visiting_demolays_compat
before insert or update on public.meeting_visiting_demolays
for each row execute function public.sync_meeting_visiting_demolays_compat();

-- 3. Garante que helper get_email_by_cid exista para clientes antigos
create or replace function public.get_email_by_cid(lookup_cid text)
returns text language plpgsql security definer set search_path = public as $$
declare
  found_email text;
begin
  select email into found_email
  from public.members
  where (id_demolay = trim(lookup_cid) or cid = trim(lookup_cid))
    and is_active = true
    and email is not null
  limit 1;
  return found_email;
end;
$$;
grant execute on function public.get_email_by_cid(text) to anon, authenticated;

-- 4. Notifica o PostgREST para recarregar o schema cache
notify pgrst, 'reload schema';
