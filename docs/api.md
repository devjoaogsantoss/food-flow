# API implementada

Base `/api`, Express 5 em `server/app.js`. O modo padrão usa HTTP com Bearer token; perfil e propriedade são verificados no servidor. [Operação](servidor-e-banco.md) · [Pendências atuais](pendencias-atuais.md).

| Método e caminho | Acesso | Finalidade |
|---|---|---|
| POST `/auth/staff`, `/auth/guest` | Público | Autenticar equipe ou responsável |
| GET `/auth/session`, POST `/auth/logout` | Sessão | Consultar ou revogar sessão |
| GET `/health`, `/menu`, `/services/availability` | Público | Saúde, catálogo e disponibilidade |
| POST `/reservations` | Público | Reserva com senha e pagamento simulado |
| GET `/reservations` | Recepção | Lista de reservas |
| GET `/reservations/:id`, `/reservations/:id/status` | Dono ou recepção | Consulta individual |
| POST `/reservations/:id/cancel` | Dono | Cancelar e calcular reembolso simulado |
| POST `/waitlist` | Público/recepção | Inscrição gratuita |
| GET `/reception/operations` | Recepção | Espera e bar |
| PATCH `/waitlist/:id`, PUT `/reception/bar` | Recepção | Atualizar espera e bar |
| POST `/reservations/:id/check-in`, `/wait`, `/accommodation`, `/departure` | Recepção | Chegada, espera, acomodação e saída |
| PATCH `/reservations/:id/parking` | Recepção | Corrigir estacionamento antes de fechar |
| GET `/tables` | Equipe ou cliente | Mesas filtradas por sessão |
| GET `/checks`, `/checks/:id` | Garçom, cozinha ou dono | Comandas filtradas por sessão |
| POST `/orders` | Dono ou garçom | Rodada com preço do catálogo |
| PATCH `/rounds/:id` | Cozinha/garçom | Pronto pela cozinha; entregue pelo garçom |
| POST `/checks/:id/calls` | Dono | Atendimento ou fechamento presencial |
| PATCH `/checks/:id/calls/:callId` | Garçom | Atender chamada, sem pagar |
| PATCH `/checks/:id/tasting` | Dono ou garçom | Preferências de degustação |
| POST `/tables/:id/release` | Recepção | Liberar após saída e limpeza |

POST `/checks/:id/payments`: dono (digital) ou garçom (presencial). Corpo: `method`, `paymentStatus` (`aprovado`/`recusado`), `expectedTotalCents`, `expectedCreditCents`; aceita `Idempotency-Key`. O servidor recalcula a conta e obtém o canal pela sessão. O resultado é a comanda fechada com `settlement` e referência única. Não confundir chamada presencial com liquidação.

Digital: `pix`, `cartao_credito`, ou `credito` quando o saldo é exatamente zero. Presencial: `dinheiro`, `cartao_presencial`, `dividido` (confirmação do total pela equipe), `credito`, ou `sem_consumo`. Crédito excedente exige atendimento e retorna `MANUAL_REQUIRED`, sem liquidação em qualquer canal até decisão da equipe. Sem consumo é encerrado presencialmente com retenção da taxa e sem nova cobrança.

Rodadas ou itens não entregues e estacionamento não informado bloqueiam pagamento. Resumo alterado retorna 409; pagamento recusado retorna 422 sem aplicar crédito. Crédito, liquidação e estado fechado são gravados atomicamente; fechar não libera fisicamente a mesa. Saída e limpeza continuam com a recepção.

## Contratos e concorrência

Respostas JSON preservam os contratos dos serviços em `src/services/`. Erros usam `{ code, message }`: 400 entrada, 401/403 acesso, 404 inexistente, 409 conflito, 422 regra e 429 limite de login.

Cada operação de negócio usa `BEGIN IMMEDIATE`. Restrições SQL e serialização impedem duplicar vagas e comandas. `Idempotency-Key` permite repetir criação com o mesmo corpo; outro corpo retorna conflito. O navegador não repete mutações automaticamente.

Não há CORS aberto nem autenticação por cookie; mutações usam JSON e chamadas declaradas cross-site são recusadas. Adaptadores HTTP estão ativos por padrão; `dev:local` é o modo demonstrativo explícito.
