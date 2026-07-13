# Correção v015 — Filtro de filiais na folha

## Problema identificado
Na tela de geração da folha, o campo **Filial/Matriz** estava exibindo apenas a opção **Todas permitidas**, sem listar Matriz, Vila Biné, Brilho do Sol Construção ou Filial 1° de Maio.

## Causa técnica
O helper `canAccessAllBranches()` exigia que o `master_admin` não tivesse `branch_id` nem `allowedBranchIds`. Em bancos onde o usuário master antigo ficou vinculado acidentalmente a uma filial, a API `/api/admin/options/branches` era limitada por essa filial e podia retornar lista vazia.

## Correções aplicadas
- `master_admin` agora sempre tem acesso global real às filiais, mesmo se o perfil tiver vínculo legado com alguma unidade.
- A rota `/api/admin/options/branches` foi reforçada com `status=all` e fallback para bancos antigos onde unidades podem estar sem `active=true`.
- A tela de folha agora busca `/api/admin/options/branches?status=all`, garantindo que o seletor liste todas as unidades disponíveis ao usuário.

## Resultado esperado
Na tela **Admin > Folha**, o seletor **Filial/Matriz** deve mostrar:

- Todas permitidas;
- Brilho do Sol Matriz;
- Brilho do Sol Vila Biné;
- Brilho do Sol Construção;
- Brilho do Sol Filial 1° de Maio.

Com isso, o RH pode gerar:

- folha geral de todas as unidades permitidas;
- folha apenas da Matriz;
- folha apenas da Vila Biné;
- folha apenas da Construção;
- folha apenas da Filial 1° de Maio;
- folha por filial + dia de pagamento.

## Testes executados
- `npm run typecheck`: passou.
- `npm run lint`: passou com 1 aviso antigo não bloqueante em `PayrollPage.tsx`.
- `npm run build`: passou.
- `npm run build:finalize`: passou.
