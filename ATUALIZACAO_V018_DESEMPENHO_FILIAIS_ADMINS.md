# Brilho do Sol Ponto RH — v018

## Problemas corrigidos

### Travamentos no painel administrativo
O `ResourceManager` recriava o array vazio de filtros a cada renderização. Nas telas com opções remotas, como Administradores e Escalas, isso reiniciava o efeito de carregamento, atualizava o estado e disparava novas requisições continuamente.

Correções:
- filtros e valores padrão estáveis;
- carregamento de opções baseado em chave serializada;
- deduplicação de requisições GET em andamento;
- cache do token administrativo;
- timeout de rede com mensagem clara;
- remoção do pré-carregamento automático de todas as rotas e APIs do menu;
- dashboard inicial usando apenas endpoint leve.

### Folha por matriz/filial
O seletor existia, mas qualquer falha ao carregar as filiais era ignorada. A tela ficava apenas com “Todas permitidas”, sem explicar que as unidades não foram retornadas pelo banco.

Correções:
- carregamento explícito de Matriz e filiais;
- fallback para a rota completa de filiais;
- aviso visível quando o banco não possui unidades;
- botão para recarregar;
- geração bloqueada enquanto as filiais não estiverem prontas;
- ordenação oficial: Matriz, Vila Biné, Construção e Filial 1° de Maio;
- migration 017 para garantir as quatro unidades no Supabase.

### Criação de administradores
Correções:
- eliminada a sequência de requisições que travava a tela;
- criação real do usuário no Supabase Auth quando é informada uma senha inicial;
- vínculo automático de um usuário Auth já existente pelo e-mail;
- bloqueio de perfil administrativo sem login vinculado;
- validação de e-mail, filial e perfil;
- gerente de filial exige uma filial principal;
- atualização de e-mail, senha e metadados no Supabase Auth;
- rollback do usuário Auth caso a gravação do perfil administrativo falhe.

## Migration obrigatória
Execute no SQL Editor do Supabase:

`supabase/migrations/017_v018_admin_performance_branches.sql`

## Validação
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado;
- `npm run build:full`: aprovado;
- 30 páginas geradas sem erro de compilação.
