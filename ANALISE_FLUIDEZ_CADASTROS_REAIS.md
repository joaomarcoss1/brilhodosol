# Análise e acabamento — fluidez, GPS, cadastros reais e folha

## O que foi ajustado

- Removido o carregamento bloqueante entre funções administrativas: o AdminShell agora usa sessão em cache seguro e revalidação em segundo plano.
- Criado cache em memória para chamadas GET administrativas, com invalidação automática após ações de escrita.
- Pré-carregamento dos dados mais usados: perfil, filiais, funcionários leves e resumo do dashboard.
- Mantida validação de sessão e permissão, sem depender apenas do frontend.
- PDF de folha/relatórios recebeu correção de linhas escuras, linhas alternadas claras, cards e assinatura somente quando apropriado.
- Dados demonstrativos continuam removidos.
- Colaboradores reais foram pré-cadastrados via migration 009, com PIN inicial e escala quando informada.

## Sobre GPS/geolocalização

A estrutura de GPS permanece adequada: ponto registra latitude/longitude, distância, precisão, filial validada, raio e status de revisão. As filiais da migration usam coordenadas aproximadas de Codó-MA apenas para evitar filial sem geofence. Antes do uso oficial, ajuste cada filial no painel de Filiais com o GPS real da loja.

## Atenções de dados

- Mayara: a mensagem informava CPF terminando em 04, mas a ficha oficial anexada mostrou CPF terminando em 02. A migration usa a ficha oficial como referência para evitar duplicidade incorreta.
- Funcionários sem cargo, salário ou horário oficial ficaram com campos de controle marcados como pendentes em profile_notes/schedule_confirmed.
- PINs iniciais estão documentados em docs/PINS_INICIAIS_COLABORADORES_BS.md.
