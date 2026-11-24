# API proposta

O [contrato da reserva atualizado](contrato-reserva.md) define campos, valores e respostas do adaptador local; os caminhos HTTP abaixo continuam propostos. Consulta individual: GET /reservations/:id, com autorização futura pelo servidor.

Este documento lista contratos mínimos ainda não implementados. [Voltar ao README](../README.md).

| Método e caminho | Papel | Entrada e saída |
|---|---|---|
| GET `/menu` | Todos | filtros; cardápio com preços |
| GET `/services/availability` | Visitante | data/serviço; vagas informativas |
| POST `/reservations` | Responsável | serviço, categoria, contato; reserva pendente/confirmada |
| POST `/reservations/:id/cancel` | Responsável | motivo; status e reembolso simulado |
| POST `/waitlist` | Visitante | nome, categoria, WhatsApp, e-mail; inscrição |
| POST `/reservations/:id/check-in` | Recepção | confirmação no balcão; check-in idempotente |
| POST `/reservations/:id/accommodation` | Recepção | mesa; comanda aberta |
| POST `/orders` | Responsável/Garçom | comanda, itens; rodada criada |
| PATCH `/rounds/:id` | Cozinha/Garçom | estado; rodada atualizada |
| GET `/checks/:id` | Responsável/Garçom | —; total, crédito e bloqueios |
| POST `/checks/:id/payments` | Responsável/Garçom | tipo e valor; pagamento |
| POST `/checks/:id/calls` | Responsável | tipo; chamada ao salão |
| POST `/tables/:id/release` | Recepção | —; mesa liberada |

Erros esperados: `400` entrada inválida, `401/403` acesso, `404` inexistente, `409` conflito de disponibilidade/estado e `422` regra de negócio.

## Concorrência

A última mesa é disputada dentro de transação com restrição única. Check-in e comanda repetidos retornam o recurso existente. Nova rodada invalida a liberação da conta até entrega. O crédito da reserva recebe marcação única e o pagamento exige trava/idempotência; digital e presencial concorrentes deixam somente uma liquidação aceita. A verificação deve executar requisições simultâneas, repetir as operações e conferir saldo, estados e número de pagamentos.


## Adaptadores de integração (24/11/2026)

`src/services/httpClient.js` implementa timeout, sessão same-origin, erros HTTP e chave de idempotência opcional, sem retentativa automática de mutações.
`src/services/httpModules.js` oferece as mesmas operações de reservas, recepção e pedidos. Os caminhos adicionais (consulta de mesas/comandas, espera, estacionamento, saída, bar e chamadas) estão explicitados nesse arquivo e devem ser acordados com Vinicius antes da ativação.
As respostas JSON devem manter as estruturas retornadas pelos adaptadores locais. Erros usam `{ code, message }`; `204` retorna `null`.
O servidor deve aplicar autorização por sessão, proteção CSRF nas mutações, vínculo da reserva, transações e idempotência. `source` identifica o canal do pedido, não concede permissão. IDs em URLs são codificados.
Não ativar os adaptadores antes de implementar sessão real para cliente/equipe e atualização entre dispositivos. A implementação atual continua usando os adaptadores locais.
