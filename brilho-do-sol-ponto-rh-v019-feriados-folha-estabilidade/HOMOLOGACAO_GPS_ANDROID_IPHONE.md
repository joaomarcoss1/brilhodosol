# Homologação GPS — Android e iPhone

Este roteiro deve ser executado em cada unidade: Brilho do Sol Matriz, Vila Biné, Brilho do Sol Construção e Filial 1° de Maio.

## Pré-requisitos

- Sistema publicado em HTTPS.
- Filial com latitude e longitude reais salvas no painel.
- Geofence ativa.
- Raio permitido definido.
- GPS confirmado no painel de filiais.
- Funcionário ativo vinculado à unidade.
- PIN de 4 dígitos funcionando.

## Teste em Android / Chrome

1. Abrir o sistema pelo Chrome.
2. Permitir localização.
3. Tocar em **Testar GPS da filial**.
4. Conferir distância e precisão.
5. Registrar entrada dentro da loja.
6. Sair para fora do raio configurado.
7. Tocar novamente em **Testar GPS da filial**.
8. Confirmar bloqueio fora do raio.
9. Tirar print do resultado.

## Teste em iPhone / Safari

1. Abrir o sistema pelo Safari.
2. Confirmar que a URL está em HTTPS.
3. Permitir localização.
4. Tocar em **Testar GPS da filial**.
5. Conferir distância e precisão.
6. Registrar ponto dentro da loja.
7. Testar fora do raio.
8. Validar a mensagem de bloqueio.

## Testes obrigatórios por loja

| Loja | Dispositivo | Navegador | Dentro do raio OK | Fora do raio bloqueou | Precisão GPS | Ponto salvou | Data | Responsável | Observações |
|---|---|---|---|---|---|---|---|---|---|
| Matriz | Android | Chrome |  |  |  |  |  |  |  |
| Matriz | iPhone | Safari |  |  |  |  |  |  |  |
| Vila Biné | Android | Chrome |  |  |  |  |  |  |  |
| Vila Biné | iPhone | Safari |  |  |  |  |  |  |  |
| Construção | Android | Chrome |  |  |  |  |  |  |  |
| Construção | iPhone | Safari |  |  |  |  |  |  |  |
| Filial 1° de Maio | Android | Chrome |  |  |  |  |  |  |  |
| Filial 1° de Maio | iPhone | Safari |  |  |  |  |  |  |  |

## Cenários negativos

- GPS negado pelo usuário.
- GPS impreciso.
- Funcionário sem filial.
- Filial sem GPS confirmado.
- PIN errado.
- Ponto duplicado.
- Sequência completa: entrada, almoço, retorno e saída.
