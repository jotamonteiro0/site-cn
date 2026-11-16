-- ====================================================================
-- MIGRATION 20261113000031: REGRA INSTITUCIONAL DE VIGÊNCIA DAS GESTÕES
-- Capítulo DeMolay Professor Carvalho Neves nº 500
--
-- Fundamentação Litúrgica e Regimental:
-- 1. Início Oficial da Gestão:
--    - O Mestre Conselheiro informa a data oficial de sua instalação/posse solene.
--    - Essa data é registrada no banco como início oficial (starts_on).
--    - O sistema utiliza o registro oficial sem datas fixas espalhadas pelo código.
--
-- 2. Encerramento da Gestão:
--    - Acontece na data efetiva da Assembleia Capitular de encerramento realizada.
--    - A data prevista da Assembleia Capitular de encerramento (expected_close_date) é mantida
--      SEPARADAMENTE da data efetiva de encerramento (ends_on).
--    - A gestão permanece ativa até que seu encerramento seja formalmente registrado por procedimento
--      administrativo autorizado.
--    - A passagem de seis meses NÃO encerra a gestão.
--    - A chegada de janeiro, por si só, NÃO encerra a gestão.
--    - Não se inventam datas de assembleias nem se presume que uma data prevista representa encerramento realizado.
--
-- 3. Nova Gestão:
--    - A posse do novo Mestre Conselheiro ocorre em janeiro, conforme o calendário institucional.
--    - A data de instalação informada inicia oficialmente a nova gestão.
--    - A ativação respeita o fluxo administrativo e a restrição de unicidade (uq_one_active_management_per_chapter).
--    - Não se cria nem se ativa automaticamente uma nova gestão sem autorização administrativa.
--
-- 4. Estados Canônicos:
--    - Programada ("planejada"): instalação ainda não ocorreu.
--    - Ativa ("ativa"): instalação ocorreu e o encerramento ainda não foi formalmente registrado.
--    - Encerrada ("encerrada"): Assembleia Capitular de encerramento realizada e registrada.
--
-- 5. Gestão XXV:
--    - Data de instalação solene: 08/08/2026.
--    - NÃO determina 08/02/2027 como data de encerramento.
--    - ends_on permanece NULL enquanto a gestão estiver em exercício ativo.
--    - expected_close_date registra a previsão para dezembro de 2026 conforme calendário capitular.
-- ====================================================================

-- 1. Adiciona coluna para armazenar a data prevista da Assembleia Capitular de encerramento
alter table public.managements
  add column if not exists expected_close_date date;

comment on column public.managements.expected_close_date is
  'Data prevista para a realização da Assembleia Capitular de encerramento da gestão, separada da data efetiva.';

-- 2. Alinhamento canônico da Gestão XXV (2026.2):
--    - Início oficial (instalação): 08/08/2026
--    - Previsão da Assembleia de encerramento: 2026-12-20
--    - Encerramento efetivo (ends_on): NULL (em exercício ativo pleno)
--    - Status: ativa
update public.managements
set
  starts_on = '2026-08-08',
  expected_close_date = '2026-12-20',
  ends_on = null,
  status = 'ativa',
  updated_at = now()
where id = '00000000-0000-0000-0000-000000002026'
   or code = '2026.2';

-- 3. Atualiza os oficiais nomeados da Gestão XXV (starts_on oficial = 08/08/2026, ends_on = NULL)
update public.member_management_positions
set
  starts_on = '2026-08-08',
  ends_on = null
where management_position_id in (
  select id from public.management_positions
  where management_id in (
    select id from public.managements
    where id = '00000000-0000-0000-0000-000000002026' or code = '2026.2'
  )
);

-- 4. Alinhamento da Gestão XXVI (2027.1 - Programada para Janeiro):
--    - Início previsto (posse solene em janeiro): 2027-01-16
--    - Previsão da Assembleia de encerramento: 2027-06-30
--    - Encerramento efetivo (ends_on): NULL
--    - Status: planejada (Programada)
update public.managements
set
  starts_on = '2027-01-16',
  expected_close_date = '2027-06-30',
  ends_on = null,
  status = 'planejada',
  updated_at = now()
where id = '00000000-0000-0000-0000-000000002027'
   or code = '2027.1';
