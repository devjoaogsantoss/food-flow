# API proposta

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
