-- ==============================================================================
-- Migração 18: Garantia Permanente de Acesso Master para Mantenedores
-- João Guilherme Martins Lopes Monteiro (CID 127738) e Airton (CID 102836)
-- ==============================================================================

-- 1. Garante que Airton (CID 102836) possui registro como membro ativo no Capítulo 500
insert into public.members (
  id,
  chapter_id,
  cid,
  full_name,
  email,
  category,
  regularity,
  member_type,
  status,
  is_active
)
values (
  'f9893a64-cf27-43c2-bd0f-617091c00ee5',
  '00000000-0000-0000-0000-000000000500',
  '102836',
  'Airton',
  'airton@carvalhoneves500.org.br',
  'demolay_ativo',
  'Regular',
  'demolay',
  'ativo',
  true
)
on conflict (chapter_id, cid)
do update set
  full_name = 'Airton',
  email = 'airton@carvalhoneves500.org.br',
  is_active = true,
  updated_at = now();

-- 2. Atualiza profile_id de Airton caso o usuário no auth já exista
update public.members m
set profile_id = u.id
from auth.users u
where m.cid = '102836'
  and (u.email = 'airton@carvalhoneves500.org.br' or u.raw_user_meta_data->>'cid' = '102836');

-- 3. Garante chapter_memberships como 'master' para Airton e João
insert into public.chapter_memberships (
  chapter_id,
  user_id,
  member_id,
  role_code,
  is_active
)
select
  '00000000-0000-0000-0000-000000000500',
  m.profile_id,
  m.id,
  'master',
  true
from public.members m
where m.cid in ('127738', '102836') and m.profile_id is not null
on conflict (chapter_id, user_id)
do update set
  role_code = 'master',
  is_active = true,
  updated_at = now();

-- 4. Protege os CIDs de Mantenedor contra rebaixamento involuntário em set_nominata_officer
create or replace function public.set_nominata_officer(
  p_management_id uuid,
  p_position_name text,
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chapter_id uuid;
  v_mgmt_status text;
  v_position_id uuid;
  v_prev_member_id uuid;
  v_target_role text;
  v_profile_id uuid;
  v_prev_profile_id uuid;
begin
  select chapter_id, status into v_chapter_id, v_mgmt_status
  from public.managements
  where id = p_management_id;

  if v_chapter_id is null then
    raise exception 'Gestão não encontrada';
  end if;

  select id into v_position_id
  from public.management_positions
  where management_id = p_management_id and name = p_position_name;

  if v_position_id is null then
    insert into public.management_positions (management_id, name, sort_order)
    values (p_management_id, p_position_name, 99)
    returning id into v_position_id;
  end if;

  select member_id into v_prev_member_id
  from public.member_management_positions
  where management_position_id = v_position_id;

  v_target_role := null;
  if p_position_name in ('Mestre Conselheiro', 'Presidente do Conselho Consultivo', 'PCC') then
    v_target_role := 'master';
  elsif p_position_name = 'Escrivão' then
    v_target_role := 'escrivao';
  elsif p_position_name = 'Tesoureiro' then
    v_target_role := 'tesoureiro';
  end if;

  delete from public.member_management_positions
  where management_position_id = v_position_id;

  if p_member_id is not null then
    insert into public.member_management_positions (
      member_id,
      management_position_id,
      starts_on
    )
    values (
      p_member_id,
      v_position_id,
      current_date
    );

    if v_mgmt_status = 'ativa' and v_target_role is not null then
      select profile_id into v_profile_id
      from public.members
      where id = p_member_id;

      if v_profile_id is not null then
        insert into public.chapter_memberships (
          chapter_id,
          user_id,
          member_id,
          role_code,
          is_active
        )
        values (
          v_chapter_id,
          v_profile_id,
          p_member_id,
          v_target_role,
          true
        )
        on conflict (chapter_id, user_id)
        do update set
          role_code = v_target_role,
          member_id = p_member_id,
          is_active = true,
          updated_at = now();
      end if;

      -- Mantenedores permanentes (João 127738 e Airton 102836) NUNCA são rebaixados
      if v_prev_member_id is not null and v_prev_member_id <> p_member_id then
        select profile_id into v_prev_profile_id
        from public.members
        where id = v_prev_member_id;

        if v_prev_profile_id is not null then
          update public.chapter_memberships
          set role_code = 'membro', updated_at = now()
          where chapter_id = v_chapter_id
            and user_id = v_prev_profile_id
            and role_code = v_target_role
            and member_id not in (select id from public.members where cid in ('127738', '102836'));
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'management_id', p_management_id,
    'position_name', p_position_name,
    'member_id', p_member_id,
    'assigned_role', v_target_role,
    'synchronized_with_rbac', (v_mgmt_status = 'ativa' and v_target_role is not null)
  );
end;
$$;
