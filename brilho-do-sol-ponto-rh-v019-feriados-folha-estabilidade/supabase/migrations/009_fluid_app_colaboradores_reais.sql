-- Cadastro inicial dos colaboradores reais informados em 10/07/2026.
-- Fonte: mensagem de coleta no WhatsApp + fichas PDF Fortes Pessoal anexadas.
-- O PIN é gravado com hash usando pgcrypto. A lista dos PINs iniciais está em docs/PINS_INICIAIS_COLABORADORES_BS.md.

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
    ('BS03-001', 'Irenilde Silva Moraes', '037.172.123-70', 'A definir', '33333333-3333-4333-8333-333333333333', 'mensalista', 0.00, 0.00, 'automatic', '4715', '07:00', '18:00', 540, 120, '10:00', '12:00', true, 'Mensagem WhatsApp - Filial 2 / BS 03 | Cargo/salário/horário pendente de conferência.'),
    ('AR-000013', 'Samuel da Paixão Colaço', '035.617.483-25', 'Operador de Caixa', '33333333-3333-4333-8333-333333333333', 'mensalista', 1680.00, 64.62, 'automatic', '3953', '07:00', '18:00', 540, 120, '14:00', '16:00', true, 'Mensagem WhatsApp + ficha A R MARTINS'),
    ('AR-000028', 'Bruna Ferreira', '049.505.923-43', 'Operadora de Caixa', '33333333-3333-4333-8333-333333333333', 'mensalista', 1680.00, 64.62, 'automatic', '3903', '08:00', '18:00', 480, 120, '12:00', '14:00', true, 'Mensagem WhatsApp + ficha A R MARTINS'),
    ('AR-000003', 'Antônio Carlos Silva da Conceição', '076.307.673-23', 'Entregador de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '1267', '07:00', '18:00', 540, 120, '11:00', '13:00', true, 'Mensagem WhatsApp + ficha A R MARTINS'),
    ('AB-000007', 'Mayara dos Reis Silva Bispo', '044.078.503-02', 'Repositora de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '9835', '07:00', '18:00', 540, 120, '11:00', '13:00', true, 'Mensagem WhatsApp + ficha ABENÇOADO; CPF da ficha oficial usado'),
    ('BS2-004', 'Jaqueline da Silva Oliveira', '636.761.933-00', 'A definir', '22222222-2222-4222-8222-222222222222', 'mensalista', 0.00, 0.00, 'automatic', '1293', '07:00', '18:00', 540, 120, '13:00', '15:00', true, 'Mensagem WhatsApp - Filial 01 / BS 2 | Cargo/salário/horário pendente de conferência.'),
    ('AR-000022', 'Valdeci Souza dos Santos', '608.517.683-00', 'Entregador de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '5909', '07:00', '18:00', 540, 120, '13:00', '15:00', true, 'Mensagem WhatsApp + ficha A R MARTINS'),
    ('BS2-005', 'Jean Kardek Santos da Silva', '053.039.033-70', 'A definir', '22222222-2222-4222-8222-222222222222', 'mensalista', 0.00, 0.00, 'automatic', '9323', '07:00', '18:00', 540, 120, '13:00', '15:00', true, 'Mensagem WhatsApp - Filial 01 / BS 2 | Cargo/salário/horário pendente de conferência.'),
    ('AR-000033', 'Alba Rejane Martins Borges', '471.374.443-34', 'Comerciante Varejista', '22222222-2222-4222-8222-222222222222', 'mensalista', 1621.00, 62.35, 'automatic', '4242', '08:00', '17:00', 480, 60, null, null, false, 'Ficha A R MARTINS - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('AR-000008', 'Antônio Santana da Costa', '010.619.813-04', 'Repositor de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '5646', '08:00', '17:00', 480, 60, null, null, false, 'Ficha A R MARTINS - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('AR-000026', 'Daiane Borges Vieira', '616.520.373-65', 'Operadora de Caixa', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '9213', '08:00', '17:00', 480, 60, null, null, false, 'Ficha A R MARTINS - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('AR-000030', 'Emerson Keneo da Silva Santos', '621.244.093-01', 'Entregador de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '8932', '08:00', '17:00', 480, 60, null, null, false, 'Ficha A R MARTINS - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('AR-000011', 'Gilvan Fernandes Ramos', '025.130.703-48', 'Entregador de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '3546', '08:00', '17:00', 480, 60, null, null, false, 'Ficha A R MARTINS - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('AB-000003', 'Antônio Domingos da Conceição', '031.607.533-79', 'Entregador de Mercadorias', '44444444-4444-4444-8444-444444444444', 'mensalista', 1680.00, 64.62, 'automatic', '2484', '08:00', '17:00', 480, 60, null, null, false, 'Ficha ABENÇOADO - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('DB-000004', 'Arnaldo Gomes dos Santos', '031.472.173-88', 'Repositor de Mercadorias', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '1950', '08:00', '17:00', 480, 60, null, null, false, 'Ficha D BORGES - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('DB-000006', 'Ediane Monteiro Silva', '004.399.002-98', 'Operadora de Caixa', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '2069', '08:00', '17:00', 480, 60, null, null, false, 'Ficha D BORGES - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('DB-000003', 'Edivania Ribeiro Pereira', '006.437.283-92', 'Repositora de Mercadorias', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '1556', '08:00', '17:00', 480, 60, null, null, false, 'Ficha D BORGES - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('DB-000005', 'Francisco Italo Cunha de Souza', '083.108.563-00', 'Vendedor(a)', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '4673', '08:00', '17:00', 480, 60, null, null, false, 'Ficha D BORGES - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('DB-000002', 'Givanilson Rodrigues de Oliveira', '604.845.403-19', 'Entregador de Mercadorias', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '1169', '08:00', '17:00', 480, 60, null, null, false, 'Ficha D BORGES - horário específico não informado | Cargo/salário/horário pendente de conferência.'),
    ('DB-000001', 'José Ricardo da Silva Frais', '604.251.873-90', 'Vendedor(a)', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '9293', '08:00', '17:00', 480, 60, null, null, false, 'Ficha D BORGES - horário específico não informado | Cargo/salário/horário pendente de conferência.')
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
  select 1 from public.employee_salary_history h where h.employee_id = upserted.id and h.effective_from = current_date
);

with seeded as (
  select id, branch_id, full_name, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes, expected_lunch_start_time, expected_lunch_end_time, schedule_confirmed
  from public.employees
  where document in ('037.172.123-70', '035.617.483-25', '049.505.923-43', '076.307.673-23', '044.078.503-02', '636.761.933-00', '608.517.683-00', '053.039.033-70', '471.374.443-34', '010.619.813-04', '616.520.373-65', '621.244.093-01', '025.130.703-48', '031.607.533-79', '031.472.173-88', '004.399.002-98', '006.437.283-92', '083.108.563-00', '604.845.403-19', '604.251.873-90')
), deleted as (
  delete from public.work_schedules ws
  using seeded s
  where ws.employee_id = s.id and ws.title = 'Escala principal'
  returning ws.id
)
insert into public.work_schedules (
  employee_id, branch_id, title, work_days, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes,
  expected_lunch_start_time, expected_lunch_end_time, effective_from, active
)
select id, branch_id, 'Escala principal', array[1,2,3,4,5,6], expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes,
  expected_lunch_start_time, expected_lunch_end_time, current_date, true
from seeded;

insert into public.system_settings (key, value) values
  ('admin_navigation_cache_enabled', 'true'::jsonb),
  ('payroll_pdf_premium_layout', 'true'::jsonb),
  ('employee_seed_batch_2026_07_10', to_jsonb(now()::text))
on conflict (key) do update set value = excluded.value;
