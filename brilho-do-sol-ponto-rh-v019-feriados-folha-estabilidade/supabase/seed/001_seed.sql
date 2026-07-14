-- Seed limpo de produção: configurações e unidades-base sem funcionários fictícios.
-- Cadastros de funcionários devem ser feitos pela tela /admin/funcionarios ou importados por Excel/PDF.

insert into public.system_settings (key, value) values
  ('late_tolerance_minutes', '15'::jsonb),
  ('early_leave_tolerance_minutes', '15'::jsonb),
  ('default_radius_meters', '900'::jsonb),
  ('overtime_multiplier', '1.5'::jsonb),
  ('daily_rate_calculation', '"expected_work_days"'::jsonb),
  ('company_name', '"Brilho do Sol Supermercado"'::jsonb),
  ('company_document', '""'::jsonb),
  ('company_address', '"Codó - MA"'::jsonb),
  ('report_footer', '"Relatório oficial gerado pelo Brilho do Sol Ponto RH"'::jsonb)
on conflict (key) do update set value = excluded.value;

-- Coordenadas-base aproximadas de Codó-MA para impedir filial sem geofence.
-- Antes do uso oficial, ajuste cada unidade no painel de Filiais usando o mapa/GPS real da loja.
insert into public.branches (id, name, type, address, latitude, longitude, allowed_radius_meters, active) values
  ('11111111-1111-4111-8111-111111111111', 'Brilho do Sol Matriz', 'matriz', 'Codó - MA | ajustar endereço real no painel', -4.4559000, -43.8857000, 900, true),
  ('22222222-2222-4222-8222-222222222222', 'Brilho do Sol Filial 1', 'filial', 'Codó - MA | ajustar endereço real no painel', -4.4563000, -43.8872000, 900, true),
  ('33333333-3333-4333-8333-333333333333', 'Brilho do Sol Filial 2', 'filial', 'Codó - MA | ajustar endereço real no painel', -4.4549000, -43.8849000, 900, true),
  ('44444444-4444-4444-8444-444444444444', 'Brilho do Sol Filial 3', 'filial', 'Codó - MA | ajustar endereço real no painel', -4.4572000, -43.8838000, 900, true),
  ('55555555-5555-4555-8555-555555555555', 'Brilho do Sol Filial 4', 'filial', 'Codó - MA | ajustar endereço real no painel', -4.4539000, -43.8864000, 900, true)
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  allowed_radius_meters = excluded.allowed_radius_meters,
  active = excluded.active;
