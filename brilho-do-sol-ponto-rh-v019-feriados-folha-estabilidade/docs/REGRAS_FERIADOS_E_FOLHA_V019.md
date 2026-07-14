# Regras de feriados e folha — v019

## Decisão operacional

Cada feriado ativo possui uma decisão por escopo: **pendente**, **funcionará normalmente** ou **unidade fechada**. Uma decisão específica de filial prevalece sobre uma decisão global.

- **Aberto:** jornada, ponto, faltas e atrasos seguem normalmente.
- **Fechado:** dispensa remunerada; não exige ponto, não gera falta, atraso ou desconto e não reduz o salário.
- **Pendente:** não gera desconto nem falta automaticamente, mas bloqueia o fechamento definitivo da folha até a decisão administrativa.

O funcionário pode registrar ponto mesmo em unidade fechada. Esse trabalho não gera pagamento adicional automático; deve seguir o fluxo de hora extra/aprovação.

## Folha quinzenal

- mensalista mensal: 100% do salário do período mensal;
- mensalista/quinzenal em período quinzenal: 50% do salário mensal por quinzena;
- diarista: diária multiplicada pelos dias efetivamente trabalhados;
- faltas válidas são descontadas sobre a base diária calculada sem duplicar a fórmula.

## Ordem de atualização do banco

1. migrations já aplicadas até `017_v018_admin_performance_branches.sql`;
2. `018_v019_holiday_operations_payroll_hardening.sql`.

A migration é idempotente e não altera PINs, `pin_hash` ou o portal de ponto.
