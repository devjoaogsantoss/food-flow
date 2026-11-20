# Regras de negócio

Este documento consolida as regras validadas e o acesso por perfil. [Voltar ao README](../README.md).

## Reserva

O cardápio é público e não pré-seleciona pratos. Há 18 mesas: 10 para duas pessoas, 6 para quatro e 2 para oito. Os serviços são 17h45, 20h00 e 22h15, de terça a sábado. A reserva exige pagamento simulado de R$ 50, R$ 100 ou R$ 200 conforme a categoria e só confirma com disponibilidade e aprovação. Cancelamento com 12 horas ou mais permite reembolso simulado. Lotação oferece outra data ou lista de espera gratuita, sem garantir vaga ou bloquear mesa.

## Recepção

Somente a recepção faz check-in após a apresentação no balcão. No check-in, informa se a mesa utiliza estacionamento: R$ 7,90 uma vez por mesa, inclusive no menu degustação. Mesa pronta permite acomodação e abertura de comanda. Em atraso, o site informa lounge ou bar; a recepção confirma a acomodação antes da comanda. O bar tem 20 lugares e é controlado pela equipe; pedidos do bar ficam com o barman.

## Pedidos

O responsável da reserva e o garçom podem lançar itens na mesma comanda. Uma pessoa representa a mesa no pedido digital; também pode chamar o garçom. É permitido misturar degustação e à la carte. Categorias: Entradas, Principal, Sobremesa e Bebida. O catálogo fornecido em 20/11/2026 substitui a degustação única de R$ 239,90: agora existem Mar (R$ 226,96), Terra (R$ 217,96) e Vegano (R$ 215,35) por pessoa, com entrada, principal, sobremesa e escolha de uma das duas bebidas de cada menu. Composição e porções vêm da planilha; códigos são identificados dentro de cada seção para preservar diferenças entre menus.

À la carte: soma dos produtos × quantidades da mesa, mais 10% de serviço e 10% de couvert, ambos calculados separadamente sobre esse subtotal. Degustação: preço do menu × pessoas, sem os adicionais de serviço e couvert. Estacionamento soma R$ 7,90 uma única vez à conta quando utilizado, nos dois caminhos, conforme confirmação do usuário. Ao misturar os caminhos, somente os produtos à la carte recebem serviço e couvert. Valores são calculados em centavos e os preços são registrados no pedido.

A cozinha vê a sequência; cada rodada tem estado próprio: “Em preparo” e “Todos os itens foram entregues”. A cozinha pode indicar “Pronto para servir”, mas o garçom confirma a entrega do último item. O cliente e o garçom revisam itens, quantidades e observações antes de enviar cada rodada.

## Fechamento

A conta libera quando há consumo e nenhuma rodada está em preparo. Nova rodada bloqueia o pagamento. Pix e cartão de crédito são simulados pelo site; dinheiro, cartão físico ou divisão chamam o garçom. O saldo é consumo menos a reserva já paga. Sem consumo após check-in encerra como “Sem consumo” e retém a taxa. Consumo positivo menor que a taxa exige tratamento manual. Após a saída, a equipe limpa e libera a mesa.

## Acesso e estados

| Perfil | Pode executar mudanças principais |
|---|---|
| Visitante | Consultar cardápio, disponibilidade e solicitar lista de espera |
| Responsável | Criar/cancelar reserva, pedir e pagar quando liberado |
| Recepção | Confirmar reserva, check-in, acomodação, espera e liberar mesa |
| Garçom | Lançar pedido, combinar bebida, confirmar entrega e atender chamada |
| Cozinha | Atualizar preparo e indicar pronto para servir; entrega final confirmada pelo garçom |
| Admin | Administrar cardápio, serviços e acesso operacional |

Decisões pendentes: tolerância de atraso/ausência e destino do valor quando o consumo é positivo e menor que a taxa.

O protótipo possui site do cliente e acesso demonstrativo da equipe por matrícula: 01510041 (garçom), 15152018 (recepção) e 00589510 (cozinha). Cada sessão mostra apenas a tela do perfil correspondente; isso não implementa autenticação/autorização de servidor. Reserva, pagamento, abatimento do crédito e fechamento completo continuam dependentes dos respectivos módulos.
