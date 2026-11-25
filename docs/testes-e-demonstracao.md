# Testes e demonstração

Este documento separa testes automatizados de verificações manuais. [Voltar ao README](../README.md).

## Créditos de testes e qualidade — 25/11/2026

Créditos de todos os testes realizados nesta entrega atribuídos, a pedido de João, a **Eduardo José Vera Cruz de Souza (Dudu)** ([ejose28dudu-boop](https://github.com/ejose28dudu-boop)), responsável pela área de testes e qualidade no planejamento.

O escopo inclui testes de regras, integração e API; concorrência, autorização, idempotência e rollback; persistência após reinício; UUID, fechamento e entrada de produção; verificações de build e roteiro automatizado Chrome com cinco contextos e layouts de 390/1024/1440 px. A última execução local terminou com 68 testes, build e roteiro Chrome aprovados.

A implementação e a execução automatizada desta sessão foram realizadas com assistência do Codex a pedido de João. O crédito de Dudu pela área não declara execução manual, revisão ou aprovação pessoal já realizada por ele. Ensaio humano da equipe, deploy e validação real de Docker/HTTPS continuam pendentes conforme [pendências atuais](pendencias-atuais.md).

## Aceite automatizado

Os testes implementados cobrem concorrência na última mesa, pedido antes da acomodação, duas rodadas, bloqueio/liberação da conta, abatimento da reserva, pagamento duplicado e disputa digital/presencial. Também cobrem transações, idempotência e persistência após reinício. Testes locais não substituem validação no ambiente publicado.

## Roteiro manual

1. Visitante consulta cardápio; responsável reserva, paga e cancela em cenário separado.
2. Recepção faz check-in, simula mesa atrasada, acomoda e abre uma única comanda.
3. Responsável e garçom lançam pedidos; cozinha entrega duas rodadas; garçom confirma a última.
4. Responsável paga saldo por Pix; repetir pagamento e tentar nova rodada para demonstrar bloqueios.
5. Repetir com fechamento presencial, lista de espera, sem consumo e consumo positivo menor que a taxa.
6. Recepção libera a mesa após limpeza.

As verificações manuais devem guardar data, perfil, entradas, resultado esperado, resultado observado e evidência. O roteiro não trata como resolvida a regra pendente de consumo abaixo da taxa.
