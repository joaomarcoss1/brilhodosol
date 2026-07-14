# Ordem de migrations — Brilho do Sol v019

Projetos novos devem executar `001` até `018` em ordem numérica.

Projetos já na v018 precisam executar somente:

```text
018_v019_holiday_operations_payroll_hardening.sql
```

Se a v017 falhou por policy existente, substitua o arquivo antigo pelo `016` idempotente deste pacote e execute-o antes da v018/v019.

A v019 não altera PINs, `pin_hash`, bcrypt ou o fluxo público de autenticação dos funcionários.
