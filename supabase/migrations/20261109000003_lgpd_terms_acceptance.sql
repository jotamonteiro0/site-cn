-- -------------------------------------------------------------
-- Conformidade LGPD: Registro de Aceite de Termos e Privacidade
-- -------------------------------------------------------------
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists parental_consent_at timestamptz,
  add column if not exists parental_consent_name text;

comment on column public.profiles.terms_accepted_at is 'Data e hora do aceite dos Termos de Uso';
comment on column public.profiles.privacy_accepted_at is 'Data e hora do aceite da Política de Privacidade (LGPD)';
comment on column public.profiles.parental_consent_at is 'Data e hora do consentimento formal do responsável legal (para menores de 18 anos)';
comment on column public.profiles.parental_consent_name is 'Nome completo do responsável legal que anuiu';
