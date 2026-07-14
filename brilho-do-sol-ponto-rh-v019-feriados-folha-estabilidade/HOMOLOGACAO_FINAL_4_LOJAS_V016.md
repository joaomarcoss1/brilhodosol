# Homologação Final — v016 Homologação 4 Lojas

## Itens implementados

- Escopo por filial reforçado nas rotas de revisões de ponto, inconsistências, autorizações por filial e feriados.
- Status **Prévia incompleta** para folha com sinais críticos de ausência de pontos, remuneração ausente ou líquido negativo.
- PDFs com tabela resumida, cabeçalho repetido em nova página e layout mais estável.
- Botões da folha escondidos/bloqueados conforme status e perfil.
- Endpoint `/api/admin/branches/readiness` para checklist de loja pronta para ponto.
- Seção visual “Loja pronta para ponto” em Filiais.
- Roteiro de GPS real para Android e iPhone.

## Testes locais obrigatórios

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run build:finalize`

## Critérios para liberar as 4 lojas

1. Cada loja deve estar com status **Pronta** no checklist.
2. Teste de GPS dentro do raio deve passar em Android e iPhone.
3. Teste fora do raio deve bloquear em Android e iPhone.
4. Gerente de filial deve visualizar apenas dados da sua própria unidade.
5. Folha por filial deve ser gerada separadamente.
6. Folha com pontos ausentes deve exibir **Prévia incompleta**.
7. PDF da folha deve estar legível e sem colunas tortas.
