# Validação de preservação dos PINs — v019

A v019 não modifica o sistema de PIN dos funcionários.

Verificações realizadas:

- `src/lib/server/pin.ts` permanece idêntico à v018;
- `pin_hash` não é alterado pela migration `018_v019`;
- a validação continua exigindo PIN numérico de quatro dígitos;
- o hash continua usando bcrypt;
- bloqueio e logs de tentativa continuam ativos;
- histórico, justificativa e ponto continuam utilizando o mesmo PIN;
- senha de administrador permanece exclusiva do Supabase Auth.

A rota `api/public/clock/register` recebeu somente a integração com a decisão operacional do feriado para que um feriado aberto seja tratado como dia normal. O fluxo `assertPin` → bloqueio → `verifyPin` → registro da tentativa foi preservado.
