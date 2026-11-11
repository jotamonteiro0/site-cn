-- -------------------------------------------------------------
-- Helper seguro para autenticação com verificação de banco antecipada
-- Suporta busca tanto por ID Oficial quanto por e-mail no quadro
-- Rejeita identidades não cadastradas para proteção contra ataques
-- -------------------------------------------------------------
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
    -- Busca por e-mail no quadro de membros ativo
    select email into found_email
    from public.members
    where lower(email) = lower(clean_input)
      and is_active = true
    limit 1;
  else
    -- Busca por ID no quadro de membros ativo
    select email into found_email
    from public.members
    where cid = clean_input
      and is_active = true
      and email is not null
    limit 1;
  end if;

  return found_email;
end;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;
