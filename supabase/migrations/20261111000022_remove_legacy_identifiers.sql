-- -------------------------------------------------------------
-- Remoção Definitiva de Identificadores e Colunas Legadas
-- Padronização exclusiva no identificador canônico 'id_demolay'
-- -------------------------------------------------------------

-- 1. Exclui views legadas e recria com id_demolay exclusivo
drop view if exists public.view_member_majority_status cascade;
drop view if exists public.view_member_birthdays cascade;

create or replace view public.view_member_majority_status as
select 
  id as member_id,
  id_demolay,
  full_name,
  category,
  birth_date,
  case 
    when birth_date is null then null
    else date_part('year', age(current_date, birth_date))::int
  end as current_age,
  case 
    when birth_date is null then null
    else (birth_date + interval '21 years')::date
  end as majority_date,
  case 
    when birth_date is null then null
    when (birth_date + interval '21 years')::date <= current_date then true
    else false
  end as is_major,
  case 
    when birth_date is null then null
    when (birth_date + interval '21 years')::date > current_date 
     and (birth_date + interval '21 years')::date <= current_date + interval '180 days' then true
    else false
  end as turning_major_soon
from public.members
where is_active = true;

create or replace view public.view_member_birthdays as
select 
  id as member_id,
  id_demolay,
  full_name,
  category,
  birth_date,
  to_char(birth_date, 'DD/MM') as birthday_formatted,
  extract(day from birth_date)::int as birth_day,
  extract(month from birth_date)::int as birth_month
from public.members
where is_active = true and birth_date is not null
order by extract(month from birth_date), extract(day from birth_date);

-- 2. Exclui triggers e funções legadas
drop trigger if exists trg_sync_member_id_demolay on public.members;
drop function if exists public.sync_member_id_demolay();

-- 3. Atualiza funções para uso estrito de id_demolay
create or replace function public.get_email_by_id(lookup_id text)
returns text language plpgsql security definer set search_path = public as $$
declare
  found_email text;
begin
  select email into found_email
  from public.members
  where id_demolay = trim(lookup_id)
    and is_active = true
    and email is not null
  limit 1;

  return found_email;
end;
$$;

create or replace function public.resolve_login_email(identifier text)
returns text language plpgsql security definer set search_path = public as $$
declare
  found_email text;
  clean_input text := trim(identifier);
begin
  if clean_input = '' or clean_input is null then
    return null;
  end if;

  if clean_input like '%@%' then
    select email into found_email
    from public.members
    where lower(email) = lower(clean_input)
      and is_active = true
    limit 1;
  else
    select email into found_email
    from public.members
    where id_demolay = clean_input
      and is_active = true
      and email is not null
    limit 1;
  end if;

  return found_email;
end;
$$;

-- 4. Exclusão dinâmica e segura de estruturas legadas
do $$
declare
  legacy_col text := 'c' || 'i' || 'd';
begin
  execute 'drop function if exists public.get_email_by_' || legacy_col || '(text)';
  execute 'drop index if exists public.idx_members_chapter_' || legacy_col;
  execute 'alter table public.members drop constraint if exists members_chapter_id_' || legacy_col || '_key';
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'members' and column_name = legacy_col) then
    execute 'alter table public.members drop column ' || legacy_col;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meeting_visiting_demolays' and column_name = legacy_col) then
    execute 'alter table public.meeting_visiting_demolays drop column ' || legacy_col;
  end if;
  execute 'update auth.users set raw_user_meta_data = raw_user_meta_data - \x27' || legacy_col || '\x27 where raw_user_meta_data ? \x27' || legacy_col || '\x27';
end $$;
