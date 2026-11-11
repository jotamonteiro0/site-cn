-- -------------------------------------------------------------
-- Helper seguro para resolução de ID Oficial em e-mail no login
-- -------------------------------------------------------------
create or replace function public.get_email_by_id_demolay(lookup_id_demolay text)
returns text language plpgsql security definer set search_path = public as $$
declare
  found_email text;
begin
  select email into found_email
  from public.members
  where id_demolay = trim(lookup_id_demolay)
    and is_active = true
    and email is not null
  limit 1;

  return found_email;
end;
$$;

grant execute on function public.get_email_by_id_demolay(text) to anon, authenticated;
