# Homologação Final — 4 Lojas — v017

## Ordem recomendada

1. Rodar migrations até a `016_v017_seguranca_final_homologacao_producao.sql`.
2. Fazer deploy na Vercel.
3. Remover `MASTER_SETUP_TOKEN` da Vercel após validar o master.
4. Testar Matriz por 2 dias.
5. Testar mais uma filial.
6. Liberar as 4 lojas.

## Checklist obrigatório

### Segurança

- Master vê todas as lojas.
- Gerente de filial vê apenas sua loja.
- Gerente não vê salário, Pix, banco ou diária.
- Gerente não altera dados financeiros nem por API.
- RH financeiro altera dados financeiros dentro do escopo permitido.
- Exportações respeitam filtros.
- `pin_hash` não aparece em API, PDF, Excel ou tela.

### Ponto/GPS

- Android Chrome dentro do raio.
- Android Chrome fora do raio.
- iPhone Safari dentro do raio.
- iPhone Safari fora do raio.
- GPS negado.
- GPS impreciso.
- PIN errado.
- Ponto duplicado.
- Sequência: entrada, almoço, retorno e saída.

### Folha

- Gerar folha da Matriz.
- Gerar folha da Vila Biné.
- Gerar folha da Construção.
- Gerar folha da Filial 1° de Maio.
- Gerar por dia de pagamento.
- Gerar duas vezes com os mesmos filtros e confirmar que não duplica.
- Validar status `Prévia incompleta` quando faltarem pontos.
- Confirmar que fechamento normal é bloqueado na prévia incompleta.
- Confirmar que apenas master fecha com exceção.

### Relatórios

- PDF da folha com 25+ funcionários.
- Excel da folha.
- Exportação de funcionários filtrada por filial.
- Exportação de funcionários filtrada por dia de pagamento.
- Relatório de GPS.

## Critério para liberar as 4 lojas

A loja só deve ser liberada quando o checklist “Loja pronta para ponto” estiver como Pronta ou, no mínimo, Atenção sem pendência crítica.
