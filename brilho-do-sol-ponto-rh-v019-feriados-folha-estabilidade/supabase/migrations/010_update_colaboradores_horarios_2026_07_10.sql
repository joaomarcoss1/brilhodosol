-- Atualização complementar dos colaboradores informados em 10/07/2026.
-- Fonte: nova coleta via WhatsApp + fichas Fortes Pessoal já anexadas.
-- Objetivo: atualizar horários reais de Givanilson, Antônio Domingos e Gilvan; manter PINs iniciais já gerados.

create extension if not exists "pgcrypto";

alter table public.employees add column if not exists expected_lunch_start_time time;
alter table public.employees add column if not exists expected_lunch_end_time time;
alter table public.employees add column if not exists schedule_confirmed boolean not null default false;
alter table public.employees add column if not exists profile_notes text;

alter table public.work_schedules add column if not exists expected_lunch_start_time time;
alter table public.work_schedules add column if not exists expected_lunch_end_time time;

create unique index if not exists idx_employees_document_unique
  on public.employees(document)
  where document is not null and document <> '';

insert into public.branches (id, name, type, address, latitude, longitude, allowed_radius_meters, active) values
  ('11111111-1111-4111-8111-111111111111', 'Brilho do Sol Matriz', 'matriz', 'Codó - MA | ajustar endereço real no painel', -4.4559000, -43.8857000, 900, true),
  ('22222222-2222-4222-8222-222222222222', 'Brilho do Sol Filial 01 / BS 2', 'filial', 'Codó - MA | ajustar endereço real da BS 2 no painel', -4.4563000, -43.8872000, 900, true),
  ('33333333-3333-4333-8333-333333333333', 'Brilho do Sol Filial 2 / BS 03', 'filial', 'Codó - MA | ajustar endereço real da BS 03 no painel', -4.4549000, -43.8849000, 900, true),
  ('44444444-4444-4444-8444-444444444444', 'Brilho do Sol Abençoado', 'filial', 'Codó - MA | ajustar endereço real no painel', -4.4572000, -43.8838000, 900, true),
  ('55555555-5555-4555-8555-555555555555', 'Brilho do Sol D Borges', 'filial', 'Codó - MA | ajustar endereço real no painel', -4.4539000, -43.8864000, 900, true)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  address = excluded.address,
  allowed_radius_meters = excluded.allowed_radius_meters,
  active = excluded.active,
  updated_at = now();

with incoming(registration_code, full_name, document, role, branch_id, employment_type, monthly_salary, daily_rate, daily_rate_mode, pin_plain, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes, expected_lunch_start_time, expected_lunch_end_time, schedule_confirmed, profile_notes) as (
  values
    ('DB-000002', 'Givanilson Rodrigues de Oliveira', '604.845.403-19', 'Entregador de Mercadorias', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '1169', '07:00', '18:00', 540, 120, '12:00', '14:00', true, 'Atualizado pela coleta WhatsApp Brilho do Sol em 10/07/2026. CPF/cargo/salário conferidos pela ficha D BORGES. Horário confirmado: 07:00-12:00 / 14:00-18:00.'),
    ('AB-000003', 'Antônio Domingos da Conceição', '031.607.533-79', 'Entregador de Mercadorias', '44444444-4444-4444-8444-444444444444', 'mensalista', 1680.00, 64.62, 'automatic', '2484', '07:00', '18:00', 540, 120, '12:00', '14:00', true, 'Atualizado pela coleta WhatsApp Brilho do Sol em 10/07/2026. CPF estava em branco na coleta e foi preenchido pela ficha ABENÇOADO/D SANTOS. Horário confirmado: 07:00-12:00 / 14:00-18:00.'),
    ('AR-000011', 'Gilvan Fernandes Ramos', '025.130.703-48', 'Entregador de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '3546', '07:00', '18:00', 540, 120, '12:00', '14:00', true, 'Atualizado pela coleta WhatsApp Brilho do Sol em 10/07/2026. CPF/cargo/salário conferidos pela ficha A R MARTINS. Horário confirmado: 07:00-12:00 / 14:00-18:00.')
), upserted as (
  insert into public.employees (
    registration_code, full_name, document, role, branch_id, employment_type, monthly_salary, daily_rate, daily_rate_mode,
    pin_hash, active, admission_date, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes,
    expected_lunch_start_time, expected_lunch_end_time, schedule_confirmed, profile_notes, work_days, allow_overtime
  )
  select
    registration_code, full_name, document, role, branch_id::uuid, employment_type::employment_type, monthly_salary, daily_rate, daily_rate_mode::daily_rate_mode,
    crypt(pin_plain, gen_salt('bf')), true, current_date, expected_start_time::time, expected_end_time::time, expected_daily_minutes, expected_lunch_minutes,
    expected_lunch_start_time::time, expected_lunch_end_time::time, schedule_confirmed, profile_notes, array[1,2,3,4,5,6], true
  from incoming
  on conflict (document) where document is not null and document <> '' do update set
    registration_code = excluded.registration_code,
    full_name = excluded.full_name,
    role = excluded.role,
    branch_id = excluded.branch_id,
    employment_type = excluded.employment_type,
    monthly_salary = excluded.monthly_salary,
    daily_rate = excluded.daily_rate,
    daily_rate_mode = excluded.daily_rate_mode,
    pin_hash = coalesce(public.employees.pin_hash, excluded.pin_hash),
    expected_start_time = excluded.expected_start_time,
    expected_end_time = excluded.expected_end_time,
    expected_daily_minutes = excluded.expected_daily_minutes,
    expected_lunch_minutes = excluded.expected_lunch_minutes,
    expected_lunch_start_time = excluded.expected_lunch_start_time,
    expected_lunch_end_time = excluded.expected_lunch_end_time,
    schedule_confirmed = excluded.schedule_confirmed,
    profile_notes = excluded.profile_notes,
    active = true,
    updated_at = now()
  returning id, document, registration_code, full_name, branch_id, monthly_salary, daily_rate, daily_rate_mode, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes, expected_lunch_start_time, expected_lunch_end_time, schedule_confirmed
)
insert into public.employee_salary_history (employee_id, monthly_salary, daily_rate, daily_rate_mode, effective_from)
select id, monthly_salary, daily_rate, daily_rate_mode, current_date
from upserted
where not exists (
  select 1 from public.employee_salary_history h
  where h.employee_id = upserted.id
    and h.effective_from = current_date
    and h.monthly_salary = upserted.monthly_salary
);

with atualizados as (
  select id, branch_id, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes, expected_lunch_start_time, expected_lunch_end_time
  from public.employees
  where document in ('604.845.403-19', '031.607.533-79', '025.130.703-48')
), deleted as (
  delete from public.work_schedules ws
  using atualizados a
  where ws.employee_id = a.id and ws.title = 'Escala principal'
  returning ws.id
)
insert into public.work_schedules (
  employee_id, branch_id, title, work_days, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes,
  expected_lunch_start_time, expected_lunch_end_time, effective_from, active
)
select id, branch_id, 'Escala principal', array[1,2,3,4,5,6], expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes,
  expected_lunch_start_time, expected_lunch_end_time, current_date, true
from atualizados;

insert into public.system_settings (key, value) values
  ('employee_update_batch_2026_07_10_2', to_jsonb(now()::text)),
  ('employee_update_batch_2026_07_10_2_total', '3'::jsonb)
on conflict (key) do update set value = excluded.value;
