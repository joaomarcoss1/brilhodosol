# Brilho do Sol Ponto e RH

Sistema profissional para controle de ponto, RH, justificativas, auditoria, relatórios e folha de pagamento do **Brilho do Sol Supermercado**.

O projeto usa dados reais do Supabase nas telas finais. Os seeds desta versão são limpos: não criam funcionários, Pix, folha ou pontos demonstrativos.

## Stack

- Next.js App Router, React e TypeScript
- Tailwind CSS com paleta verde e dourada da marca Brilho do Sol
- Supabase/PostgreSQL com migrations, RLS, Auth e Storage
- PIN de funcionário com hash bcrypt
- Geolocalização real por latitude/longitude e cálculo de distância
- PDF premium com `pdfkit`
- Excel premium com `exceljs`
- Auditoria para alterações importantes

## Instalação

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Variáveis de ambiente

Preencha `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-apenas-no-servidor

MASTER_ADMIN_EMAIL=seu-email-admin@empresa.com
MASTER_ADMIN_NAME=Administrador Master
MASTER_ADMIN_PASSWORD=troque-por-uma-senha-forte
MASTER_SETUP_TOKEN=troque-este-token-longo-e-seguro

NEXT_PUBLIC_APP_URL=http://localhost:3000
COMPANY_REPORT_NAME=Brilho do Sol Supermercado
DEFAULT_TIMEZONE=America/Fortaleza
```

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no cliente.

## Supabase

1. Crie um projeto no Supabase.
2. Copie a URL do projeto, `anon key` e `service_role key` para `.env.local`.
3. No SQL Editor, execute as migrations nesta ordem:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_final_readiness_enhancements.sql
supabase/migrations/003_structural_refinements.sql
supabase/migrations/004_final_prompt_completion.sql
supabase/migrations/005_commercial_hardening_google_maps.sql
supabase/migrations/006_final_production_hardening.sql
supabase/migrations/007_employee_import_and_professional_modules.sql
supabase/migrations/008_cleanup_demo_and_payroll_polish.sql
```

4. Opcionalmente, execute apenas o seed limpo de produção para configurações e filiais-base de Codó-MA:

```text
supabase/seed/001_seed.sql
```

Não execute seeds antigos de demonstração em produção. Os funcionários devem ser cadastrados/importados pelo painel administrativo.

As migrations criam tabelas, enums, índices, RLS, bucket privado de justificativas, histórico salarial, configurações, permissões, auditoria, folhas, revisões, status de ponto e a limpeza de dados demonstrativos conhecidos.

## Primeiro admin master

1. Configure `MASTER_ADMIN_EMAIL`, `MASTER_ADMIN_NAME`, `MASTER_ADMIN_PASSWORD` e `MASTER_SETUP_TOKEN`.
2. Acesse `/admin/login`.
3. Informe e-mail, senha e o token master no primeiro acesso.
4. O sistema cria ou vincula o usuário no Supabase Auth e grava o perfil `master_admin`.
5. Depois do primeiro acesso, entre normalmente só com e-mail e senha.

O login administrativo fica em `/admin/login`. A recuperação de senha fica em `/admin/recuperar-senha`.

O admin master pode criar outros administradores em `/admin/administradores` e promover usuários para perfis administrativos.

## Fluxo do funcionário

- `/` abre o ponto mobile.
- O funcionário busca o nome, informa PIN e seleciona a filial.
- O navegador captura GPS.
- O backend valida PIN hash, latitude/longitude, raio da filial, ordem do ponto, atraso e saída antecipada.
- O sistema confirma visualmente o registro e salva status do ponto.
- `/justificativa` permite enviar justificativa com anexo real.
- `/historico` permite consultar o histórico público seguro com nome + PIN.

`/historico` permite ao funcionário consultar pontos, atrasos, saídas antecipadas e justificativas após validar nome + PIN, sem expor salário, Pix ou dados bancários.

## Área administrativa

- `/admin` dashboard com dados reais do banco
- `/admin/funcionarios`
- `/admin/funcionarios/importar`
- `/admin/filiais`
- `/admin/horarios`
- `/admin/pontos`
- `/admin/revisoes-ponto`
- `/admin/horas-extras`
- `/admin/inconsistencias`
- `/admin/justificativas`
- `/admin/folha`
- `/admin/relatorios`
- `/admin/configuracoes`
- `/admin/administradores`
- `/admin/auditoria`

Rotas e APIs administrativas exigem Supabase Auth e perfil ativo em `admin_users`. Funcionários não acessam área admin.

## Recursos estruturais

- CRUD de funcionários, filiais, horários, pontos, justificativas, folhas e administradores.
- Geolocalização por filial com latitude, longitude e raio permitido.
- Autorização temporária para bater ponto em outra filial.
- Status de ponto: válido, pendente de revisão, ajustado, bloqueado e cancelado.
- Tela de inconsistências com ações administrativas e log de auditoria.
- Configurações gerais de tolerância, raio padrão, multiplicador de hora extra, cálculo de diária e dados da empresa.
- Feriados, folgas e dias sem expediente para evitar falta indevida.
- Histórico salarial usado na folha para preservar folhas antigas.
- Período fechado: folha fechada/paga bloqueia alteração automática dos dados usados nela.
- Reabertura e ajustes financeiros com permissão e auditoria.

## Folha e cálculos

A folha calcula faltas, atrasos, saída antecipada, hora extra, diária, descontos e valor final a pagar. Cada item salvo recebe snapshot com salário histórico, configuração usada, eventos considerados e totais financeiros.

Horas extras aprovadas ou ajustadas entram na folha. Revisões posteriores exigem reabertura ou nova rodada de fechamento.

## Relatórios

Relatórios PDF e Excel usam a logo `public/logo-brilho-do-sol.jpeg`, cabeçalho da empresa e paleta verde/dourada do sistema.

Exportações disponíveis em `/admin/relatorios` e `/admin/folha`:

A folha em PDF usa o relatório `type=payroll` com dados de salário, diária, faltas, descontos, acréscimos, Pix/banco e status da folha.

- Pontos
- Faltas
- Atrasos
- Saídas antecipadas
- Horas extras
- Financeiro/folha
- Individual
- Por filial
- Inconsistências
- Justificativas

## Como testar

1. Configure `.env.local`.
2. Execute todas as migrations em ordem, incluindo `008_cleanup_demo_and_payroll_polish.sql`.
3. Execute `supabase/seed/001_seed.sql` apenas para configurações e filiais-base, se quiser.
4. Rode `npm run dev`.
5. Acesse `/admin/login` com o e-mail/senha configurados no `.env.local` e token master no primeiro acesso.
6. Ajuste as coordenadas reais das filiais em Codó-MA no painel de Filiais.
7. Cadastre/importe funcionários reais e gere PINs individuais.
8. Teste o ponto no celular dentro e fora do raio de 900m.
9. Revise inconsistências, justificativas, GPS, banco de horas e horas extras no admin.
10. Gere folha real e exporte PDF/Excel para validar o acabamento.

## Vercel

1. Envie o projeto para GitHub.
2. Importe na Vercel.
3. Configure todas as variáveis de ambiente.
4. Execute as migrations no Supabase antes do deploy.
5. Publique com build padrão:

```bash
npm run build
```

Geolocalização em celular exige HTTPS, então use Vercel ou outro domínio com TLS.

## Logo

Para trocar a logo, substitua:

```text
public/logo-brilho-do-sol.jpeg
```

Mantenha o mesmo nome para login, PWA, relatórios e folha continuarem usando a marca.

## Verificação local

```bash
npm run lint
npm run typecheck
npm run build
```

Sem Supabase configurado, as páginas carregam e mostram aviso de ambiente ausente, mas operações reais dependem das variáveis e do banco configurados.


## Melhorias aplicadas nesta versão

- Rota pública `/historico` implementada com API `/api/public/history`, validação por PIN, limite de tentativas e dados mínimos seguros.
- Menu inferior mobile agora possui Ponto, Histórico e Justificar.
- Dashboard administrativo passou a usar o motor de escala para calcular ausentes e faltas do período.
- Relatórios individual e por filial foram ampliados com cartões, totais operacionais, faltas, horas extras, ocorrências e consolidação financeira.
- Exportação PDF foi ajustada para não cortar colunas silenciosamente; relatórios amplos usam fonte menor e página horizontal.
- Excel mantém aba Resumo e Detalhes com cabeçalho verde, detalhes dourados, filtros, congelamento e formatação profissional.
- Tela de inconsistências agora usa modal profissional com motivo obrigatório, sem `window.prompt`.
- Histórico salarial passou a aceitar vigência e fecha o período anterior no dia anterior ao novo salário.
- `.env.example` não contém senha real.
- Build script corrigido para `next build`, permitindo deploy completo na Vercel sem modo experimental de compilação e sem gerar 404 em produção.
- Tela inicial recebeu acesso discreto para `/admin/login`, mantendo o fluxo do funcionário como prioridade.
- PDFs de relatórios e folha foram reforçados para ambiente serverless da Vercel com `runtime = nodejs`, cabeçalho corporativo, logo, paleta verde/dourada, rodapé, cartões de resumo e divisão automática de tabelas largas.
- Botões, cards, tabelas, filtros, dashboard e feedbacks receberam refinamento visual para uma experiência mais comercial e profissional.

## Observação de segurança de dependências

`npm audit --omit=dev` ainda aponta 2 vulnerabilidades moderadas herdadas da cadeia `next/postcss`. O `npm audit fix --force` recomenda uma alteração quebradora para versão antiga do Next, por isso não foi aplicado automaticamente. Atualize quando o Next publicar versão estável sem o alerta ou revise manualmente em produção.

## Versão comercial reforçada — geolocalização, permissões e folha segura

Esta entrega adiciona uma camada estrutural para operação real do Brilho do Sol com matriz + 4 filiais.

### Principais melhorias

- PIN do funcionário mantido em 4 dígitos, com hash, logs de tentativas e bloqueio temporário.
- Matrícula/código interno no cadastro e busca pública por nome ou matrícula.
- Busca pública mais restrita: a tela do ponto exibe apenas dados mínimos do funcionário.
- Cadastro de filiais refeito com editor de geolocalização:
  - Google Maps com marcador arrastável quando `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` estiver configurada;
  - fallback por coordenadas, link do Google Maps e localização atual quando não houver chave;
  - raio padrão de 900m;
  - geofence por unidade;
  - link do Google Maps salvo por filial.
- Cada ponto registra latitude/longitude, distância, precisão do GPS, filial usada na validação, raio aplicado e IP/dispositivo.
- Configurações de GPS no admin:
  - precisão máxima aceitável;
  - revisão obrigatória para GPS impreciso;
  - permissão para ponto em filial diferente com autorização.
- Permissões por filial para administradores, incluindo gerente de filial e acesso financeiro separado.
- Checklist de fechamento da folha, bloqueando fechamento inseguro quando houver pendências críticas.
- Reabertura de folha somente com motivo e auditoria.
- Relatório Executivo Mensal para diretoria/gestão.
- Inconsistências ampliadas, incluindo GPS impreciso, batidas duplicadas e batidas muito próximas.
- Cálculo de diária por dias úteis revisado para considerar dias úteis reais do período.

### Variável opcional para Google Maps

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua-chave-google-maps
```

Sem essa chave, o sistema continua funcionando com prévia do Google Maps, captura da localização atual e edição manual de latitude/longitude. Com a chave, o admin consegue clicar/arrastar o marcador no mapa.

### Migration nova

Execute também:

```sql
supabase/migrations/005_commercial_hardening_google_maps.sql
006_final_production_hardening.sql
```

Ela adiciona campos de geolocalização, precisão GPS, permissões por filial, fechamento seguro de folha e relatório executivo.

### Checklist recomendado após subir

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Depois teste:

1. Cadastrar matriz e 4 filiais com mapa.
2. Confirmar raio de 900m por unidade.
3. Registrar ponto dentro e fora do raio.
4. Registrar ponto com GPS impreciso.
5. Ver inconsistências.
6. Gerar folha com pendências e validar bloqueio.
7. Fechar folha sem pendências.
8. Reabrir folha com motivo usando admin master.
9. Gerar Relatório Executivo Mensal em PDF/Excel.
10. Testar gerente de filial vendo apenas sua unidade.

## Ajustes finais de layout e admin master

Esta versão inclui uma rodada de polimento visual para evitar botões, textos e ações sobrepostos em telas menores e tabelas administrativas:

- botões com alinhamento seguro, ícones sem deformar e quebra controlada de texto;
- inputs, selects e textareas sempre com largura segura;
- tabelas administrativas com scroll horizontal controlado;
- sidebar admin com rolagem interna e textos truncados;
- cards, títulos e badges com quebra de texto profissional;
- área de filiais e mapa com botões responsivos;
- botões de ação em listas e modais empilhando corretamente no mobile.

### Admin master criando ou promovendo administradores

O admin master pode acessar:

```txt
/admin/administradores
```

Nessa tela é possível:

1. criar um novo login administrativo informando e-mail, nome, perfil e senha inicial;
2. promover um usuário já existente informando o mesmo e-mail e deixando a senha inicial em branco;
3. definir o perfil do usuário: admin master, admin geral, gerente de filial ou RH/Financeiro;
4. vincular filial principal e permissões financeiras;
5. desativar administradores sem apagar histórico.

A API `/api/admin/admins` agora é restrita ao perfil `master_admin` para leitura, criação, promoção, edição e desativação de administradores.


## Rodada final de produção

Esta versão inclui hardening final para supermercado com matriz e filiais: permissões por filial em APIs críticas, fechamento de folha com bloqueio de pendências críticas, auditoria de exportações financeiras, busca pública com dados mínimos, PIN de 4 dígitos centralizado, geolocalização com histórico e tela de fechamento mensal.

Execute as migrations em ordem, incluindo `006_final_production_hardening.sql`, antes do deploy final.


## Versão 10/10 — módulos profissionais finais

Esta versão adiciona a camada final para operação profissional em supermercados com matriz e filiais:

- importação de funcionários por Excel, CSV e PDF assistido em `/admin/funcionarios/importar`;
- modelo oficial de planilha com instruções, exemplo e validação visual;
- geração automática de PIN de 4 dígitos quando o arquivo não trouxer PIN;
- validação de PIN de 4 dígitos quando informado no arquivo;
- relatório de importação com PINs iniciais para entrega individual;
- exportação do cadastro de funcionários em PDF e Excel com logo e paleta Brilho do Sol;
- edição em massa via API para dados cadastrais e geração de novos PINs;
- campo de setor no cadastro e filtros;
- banco de horas em `/admin/banco-de-horas`;
- solicitações de turno, folga, compensação e outra filial em `/admin/solicitacoes`;
- painel operacional do gerente de filial em `/admin/gerencia-filial`;
- relatório de geolocalização com PDF/Excel;
- QR Code/código seguro por filial com PDF para impressão;
- CSS final para evitar sobreposição, botões tortos e cards estourados.

Execute a migration final:

```sql
supabase/migrations/007_employee_import_and_professional_modules.sql
```

### Como importar funcionários

1. Acesse `/admin/funcionarios/importar`.
2. Baixe o modelo oficial.
3. Preencha matrícula, nome, filial, cargo, setor, contrato, salário/diária e dados de pagamento.
4. Deixe `pin_opcional` vazio para o sistema gerar PIN automático de 4 dígitos.
5. Envie o arquivo e confira a prévia.
6. Corrija erros antes de confirmar.
7. Após confirmar, exporte o relatório de importação e entregue os PINs individualmente.

### Testes finais obrigatórios

```bash
npm run typecheck
npm run lint
npm run build
```

Teste também: importação Excel/CSV, importação PDF assistida, exportação PDF/Excel de funcionários, geração de PINs, relatório de geolocalização, banco de horas, solicitações e tela de gerente de filial.

## Versão Mobile Premium & Performance

Esta entrega aplica uma rodada estrutural de melhoria para deixar o Brilho do Sol Ponto RH mais leve, mais premium no mobile e mais seguro para relatórios em produção.

### Correção PDFKit na Vercel

A geração de PDF foi ajustada para evitar o erro serverless:

```txt
ENOENT: no such file or directory, open '/var/task/.next/server/chunks/data/Helvetica.afm'
```

O projeto agora usa:

```ts
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
```

Também foi adicionado:

```txt
src/types/pdfkit-standalone.d.ts
```

O `next.config.ts` permanece enxuto para evitar travamento de trace no build; a correção do PDF fica concentrada no import standalone do PDFKit e na tipagem dedicada.

### Melhorias mobile

- Menu mobile trocado por navegação inferior com: Início, Equipe, Ponto, Folha e Mais.
- O menu “Mais” agora abre como painel inferior, evitando a barra horizontal gigante.
- Listagens administrativas passam a ter cards no mobile e tabela somente no desktop.
- Cadastros usam uma estrutura visual em etapas para reduzir sensação de formulário pesado.
- Botões ganharam estado de loading, bloqueio contra duplo clique e feedback visual mais claro.
- A tela pública de ponto agora prioriza o próximo ponto recomendado e deixa outras ações como secundárias.

### Otimizações de performance

- Busca pública de funcionário com debounce de 350ms.
- Busca só executa com pelo menos 2 caracteres.
- Cache leve da última busca no navegador.
- Endpoint leve para perfil administrativo: `/api/admin/me`.
- Endpoints leves para selects:
  - `/api/admin/options/employees`
  - `/api/admin/options/branches`
  - `/api/admin/options/sectors`
  - `/api/admin/options/roles`
- Endpoint leve de dashboard: `/api/admin/dashboard/summary`.
- Service Worker corrigido para não interceptar `/api/*`, PDFs ou Excels.

### Folha de pagamento premium

- Tela de folha reformulada com stepper de fechamento.
- Cards superiores para total bruto, descontos, acréscimos e total líquido.
- Mobile com cards de funcionário no lugar de tabela larga.
- Ações de exportação com loading e feedback.
- Bloqueio reforçado para folhas `closed`, `closed_with_exceptions` e `paid`.
- Edição de itens com escopo por filial no backend.

### Relatórios PDF/Excel

- PDFs usam a versão standalone do PDFKit para funcionar na Vercel.
- Exportador mantém logo, cabeçalho institucional, detalhe dourado, cards de resumo, tabelas e rodapé.
- Excel mantém abas, cabeçalho institucional, filtros, congelamento e largura de colunas.
- Relatórios financeiros continuam protegidos por permissão.

### Validação executada

```bash
npm run typecheck
npm run lint
npm run build
npm run build:finalize
```

Todos os comandos acima foram executados com sucesso nesta entrega.

### Deploy Vercel

Se o `package.json` estiver na raiz do repositório, deixe o Root Directory vazio.

Configuração recomendada:

```txt
Framework Preset: Next.js
Build Command: npm run build
Output Directory: vazio / padrão Next.js
```

Depois do deploy, teste obrigatoriamente:

- PDF de funcionários;
- PDF da folha;
- PDF de geolocalização;
- PDF do QR da filial;
- Excel da folha;
- tela de ponto no celular;
- menu mobile;
- folha no celular.


## Acabamento final da folha e relatórios

Esta versão corrige o PDF de folha que gerava linhas escuras/tortas e páginas extras apenas com rodapé. A exportação agora usa preenchimento de linhas seguro, rodapé sem quebra de página inesperada e bloco de conferência administrativa no final.

Também foi adicionada a migration `008_cleanup_demo_and_payroll_polish.sql` para remover cadastros demonstrativos conhecidos de versões anteriores: Ana Paula Silva, Carlos Henrique Lima, Maria Eduarda Costa, usuário RH de demonstração e registros `device_info = 'seed'`.

Antes de apresentar para administração:

1. Rode a migration 008.
2. Abra `/admin/filiais` e ajuste coordenadas reais de cada loja.
3. Importe funcionários reais.
4. Gere a folha novamente.
5. Exporte PDF e Excel da folha.


## Atualização 009 — Fluidez e colaboradores reais

Execute também a migration:

```txt
supabase/migrations/009_fluid_app_colaboradores_reais.sql
```

Ela adiciona os colaboradores informados na coleta do Brilho do Sol, cria PINs iniciais com hash, cadastra horários informados, mantém campos pendentes quando faltarem informações e ativa melhorias de layout/fluidez administrativa.

Arquivos úteis:

```txt
docs/colaboradores_brilho_sol_pre_cadastrados.csv
docs/PINS_INICIAIS_COLABORADORES_BS.md
ANALISE_FLUIDEZ_CADASTROS_REAIS.md
```

Depois de aplicar a migration, ajuste as coordenadas reais de cada filial no painel **Filiais**, usando o GPS da loja.


## Atualização 010 — novos horários confirmados

Execute após a migration 009:

```txt
supabase/migrations/010_update_colaboradores_horarios_2026_07_10.sql
```

Esta atualização complementa os cadastros de Givanilson Rodrigues de Oliveira, Antônio Domingos da Conceição e Gilvan Fernandes Ramos, confirmando horário 07:00-12:00 / 14:00-18:00, preservando os PINs iniciais e atualizando a escala principal.

Arquivos úteis:

```txt
docs/ATUALIZACAO_COLABORADORES_010.md
docs/colaboradores_atualizacao_010_2026_07_10.csv
docs/PINS_INICIAIS_COLABORADORES_BS.md
```

## Atualização 011 — filiais oficiais, GPS e colaboradores

Execute a migration abaixo após as migrations 009 e 010:

```txt
supabase/migrations/011_branch_names_gps_audit_colaboradores_2026_07_10.sql
```

Ela padroniza as unidades oficiais:

- Brilho do Sol Matriz
- Brilho do Sol Vila Biné
- Brilho do Sol Construção
- Brilho do Sol Filial 1° de Maio

Também reorganiza os colaboradores por unidade, atualiza horários, preserva os PINs já existentes e adiciona os novos colaboradores da Matriz e da Construção.

Arquivos de conferência:

```txt
docs/MAPEAMENTO_FILIAIS_COLABORADORES_2026_07_10.md
docs/colaboradores_oficiais_011.csv
```

### Diagnóstico GPS

A versão inclui o endpoint:

```txt
/api/public/gps/diagnostic
```

Ele valida filial, coordenadas, raio de 900m, distância e precisão do aparelho antes da batida. A tela pública de ponto também ganhou o botão **Testar GPS da filial**.

Antes do uso oficial, ajuste a latitude/longitude reais de cada unidade no menu **Filiais**. O ponto usa a geolocalização real do celular, e o Google Maps é usado apenas para ajudar a configurar as coordenadas da unidade.
