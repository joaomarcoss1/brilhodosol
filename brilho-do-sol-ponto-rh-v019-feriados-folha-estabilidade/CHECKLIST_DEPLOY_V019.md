# Checklist de deploy — v019

## 1. Backup

Antes de aplicar migrations:

- faça backup do banco Supabase;
- exporte `admin_users`, `employees`, `payroll_periods`, `payroll_items`, `time_entries`, `holidays` e `system_settings`;
- confirme que o deploy atual está estável.

## 2. Banco Supabase

Em uma base que já está na v018, execute:

```text
supabase/migrations/018_v019_holiday_operations_payroll_hardening.sql
```

Caso a migration v017 anterior tenha falhado por policy duplicada, utilize o arquivo corrigido incluído neste pacote:

```text
supabase/migrations/016_v017_seguranca_final_homologacao_producao.sql
```

Depois confirme que a v018 está aplicada:

```text
supabase/migrations/017_v018_admin_performance_branches.sql
```

E finalize com a v019:

```text
supabase/migrations/018_v019_holiday_operations_payroll_hardening.sql
```

Não execute arquivos antigos e corrigidos da v017 em paralelo. O arquivo `016` deste pacote já substitui a versão defeituosa.

## 3. Conferências SQL

```sql
select id, holiday_id, branch_id, operation_status, decided_at
from public.holiday_operation_decisions
order by created_at desc;
```

```sql
select key, value
from public.system_settings
where key = 'holiday_decision_notification_days';
```

```sql
select policyname, tablename
from pg_policies
where schemaname = 'public'
  and (policyname like 'v017 %' or policyname like 'v019 %')
order by tablename, policyname;
```

## 4. Variáveis da Vercel

Obrigatórias:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
COMPANY_REPORT_NAME=Brilho do Sol Supermercado
DEFAULT_TIMEZONE=America/Fortaleza
```

Somente para a configuração inicial, quando ainda não existir master ativo:

```env
MASTER_ADMIN_EMAIL=
MASTER_ADMIN_NAME=
MASTER_ADMIN_PASSWORD=
MASTER_SETUP_TOKEN=
```

Depois que o master estiver criado, mantenha o token protegido. Ele não aparece mais no login diário.

## 5. Validação local

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run migrations:check
npm run build
npm run dev
```

## 6. Homologação funcional

- Abra `/admin/feriados`.
- Teste feriado global como aberto.
- Teste feriado global como fechado.
- Teste decisão específica por filial.
- Confirme que feriado pendente bloqueia o fechamento da folha.
- Gere primeira e segunda quinzena de um mensalista.
- Confira se cada quinzena usa 50% da base mensal.
- Teste dois registros de hora extra aprovados no mesmo dia.
- Gere folha por uma filial e confirme que não aparecem funcionários de outra.
- Crie um administrador regional com múltiplas filiais.
- Teste o portal mobile do funcionário com o PIN existente.
- Gere PDF e Excel com os filtros aplicados.

## 7. GitHub

```powershell
git add -A
git commit -m "Atualiza Brilho do Sol Ponto RH para v019"
git pull origin main --rebase
git push origin main
```
