# Correção v019.1 — estrutura do GitHub e campo multiselect

## Causa do erro no Vercel

O repositório continha duas cópias do projeto:

- uma versão anterior na raiz;
- a v019 dentro da pasta `brilho-do-sol-ponto-rh-v019-feriados-folha-estabilidade/`.

O `tsconfig.json` da raiz inclui arquivos `**/*.ts` e `**/*.tsx`. Assim, o Next.js compilou a página v019 localizada na pasta interna, mas o alias `@/` resolveu o `ResourceManager` da versão antiga na raiz. A versão antiga não reconhecia o tipo `multiselect`.

## Correção aplicada

- todos os arquivos do projeto estão diretamente na raiz deste pacote;
- `ResourceField` aceita `multiselect`;
- o `ResourceManager` renderiza seleção múltipla de filiais;
- não existe pasta de projeto duplicada dentro deste ZIP;
- PINs e fluxo de ponto não foram alterados.

## Publicação

Substitua o conteúdo do repositório pelos arquivos deste pacote, preservando apenas a pasta `.git` do clone. Exclua do GitHub a pasta antiga:

`brilho-do-sol-ponto-rh-v019-feriados-folha-estabilidade/`
