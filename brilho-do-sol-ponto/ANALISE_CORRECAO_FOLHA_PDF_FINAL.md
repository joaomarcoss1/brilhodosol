# Correção final — Folha de Pagamento e PDF

## Problemas confirmados

1. A folha em PDF estava visualmente desalinhada porque o relatório financeiro era exportado com muitas colunas e o exportador dividia a tabela em blocos `Detalhamento 1/4`, `2/4`, etc.
2. A logo real do Brilho do Sol não aparecia no cabeçalho do PDF porque o `pdfkit/js/pdfkit.standalone.js` não lida bem com imagem por caminho no ambiente Node; ele caía no fallback textual `BRILHO`.
3. A consulta de pontos ainda tinha relacionamento ambíguo entre `time_entries` e `branches`, pois a tabela possui mais de uma FK para `branches`.
4. A tela da folha ainda precisava de reforço visual para contraste e alinhamento.

## Correções aplicadas

- A exportação PDF da folha agora usa uma versão resumida e legível da tabela, com colunas operacionais e financeiras essenciais.
- O Excel permanece completo, com Pix, banco, agência, conta e observações.
- A logo foi convertida para `public/logo-brilho-do-sol-pdf.png` e o exportador usa `fs.readFileSync()` com o PDFKit normal, permitindo embutir a imagem corretamente.
- O import do PDFKit voltou para `pdfkit`, com `serverExternalPackages` e `outputFileTracingIncludes` no `next.config.ts` para evitar o erro `Helvetica.afm` na Vercel.
- A query de pontos foi corrigida para usar relacionamento explícito:

```ts
branches:branches!time_entries_branch_id_fkey(name)
```

- A folha no app ganhou reforços de contraste, alinhamento e truncamento de colunas para evitar aparência torta.

## Arquivos principais alterados

- `src/lib/server/exporters.ts`
- `src/app/api/admin/reports/route.ts`
- `src/components/admin/PayrollPage.tsx`
- `src/app/globals.css`
- `public/logo-brilho-do-sol-pdf.png`
- `next.config.ts`

## Validação

Executado com sucesso:

```bash
npm run typecheck
npm run lint
npm run build:compile
npm run build:finalize
```

## Observação

Na Vercel, como o `package.json` está na raiz do repositório, mantenha o Root Directory vazio.
