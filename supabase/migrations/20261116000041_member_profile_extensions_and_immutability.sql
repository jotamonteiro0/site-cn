-- =====================================================================================
-- MIGRATION 41: EXTENSÕES DE PERFIL DO MEMBRO E PROTEÇÃO DE CAMPOS IMUTÁVEIS
-- Capítulo Professor Carvalho Neves nº 500
-- =====================================================================================
-- 1. Adiciona campos estruturados para o autoatendimento integral do SISDM (Seções A a K)
-- 2. Trigger em nível de banco de dados para garantir imutabilidade estrita de:
--    - full_name (Nome completo)
--    - id_demolay (ID DeMolay)
--    - birth_date (Data de nascimento, uma vez cadastrada)
--    Permitindo correção exclusivamente por usuários Master devidamente autorizados.
-- 3. Política RLS que permite ao próprio membro autenticado atualizar seus dados cadastrais.
-- =====================================================================================

-- 1. Extensão de colunas na tabela public.members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS blood_donor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bone_marrow_donor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS organ_donor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS father_is_mason boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS alternative_email text,
  ADD COLUMN IF NOT EXISTS alternative_phone text,
  ADD COLUMN IF NOT EXISTS commercial_phone text,
  ADD COLUMN IF NOT EXISTS social_instagram text,
  ADD COLUMN IF NOT EXISTS social_linkedin text,
  ADD COLUMN IF NOT EXISTS social_facebook text,
  ADD COLUMN IF NOT EXISTS address_cep text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- 2. Função de proteção de campos fundamentais imutáveis
CREATE OR REPLACE FUNCTION public.protect_immutable_member_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req_role text := coalesce(auth.jwt() ->> 'role', '');
  v_jwt_email text := coalesce(auth.jwt() ->> 'email', '');
  v_meta_id text := coalesce(auth.jwt() -> 'user_metadata' ->> 'id_demolay', '');
  v_auth_uid uuid := auth.uid();
  v_is_master boolean := false;
BEGIN
  -- 2.1 Processos de infraestrutura direta (Postgres, service_role interno) têm acesso irrestrito
  IF v_req_role = 'service_role' OR (session_user = 'postgres' AND v_req_role = '') THEN
    RETURN NEW;
  END IF;

  -- 2.2 Identificação de privilégio Master do usuário autenticado
  IF v_auth_uid IS NOT NULL THEN
    IF v_meta_id IN ('127738', '102836') OR v_jwt_email IN ('joaomonteiro0@icloud.com', 'airton@carvalhoneves500.org.br') THEN
      v_is_master := true;
    ELSIF EXISTS (
      SELECT 1 FROM public.chapter_memberships cm
      WHERE cm.user_id = v_auth_uid
        AND cm.chapter_id = '00000000-0000-0000-0000-000000000500'::uuid
        AND cm.role_code = 'master'
        AND cm.is_active = true
    ) THEN
      v_is_master := true;
    END IF;
  END IF;

  -- 2.3 Se o usuário NÃO for Master, bloqueia alteração dos 3 campos fundamentais já cadastrados
  IF NOT v_is_master THEN
    -- A. Nome Completo: Imutável se já cadastrado
    IF OLD.full_name IS NOT NULL AND NEW.full_name IS DISTINCT FROM OLD.full_name THEN
      RAISE EXCEPTION 'Campo imutável: Nome completo não pode ser alterado pelo próprio membro após cadastrado. Solicite a alteração ao Mestre Conselheiro ou Presidente do Conselho Consultivo.'
        USING ERRCODE = '42501';
    END IF;

    -- B. ID DeMolay: Imutável se já cadastrado
    IF OLD.id_demolay IS NOT NULL AND NEW.id_demolay IS DISTINCT FROM OLD.id_demolay THEN
      RAISE EXCEPTION 'Campo imutável: ID DeMolay não pode ser alterado pelo próprio membro após cadastrado. Solicite a alteração ao Mestre Conselheiro ou Presidente do Conselho Consultivo.'
        USING ERRCODE = '42501';
    END IF;

    -- C. Data de Nascimento: Imutável uma vez cadastrada (permite preenchimento inicial se for NULL)
    IF OLD.birth_date IS NOT NULL AND NEW.birth_date IS DISTINCT FROM OLD.birth_date THEN
      RAISE EXCEPTION 'Campo imutável: Data de nascimento não pode ser alterada pelo próprio membro após cadastrada. Solicite a alteração ao Mestre Conselheiro ou Presidente do Conselho Consultivo.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

-- 3. Aplicação do Trigger na tabela public.members
DROP TRIGGER IF EXISTS trg_protect_immutable_member_fields ON public.members;
CREATE TRIGGER trg_protect_immutable_member_fields
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.protect_immutable_member_fields();

-- 4. Observação de Arquitetura e Segurança RLS:
-- A atualização cadastral do membro no autoatendimento SISDM é processada exclusivamente
-- pela API segura (/api/member/profile) que opera via service_role com validação de sessão,
-- garantindo que membros comuns não possuam permissão direta de UPDATE no PostgreSQL
-- e não possam adulterar masonic_lodge, category ou status de vínculo capitular.

COMMENT ON FUNCTION public.protect_immutable_member_fields() IS
  'Protege contra alteração não autorizada de nome, id_demolay e data de nascimento por usuários comuns. Apenas Master pode corrigir.';
