-- v018 — correção de performance do painel, filiais da folha e criação de administradores.
-- Migration incremental e não destrutiva.

create extension if not exists "pgcrypto";

-- Compatibilidade com bancos que não receberam todas as migrations intermediárias.
alter type public.admin_role add value if not exists 'admin_geral';
alter type public.admin_role add value if not exists 'gerente_filial';

alter table public.admin_users
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists branch_id uuid references public.branches(id) on delete set null,
  add column if not exists allowed_branch_ids uuid[] not null default '{}',
  add column if not exists can_view_financial_data boolean not null default false,
  add column if not exists active boolean not null default true;

alter table public.branches
  add column if not exists google_maps_url text,
  add column if not exists map_place_id text,
  add column if not exists geofence_enabled boolean not null default true;

-- Garante as quatro unidades oficiais utilizadas nos filtros da folha.
insert into public.branches (
  id, name, type, address, latitude, longitude,
  allowed_radius_meters, geofence_enabled, active
) values
  ('11111111-1111-4111-8111-111111111111', 'Brilho do Sol Matriz', 'matriz', 'Codó - MA | atualizar endereço e GPS real no painel', -4.4559000, -43.8857000, 900, true, true),
  ('33333333-3333-4333-8333-333333333333', 'Brilho do Sol Vila Biné', 'filial', 'Codó - MA | atualizar endereço e GPS real no painel', -4.4549000, -43.8849000, 900, true, true),
  ('55555555-5555-4555-8555-555555555555', 'Brilho do Sol Construção', 'filial', 'Codó - MA | atualizar endereço e GPS real no painel', -4.4539000, -43.8864000, 900, true, true),
  ('22222222-2222-4222-8222-222222222222', 'Brilho do Sol Filial 1° de Maio', 'filial', 'Codó - MA | atualizar endereço e GPS real no painel', -4.4563000, -43.8872000, 900, true, true)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  active = true,
  geofence_enabled = coalesce(public.branches.geofence_enabled, excluded.geofence_enabled),
  updated_at = now();

-- Vincula perfis administrativos antigos ao usuário real do Supabase Auth.
update public.admin_users au
set auth_user_id = u.id,
    updated_at = now()
from auth.users u
where au.auth_user_id is null
  and lower(au.email) = lower(u.email);

-- Master deve enxergar todas as unidades, mesmo que um vínculo legado tenha sido salvo.
update public.admin_users
set branch_id = null,
    allowed_branch_ids = '{}',
    active = true,
    can_view_financial_data = true,
    updated_at = now()
where role::text = 'master_admin';

create index if not exists idx_admin_users_email_lower_v018
  on public.admin_users(lower(email));
create index if not exists idx_admin_users_auth_active_v018
  on public.admin_users(auth_user_id, active);
create index if not exists idx_branches_active_name_v018
  on public.branches(active, name);
create index if not exists idx_employees_branch_active_name_v018
  on public.employees(branch_id, active, full_name);
create index if not exists idx_payroll_periods_branch_created_v018
  on public.payroll_periods(branch_id, created_at desc);
create index if not exists idx_time_entries_branch_date_v018
  on public.time_entries(branch_id, entry_date);

analyze public.admin_users;
analyze public.branches;
analyze public.employees;
analyze public.payroll_periods;
analyze public.time_entries;
