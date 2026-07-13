# Brilho do Sol Ponto RH — v017 Segurança Final e Homologação Produção

## Resumo técnico

Esta versão aplica correções estruturais sobre a v016 sem recriar o projeto, sem alterar o PIN de 4 dígitos e sem remover módulos existentes.

## Correções aplicadas

- Segurança por filial reforçada no backend e em migration RLS.
- Rota `/api/admin/employees` bloqueia alteração de salário, diária, Pix, banco, agência, conta e dia de pagamento para perfis sem permissão financeira.
- APIs e exportações passam a expor `has_pin` em vez de `pin_hash`.
- Alertas de funcionário sem PIN corrigidos para não gerar falso positivo.
- Rota `/api/admin/branch-authorizations` usa relacionamento explícito com `employee_branch_authorizations_branch_id_fkey` e `employee_branch_authorizations_employee_id_fkey`.
- Rota `/api/admin/bootstrap-master` bloqueia criação de master em produção quando já existe master ativo.
- Geração da folha recebeu idempotência por filtros, evitando duplicidade por duplo clique.
- Status `incomplete_preview` ficou mais rigoroso, considerando pendências de ponto, GPS, justificativas, horas extras, faltas, remuneração e folha vazia.
- Tela de folha usa perfil real de `/api/admin/me` para mostrar/esconder botões críticos.
- Exportações de funcionários respeitam filtros ativos e removem os botões duplicados de exportação geral no cabeçalho.
- Registro de ponto público recebeu rate limit básico por funcionário + IP.
- PDFs de folha exibem aviso de prévia incompleta quando aplicável.
- Página de funcionários esconde campos financeiros para quem não tem permissão.

## Arquivos principais alterados

- `src/app/api/admin/employees/route.ts`
- `src/app/api/admin/employees/export/route.ts`
- `src/app/api/admin/me/route.ts`
- `src/app/api/admin/bootstrap-master/route.ts`
- `src/app/api/admin/branch-authorizations/route.ts`
- `src/app/api/admin/payroll/route.ts`
- `src/app/api/admin/reports/route.ts`
- `src/app/api/public/clock/register/route.ts`
- `src/app/admin/funcionarios/page.tsx`
- `src/components/admin/PayrollPage.tsx`
- `src/components/admin/ResourceManager.tsx`
- `src/lib/server/branch-permissions.ts`
- `src/lib/services/employee-import.ts`
- `supabase/migrations/016_v017_seguranca_final_homologacao_producao.sql`

## Resultado dos testes locais

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado com o build configurado do projeto (`next build --experimental-build-mode=compile`).

## Observação importante

O `build:finalize` do Next em modo `generate` não foi incluído como validação final porque excedeu o tempo do ambiente local durante a geração estática. O comando usado pela Vercel no projeto continua sendo `npm run build`, que foi validado com sucesso.
