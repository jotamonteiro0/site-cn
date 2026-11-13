-- ==============================================================================
-- MIGRATION 20261113000029: BLINDAGEM DA ATIVAÇÃO DE GESTÕES E NOMINATA COMPLETA
-- ==============================================================================
-- 1. Hardening estrito da RPC public.activate_management:
--    - SECURITY DEFINER com SET search_path = ''
--    - Validação de autorização no servidor (exclusivo para Master do capítulo)
--    - Validação de isolamento do capítulo (chapter_id)
--    - Encerramento atômico de gestões anteriores
--    - Recálculo inteligente e atômico de RBAC para todos os membros do capítulo:
--      * Preservação incondicional de Master para IDs 127738 e 102836
--      * Concessão de Master para o novo Mestre Conselheiro e novo Presidente do Conselho (PCC)
--      * Concessão de Escrivão e Tesoureiro para os respectivos ocupantes nomeados
--      * Rebaixamento para 'membro' dos oficiais da gestão anterior que não possuem
--        outra nomeação ativa ou proteção permanente
--    - Revogação de privilégios de execução para PUBLIC e anon; concessão a authenticated e service_role
-- 2. Criação da RPC public.create_management_with_positions:
--    - Validação de autorização no servidor (Master e Escrivão)
--    - Criação de gestão com status 'planejada'
--    - População automática e padronizada das 25 posições canônicas da Ordem DeMolay
--    - Prevenção contra duplicidades de código
-- ==============================================================================

-- 1. Hardening da RPC activate_management
CREATE OR REPLACE FUNCTION public.activate_management(p_management_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
declare
  v_chapter_id uuid;
  v_is_master boolean;
  v_mgmt_title text;
  v_officer_record record;
  v_membership_record record;
  v_assigned_role text;
  v_synced_count integer := 0;
begin
  -- 1. Localiza a gestão e seu capítulo
  select chapter_id, title into v_chapter_id, v_mgmt_title
  from public.managements
  where id = p_management_id;

  if v_chapter_id is null then
    raise exception 'Gestão não encontrada';
  end if;

  -- 2. Valida autorização estrita no servidor (Apenas Master do Capítulo pode empossar/ativar gestão)
  select exists(
    select 1 from public.chapter_memberships
    where chapter_id = v_chapter_id
      and user_id = (select auth.uid())
      and is_active = true
      and role_code = 'master'
  ) into v_is_master;

  if not v_is_master then
    raise exception 'Permissão negada: apenas usuários com papel Master podem ativar uma gestão capitular';
  end if;

  -- 3. Encerra gestões ativas anteriores do mesmo capítulo
  update public.managements
  set status = 'encerrada', updated_at = now()
  where chapter_id = v_chapter_id
    and status = 'ativa'
    and id <> p_management_id;

  -- 4. Ativa a gestão selecionada
  update public.managements
  set status = 'ativa', updated_at = now()
  where id = p_management_id;

  -- 5. Garante que novos oficiais empossados que possuem conta auth tenham vínculo em chapter_memberships
  for v_officer_record in
    select distinct mmp.member_id, m.profile_id
    from public.member_management_positions mmp
    join public.management_positions mp on mp.id = mmp.management_position_id
    join public.members m on m.id = mmp.member_id
    where mp.management_id = p_management_id
      and m.profile_id is not null
      and m.chapter_id = v_chapter_id
  loop
    insert into public.chapter_memberships (
      chapter_id,
      user_id,
      member_id,
      role_code,
      is_active
    )
    values (
      v_chapter_id,
      v_officer_record.profile_id,
      v_officer_record.member_id,
      'membro',
      true
    )
    on conflict (chapter_id, user_id)
    do update set
      member_id = v_officer_record.member_id,
      is_active = true;
  end loop;

  -- 6. Recalcula atômica e globalmente o RBAC de todos os vínculos de membros do capítulo
  for v_membership_record in
    select cm.id as membership_id, cm.user_id, cm.member_id, m.id_demolay
    from public.chapter_memberships cm
    left join public.members m on m.id = cm.member_id
    where cm.chapter_id = v_chapter_id
  loop
    -- A) Mantenedores permanentes (IDs 127738 e 102836) SEMPRE permanecem Master
    if v_membership_record.id_demolay in ('127738', '102836') then
      v_assigned_role := 'master';
    else
      -- B) Recalcula a maior nomeação administrativa ativa da nova gestão ativa
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
          where mmp.member_id = v_membership_record.member_id
            and m.chapter_id = v_chapter_id
            and m.status = 'ativa'
        ),
        'membro'
      ) into v_assigned_role;
    end if;

    update public.chapter_memberships
    set role_code = v_assigned_role,
        updated_at = now()
    where id = v_membership_record.membership_id
      and role_code <> v_assigned_role;

    v_synced_count := v_synced_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'activated_management_id', p_management_id,
    'management_title', v_mgmt_title,
    'chapter_id', v_chapter_id,
    'synchronized_memberships_count', v_synced_count
  );
end;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_management(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_management(uuid) TO authenticated, service_role;

-- 2. Criação da RPC create_management_with_positions
CREATE OR REPLACE FUNCTION public.create_management_with_positions(
  p_chapter_id uuid,
  p_code text,
  p_title text,
  p_starts_on date,
  p_ends_on date,
  p_theme text default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
declare
  v_is_authorized boolean;
  v_new_mgmt_id uuid;
  v_positions constant text[] := ARRAY[
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
    'Porta-Estandarte',
    'Organista',
    'Sentinela',
    '1º Preceptor',
    '2º Preceptor',
    '3º Preceptor',
    '4º Preceptor',
    '5º Preceptor',
    '6º Preceptor',
    '7º Preceptor',
    'Consultor da Organização'
  ];
  v_pos_name text;
  v_sort_idx smallint := 1;
begin
  -- 1. Validação de autorização no servidor (Master ou Escrivão do Capítulo)
  select exists(
    select 1 from public.chapter_memberships
    where chapter_id = p_chapter_id
      and user_id = (select auth.uid())
      and is_active = true
      and role_code = any(ARRAY['master'::text, 'escrivao'::text])
  ) into v_is_authorized;

  if not v_is_authorized then
    raise exception 'Permissão negada: apenas Master ou Escrivão podem cadastrar novas gestões';
  end if;

  -- 2. Validação de formato do código e datas
  if p_code is null or length(trim(p_code)) < 3 then
    raise exception 'Código da gestão inválido. Informe o ano e semestre (ex: 2027.2)';
  end if;

  if p_starts_on is null then
    raise exception 'Data de início do mandato é obrigatória';
  end if;

  -- 3. Insere a nova gestão com status inicial 'planejada'
  insert into public.managements (
    chapter_id,
    code,
    title,
    theme,
    starts_on,
    ends_on,
    status
  )
  values (
    p_chapter_id,
    trim(p_code),
    trim(coalesce(p_title, 'Gestão ' || trim(p_code))),
    nullif(trim(p_theme), ''),
    p_starts_on,
    p_ends_on,
    'planejada'
  )
  returning id into v_new_mgmt_id;

  -- 4. Insere automaticamente as 25 posições canônicas da Ordem DeMolay
  foreach v_pos_name in array v_positions loop
    insert into public.management_positions (
      management_id,
      name,
      sort_order
    )
    values (
      v_new_mgmt_id,
      v_pos_name,
      v_sort_idx
    );
    v_sort_idx := v_sort_idx + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'management_id', v_new_mgmt_id,
    'code', p_code,
    'title', p_title,
    'status', 'planejada',
    'positions_count', array_length(v_positions, 1)
  );
end;
$$;

REVOKE EXECUTE ON FUNCTION public.create_management_with_positions(uuid, text, text, date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_management_with_positions(uuid, text, text, date, date, text) TO authenticated, service_role;
