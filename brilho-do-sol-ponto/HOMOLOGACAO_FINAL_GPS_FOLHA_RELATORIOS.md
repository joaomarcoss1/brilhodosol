# Homologação Final — GPS, Folha, Relatórios e Segurança

Versão: v012 — Homologação Final GPS, Folha e Segurança

## Objetivo
Validar o núcleo crítico do Brilho do Sol Ponto RH antes do piloto real: ponto com GPS, folha de pagamento, relatórios PDF/Excel, permissões, segurança e estabilidade mobile.

## GPS
- [ ] Confirmar latitude e longitude reais da Matriz.
- [ ] Confirmar latitude e longitude reais da Vila Biné.
- [ ] Confirmar latitude e longitude reais da Brilho do Sol Construção.
- [ ] Confirmar latitude e longitude reais da Filial 1° de Maio.
- [ ] Verificar se cada filial aparece como `GPS confirmado` no painel Filiais.
- [ ] Testar funcionário dentro do raio permitido.
- [ ] Testar funcionário fora do raio permitido.
- [ ] Testar GPS impreciso.
- [ ] Testar GPS negado pelo navegador.
- [ ] Testar em Android/Chrome.
- [ ] Testar em iPhone/Safari.
- [ ] Testar apenas em HTTPS.

## Ponto
- [ ] Entrada.
- [ ] Saída para almoço.
- [ ] Retorno do almoço.
- [ ] Saída final.
- [ ] PIN correto.
- [ ] PIN errado.
- [ ] Duplo clique no mesmo ponto.
- [ ] Duas abas abertas.
- [ ] Funcionário sem filial.
- [ ] Funcionário inativo.
- [ ] Filial sem GPS confirmado.
- [ ] Horário de almoço antecipado.
- [ ] Retorno do almoço atrasado.
- [ ] Intervalo maior que o previsto.

## Folha
- [ ] Gerar prévia.
- [ ] Funcionário sem salário/diária deve aparecer como pendência crítica.
- [ ] Funcionário sem cargo definido deve aparecer como pendência crítica.
- [ ] Funcionário sem escala/horário confirmado deve aparecer como pendência crítica.
- [ ] Filial com GPS pendente deve bloquear fechamento.
- [ ] Ponto incompleto deve bloquear fechamento.
- [ ] Justificativa pendente deve bloquear fechamento.
- [ ] Hora extra pendente deve bloquear fechamento.
- [ ] Fechar folha sem pendências.
- [ ] Fechar com exceção somente como master admin e com justificativa.
- [ ] Reabrir folha somente como master admin e com justificativa.
- [ ] Marcar como paga.
- [ ] Bloquear edição após status closed, closed_with_exceptions ou paid.

## Relatórios
- [ ] PDF da folha com logo real.
- [ ] PDF da folha sem tabela torta, sem linhas pretas e sem páginas vazias.
- [ ] Excel da folha com abas Resumo, Folha, Pendências, Dados bancários e Auditoria-Conferência.
- [ ] PDF de pontos.
- [ ] Excel de pontos.
- [ ] Relatório de horas extras sem erro de relacionamento Supabase.
- [ ] Relatório de justificativas sem erro de relacionamento Supabase.
- [ ] Relatório executivo.
- [ ] Relatório com muitos registros deve orientar uso de Excel.

## Permissões
- [ ] Master admin vê tudo.
- [ ] RH financeiro vê folha e dados financeiros.
- [ ] Gerente de filial não vê salário, Pix, banco nem folha geral.
- [ ] Gerente de filial não vê dados de outras filiais.
- [ ] Exportação financeira aparece na auditoria.

## Deploy
- [ ] Vercel com Root Directory vazio.
- [ ] Build Command: `npm run build`.
- [ ] Install Command: `npm install`.
- [ ] Variáveis Supabase configuradas.
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configurada e restrita por domínio.
- [ ] Migration 012 aplicada no Supabase depois da 011.
