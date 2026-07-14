-- Revisão operacional 2026-07-10
-- Objetivos:
-- 1) padronizar nomes oficiais das unidades: Matriz, Vila Biné, Construção e Filial 1° de Maio;
-- 2) reorganizar colaboradores nas unidades corretas conforme coletas enviadas;
-- 3) atualizar horários de trabalho e almoço;
-- 4) preparar diagnóstico de GPS e deixar o raio padrão em 900m.

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

-- Unidades oficiais. As coordenadas abaixo são pontos iniciais em Codó-MA;
-- ajuste a posição real pelo painel Filiais antes de liberar batidas oficiais.
insert into public.branches (id, name, type, address, latitude, longitude, allowed_radius_meters, geofence_enabled, active)
values
  ('11111111-1111-4111-8111-111111111111', 'Brilho do Sol Matriz', 'matriz', 'Codó - MA | ajustar endereço real da matriz no painel', -4.4559000, -43.8857000, 900, true, true),
  ('22222222-2222-4222-8222-222222222222', 'Brilho do Sol Filial 1° de Maio', 'filial', 'Codó - MA | ajustar endereço real da Filial 1° de Maio no painel', -4.4563000, -43.8872000, 900, true, true),
  ('33333333-3333-4333-8333-333333333333', 'Brilho do Sol Vila Biné', 'filial', 'Codó - MA | ajustar endereço real da Vila Biné no painel', -4.4549000, -43.8849000, 900, true, true),
  ('55555555-5555-4555-8555-555555555555', 'Brilho do Sol Construção', 'filial', 'Codó - MA | ajustar endereço real da Construção no painel', -4.4539000, -43.8864000, 900, true, true)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  address = excluded.address,
  allowed_radius_meters = excluded.allowed_radius_meters,
  geofence_enabled = excluded.geofence_enabled,
  active = excluded.active,
  updated_at = now();

-- Unidade legada consolidada na Construção para evitar duplicidade operacional.
update public.branches
set name = 'Brilho do Sol Construção - legado',
    active = false,
    updated_at = now()
where id = '44444444-4444-4444-8444-444444444444';

with incoming(registration_code, full_name, document, role, branch_id, employment_type, monthly_salary, daily_rate, daily_rate_mode, pin_plain, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes, expected_lunch_start_time, expected_lunch_end_time, schedule_confirmed, profile_notes) as (
  values
    -- Vila Biné / antigo BS 03
    ('BSVB-001', 'Irenilde Silva Moraes', '037.172.123-70', 'A definir', '33333333-3333-4333-8333-333333333333', 'mensalista', 0.00, 0.00, 'automatic', '4715', '07:00', '18:00', 540, 120, '10:00', '12:00', true, 'Coleta WhatsApp: Filial 2/BS03 organizada como Brilho do Sol Vila Biné. Cargo/salário pendentes.'),
    ('BSVB-002', 'Samuel da Paixão Colaço', '035.617.483-25', 'Operador de Caixa', '33333333-3333-4333-8333-333333333333', 'mensalista', 1680.00, 64.62, 'automatic', '3953', '07:00', '18:00', 540, 120, '14:00', '16:00', true, 'Coleta WhatsApp + ficha: organizado na Vila Biné.'),
    ('BSVB-003', 'Bruna Ferreira', '049.505.923-43', 'Operadora de Caixa', '33333333-3333-4333-8333-333333333333', 'mensalista', 1680.00, 64.62, 'automatic', '3903', '08:00', '18:00', 480, 120, '12:00', '14:00', true, 'Coleta WhatsApp + ficha: organizado na Vila Biné.'),

    -- Filial 1° de Maio / antigo BS 2
    ('BS1M-001', 'Antônio Carlos Silva da Conceição', '076.307.673-23', 'Entregador de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '1267', '07:00', '18:00', 540, 120, '11:00', '13:00', true, 'Coleta WhatsApp: Filial 01/BS2 organizada como Brilho do Sol Filial 1° de Maio.'),
    ('BS1M-002', 'Mayara dos Reis Silva Bispo', '044.078.503-02', 'Repositora de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '9835', '07:00', '18:00', 540, 120, '11:00', '13:00', true, 'Coleta WhatsApp + ficha. CPF oficial da ficha mantido. Organizada na Filial 1° de Maio.'),
    ('BS1M-003', 'Jaqueline da Silva Oliveira', '636.761.933-00', 'A definir', '22222222-2222-4222-8222-222222222222', 'mensalista', 0.00, 0.00, 'automatic', '1293', '07:00', '18:00', 540, 120, '13:00', '15:00', true, 'Coleta WhatsApp: Filial 01/BS2 organizada como Brilho do Sol Filial 1° de Maio. Cargo/salário pendentes.'),
    ('BS1M-004', 'Valdeci Souza dos Santos', '608.517.683-00', 'Entregador de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '5909', '07:00', '18:00', 540, 120, '13:00', '15:00', true, 'Coleta WhatsApp: Filial 01/BS2 organizada como Brilho do Sol Filial 1° de Maio.'),
    ('BS1M-005', 'Jean Kardek Santos da Silva', '053.039.033-70', 'A definir', '22222222-2222-4222-8222-222222222222', 'mensalista', 0.00, 0.00, 'automatic', '9323', '07:00', '18:00', 540, 120, '13:00', '15:00', true, 'Coleta WhatsApp: Filial 01/BS2 organizada como Brilho do Sol Filial 1° de Maio. Cargo/salário pendentes.'),
    ('BS1M-006', 'Gilvan Fernandes Ramos', '025.130.703-48', 'Entregador de Mercadorias', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '3546', '07:00', '18:00', 540, 120, '12:00', '14:00', true, 'Coleta WhatsApp: organizado na Filial 1° de Maio.'),
    ('BS1M-007', 'Alba Rejane Martins Borges', '471.374.443-34', 'Comerciante Varejista', '22222222-2222-4222-8222-222222222222', 'mensalista', 1621.00, 62.35, 'automatic', '4242', '08:00', '17:00', 480, 60, null, null, false, 'Ficha: organizada na Filial 1° de Maio; horário específico pendente.'),
    ('BS1M-008', 'Daiane Borges Vieira', '616.520.373-65', 'Operadora de Caixa', '22222222-2222-4222-8222-222222222222', 'mensalista', 1680.00, 64.62, 'automatic', '9213', '08:00', '17:00', 480, 60, null, null, false, 'Ficha: organizada na Filial 1° de Maio; horário específico pendente.'),

    -- Construção
    ('BSC-001', 'José Ricardo da Silva Frais', '604.251.873-90', 'Vendedor(a)', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '9293', '07:00', '17:00', 480, 120, '11:00', '13:00', true, 'Coleta WhatsApp: pertence ao Brilho do Sol Construção.'),
    ('BSC-002', 'Francisco Italo Cunha de Souza', '083.108.563-00', 'Vendedor(a)', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '4673', '07:00', '18:00', 540, 120, '13:00', '15:00', true, 'Coleta WhatsApp: pertence ao Brilho do Sol Construção.'),
    ('BSC-003', 'Emerson Kenio da Silva Santos', '621.244.093-01', 'Entregador de Mercadorias', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '8932', '07:00', '18:00', 540, 120, '12:00', '14:00', true, 'Coleta WhatsApp: pertence ao Brilho do Sol Construção. Grafia atualizada conforme coleta.'),
    ('BSC-004', 'Givanilson Rodrigues de Oliveira', '604.845.403-19', 'Entregador de Mercadorias', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '1169', '07:00', '18:00', 540, 120, '12:00', '14:00', true, 'Coleta WhatsApp anterior: organizado no Brilho do Sol Construção.'),
    ('BSC-005', 'Antônio Domingos da Conceição', '031.607.533-79', 'Entregador de Mercadorias', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '2484', '07:00', '18:00', 540, 120, '12:00', '14:00', true, 'Coleta WhatsApp anterior. CPF preenchido pela ficha. Unidade legada consolidada no Brilho do Sol Construção.'),
    ('BSC-006', 'Ediane Monteiro Silva', '004.399.002-98', 'Operadora de Caixa', '55555555-5555-4555-8555-555555555555', 'mensalista', 1680.00, 64.62, 'automatic', '2069', '08:00', '17:00', 480, 60, null, null, false, 'Ficha: organizada no Brilho do Sol Construção; horário específico pendente.'),

    -- Matriz
    ('BSM-001', 'Alannys Lorena de Carvalho Silva', '625.820.903-36', 'A definir', '11111111-1111-4111-8111-111111111111', 'mensalista', 0.00, 0.00, 'automatic', '7426', '09:00', '19:00', 480, 120, '13:00', '15:00', true, 'Coleta WhatsApp: Matriz. Cargo/salário pendentes.'),
    ('BSM-002', 'Carlos Eduardo de Sousa Araújo Ribeiro', '082.128.713-39', 'A definir', '11111111-1111-4111-8111-111111111111', 'mensalista', 0.00, 0.00, 'automatic', '3819', '13:00', '19:00', 360, 0, null, null, true, 'Coleta WhatsApp: Matriz. Sem intervalo informado; deixado em branco. Cargo/salário pendentes.'),
    ('BSM-003', 'Marcos Paulos Lopes dos Santos', '631.315.263-86', 'A definir', '11111111-1111-4111-8111-111111111111', 'mensalista', 0.00, 0.00, 'automatic', '9064', '08:00', '19:00', 480, 180, '13:00', '16:00', true, 'Coleta WhatsApp: Matriz. Cargo/salário pendentes.'),
    ('BSM-004', 'Edvânia Ribeiro Pereira', '006.437.283-92', 'Repositora de Mercadorias', '11111111-1111-4111-8111-111111111111', 'mensalista', 1680.00, 64.62, 'automatic', '1556', '08:00', '19:00', 480, 180, '13:00', '16:00', true, 'Coleta WhatsApp: Matriz. Atualiza unidade e horário.'),
    ('BSM-005', 'Arnaldo Gomes dos Santos', '031.472.173-88', 'Repositor de Mercadorias', '11111111-1111-4111-8111-111111111111', 'mensalista', 1680.00, 64.62, 'automatic', '1950', '06:00', '19:00', 600, 180, '10:00', '13:00', true, 'Coleta WhatsApp: Matriz. CPF estava em branco na coleta e foi mantido pela ficha.'),
    ('BSM-006', 'Wannyson David Santos da Silva', '031.299.243-29', 'A definir', '11111111-1111-4111-8111-111111111111', 'mensalista', 0.00, 0.00, 'automatic', '5279', '08:00', '19:00', 480, 180, '13:00', '16:00', true, 'Coleta WhatsApp: Matriz. Cargo/salário pendentes.'),
    ('BSM-007', 'Antônio Santana da Costa', '010.619.813-04', 'Repositor de Mercadorias', '11111111-1111-4111-8111-111111111111', 'mensalista', 1680.00, 64.62, 'automatic', '5646', '06:00', '16:00', 480, 120, '11:00', '13:00', true, 'Coleta WhatsApp: Matriz. Atualiza unidade e horário.')
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
    work_days = excluded.work_days,
    allow_overtime = excluded.allow_overtime,
    active = true,
    updated_at = now()
  returning id, document, full_name, branch_id, monthly_salary, daily_rate, daily_rate_mode, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes, expected_lunch_start_time, expected_lunch_end_time, schedule_confirmed
)
insert into public.employee_salary_history (employee_id, monthly_salary, daily_rate, daily_rate_mode, effective_from)
select id, monthly_salary, daily_rate, daily_rate_mode, current_date
from upserted
where not exists (
  select 1 from public.employee_salary_history h
  where h.employee_id = upserted.id
    and h.effective_from = current_date
    and h.monthly_salary = upserted.monthly_salary
    and h.daily_rate = upserted.daily_rate
);

with pessoas as (
  select id, branch_id, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes, expected_lunch_start_time, expected_lunch_end_time
  from public.employees
  where document in (
    '037.172.123-70','035.617.483-25','049.505.923-43','076.307.673-23','044.078.503-02','636.761.933-00','608.517.683-00','053.039.033-70','025.130.703-48','471.374.443-34','616.520.373-65','604.251.873-90','083.108.563-00','621.244.093-01','604.845.403-19','031.607.533-79','004.399.002-98','625.820.903-36','082.128.713-39','631.315.263-86','006.437.283-92','031.472.173-88','031.299.243-29','010.619.813-04'
  )
), deleted as (
  delete from public.work_schedules ws
  using pessoas p
  where ws.employee_id = p.id and ws.title = 'Escala principal'
  returning ws.id
)
insert into public.work_schedules (
  employee_id, branch_id, title, work_days, expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes,
  expected_lunch_start_time, expected_lunch_end_time, effective_from, active
)
select id, branch_id, 'Escala principal', array[1,2,3,4,5,6], expected_start_time, expected_end_time, expected_daily_minutes, expected_lunch_minutes,
  expected_lunch_start_time, expected_lunch_end_time, current_date, true
from pessoas;

insert into public.system_settings (key, value) values
  ('gps_diagnostic_enabled', 'true'::jsonb),
  ('official_branch_names_2026_07_10', 'true'::jsonb),
  ('default_radius_meters', '900'::jsonb),
  ('employee_branch_reorganization_2026_07_10', to_jsonb(now()::text))
on conflict (key) do update set value = excluded.value;
