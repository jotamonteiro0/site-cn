-- Sistema CN: fundação multi-institucional, autenticação, RBAC, dados e Storage.
-- Migration incremental: cria apenas objetos inexistentes; não remove dados ou tabelas.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9-]+$'), name text not null,
  number text not null, city text, state char(2), is_active boolean not null default true, is_public boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.chapter_settings (
  chapter_id uuid primary key references public.chapters(id), institutional_email text, meeting_weekday smallint check (meeting_weekday between 0 and 6),
  meeting_time time, meeting_location text, public_contact jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, full_name text not null default '', email text, phone text,
  avatar_path text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.permission_definitions (
  id uuid primary key default gen_random_uuid(), code text not null unique, description text not null, created_at timestamptz not null default now()
);
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(), code text not null unique check (code in ('master','escrivao','tesoureiro','membro')), name text not null, created_at timestamptz not null default now()
);
insert into public.user_roles (code,name) values ('master','Master'),('escrivao','Escrivão'),('tesoureiro','Tesoureiro'),('membro','Membro') on conflict (code) do nothing;
create table if not exists public.role_permissions (
  role_id uuid not null references public.user_roles(id) on delete cascade, permission_id uuid not null references public.permission_definitions(id) on delete cascade,
  primary key (role_id,permission_id)
);
create table if not exists public.chapter_memberships (
  id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), user_id uuid not null references auth.users(id),
  member_id uuid, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(chapter_id,user_id)
);
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), profile_id uuid references public.profiles(id),
  id_demolay text, full_name text not null, email text, phone text, birth_date date, initiation_date date, member_type text not null default 'demolay' check(member_type in ('demolay','macom','consultor')),
  status text not null default 'ativo' check(status in ('ativo','inativo','senior','desligado')), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique(chapter_id,id_demolay), unique(chapter_id,profile_id)
);
alter table public.chapter_memberships add constraint chapter_memberships_member_id_fkey foreign key (member_id) references public.members(id);
create table if not exists public.member_status_history (id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id), previous_status text, new_status text not null, reason text, changed_by uuid references public.profiles(id), created_at timestamptz not null default now());
create table if not exists public.member_degrees (id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id), degree text not null, granted_at date not null, notes text, created_at timestamptz not null default now());
create table if not exists public.member_positions_history (id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id), position_name text not null, started_at date not null, ended_at date, notes text, created_at timestamptz not null default now());
create table if not exists public.member_documents (id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id), document_type text not null, storage_path text not null, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), deleted_at timestamptz);
create table if not exists public.member_photos (id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id), storage_path text not null, is_primary boolean not null default false, approved_at timestamptz, created_at timestamptz not null default now());
create unique index if not exists member_photos_primary_unique on public.member_photos(member_id) where is_primary;

create table if not exists public.managements (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), code text not null, starts_on date not null, ends_on date, status text not null default 'ativa' check(status in ('planejada','ativa','encerrada')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(chapter_id,code));
create table if not exists public.management_positions (id uuid primary key default gen_random_uuid(), management_id uuid not null references public.managements(id), name text not null, sort_order smallint not null default 0, unique(management_id,name));
create table if not exists public.member_management_positions (id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id), management_position_id uuid not null references public.management_positions(id), starts_on date not null default current_date, ends_on date, unique(member_id,management_position_id,starts_on));

create table if not exists public.document_categories (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), name text not null, is_public boolean not null default false, unique(chapter_id,name));
create table if not exists public.documents (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), category_id uuid references public.document_categories(id), management_id uuid references public.managements(id), title text not null, description text, visibility text not null default 'members' check(visibility in ('public','members','staff')), status text not null default 'draft' check(status in ('draft','published','archived')), created_by uuid references public.profiles(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table if not exists public.document_versions (id uuid primary key default gen_random_uuid(), document_id uuid not null references public.documents(id), version_number integer not null, storage_path text not null, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), unique(document_id,version_number));
create table if not exists public.document_access_logs (id uuid primary key default gen_random_uuid(), document_id uuid not null references public.documents(id), profile_id uuid references public.profiles(id), accessed_at timestamptz not null default now());

create table if not exists public.meeting_types (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), name text not null, unique(chapter_id,name));
create table if not exists public.meetings (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), management_id uuid references public.managements(id), meeting_type_id uuid references public.meeting_types(id), title text not null, starts_at timestamptz not null, location text, description text, status text not null default 'agendada' check(status in ('agendada','realizada','cancelada')), responsible_id uuid references public.profiles(id), created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), cancelled_at timestamptz);
create index if not exists meetings_chapter_starts_at_idx on public.meetings(chapter_id,starts_at desc);
create table if not exists public.meeting_agendas (id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.meetings(id), title text not null, description text, sort_order smallint not null default 0);
create table if not exists public.meeting_attendance (id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.meetings(id), member_id uuid not null references public.members(id), confirmation_at timestamptz, status text not null default 'ausente' check(status in ('presente','ausente','justificado')), recorded_by uuid references public.profiles(id), recorded_at timestamptz, notes text, unique(meeting_id,member_id));
create table if not exists public.meeting_justifications (id uuid primary key default gen_random_uuid(), attendance_id uuid not null unique references public.meeting_attendance(id), reason text not null, storage_path text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.meeting_minutes (id uuid primary key default gen_random_uuid(), meeting_id uuid not null unique references public.meetings(id), content text, storage_path text, status text not null default 'draft', created_by uuid references public.profiles(id), published_at timestamptz, updated_at timestamptz not null default now());
create table if not exists public.meeting_media (id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.meetings(id), storage_path text not null, caption text, is_public boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.meeting_tasks (id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.meetings(id), title text not null, assignee_id uuid references public.profiles(id), due_at timestamptz, status text not null default 'aberta', created_at timestamptz not null default now());

create table if not exists public.member_majority_records (id uuid primary key default gen_random_uuid(), member_id uuid not null unique references public.members(id), reaches_majority_on date not null, status text not null default 'monitorar' check(status in ('monitorar','notificado','transicionado')), notified_at timestamptz, transitioned_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.member_status_transitions (id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id), from_status text not null, to_status text not null, reason text, authorized_by uuid references public.profiles(id), created_at timestamptz not null default now());

create table if not exists public.financial_accounts (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), name text not null, account_type text not null, is_active boolean not null default true, unique(chapter_id,name));
create table if not exists public.financial_categories (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), name text not null, category_type text not null check(category_type in ('receita','despesa')), unique(chapter_id,name,category_type));
create table if not exists public.financial_periods (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), year smallint not null, month smallint not null check(month between 1 and 12), status text not null default 'aberto', unique(chapter_id,year,month));
create table if not exists public.chapter_fees (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), name text not null, payer_type text not null check(payer_type in ('demolay','macom')), amount numeric(12,2) not null check(amount >= 0), starts_on date not null, ends_on date, is_active boolean not null default true);
create table if not exists public.member_charges (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), member_id uuid references public.members(id), payer_name text, payer_type text not null check(payer_type in ('demolay','macom')), financial_period_id uuid references public.financial_periods(id), description text not null, amount numeric(12,2) not null check(amount >= 0), due_date date, status text not null default 'pendente' check(status in ('pendente','aguardando_confirmacao','confirmado','recusado','cancelado','estornado')), created_at timestamptz not null default now(), unique(member_id,financial_period_id,description));
create table if not exists public.payment_methods (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), name text not null, provider text, is_active boolean not null default true, unique(chapter_id,name));
create table if not exists public.payments (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), charge_id uuid not null references public.member_charges(id), payment_method_id uuid references public.payment_methods(id), amount numeric(12,2) not null check(amount > 0), status text not null default 'aguardando_confirmacao' check(status in ('pendente','aguardando_confirmacao','confirmado','recusado','cancelado','estornado')), external_reference text, paid_at timestamptz, confirmed_at timestamptz, confirmed_by uuid references public.profiles(id), created_at timestamptz not null default now());
create table if not exists public.payment_proofs (id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments(id), storage_path text not null, uploaded_by uuid references public.profiles(id), created_at timestamptz not null default now());
create table if not exists public.financial_transactions (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), account_id uuid references public.financial_accounts(id), category_id uuid references public.financial_categories(id), transaction_type text not null check(transaction_type in ('receita','despesa')), amount numeric(12,2) not null check(amount > 0), occurred_at timestamptz not null default now(), description text, created_by uuid references public.profiles(id), created_at timestamptz not null default now());
create table if not exists public.financial_statements (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), period_id uuid references public.financial_periods(id), storage_path text, generated_by uuid references public.profiles(id), created_at timestamptz not null default now());
create table if not exists public.financial_audit_logs (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), entity_type text not null, entity_id uuid not null, action text not null, previous_data jsonb, next_data jsonb, actor_id uuid references public.profiles(id), created_at timestamptz not null default now());

create table if not exists public.request_categories (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), name text not null, target_role text check(target_role in ('master','escrivao','tesoureiro')), unique(chapter_id,name));
create table if not exists public.member_requests (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), requester_member_id uuid not null references public.members(id), category_id uuid references public.request_categories(id), protocol text not null unique default ('CN-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))), target_role text, assigned_to uuid references public.profiles(id), status text not null default 'aberta' check(status in ('aberta','em_analise','aguardando_informacoes','aprovada','recusada','concluida','cancelada')), description text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.request_messages (id uuid primary key default gen_random_uuid(), request_id uuid not null references public.member_requests(id), author_id uuid references public.profiles(id), message text not null, created_at timestamptz not null default now());
create table if not exists public.request_attachments (id uuid primary key default gen_random_uuid(), request_id uuid not null references public.member_requests(id), storage_path text not null, uploaded_by uuid references public.profiles(id), created_at timestamptz not null default now());
create table if not exists public.request_history (id uuid primary key default gen_random_uuid(), request_id uuid not null references public.member_requests(id), status text not null, actor_id uuid references public.profiles(id), notes text, created_at timestamptz not null default now());

create table if not exists public.notifications (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), profile_id uuid not null references public.profiles(id), title text not null, body text not null, type text not null default 'sistema', read_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.notification_preferences (profile_id uuid primary key references public.profiles(id), email_enabled boolean not null default true, whatsapp_enabled boolean not null default false, updated_at timestamptz not null default now());
create table if not exists public.notification_deliveries (id uuid primary key default gen_random_uuid(), notification_id uuid not null references public.notifications(id), channel text not null, status text not null default 'pendente', delivered_at timestamptz, error_message text);
create table if not exists public.notification_templates (id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id), code text not null, subject text not null, body text not null, unique(chapter_id,code));
create table if not exists public.audit_logs (id uuid primary key default gen_random_uuid(), chapter_id uuid references public.chapters(id), actor_id uuid references public.profiles(id), action text not null, entity_type text not null, entity_id uuid, before_data jsonb, after_data jsonb, created_at timestamptz not null default now());
create table if not exists public.login_history (id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id), ip inet, user_agent text, created_at timestamptz not null default now());
create table if not exists public.security_events (id uuid primary key default gen_random_uuid(), chapter_id uuid references public.chapters(id), profile_id uuid references public.profiles(id), event_type text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());

create or replace function public.is_chapter_member(target_chapter uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from chapter_memberships where chapter_id=target_chapter and user_id=auth.uid() and is_active) $$;
-- O papel é atribuído por capítulo, evitando que uma mesma conta receba privilégios em outra instituição.
alter table public.chapter_memberships add column if not exists role_code text not null default 'membro' check(role_code in ('master','escrivao','tesoureiro','membro'));
create or replace function public.has_chapter_role(target_chapter uuid, allowed_roles text[]) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from chapter_memberships where chapter_id=target_chapter and user_id=auth.uid() and is_active and role_code = any(allowed_roles)) $$;

do $$ declare t text; begin
  foreach t in array array['chapters','chapter_settings','profiles','permission_definitions','user_roles','role_permissions','chapter_memberships','members','member_status_history','member_degrees','member_positions_history','member_documents','member_photos','managements','management_positions','member_management_positions','document_categories','documents','document_versions','document_access_logs','meeting_types','meetings','meeting_agendas','meeting_attendance','meeting_justifications','meeting_minutes','meeting_media','meeting_tasks','member_majority_records','member_status_transitions','financial_accounts','financial_categories','financial_periods','chapter_fees','member_charges','payment_methods','payments','payment_proofs','financial_transactions','financial_statements','financial_audit_logs','request_categories','member_requests','request_messages','request_attachments','request_history','notifications','notification_preferences','notification_deliveries','notification_templates','audit_logs','login_history','security_events'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy "public chapters" on public.chapters for select using (is_public and is_active);
create policy "own profile" on public.profiles for select using (id=auth.uid());
create policy "update own profile" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());
create policy "own membership" on public.chapter_memberships for select using (user_id=auth.uid());
create policy "staff members" on public.members for select using (has_chapter_role(chapter_id,array['master','escrivao']));
create policy "own member record" on public.members for select using (profile_id=auth.uid());
create policy "chapter meetings" on public.meetings for select using (is_chapter_member(chapter_id));
create policy "staff manage meetings" on public.meetings for all using (has_chapter_role(chapter_id,array['master','escrivao'])) with check (has_chapter_role(chapter_id,array['master','escrivao']));
create policy "own attendance" on public.meeting_attendance for select using (exists(select 1 from members m where m.id=member_id and m.profile_id=auth.uid()));
create policy "staff attendance" on public.meeting_attendance for all using (exists(select 1 from meetings mt where mt.id=meeting_id and has_chapter_role(mt.chapter_id,array['master','escrivao']))) with check (exists(select 1 from meetings mt where mt.id=meeting_id and has_chapter_role(mt.chapter_id,array['master','escrivao'])));
create policy "own requests" on public.member_requests for select using (exists(select 1 from members m where m.id=requester_member_id and m.profile_id=auth.uid()));
create policy "create own requests" on public.member_requests for insert with check (exists(select 1 from members m where m.id=requester_member_id and m.profile_id=auth.uid() and m.chapter_id=chapter_id));
create policy "staff requests" on public.member_requests for all using (has_chapter_role(chapter_id,array['master','escrivao','tesoureiro'])) with check (has_chapter_role(chapter_id,array['master','escrivao','tesoureiro']));
create policy "own notifications" on public.notifications for select using (profile_id=auth.uid());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
('brasao','brasao',true,5242880,array['image/png','image/jpeg','image/webp']),('gestoes','gestoes',true,10485760,array['image/png','image/jpeg','image/webp']),('atividades','atividades',true,10485760,array['image/png','image/jpeg','image/webp']),('membros','membros',false,5242880,array['image/png','image/jpeg','image/webp']),('documentos','documentos',false,26214400,array['application/pdf']),('comprovantes','comprovantes',false,10485760,array['application/pdf','image/png','image/jpeg']),('solicitacoes','solicitacoes',false,10485760,array['application/pdf','image/png','image/jpeg']),('declaracoes','declaracoes',false,5242880,array['application/pdf']) on conflict (id) do nothing;
create policy "public media read" on storage.objects for select using (bucket_id in ('brasao','gestoes','atividades'));
create policy "authenticated private upload" on storage.objects for insert to authenticated with check (bucket_id in ('membros','documentos','comprovantes','solicitacoes','declaracoes') and owner_id=auth.uid()::text);

-- Sincronização automática entre auth.users e public.profiles
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when profiles.full_name = '' or profiles.full_name is null then excluded.full_name else profiles.full_name end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Políticas adicionais essenciais de leitura
create policy "authenticated read user_roles" on public.user_roles
  for select to authenticated using (true);

create policy "public chapter settings" on public.chapter_settings
  for select using (exists (
    select 1 from public.chapters c
    where c.id = chapter_settings.chapter_id and c.is_public and c.is_active
  ));

create policy "staff chapter memberships" on public.chapter_memberships
  for select using (has_chapter_role(chapter_id, array['master', 'escrivao']));

create policy "public managements" on public.managements
  for select using (true);

create policy "public management positions" on public.management_positions
  for select using (true);

create policy "public member management positions" on public.member_management_positions
  for select using (true);

-- Semente Oficial do Capítulo Piloto: Carvalho Neves Nº 500
insert into public.chapters (id, slug, name, number, city, state, is_active, is_public)
values (
  '00000000-0000-0000-0000-000000000500',
  'carvalho-neves-500',
  'Capítulo Professor Carvalho Neves',
  '500',
  'Teresina',
  'PI',
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  number = excluded.number,
  city = excluded.city,
  state = excluded.state,
  is_active = excluded.is_active,
  is_public = excluded.is_public;

insert into public.chapter_settings (chapter_id, institutional_email, meeting_weekday, meeting_time, meeting_location, public_contact)
values (
  '00000000-0000-0000-0000-000000000500',
  'contato@carvalhoneves500.org.br',
  6,
  '16:00:00',
  'Loja Maçônica Caridade II Nº 02 - Teresina/PI',
  '{"cidade": "Teresina - PI", "loja_patrocinadora": "A.R.L.S. Caridade II Nº 02"}'::jsonb
)
on conflict (chapter_id) do nothing;

