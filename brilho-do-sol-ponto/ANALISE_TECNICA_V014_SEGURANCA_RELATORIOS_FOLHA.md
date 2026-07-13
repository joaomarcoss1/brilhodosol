# Análise Técnica v014 — Segurança, Relatórios e Folha Premium

## Principais melhorias aplicadas
- Reforço de segurança e helpers para escopo por filial, folha e dados financeiros.
- Funcionários agora têm horários de saída/retorno do almoço visíveis e exportáveis.
- Exportação de funcionários passa a respeitar filtros aplicados no quadro.
- PDF da folha foi polido para reduzir cortes, melhorar tabela e repetir padrão corporativo.
- Excel ganhou fallback textual para logo quando a imagem não puder ser inserida.
- Relatório de almoço foi incluído para auditar saída, retorno e intervalos acima do previsto.
- Folha ganhou botões mais seguros por status: revisar, fechar, pagar, reabrir e exportar.
- Rotas críticas de pontos, justificativas, horas extras e escalas receberam escopo por filial.
- Migration v014 adiciona índices, constraints, idempotência e campos de almoço/GPS.

## Avaliação técnica estimada após v014
- Segurança e permissões: 9,2/10
- Folha de pagamento: 9,1/10
- PDFs e relatórios: 9,0/10
- Excel e exportações: 9,1/10
- GPS e ponto: 9,3/10
- Design/botões: 8,9/10

## Observação importante
A nota 10/10 real depende de teste em produção com Supabase, Vercel, celulares e coordenadas reais das lojas. O código foi reforçado, mas GPS e exportações precisam de homologação física.
