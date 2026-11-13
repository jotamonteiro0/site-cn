-- ==============================================================================
-- MIGRATION 20261113000028: REVOGAÇÃO ATÔMICA DE RBAC E HARDENING DE CHAPTER_MEMBERSHIPS
-- ==============================================================================
-- 1. Revoga privilégios DML residuais (INSERT, UPDATE, DELETE, TRUNCATE) do papel anon na tabela chapter_memberships.
-- 2. Atualiza a RPC public.set_nominata_officer para:
--    - Garantir revogação ou rebaixamento de privilégios quando um cargo for desocupado (p_member_id IS NULL).
--    - Considerar todas as nomeações administrativas ativas do membro antes de rebaixar para 'membro'.
--    - Preservar acesso Master do Presidente do Conselho Consultivo (PCC).
--    - Preservar mantenedores permanentes (IDs DeMolay 127738 e 102836).
--    - Retornar synchronized_with_rbac refletindo fielmente se houve sincronização efetiva no RBAC.
-- ==============================================================================

-- 1. Hardening de privilégios defensivos na tabela chapter_memberships
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.chapter_memberships FROM anon;

-- 2. RPC public.set_nominata_officer atualizada com recalculo inteligente de RBAC
CREATE OR REPLACE FUNCTION public.set_nominata_officer(
  p_management_id uuid,
  p_position_name text,
  p_member_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
declare
  v_chapter_id uuid;
  v_mgmt_status text;
  v_position_id uuid;
  v_prev_member_id uuid;
  v_target_role text;
  v_new_role text;
  v_prev_role text;
  v_profile_id uuid;
  v_prev_profile_id uuid;
  v_is_authorized boolean;
  v_canonical_name text;
  v_sort_order smallint;
  v_rbac_sync_occurred boolean := false;
  v_canonical_positions constant text[] := ARRAY[
    'Mestre Conselheiro',
    'Presidente do Conselho Consultivo',
    'Primeiro Conselheiro',
    'Segundo Conselheiro',
    'Escrivão',
    'Tesoureiro',
    'Orador',
    'Primeiro Diácono',
    'Segundo Diácono',
    'Primeiro Mordomo',
    'Segundo Mordomo',
    'Hospitaleiro',
    'Capelão',
    'Mestre de Cerimônias',
    'Organista',
    'Porta-Estandarte',
    'Sentinela',
    '1º Preceptor',
    '2º Preceptor',
    '3º Preceptor',
    '4º Preceptor',
    '5º Preceptor',
    '6º Preceptor',
    '7º Preceptor',
    'Consultor da Organização',
    'PCC'
  ];
begin
  -- 1. Validação contra a whitelist de cargos canônicos antes de qualquer operação
  if p_position_name is null or not (p_position_name = any(v_canonical_positions)) then
    raise exception 'Cargo inválido ou não autorizado: %', coalesce(p_position_name, 'NULL');
  end if;

  -- Normaliza alias PCC para o título canônico completo
  v_canonical_name := case when p_position_name = 'PCC' then 'Presidente do Conselho Consultivo' else p_position_name end;

  -- 2. Valida existência da Gestão e obtém seu capítulo e status
  select chapter_id, status into v_chapter_id, v_mgmt_status
  from public.managements
  where id = p_management_id;

  if v_chapter_id is null then
    raise exception 'Gestão não encontrada';
  end if;

  -- 3. Validação estrita de autorização no servidor (Master ou Escrivão do Capítulo correspondente)
  select exists(
    select 1 from public.chapter_memberships
    where chapter_id = v_chapter_id
      and user_id = (select auth.uid())
      and is_active = true
      and role_code = any(ARRAY['master'::text, 'escrivao'::text])
  ) into v_is_authorized;

  if not v_is_authorized then
    raise exception 'Permissão negada: apenas Master ou Escrivão podem alterar a nominata';
  end if;

  -- 4. Validação de que o membro indicado pertence ao mesmo capítulo da gestão e está ativo
  if p_member_id is not null then
    if not exists (
      select 1 from public.members
      where id = p_member_id
        and chapter_id = v_chapter_id
        and is_active = true
    ) then
      raise exception 'Membro inválido, inativo ou não pertencente a este capítulo';
    end if;
  end if;

  -- 5. Define ordem de classificação canônica
  v_sort_order := case v_canonical_name
    when 'Mestre Conselheiro' then 1
    when 'Presidente do Conselho Consultivo' then 2
    when 'Primeiro Conselheiro' then 3
    when 'Segundo Conselheiro' then 4
    when 'Escrivão' then 5
    when 'Tesoureiro' then 6
    when 'Orador' then 7
    when 'Primeiro Diácono' then 8
    when 'Segundo Diácono' then 9
    when 'Primeiro Mordomo' then 10
    when 'Segundo Mordomo' then 11
    when 'Hospitaleiro' then 12
    when 'Capelão' then 13
    when 'Mestre de Cerimônias' then 14
    when 'Porta-Estandarte' then 15
    when 'Organista' then 16
    when 'Sentinela' then 17
    when '1º Preceptor' then 18
    when '2º Preceptor' then 19
    when '3º Preceptor' then 20
    when '4º Preceptor' then 21
    when '5º Preceptor' then 22
    when '6º Preceptor' then 23
    when '7º Preceptor' then 24
    when 'Consultor da Organização' then 25
    else 50
  end;

  -- 6. Localiza ou cria a posição na gestão
  select id into v_position_id
  from public.management_positions
  where management_id = p_management_id and name = v_canonical_name;

  if v_position_id is null then
    insert into public.management_positions (management_id, name, sort_order)
    values (p_management_id, v_canonical_name, v_sort_order)
    returning id into v_position_id;
  end if;

  -- 7. Localiza ocupante anterior (ordenado descendentemente para tolerar histórico)
  select member_id into v_prev_member_id
  from public.member_management_positions
  where management_position_id = v_position_id
  order by starts_on desc
  limit 1;

  -- 8. Mapeia papel RBAC inerente ao cargo atual
  v_target_role := null;
  if v_canonical_name in ('Mestre Conselheiro', 'Presidente do Conselho Consultivo') then
    v_target_role := 'master';
  elsif v_canonical_name = 'Escrivão' then
    v_target_role := 'escrivao';
  elsif v_canonical_name = 'Tesoureiro' then
    v_target_role := 'tesoureiro';
  end if;

  -- 9. Remove vinculações anteriores desta posição
  delete from public.member_management_positions
  where management_position_id = v_position_id;

  -- 10. Se membro indicado foi fornecido, cadastra nova vinculação
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
  end if;

  -- 11. Sincronização estrita de RBAC quando a Gestão estiver ATIVA
  if v_mgmt_status = 'ativa' then
    -- A) Sincroniza novo titular (se houver e tiver profile_id)
    if p_member_id is not null then
      select profile_id into v_profile_id
      from public.members
      where id = p_member_id;

      if v_profile_id is not null then
        -- Calcula o maior papel administrativo que o novo titular deve possuir
        if exists (
          select 1 from public.members
          where id = p_member_id and id_demolay in ('127738', '102836')
        ) then
          v_new_role := 'master';
        else
          select coalesce(
            (
              select case
                when bool_or(mp.name in ('Mestre Conselheiro', 'Presidente do Conselho Consultivo', 'PCC')) then 'master'
                when bool_or(mp.name = 'Escrivão') then 'escrivao'
                when bool_or(mp.name = 'Tesoureiro') then 'tesoureiro'
                else 'membro'
              end
              from public.member_management_positions mmp
              join public.management_positions mp on mp.id = mmp.management_position_id
              join public.managements m on m.id = mp.management_id
              where mmp.member_id = p_member_id
                and m.chapter_id = v_chapter_id
                and m.status = 'ativa'
            ),
            'membro'
          ) into v_new_role;
        end if;

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
          v_new_role,
          true
        )
        on conflict (chapter_id, user_id)
        do update set
          role_code = v_new_role,
          member_id = p_member_id,
          is_active = true,
          updated_at = now();

        v_rbac_sync_occurred := true;
      end if;
    end if;

    -- B) Sincroniza titular anterior (se houver, e se cargo foi desocupado ou transferido)
    if v_prev_member_id is not null and (p_member_id is null or v_prev_member_id <> p_member_id) then
      select profile_id into v_prev_profile_id
      from public.members
      where id = v_prev_member_id;

      if v_prev_profile_id is not null then
        -- Calcula o maior papel administrativo remanescente legítimo do titular anterior
        if exists (
          select 1 from public.members
          where id = v_prev_member_id and id_demolay in ('127738', '102836')
        ) then
          v_prev_role := 'master';
        else
          select coalesce(
            (
              select case
                when bool_or(mp.name in ('Mestre Conselheiro', 'Presidente do Conselho Consultivo', 'PCC')) then 'master'
                when bool_or(mp.name = 'Escrivão') then 'escrivao'
                when bool_or(mp.name = 'Tesoureiro') then 'tesoureiro'
                else 'membro'
              end
              from public.member_management_positions mmp
              join public.management_positions mp on mp.id = mmp.management_position_id
              join public.managements m on m.id = mp.management_id
              where mmp.member_id = v_prev_member_id
                and m.chapter_id = v_chapter_id
                and m.status = 'ativa'
            ),
            'membro'
          ) into v_prev_role;
        end if;

        update public.chapter_memberships
        set role_code = v_prev_role, updated_at = now()
        where chapter_id = v_chapter_id
          and user_id = v_prev_profile_id;

        v_rbac_sync_occurred := true;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'management_id', p_management_id,
    'position_name', v_canonical_name,
    'member_id', p_member_id,
    'assigned_role', v_target_role,
    'synchronized_with_rbac', v_rbac_sync_occurred
  );
end;
$$;

-- 3. Revogação de EXECUTE de anon e PUBLIC; concessão estrita a authenticated e service_role
REVOKE EXECUTE ON FUNCTION public.set_nominata_officer(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_nominata_officer(uuid, text, uuid) TO authenticated, service_role;
