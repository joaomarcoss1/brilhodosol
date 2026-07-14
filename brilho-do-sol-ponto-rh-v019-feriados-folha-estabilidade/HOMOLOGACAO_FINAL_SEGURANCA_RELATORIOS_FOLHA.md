# Homologação Final — Segurança, Relatórios, Folha e GPS

Versão: v014 Segurança, Relatórios e Folha Premium

## Segurança e permissões
- [ ] Master visualiza todas as filiais e relatórios.
- [ ] Gerente de filial visualiza somente a própria filial.
- [ ] Gerente de filial não visualiza salário, Pix, banco, folha geral ou auditoria global.
- [ ] RH financeiro exporta folha e dados bancários conforme permissão.
- [ ] Usuário sem permissão recebe 403 ao chamar API manualmente.
- [ ] Exportação financeira registra auditoria.
- [ ] Alteração de salário, filial, PIN, folha fechada/paga registra auditoria.

## PIN de 4 dígitos
- [ ] PIN aceita exatamente 4 números.
- [ ] PIN é salvo somente com hash.
- [ ] API pública nunca retorna `pin_hash`.
- [ ] Tentativas erradas são bloqueadas temporariamente.
- [ ] Reset de PIN gera auditoria.

## GPS e ponto
- [ ] Filial sem coordenada bloqueia ponto.
- [ ] Filial sem GPS confirmado bloqueia ponto.
- [ ] Celular dentro do raio registra ponto.
- [ ] Celular fora do raio envia para revisão ou bloqueia conforme regra.
- [ ] GPS impreciso mostra mensagem clara.
- [ ] Ponto duplicado retorna “Este ponto já foi registrado hoje.”
- [ ] Duplo clique não duplica ponto por causa de índice único/idempotência.
- [ ] Testar Android + Chrome e iPhone + Safari em HTTPS.

## Folha de pagamento
- [ ] Gerar folha da Matriz por dia de pagamento.
- [ ] Gerar folha de cada filial por período e dia de pagamento.
- [ ] Folha sem pontos suficientes aparece como prévia incompleta/pendente.
- [ ] Checklist aponta sem salário, sem cargo, sem horário, sem almoço, sem dia de pagamento e sem ponto.
- [ ] Fechar folha com pendência crítica é bloqueado.
- [ ] Fechar com exceção exige master e justificativa.
- [ ] Folha fechada/paga não permite edição.
- [ ] Reabrir exige master e justificativa.

## PDFs e Excel
- [ ] PDF da folha abre na Vercel sem erro Helvetica.afm.
- [ ] PDF tem logo real, cabeçalho verde, detalhe dourado e tabela alinhada.
- [ ] PDF não gera páginas vazias nem blocos pretos.
- [ ] Excel mostra logo ou fallback textual elegante.
- [ ] Excel da folha tem abas Resumo, Folha, Pendências, Dados bancários e Auditoria-Conferência.
- [ ] Exportação de funcionários respeita filtros de filial, dia, status, contrato e busca.
- [ ] Relatórios grandes sugerem Excel quando ultrapassam limite.

## Botões e design
- [ ] Botões têm loading e ficam desabilitados durante execução.
- [ ] Botões inválidos são escondidos por status/permissão.
- [ ] Mobile não tem tabela larga onde houver cards.
- [ ] Dropdowns, filtros e cards seguem paleta Brilho do Sol.
