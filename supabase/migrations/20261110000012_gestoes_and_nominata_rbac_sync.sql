-- ====================================================================
-- MIGRATION 20261110000012: GESTÕES, NOMINATA E SINCRONIZAÇÃO AUTOMÁTICA DE RBAC
-- Permite configurar a Nominata da gestão atual ou de outra gestão
-- e transfere automaticamente os acessos e permissões do sistema
-- (MC/PCC -> master, Escrivão -> escrivao, Tesoureiro -> tesoureiro)
-- ====================================================================

-- 1. Campos adicionais para managements
alter table public.managements add column if not exists title text;
alter table public.managements add column if not exists theme text;
alter table public.managements add column if not exists photo_url text;

-- 2. Políticas RLS para Gestão de Nominatas
create policy "staff manage chapter memberships" on public.chapter_memberships
  for all to authenticated
  using (has_chapter_role(chapter_id, array['master']))
  with check (has_chapter_role(chapter_id, array['master']));

create policy "staff manage managements" on public.managements
  for all to authenticated
  using (has_chapter_role(chapter_id, array['master', 'escrivao']))
  with check (has_chapter_role(chapter_id, array['master', 'escrivao']));

create policy "staff manage management_positions" on public.management_positions
  for all to authenticated
  using (exists (
    select 1 from public.managements m
    where m.id = management_positions.management_id
      and has_chapter_role(m.chapter_id, array['master', 'escrivao'])
  ))
  with check (exists (
    select 1 from public.managements m
    where m.id = management_positions.management_id
      and has_chapter_role(m.chapter_id, array['master', 'escrivao'])
  ));

create policy "staff manage member_management_positions" on public.member_management_positions
  for all to authenticated
  using (exists (
    select 1 from public.management_positions mp
    join public.managements m on m.id = mp.management_id
    where mp.id = member_management_positions.management_position_id
      and has_chapter_role(m.chapter_id, array['master', 'escrivao'])
  ))
  with check (exists (
    select 1 from public.management_positions mp
    join public.managements m on m.id = mp.management_id
    where mp.id = member_management_positions.management_position_id
      and has_chapter_role(m.chapter_id, array['master', 'escrivao'])
  ));

-- 3. Função para definir oficial na nominata e sincronizar permissão RBAC
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
  v_target_role text := null;
  v_prev_member_id uuid := null;
  v_profile_id uuid := null;
  v_prev_profile_id uuid := null;
begin
  -- Busca dados da Gestão
  select chapter_id, status into v_chapter_id, v_mgmt_status
  from public.managements
  where id = p_management_id;

  if v_chapter_id is null then
    raise exception 'Gestão não encontrada';
  end if;

  -- Mapeia cargo da nominata para permissão do sistema
  if p_position_name in ('Mestre Conselheiro', 'Presidente do Conselho Consultivo', 'PCC') then
    v_target_role := 'master';
  elsif p_position_name = 'Escrivão' then
    v_target_role := 'escrivao';
  elsif p_position_name = 'Tesoureiro' then
    v_target_role := 'tesoureiro';
  end if;

  -- Garante que a posição existe na tabela management_positions
  select id into v_position_id
  from public.management_positions
  where management_id = p_management_id and name = p_position_name;

  if v_position_id is null then
    insert into public.management_positions (management_id, name, sort_order)
    values (
      p_management_id,
      p_position_name,
      case
        when p_position_name = 'Mestre Conselheiro' then 1
        when p_position_name = 'Presidente do Conselho Consultivo' then 2
        when p_position_name = 'Primeiro Conselheiro' then 3
        when p_position_name = 'Segundo Conselheiro' then 4
        when p_position_name = 'Escrivão' then 5
        when p_position_name = 'Tesoureiro' then 6
        when p_position_name = 'Orador' then 7
        when p_position_name = 'Primeiro Diácono' then 8
        when p_position_name = 'Segundo Diácono' then 9
        when p_position_name = 'Primeiro Mordomo' then 10
        when p_position_name = 'Segundo Mordomo' then 11
        when p_position_name = 'Hospitaleiro' then 12
        when p_position_name = 'Capelão' then 13
        when p_position_name = 'Mestre de Cerimônias' then 14
        when p_position_name = 'Porta-Estandarte' then 15
        when p_position_name = 'Organista' then 16
        when p_position_name = 'Sentinela' then 17
        else 50
      end
    )
    returning id into v_position_id;
  end if;

  -- Identifica quem ocupava o cargo anteriormente
  select member_id into v_prev_member_id
  from public.member_management_positions
  where management_position_id = v_position_id
  order by starts_on desc
  limit 1;

  -- Remove a vinculação anterior
  delete from public.member_management_positions
  where management_position_id = v_position_id;

  -- Se foi passado um novo membro, cadastra a nova nomeação
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

    -- Se a gestão estiver ATIVA e o cargo tiver perfil administrativo vinculado,
    -- passa automaticamente o acesso e permissão no sistema!
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

      -- Se o membro anterior ocupava o cargo e tinha login, rebaixa para membro
      -- caso não exerça outro cargo administrativo
      if v_prev_member_id is not null and v_prev_member_id <> p_member_id then
        select profile_id into v_prev_profile_id
        from public.members
        where id = v_prev_member_id;

        if v_prev_profile_id is not null then
          update public.chapter_memberships
          set role_code = 'membro', updated_at = now()
          where chapter_id = v_chapter_id
            and user_id = v_prev_profile_id
            and role_code = v_target_role;
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

-- 4. Função para Ativar uma Gestão e Sincronizar toda a Nominata com o RBAC
create or replace function public.activate_management(p_management_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chapter_id uuid;
  r record;
  v_target_role text;
  v_profile_id uuid;
  v_count integer := 0;
begin
  select chapter_id into v_chapter_id
  from public.managements
  where id = p_management_id;

  if v_chapter_id is null then
    raise exception 'Gestão não encontrada';
  end if;

  -- 1. Encerra outras gestões e ativa a selecionada
  update public.managements
  set status = 'encerrada', updated_at = now()
  where chapter_id = v_chapter_id and id <> p_management_id and status = 'ativa';

  update public.managements
  set status = 'ativa', updated_at = now()
  where id = p_management_id;

  -- 2. Itera sobre os cargos da nominata desta gestão e sincroniza as permissões
  for r in
    select mp.name as position_name, mmp.member_id, m.profile_id
    from public.management_positions mp
    join public.member_management_positions mmp on mmp.management_position_id = mp.id
    join public.members m on m.id = mmp.member_id
    where mp.management_id = p_management_id
  loop
    v_target_role := null;
    if r.position_name in ('Mestre Conselheiro', 'Presidente do Conselho Consultivo', 'PCC') then
      v_target_role := 'master';
    elsif r.position_name = 'Escrivão' then
      v_target_role := 'escrivao';
    elsif r.position_name = 'Tesoureiro' then
      v_target_role := 'tesoureiro';
    end if;

    if v_target_role is not null and r.profile_id is not null then
      insert into public.chapter_memberships (
        chapter_id,
        user_id,
        member_id,
        role_code,
        is_active
      )
      values (
        v_chapter_id,
        r.profile_id,
        r.member_id,
        v_target_role,
        true
      )
      on conflict (chapter_id, user_id)
      do update set
        role_code = v_target_role,
        member_id = r.member_id,
        is_active = true,
        updated_at = now();

      v_count := v_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'activated_management_id', p_management_id,
    'synchronized_roles_count', v_count
  );
end;
$$;

-- 5. Semente Inicial de Gestões 2026.2 (Atual) e 2027.1 (Planejada)
insert into public.managements (id, chapter_id, code, title, starts_on, ends_on, status)
values
  (
    '00000000-0000-0000-0000-000000002026',
    '00000000-0000-0000-0000-000000000500',
    '2026.2',
    'Gestão XXV (2026.2)',
    '2026-07-01',
    '2026-12-31',
    'ativa'
  ),
  (
    '00000000-0000-0000-0000-000000002027',
    '00000000-0000-0000-0000-000000000500',
    '2027.1',
    'Gestão XXVI (2027.1)',
    '2027-01-01',
    '2027-06-30',
    'planejada'
  )
on conflict (chapter_id, code) do update set
  title = excluded.title,
  status = excluded.status;

-- Cria os cargos padrão para a Gestão 2026.2
insert into public.management_positions (management_id, name, sort_order)
values
  ('00000000-0000-0000-0000-000000002026', 'Mestre Conselheiro', 1),
  ('00000000-0000-0000-0000-000000002026', 'Presidente do Conselho Consultivo', 2),
  ('00000000-0000-0000-0000-000000002026', 'Primeiro Conselheiro', 3),
  ('00000000-0000-0000-0000-000000002026', 'Segundo Conselheiro', 4),
  ('00000000-0000-0000-0000-000000002026', 'Escrivão', 5),
  ('00000000-0000-0000-0000-000000002026', 'Tesoureiro', 6),
  ('00000000-0000-0000-0000-000000002026', 'Orador', 7),
  ('00000000-0000-0000-0000-000000002026', 'Primeiro Diácono', 8),
  ('00000000-0000-0000-0000-000000002026', 'Segundo Diácono', 9),
  ('00000000-0000-0000-0000-000000002026', 'Primeiro Mordomo', 10),
  ('00000000-0000-0000-0000-000000002026', 'Segundo Mordomo', 11),
  ('00000000-0000-0000-0000-000000002026', 'Hospitaleiro', 12),
  ('00000000-0000-0000-0000-000000002026', 'Capelão', 13),
  ('00000000-0000-0000-0000-000000002026', 'Mestre de Cerimônias', 14),
  ('00000000-0000-0000-0000-000000002026', 'Porta-Estandarte', 15),
  ('00000000-0000-0000-0000-000000002026', 'Sentinela', 16)
on conflict (management_id, name) do nothing;

-- Cria os cargos padrão para a Gestão 2027.1
insert into public.management_positions (management_id, name, sort_order)
values
  ('00000000-0000-0000-0000-000000002027', 'Mestre Conselheiro', 1),
  ('00000000-0000-0000-0000-000000002027', 'Presidente do Conselho Consultivo', 2),
  ('00000000-0000-0000-0000-000000002027', 'Primeiro Conselheiro', 3),
  ('00000000-0000-0000-0000-000000002027', 'Segundo Conselheiro', 4),
  ('00000000-0000-0000-0000-000000002027', 'Escrivão', 5),
  ('00000000-0000-0000-0000-000000002027', 'Tesoureiro', 6),
  ('00000000-0000-0000-0000-000000002027', 'Orador', 7),
  ('00000000-0000-0000-0000-000000002027', 'Primeiro Diácono', 8),
  ('00000000-0000-0000-0000-000000002027', 'Segundo Diácono', 9),
  ('00000000-0000-0000-0000-000000002027', 'Primeiro Mordomo', 10),
  ('00000000-0000-0000-0000-000000002027', 'Segundo Mordomo', 11),
  ('00000000-0000-0000-0000-000000002027', 'Hospitaleiro', 12),
  ('00000000-0000-0000-0000-000000002027', 'Capelão', 13),
  ('00000000-0000-0000-0000-000000002027', 'Mestre de Cerimônias', 14),
  ('00000000-0000-0000-0000-000000002027', 'Porta-Estandarte', 15),
  ('00000000-0000-0000-0000-000000002027', 'Sentinela', 16)
on conflict (management_id, name) do nothing;
