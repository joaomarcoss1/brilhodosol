# Checklist de Deploy — Vercel e Supabase

## VS Code

```powershell
npm install
npm run typecheck
npm run lint
npm run build
```

## Supabase

Rodar a migration nova após a v016:

```txt
supabase/migrations/016_v017_seguranca_final_homologacao_producao.sql
```

Validar:

- Funções `current_admin_id`, `current_admin_profile`, `has_financial_permission` e `can_access_branch` criadas.
- View `admin_employees_safe` criada.
- Coluna `payroll_periods.idempotency_key` criada.
- Índice único `idx_payroll_periods_idempotency_key` criado.

## Vercel

Configurações recomendadas:

```txt
Root Directory: vazio
Install Command: npm install
Build Command: npm run build
Output Directory: vazio
```

Variáveis necessárias:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

Após criar o master, remover:

```txt
MASTER_SETUP_TOKEN
MASTER_ADMIN_PASSWORD
```

## GitHub

```powershell
git init
git branch -M main
git remote remove origin
git remote add origin https://github.com/joaomarcoss1/brilhodosol.git
git add .
git commit -m "Atualiza Brilho do Sol Ponto RH v017 seguranca final"
git push -u origin main --force
```
