# Atualização complementar de colaboradores — 10/07/2026

Esta atualização adiciona/atualiza os três colaboradores informados na nova coleta do Brilho do Sol e preserva os PINs iniciais já gerados quando o colaborador já existia no cadastro.

## Colaboradores atualizados

| Matrícula | Nome | CPF | Filial | Cargo | Horário | PIN inicial | Observação |
|---|---|---|---|---|---|---|---|
| DB-000002 | Givanilson Rodrigues de Oliveira | 604.845.403-19 | Brilho do Sol D Borges | Entregador de Mercadorias | 07:00-12:00 / 14:00-18:00 | 1169 | CPF, cargo e salário conferidos pela ficha D BORGES. |
| AB-000003 | Antônio Domingos da Conceição | 031.607.533-79 | Brilho do Sol Abençoado | Entregador de Mercadorias | 07:00-12:00 / 14:00-18:00 | 2484 | CPF estava em branco na coleta e foi preenchido pela ficha ABENÇOADO/D SANTOS. |
| AR-000011 | Gilvan Fernandes Ramos | 025.130.703-48 | Brilho do Sol Filial 01 / BS 2 | Entregador de Mercadorias | 07:00-12:00 / 14:00-18:00 | 3546 | CPF, cargo e salário conferidos pela ficha A R MARTINS. |

## Migration

Execute após a 009:

```txt
supabase/migrations/010_update_colaboradores_horarios_2026_07_10.sql
```

A migration faz `upsert` por CPF, atualiza a escala principal e não sobrescreve o PIN de quem já possui PIN salvo.
