-- -------------------------------------------------------------
-- Helper seguro para resolução de ID em e-mail no login
-- Suporta busca por get_email_by_id preservando compatibilidade
-- -------------------------------------------------------------
create or replace function public.get_email_by_id(lookup_id text)
returns text language plpgsql security definer set search_path = public as $$
declare
  found_email text;
begin
  select email into found_email
  from public.members
  where (id_demolay = trim(lookup_id) or cid = trim(lookup_id))
    and is_active = true
    and email is not null
  limit 1;

  return found_email;
end;
$$;

grant execute on function public.get_email_by_id(text) to anon, authenticated;
