-- ====================================================================
-- MIGRATION 20261110000013: NOMINATA OFICIAL DA GESTÃO ATIVA (2026.2)
-- Cadastro completo dos 22 oficiais da Gestão XXV (2026.2)
-- e vinculação com os respectivos acessos do sistema
-- ====================================================================

-- 1. Garante que todas as posições (incluindo Preceptores e Consultores) existam
insert into public.management_positions (management_id, name, sort_order)
values
  ('00000000-0000-0000-0000-000000002026', 'Organista', 15),
  ('00000000-0000-0000-0000-000000002026', '2º Preceptor', 17),
  ('00000000-0000-0000-0000-000000002026', '3º Preceptor', 18),
  ('00000000-0000-0000-0000-000000002026', '4º Preceptor', 19),
  ('00000000-0000-0000-0000-000000002026', '5º Preceptor', 20),
  ('00000000-0000-0000-0000-000000002026', '6º Preceptor', 21),
  ('00000000-0000-0000-0000-000000002026', '7º Preceptor', 22),
  ('00000000-0000-0000-0000-000000002026', 'Consultor da Organização', 23)
on conflict (management_id, name) do nothing;

-- 2. Limpa registros anteriores para a Gestão 2026.2
delete from public.member_management_positions
where management_position_id in (
  select id from public.management_positions
  where management_id = '00000000-0000-0000-0000-000000002026'
);

-- 3. Insere a Nominata Oficial com os 22 membros designados
-- Mestre Conselheiro: Rafael Inácio do Nascimento de Morais
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select 'ed81f7d4-4c3a-45fa-827c-15be3a9433ac', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Mestre Conselheiro';

-- Presidente do Conselho Consultivo (PCC): Ericles Oliveira Guerra
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '8a17db9f-9e5f-44b4-b68d-ada82ce49e15', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Presidente do Conselho Consultivo';

-- 1º Conselheiro: Josue de Melo Servio Rodrigues
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '376da514-6353-4db1-922a-3f5aaa0fcb30', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Primeiro Conselheiro';

-- 2º Conselheiro: Luis Eduardo Soares Frota
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '9e4fa01f-4a92-445b-813b-8d45f236ad9b', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Segundo Conselheiro';

-- Escrivão: Waldecy Goncalves de Araujo Neto
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '880846f4-51c2-430a-b7ad-eca0ae7f9335', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Escrivão';

-- Tesoureiro: Aloísio Oliveira Neto
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select 'beff133e-c601-4892-98ec-f05278dc9caf', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Tesoureiro';

-- Orador: João Guilherme Martins Lopes Monteiro
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select 'afacfcf3-653e-4911-a9f1-5d4657d4dc7a', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Orador';

-- 1º Diácono: Felipe Rocha de Sousa
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '4bbc7413-e985-4b18-bdca-d52274a7f4f3', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Primeiro Diácono';

-- 2º Diácono: Carlos Eduardo Bonfim Tupinambá
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '95f4d2ec-b923-415f-9799-35492bfcfb69', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Segundo Diácono';

-- 1º Mordomo: Aluizio Gonzaga de Carvalho Neto
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select 'caf9edb7-ab91-43a9-a9c3-85c290be5d8c', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Primeiro Mordomo';

-- 2º Mordomo: Caio Sérgio Ximenes Maia
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select 'd661a92e-52b7-49c7-af22-0f2cf46b39f4', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Segundo Mordomo';

-- Capelão: Hugo Carvalho Fonseca Lima
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select 'ed13f20d-a367-42e5-b245-e24254eb7940', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Capelão';

-- Mestre de Cerimônias: José Keltton da Silva Cardoso Viana
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '0731b040-667c-4d07-93c5-ba327677ccc7', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Mestre de Cerimônias';

-- Hospitaleiro: Rubens Inacio Bezerra de Morais Fortes
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select 'dd384e6e-6737-4201-a142-40c4d752c1d4', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Hospitaleiro';

-- Organista: Emanuel Arêa Leão Chagas Melo
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select 'b621716f-5ade-4efb-abd7-63647c627fb1', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Organista';

-- 2º Preceptor: João Yves Ribeiro Alencar
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select 'b6d9c4b1-d93b-4e4b-a929-4b3281b03652', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = '2º Preceptor';

-- 3º Preceptor: Arthur Araújo Noronha
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '1d8e82c6-1abe-4660-9144-73696b90a16c', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = '3º Preceptor';

-- 4º Preceptor: Luca Gabriel Barros
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '83564dd7-41cb-45ea-bb7a-e546b6abb2b2', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = '4º Preceptor';

-- 5º Preceptor: Kaiky Coelho Soares
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '92f23913-376f-4002-8fd3-c85befc00345', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = '5º Preceptor';

-- 6º Preceptor: Gabriel Rufino Silva
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '8e48e95b-6462-4f04-8822-ec2b7a6a8ce3', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = '6º Preceptor';

-- 7º Preceptor: Inácio Gabriel de Melo Pereira
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select '7b3c397e-febd-4e29-9440-d61488a686e9', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = '7º Preceptor';

-- Consultor da Organização: Epaminondas Coutinho Feitosa Júnior
insert into public.member_management_positions (member_id, management_position_id, starts_on)
select 'a1ad924d-8e8b-4617-b00f-b741ab583e17', id, '2026-07-01'
from public.management_positions where management_id = '00000000-0000-0000-0000-000000002026' and name = 'Consultor da Organização';

-- 4. Função aprimorada para sincronizar role ao cadastrar usuário/perfil
create or replace function public.sync_profile_role_from_active_nominata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_role text := 'membro';
  v_active_mgmt_id uuid;
  v_pos_name text;
begin
  -- Procura o membro pelo email ou pelo perfil já vinculado
  select id into v_member_id
  from public.members
  where (profile_id = new.id or (email is not null and lower(email) = lower(new.email)))
  limit 1;

  if v_member_id is not null then
    -- Vincula profile_id no membro caso ainda não esteja
    update public.members
    set profile_id = new.id
    where id = v_member_id and profile_id is null;

    -- Descobre a gestão ativa
    select id into v_active_mgmt_id
    from public.managements
    where chapter_id = '00000000-0000-0000-0000-000000000500' and status = 'ativa'
    limit 1;

    -- Verifica se o membro ocupa algum cargo com papel administrativo
    if v_active_mgmt_id is not null then
      select mp.name into v_pos_name
      from public.member_management_positions mmp
      join public.management_positions mp on mp.id = mmp.management_position_id
      where mp.management_id = v_active_mgmt_id and mmp.member_id = v_member_id
      limit 1;

      if v_pos_name in ('Mestre Conselheiro', 'Presidente do Conselho Consultivo', 'PCC') then
        v_role := 'master';
      elsif v_pos_name = 'Escrivão' then
        v_role := 'escrivao';
      elsif v_pos_name = 'Tesoureiro' then
        v_role := 'tesoureiro';
      end if;
    end if;

    -- Se for o João Guilherme (desenvolvedor / admin master), mantém master sempre
    if new.email ilike '%joaomonteiro%' then
      v_role := 'master';
    end if;

    insert into public.chapter_memberships (
      chapter_id,
      user_id,
      member_id,
      role_code,
      is_active
    )
    values (
      '00000000-0000-0000-0000-000000000500',
      new.id,
      v_member_id,
      v_role,
      true
    )
    on conflict (chapter_id, user_id)
    do update set
      role_code = excluded.role_code,
      member_id = v_member_id,
      is_active = true,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_role on public.profiles;
create trigger trg_sync_profile_role
after insert or update on public.profiles
for each row execute function public.sync_profile_role_from_active_nominata();
