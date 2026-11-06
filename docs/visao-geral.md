# Visão geral

Este documento explica o problema, o objetivo e os limites do MVP. [Voltar ao README](../README.md).

## Objetivo

Simular no site uma semana de atendimento do Santo Garfo, permitindo que cliente e restaurante usem os mesmos dados. O cliente consulta preços antes da reserva, escolhe pedir pelo site ou com o garçom e pode pagar digitalmente.

## Escopo do MVP

- Cardápio público com degustação e à la carte.
- Reserva com serviço, categoria de mesa, pré-pagamento simulado e cancelamento.
- Check-in e acomodação controlados pela recepção.
- Comanda, rodadas, pedidos digitais ou lançados pelo garçom e acompanhamento da cozinha.
- Conta com abatimento da reserva e pagamento Pix ou cartão simulado.
- Cenários de bar, atraso, lista de espera, fechamento presencial e sem consumo.

O caso de demonstração cobre terça a sábado, nos serviços de 17h45, 20h00 e 22h15. Redução de trabalho e tempo são hipóteses, não resultados comprovados.

## Fora do escopo

Estoque, CRM, escalas e white label ficam para evolução. Não há código, publicação, CI ou testes automatizados comprovados no estado atual.

## Entregáveis e pendências

Entregáveis: documentação, jornada demonstrável, aplicação publicada e evidências de validação, conforme implementação futura. Pendem a tolerância de atraso e ausência, o tratamento de consumo abaixo da taxa e a hospedagem com SQLite persistente.
