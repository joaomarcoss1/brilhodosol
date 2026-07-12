# Análise minuciosa e correções — versão 011

## Correções estruturais aplicadas

1. **Filiais oficiais padronizadas**
   - Brilho do Sol Matriz
   - Brilho do Sol Vila Biné
   - Brilho do Sol Construção
   - Brilho do Sol Filial 1° de Maio

2. **Colaboradores reorganizados por unidade**
   - Colaboradores enviados por texto e PDFs foram consolidados por CPF/documento.
   - Colaboradores novos da Construção e Matriz foram adicionados.
   - PINs existentes foram preservados; novos colaboradores receberam PIN inicial de 4 dígitos.
   - Horários enviados foram aplicados em `employees` e em `work_schedules`.
   - Campos ausentes, como cargo/salário em alguns casos, permaneceram como `A definir` ou `0,00`, para preenchimento posterior.

3. **GPS e ponto**
   - Criado endpoint `/api/public/gps/diagnostic` para validar GPS antes do ponto.
   - A tela pública ganhou o botão **Testar GPS da filial**.
   - O diagnóstico confirma: filial ativa, geofence ativa, coordenadas da filial, raio, distância e precisão do aparelho.
   - A batida de ponto continua validando latitude/longitude, raio de 900m, precisão GPS e status da filial.

4. **Correção de relacionamento Supabase**
   - Corrigidas consultas de `time_entries` com relação explícita para `branches!time_entries_branch_id_fkey`, evitando erro de relacionamento ambíguo.

5. **PDF e folha**
   - PDFKit configurado em modo standalone para evitar erro `Helvetica.afm` na Vercel.
   - O PDF da folha não quebra mais em `Detalhamento 1/4`; agora usa quadro único e colunas essenciais.
   - O Excel continua completo para uso financeiro/contábil.
   - Logo oficial foi mantida em `public/logo-brilho-do-sol-pdf.png` e incluída no tracing do Next/Vercel.

## Pontos validados localmente

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build:compile` ✅
- `npm run build:finalize` ✅
- Teste local de PDFKit standalone com fonte Helvetica ✅

## Pendências operacionais antes de uso oficial

1. Ajustar latitude/longitude reais de cada unidade no painel **Filiais**.
2. Testar o botão **Testar GPS da filial** em cada loja usando celular em HTTPS.
3. Conferir cargo/salário dos colaboradores com `A definir`/`0,00`.
4. Entregar os PINs individualmente aos colaboradores e remover a lista de PINs de qualquer ambiente público.
