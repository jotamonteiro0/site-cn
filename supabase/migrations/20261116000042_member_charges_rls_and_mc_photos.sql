-- ==============================================================================
-- Migration 42: member_charges_rls_and_mc_photos.sql
--
-- 1. Fortalecimento da RLS em public.member_charges:
--    - Permite visualização irrestrita aos administradores e tesoureiros via public.has_chapter_role.
--    - Permite a cada membro consultar exclusivamente suas próprias cobranças
--      via função SECURITY DEFINER public.is_member_charge_owner(member_id),
--      resolvendo o vínculo de forma robusta por profile_id, e-mail autenticado
--      ou id_demolay nos metadados JWT (user_metadata / app_metadata).
--
-- 2. Atualização da função public.is_chapter_member(target_chapter uuid):
--    - Permite a qualquer membro ativo do Capítulo 500 consultar
--      as sessões e reuniões oficiais em public.meetings, períodos financeiros e frequências,
--      preservando o isolamento multi-tenant estrito (usuários de outros capítulos
--      ou inativos têm acesso estritamente bloqueado).
--
-- 3. Atualização da RLS de leitura em public.members:
--    - Permite aos membros consultarem seus próprios dados e aos Masters/Tesoureiros
--      consultarem o quadro completo.
--
-- 4. Sincronização definitiva das fotos históricas de Mestres Conselheiros:
--    - Registra e atualiza fotos em public.management_mc_photos para Cleison Almeida,
--      Tiago Moreira, Renandro Reis, Breno Correia, Rafael Rocha e Ezequias Júnior,
--      preservando as de Wesley Abreu, Caio Carvalho, Gustavo Vilarinho, João Guilherme,
--      José Keltton e Rafael Inácio.
-- ==============================================================================

-- 1. Função auxiliar SECURITY DEFINER para verificar posse de cobrança
CREATE OR REPLACE FUNCTION public.is_member_charge_owner(p_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_meta_id text := coalesce(auth.jwt() -> 'user_metadata' ->> 'id_demolay', auth.jwt() -> 'app_metadata' ->> 'id_demolay', '');
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = p_member_id AND (
      m.profile_id = v_uid
      OR (v_email <> '' AND m.email IS NOT NULL AND lower(m.email) = lower(v_email))
      OR (v_meta_id <> '' AND m.id_demolay IS NOT NULL AND m.id_demolay = v_meta_id)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_member_charge_owner(uuid) TO authenticated, service_role;

-- 2. Função helper public.has_chapter_role atualizada
CREATE OR REPLACE FUNCTION public.has_chapter_role(target_chapter uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_meta_id text := coalesce(auth.jwt() -> 'user_metadata' ->> 'id_demolay', auth.jwt() -> 'app_metadata' ->> 'id_demolay', '');
  v_email text := coalesce(auth.jwt() ->> 'email', '');
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Permanent masters homologados
  IF (v_meta_id IN ('127738', '102836') OR lower(v_email) IN ('joaomonteiro0@icloud.com', 'airton@carvalhoneves500.org.br')) 
     AND 'master' = ANY(allowed_roles) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.chapter_memberships
    WHERE chapter_id = target_chapter
      AND user_id = v_uid
      AND is_active = true
      AND role_code = ANY(allowed_roles)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_chapter_role(uuid, text[]) TO authenticated, service_role;

-- 3. Função helper public.is_chapter_member atualizada com isolamento multi-tenant estrito
CREATE OR REPLACE FUNCTION public.is_chapter_member(target_chapter uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_meta_id text := coalesce(auth.jwt() -> 'user_metadata' ->> 'id_demolay', auth.jwt() -> 'app_metadata' ->> 'id_demolay', '');
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 3.1 Se o usuário possuir vínculo em chapter_memberships para o capítulo alvo e estiver ativo
  IF EXISTS (
    SELECT 1 FROM public.chapter_memberships
    WHERE chapter_id = target_chapter
      AND user_id = v_uid
      AND is_active = true
  ) THEN
    RETURN true;
  END IF;

  -- 3.2 Se o usuário possuir registro inativo ou pertencer a outro capítulo em chapter_memberships, rejeita
  IF EXISTS (
    SELECT 1 FROM public.chapter_memberships
    WHERE user_id = v_uid
  ) THEN
    RETURN false;
  END IF;

  -- 3.3 Se o usuário for um membro ativo cadastrado no capítulo alvo
  RETURN EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.chapter_id = target_chapter
      AND m.is_active = true
      AND (
        m.profile_id = v_uid
        OR (v_email <> '' AND m.email IS NOT NULL AND lower(m.email) = lower(v_email))
        OR (v_meta_id <> '' AND m.id_demolay IS NOT NULL AND m.id_demolay = v_meta_id)
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_chapter_member(uuid) TO authenticated, service_role;

-- 4. Atualização da política RLS em public.member_charges
DROP POLICY IF EXISTS "Membro visualiza suas proprias cobrancas" ON public.member_charges;
CREATE POLICY "Membro visualiza suas proprias cobrancas"
ON public.member_charges FOR SELECT TO authenticated
USING (
  public.has_chapter_role(chapter_id, ARRAY['master'::text, 'tesoureiro'::text])
  OR public.is_member_charge_owner(member_id)
);

-- 5. Atualização da política RLS de consulta em public.members
DO $$
BEGIN
  DROP POLICY IF EXISTS "Membros visualizam quadro ou proprio registro" ON public.members;
  CREATE POLICY "Membros visualizam quadro ou proprio registro"
  ON public.members FOR SELECT TO authenticated
  USING (
    public.has_chapter_role(chapter_id, ARRAY['master'::text, 'admin'::text, 'tesoureiro'::text, 'escrivao'::text])
    OR profile_id = auth.uid()
    OR (email IS NOT NULL AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    OR (id_demolay IS NOT NULL AND (
      id_demolay = coalesce(auth.jwt() -> 'user_metadata' ->> 'id_demolay', '')
      OR id_demolay = coalesce(auth.jwt() -> 'app_metadata' ->> 'id_demolay', '')
    ))
  );
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

-- 6. Sincronização de fotos históricas em public.management_mc_photos
INSERT INTO public.management_mc_photos 
  (chapter_id, management_code, management_roman, management_title, periodo, status, destaque, member_name, photo_url, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000500', '2016.2', 'X', 'Gestão X', '2016.2', 'Past MC', false, 'Cleison Almeida', '/gestoes/cleison-almeida.2016.2.jpg', now()),
  ('00000000-0000-0000-0000-000000000500', '2017.1', 'XI', 'Gestão XI', '2017.1', 'Past MC', false, 'Breno Correia', '/gestoes/breno-correia.2017.1.jpg', now()),
  ('00000000-0000-0000-0000-000000000500', '2017.2', 'XII', 'Gestão XII', '2017.2', 'Past MC', false, 'Rafael Rocha', '/gestoes/rafael-rocha.2017.2.jpg', now()),
  ('00000000-0000-0000-0000-000000000500', '2018.1', 'XIII', 'Gestão XIII', '2018.1', 'Past MC', false, 'Ezequias Júnior', '/gestoes/ezequias-junior.2018.1.jpg', now()),
  ('00000000-0000-0000-0000-000000000500', '2015.1', 'VII', 'Gestão VII', '2015.1', 'Past MC', false, 'Renandro Reis', '/gestoes/renandro-reis.2015.1.jpg', now()),
  ('00000000-0000-0000-0000-000000000500', '2012.1', 'I / II', 'Gestão I / II (Fundação)', '2012.1', 'Past MC', false, 'Tiago Moreira', '/gestoes/tiago-moreira.2012.1.jpg', now())
ON CONFLICT (management_code) 
DO UPDATE SET 
  management_roman = EXCLUDED.management_roman,
  management_title = EXCLUDED.management_title,
  member_name = EXCLUDED.member_name,
  photo_url = EXCLUDED.photo_url,
  updated_at = now();
