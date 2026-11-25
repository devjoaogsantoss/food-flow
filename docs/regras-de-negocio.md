# Regras de negócio

## Decisões aprovadas em 25/11/2026

- Atraso: indicador exclusivamente informativo; a recepção decide o atendimento. Não cancelar reserva nem liberar vaga automaticamente por atraso.
- Ausência: tratamento manual pela equipe, sem multa, estorno ou liberação automática de vaga nesta versão.
- Consumo positivo inferior ao crédito: exibir consumo, crédito e diferença; bloquear fechamento digital e encaminhar ao atendimento presencial. Não automatizar o destino da diferença antes da aprovação da equipe. Enquanto não houver decisão registrada, a comanda não é liquidada automaticamente, inclusive no canal presencial.

> API Express, SQLite, autenticação e sincronização implementados. Estado e trabalho restante: [pendências atuais](pendencias-atuais.md). Registros de sessões anteriores abaixo são históricos.

Este documento consolida as regras validadas e o acesso por perfil. [Voltar ao README](../README.md).

## Reserva

O cardápio é público e não pré-seleciona pratos. Há 18 mesas: 10 para duas pessoas, 6 para quatro e 2 para oito. Os serviços são 17h45, 20h00 e 22h15, de terça a sábado. A reserva exige pagamento simulado de R$ 50 por mesa de 2 lugares, R$ 100 por mesa de 4 e R$ 200 por mesa de 8 (associação aprovada em 24/11/2026) e só confirma com disponibilidade e aprovação. Cancelamento com 12 horas ou mais permite reembolso simulado. Lotação oferece outras datas ou horários. Lista de espera está desativada nesta versão.

## Recepção

Somente a recepção faz check-in após a apresentação no balcão. No check-in, informa se a mesa utiliza estacionamento: R$ 7,90 uma vez por mesa, inclusive no menu degustação. A recepção define uma mesa pronta e a encaminha ao salão. O garçom/metre confirma a acomodação física; somente então a comanda é aberta. A mesa definida fica indisponível para outra atribuição. O bar tem 20 lugares e é controlado pela equipe; pedidos do bar ficam com o barman.

## Pedidos

O responsável da reserva e o garçom podem lançar itens na mesma comanda. Uma pessoa representa a mesa no pedido digital; também pode chamar o garçom. É permitido misturar degustação e à la carte. Categorias: Entradas, Principal, Sobremesa e Bebida. O catálogo fornecido em 20/11/2026 substitui a degustação única de R$ 239,90: agora existem Mar (R$ 226,96), Terra (R$ 217,96) e Vegano (R$ 215,35) por pessoa, com entrada, principal, sobremesa e escolha de uma das duas bebidas de cada menu. Composição e porções vêm da planilha; códigos são identificados dentro de cada seção para preservar diferenças entre menus.

À la carte: soma dos produtos × quantidades da mesa, mais 10% de serviço e 10% de couvert, ambos calculados separadamente sobre esse subtotal. Degustação: preço do menu × pessoas, sem os adicionais de serviço e couvert. Estacionamento soma R$ 7,90 uma única vez à conta quando utilizado, nos dois caminhos, conforme confirmação do usuário. Ao misturar os caminhos, somente os produtos à la carte recebem serviço e couvert. Valores são calculados em centavos e os preços são registrados no pedido.

A cozinha vê a sequência; cada rodada tem estado próprio: “Em preparo” e “Todos os itens foram entregues”. A cozinha registra o início do preparo e indica “Pronto para servir”; o garçom confirma a entrega somente após esse aviso. O salão pode confirmar “Em refeição” após as entregas; nova rodada remove essa indicação. O cliente e o garçom revisam itens, quantidades e observações antes de enviar cada rodada.

## Fechamento

A conta libera quando há consumo e nenhuma rodada está em preparo. Nova rodada bloqueia o pagamento. Pix e cartão de crédito são simulados pelo site; dinheiro, cartão físico ou divisão chamam o garçom. O saldo é consumo menos a reserva já paga. Sem consumo após check-in encerra como “Sem consumo” e retém a taxa. Consumo positivo menor que a taxa exige tratamento manual. Após a saída, a equipe limpa e libera a mesa.

## Acesso e estados

| Perfil | Pode executar mudanças principais |
|---|---|
| Visitante | Consultar cardápio e disponibilidade |
| Responsável | Criar/cancelar reserva, pedir e pagar quando liberado |
| Recepção | Check-in, estacionamento, definir mesa, acompanhar atendimento, controlar bar e registrar saída após quitação |
| Garçom/metre | Confirmar acomodação, lançar pedido, entregar após preparo, atender chamada, confirmar refeição, auxiliar pagamento e liberar mesa após limpeza |
| Cozinha | Atualizar preparo e indicar pronto para servir; entrega final confirmada pelo garçom |
| Administração | Ambiente separado por função; cadastro de cardápio e serviços não é oferecido nesta versão |

Atraso e ausência seguem as decisões manuais de 25/11. Destino da diferença de crédito depende de aprovação; veja [pendências atuais](pendencias-atuais.md).

O modo padrão autentica a equipe por matrícula/senha. O cliente pode usar o código UUID completo, sem criar conta, ou optar por conta com senha protegida por hash para reunir reservas no histórico; reservas anteriores podem ser vinculadas com o respectivo código. Reservas, recepção, pedidos e cozinha usam SQLite compartilhado. O modo local é exclusivamente demonstrativo. Veja [Contrato da reserva](contrato-reserva.md).
