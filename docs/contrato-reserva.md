# Contrato da reserva e integração — 25/11/2026

> API Express, SQLite, autenticação e sincronização implementados. Estado e trabalho restante: [pendências atuais](pendencias-atuais.md). Registros de sessões anteriores abaixo são históricos.

Decisão aprovada pelo usuário nesta sessão: taxa **por mesa**, 2 lugares = R$ 50,00; 4 = R$ 100,00; 8 = R$ 200,00. Fonte de configuração: src/lib/reservations.js. Serviços: 17:45, 20:00, 22:15; terça a sábado, horário de São Paulo. Categorias exatas, sem acomodação automática em categoria maior. Quantidade de pessoas de 1 até a capacidade escolhida.

## Registro comum

| Campo | Contrato |
|---|---|
| id | Código FF- seguido de UUID, único e imutável; funciona como credencial de acesso do cliente, trocada por sessão restrita à reserva |
| customerId | Identificador opcional da conta cliente; reserva pode existir e ser acessada por código sem conta |
| guestName, whatsapp, email | Responsável e contato; dados fictícios no protótipo |
| partySize | Inteiro entre 1 e tableCategory |
| tableCategory | Número 2, 4 ou 8 |
| date | Data local AAAA-MM-DD |
| service | HH:mm; um dos três serviços |
| status | reservada → chegou → mesa_definida → acomodada → encerrada; reservada → cancelada; em_espera preservado apenas no histórico |
| payment | status aprovado, amountCents inteiro calculado pela categoria, simulated true |
| refund | eligible, amountCents, simulated; registrado no cancelamento |
| createdAt, cancelledAt, arrivedAt, seatedAt, departedAt | Instantes ISO; preenchidos pela etapa responsável |
| assignedTableId, tableId, commandId, waitingTableId, waitingSince | Vínculos/estado operacional da recepção |

Confirmar exige contato válido, quantidade compatível, serviço futuro, disponibilidade e pagamento simulado aprovado. O valor enviado pelo cliente não determina a taxa. A reserva confirmada já nasce como reservada; a recepção registra chegada e define mesa; o garçom/metre confirma a acomodação. Cancelamento digital somente antes do check-in; reembolso integral quando faltam pelo menos 12 horas, incluindo o limite exato. Depois do check-in, orientar à recepção; sem inventar regra de estorno.

Disponibilidade é por data, serviço e categoria: inventário 10/6/2 mesas menos reservas não canceladas daquele serviço. Saída física não libera uma segunda reserva no mesmo serviço; cancelamento libera. Estado físico da mesa é independente da disponibilidade futura. Reservas demonstrativas existentes são preservadas e contam na disponibilidade de suas datas.

A acomodação abre uma comanda e copia payment para reservationPayment. Esse é um registro do pré-pagamento; não é abatimento nem confirmação de fechamento. O fechamento já aplica o crédito uma única vez, valida pagamento na API e bloqueia itens pendentes.

## Operações HTTP implementadas

O adaptador local src/services/reservationsApi.js oferece getAvailability, confirm, getReservation, cancel e joinWaitlist.

| HTTP | Entrada/saída |
|---|---|
| GET /services/availability | date, service, tableCategory → available, remaining, feeCents, suggestions (até 3 datas nos próximos 14 dias) |
| POST /reservations | date, service, tableCategory, partySize, guestName, whatsapp, email, paymentStatus → registro confirmado |
| GET /reservations/:id | Registro; servidor deve exigir identidade e vínculo do responsável |
| POST /reservations/:id/cancel | Estado cancelado e refund |
| POST /reservations/:id/table | Recepção define mesa, sem abrir comanda |
| POST /floor/accommodations/:id | Salão confirma acomodação e abre uma única comanda |

Lista de espera desativada na interface e API. Registros históricos permanecem preservados.

Erros locais: INVALID_INPUT (400), PAYMENT_DECLINED (422), NOT_FOUND (404), CONFLICT (409), INVALID_STATE (422). Os caminhos HTTP estão implementados em /api. Não foi mantido o contrato divergente /disponibilidade e /reservas do ZIP.

## Histórico de entrega e responsabilidades originais

Os itens abaixo descrevem a divisão original; o estado vigente está em [experiências do produto](experiencias-produto.md) e [pendências atuais](pendencias-atuais.md).

- Manasses: fluxo público integrado, taxas oficiais, disponibilidade pelo inventário, dados do responsável, pagamento simulado, código/consulta, cancelamento, sugestões e inscrição pública na espera.
- João: decisão de valores registrada, contrato compartilhado, base atual preservada e documentação atualizada. Build e testes são verificações locais; Workflow de CI para teste/build criado; execução remota, publicação e revisão humana seguem pendentes.
- Matheus: reservas novas entram no mesmo registro da recepção; canceladas aparecem separadamente e não fazem check-in; lista pública compartilhada; pagamento transmitido na abertura da comanda.
- Henrique: pedidos pelos dois canais na mesma comanda, crédito exibido como registro, operações recusadas em comanda fechada e repetição de atendimento/entrega sem alterar o registro concluído.
- Vinicius: servidor/API, SQLite, autenticação, transações, restrições e sincronização entre dispositivos implementados. Consulte [pendências atuais](pendencias-atuais.md).
- Israel: escopo original de pagamento/abatimento/fechamento implementado com assistência do Codex a pedido de João. Destino da diferença inferior ao crédito continua dependendo de decisão da equipe.
- Dudu/equipe: revisão humana, evidências, ensaio e testes reais de concorrência/persistência de servidor.

Estado local continua food-flow-state-v1; não se importam .git, node_modules, dist ou arquivos antigos do ZIP. As chaves santoGarfo:mockDb do ZIP não são migradas automaticamente: categorias antigas (salão/varanda/reservado) não têm equivalência aprovada com capacidades. Nenhum dado legado é apagado.

Web Locks serializa mutações no mesmo navegador/origem quando suportado; a alternativa serializa somente o contexto atual. Isto não substitui transação no servidor nem garante disputa entre dispositivos. No backend, código de reserva autentica somente aquela visita; a conta cliente opcional autentica o perfil e suas reservas vinculadas. A API valida proprietário e papel.

## Verificação

Resultado desta sessão: 46 testes aprovados, build de produção aprovado e roteiro Chrome aprovado, incluindo layouts em 390/1024/1440 pixels sem transbordamento horizontal. Workflow GitHub Actions criado para npm ci, npm test e npm run build; ainda não executado remotamente.

Testes de reserva/integracão cobrem última vaga local com duas APIs, isolamento por serviço/categoria, recusa/validação, reembolso no limite de 12h, devolução de vaga, espera sem cobrança e sem comanda, preservação em falha de gravação, crédito da reserva na comanda, pedidos pelos dois canais e bloqueios de comanda fechada.

Roteiro Chrome: node scripts/verify-browser.mjs. Inclui criar reserva pela interface, recusa/aprovação, recarga, consulta por URL, cancelamento e sincronização entre abas, além dos cenários já existentes. Sem commit, push ou publicação nesta sessão.
