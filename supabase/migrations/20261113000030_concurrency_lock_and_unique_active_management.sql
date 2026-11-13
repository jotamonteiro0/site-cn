-- ==============================================================================
-- MIGRATION 20261113000030: PROTEÇÃO COMPLETA CONTRA CONCORRÊNCIA NA ATIVAÇÃO DE GESTÕES
-- ==============================================================================
-- 1. Camada 1 — Serialização:
--    Atualiza a RPC public.activate_management para executar bloqueio pessimista
--    exclusivo na linha do capítulo (PERFORM 1 FROM public.chapters WHERE id = v_chapter_id FOR UPDATE).
--    Garante a serialização de todas as requisições de ativação para o mesmo capítulo,
--    evitando condições de corrida sem impactar ativações de outros capítulos.
-- 2. Camada 2 — Integridade Estrutural:
--    Cria índice único parcial garantindo que não possam existir duas gestões 'ativa'
--    no mesmo capítulo ao mesmo tempo (uq_one_active_management_per_chapter).
-- 3. Defesa em Profundidade:
--    Revoga privilégios DML residuais de escrita (INSERT, UPDATE, DELETE, TRUNCATE)
--    do papel anon nas tabelas managements, management_positions e member_management_positions.
-- ==============================================================================

-- 1. Criação do índice único parcial (Camada 2 - Integridade Estrutural)
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_management_per_chapter
ON public.managements (chapter_id)
WHERE (status = 'ativa');

-- 2. Revogação de privilégios de escrita residuais de anon
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.managements FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.management_positions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.member_management_positions FROM anon;

-- 3. Atualização da RPC activate_management com bloqueio pessimista (Camada 1 - Serialização)
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

  -- 1.1 Bloqueio pessimista da linha do capítulo (Camada 1: Serialização estrita de ativações por capítulo)
  perform 1
  from public.chapters
  where id = v_chapter_id
  for update;

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

  -- 4. Ativa a gestão selecionada (bloqueada e protegida pelo índice único parcial)
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
