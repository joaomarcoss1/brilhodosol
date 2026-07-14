# Brilho do Sol Ponto RH — v019

## Escopo aplicado

Esta versão implementa correções estruturais nas áreas de feriados, folha de pagamento, horas extras, administradores, desempenho, migrations, acessibilidade e validação. O objetivo foi preservar o comportamento existente e eliminar falhas que poderiam afetar o uso administrativo e financeiro.

## Garantia sobre os PINs

O mecanismo de PIN dos funcionários foi preservado:

- continua com quatro dígitos;
- continua armazenado em `pin_hash` com bcrypt;
- continua sendo validado no portal público de ponto;
- bloqueios e registros de tentativa não foram removidos;
- nenhuma migration v019 altera `pin_hash`;
- a senha administrativa permanece separada do PIN do funcionário.

A rota pública de registro de ponto foi alterada somente para interpretar corretamente a decisão operacional do feriado. O trecho de validação do PIN foi mantido.

## Implementações principais

### Feriados

- Nova tabela `holiday_operation_decisions`.
- Decisão `pending`, `open` ou `closed` por feriado e filial.
- Decisão global com possibilidade de sobrescrita por filial.
- Notificações automáticas no dashboard.
- Antecedência configurável, com padrão de sete dias.
- Nova tela `/admin/feriados`.
- Feriado aberto mantém escala e ponto normais.
- Feriado fechado vira dispensa remunerada, sem falta ou desconto.
- Decisão pendente não gera falta/desconto e impede o fechamento definitivo da folha.
- Funcionário ainda pode registrar ponto em unidade fechada; pagamento adicional depende da aprovação de hora extra.

### Folha

- Mensalista em período mensal: 100% do salário mensal.
- Mensalista/quinzenal em período quinzenal: 50% por quinzena.
- Diarista: diária conforme dias elegíveis, incluindo fechamento remunerado.
- Admissão e desligamento considerados no período.
- Histórico salarial ponderado quando há mudança dentro do período.
- Regeneração segura de folha ainda editável.
- Folha fechada ou paga não é sobrescrita.
- Snapshot contém regra e fórmula utilizadas.
- Fechamento é bloqueado enquanto houver feriado pendente, inclusive para master.

### Horas extras

- Soma de todos os registros aprovados/ajustados do mesmo dia.
- Registros rejeitados são ignorados.
- Duplicidades por idempotência/origem são descartadas.
- Detalhamento das origens é preservado para o snapshot da folha.

### Filiais e administradores

- Filtros por filial mantidos de ponta a ponta.
- Paginação e busca no servidor para funcionários e administradores.
- Administradores podem receber múltiplas filiais permitidas.
- Proteção contra desativação do próprio master e do último master ativo.
- Senha administrativa com mínimo de dez caracteres, letra e número.
- Criação ou vínculo real no Supabase Auth.
- Configuração inicial movida para `/admin/configuracao-inicial`.
- Login diário não exibe mais o token master.

### Estabilidade e desempenho

- Deduplicação e cache controlado de requisições administrativas.
- AbortController e timeout em APIs e downloads.
- Correção de efeitos que podiam provocar recarregamentos repetidos.
- Menu administrativo agrupado por área.
- Contagens do dashboard feitas no banco, sem limitar indicadores aos primeiros 200 registros.
- Data do dashboard baseada no fuso `America/Fortaleza`/configuração do sistema.

### Segurança e qualidade

- Erros internos do Supabase não são expostos em produção.
- Falha de auditoria deixa de ser ignorada silenciosamente.
- Zod aplicado aos fluxos críticos de administrador, folha, feriado e configurações.
- Botões passam a usar `type="button"` por padrão.
- Correção de Link envolvendo Button.
- Feedback com `aria-live` e melhorias de teclado/modais.
- Workflow de CI adicionado.
- Verificador estático de migrations adicionado.

## Arquivos principais alterados

- `src/app/api/admin/payroll/route.ts`
- `src/lib/services/payroll-engine.ts`
- `src/lib/services/overtime-engine.ts`
- `src/lib/services/schedule-engine.ts`
- `src/lib/services/holiday-operations.ts`
- `src/app/api/admin/holiday-decisions/route.ts`
- `src/components/admin/HolidayDecisionsPage.tsx`
- `src/app/api/admin/admins/route.ts`
- `src/components/admin/ResourceManager.tsx`
- `src/components/admin/AdminShell.tsx`
- `src/lib/client/admin-api.ts`
- `src/lib/validation/schemas.ts`
- `supabase/migrations/016_v017_seguranca_final_homologacao_producao.sql`
- `supabase/migrations/018_v019_holiday_operations_payroll_hardening.sql`
- `.github/workflows/ci.yml`

## Validação executada

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: 15 testes aprovados.
- `npm run migrations:check`: aprovado.
- `npm run build`: aprovado localmente com Next.js 15.5.20.
- `npm audit`: nenhuma vulnerabilidade encontrada após atualização do Vitest e resolução segura do PostCSS.

## Observação de produção

As migrations foram verificadas estaticamente e o projeto foi compilado, mas este pacote não executou SQL na base de produção do usuário. Faça backup e aplique as migrations na ordem documentada antes do deploy.
