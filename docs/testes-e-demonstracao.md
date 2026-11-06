# Testes e demonstração

Este documento separa testes automatizados de verificações manuais. [Voltar ao README](../README.md).

## Aceite automatizado

Quando houver implementação, testar concorrência na última mesa, pedido antes da acomodação, duas rodadas, bloqueio/liberação da conta, abatimento da reserva, pagamento duplicado e disputa digital/presencial. Também testar transações, idempotência e persistência após reinício.

## Roteiro manual

1. Visitante consulta cardápio; responsável reserva, paga e cancela em cenário separado.
2. Recepção faz check-in, simula mesa atrasada, acomoda e abre uma única comanda.
3. Responsável e garçom lançam pedidos; cozinha entrega duas rodadas; garçom confirma a última.
4. Responsável paga saldo por Pix; repetir pagamento e tentar nova rodada para demonstrar bloqueios.
5. Repetir com fechamento presencial, lista de espera, sem consumo e consumo positivo menor que a taxa.
6. Recepção libera a mesa após limpeza.

As verificações manuais devem guardar data, perfil, entradas, resultado esperado, resultado observado e evidência. O roteiro não trata como resolvida a regra pendente de consumo abaixo da taxa.
