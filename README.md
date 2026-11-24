# Food Flow

Reservas públicas integradas à recepção e aos pedidos no protótipo local. Veja [contrato, valores aprovados e pendências](docs/contrato-reserva.md).

[Resumo da entrega e créditos de Manasses, Matheus e Henrique](docs/resumo-integracao-reservas.md).

Food Flow é o projeto acadêmico da AV2 de Coding, uma soluão Whitelabel multitenant focado em atender restaurantes. Criamos um case com o restaurante fictício Santo Garfo: uma semana de atendimento de terça a sábado, com reserva, pedido, cozinha e fechamento no mesmo sistema.

O repositório atualmente contém a documentação do produto e da proposta técnica. A redução de carga e tempo ainda são hipóteses a validar.

## Documentação

- [Visão geral](docs/visao-geral.md)
- [Regras de negócio](docs/regras-de-negocio.md)
- [Jornada do cliente — da reserva ao pagamento](docs/jornada-do-cliente.md)
- [Arquitetura](docs/arquitetura.md)
- [Banco de dados](docs/banco-de-dados.md)
- [API](docs/api.md)
- [Planejamento](docs/planejamento.md)
- [Planejamento e divisão de tarefas](docs/planejamento-e-divisao-de-tarefas.md)
- [Contribuição](docs/contribuicao.md)
- [Testes e demonstração](docs/testes-e-demonstracao.md)
- [Registro de prompts](docs/prompts/README.md)

## Execução e integração local

Use `npm.cmd ci`, `npm.cmd run dev`, `npm.cmd test` e `npm.cmd run build` no PowerShell. Cliente: `/` e `/minha-reserva`. Equipe: `/equipe`, com matrícula demonstrativa direcionando a `/pedidos` (garçom), `/recepcao` ou `/cozinha`.

A recepção e os pedidos estão conectados como protótipo no navegador, com dados fictícios e sem autenticação. Consulte o [registro da integração de Matheus](docs/integracao-matheus.md) para contratos, preservação dos dados, roteiro de revisão e conexões ainda pendentes.

O [cardápio e roteiro dos dois caminhos](docs/cardapio-e-pedidos.md) descreve a planilha integrada, preços, estacionamento e matrículas de teste. Para atualizar o catálogo a partir de `src/data/cardapio.csv`, execute `node scripts/import-menu.mjs`.

## Equipe

João, Manasses, Vinicius, Matheus, Dudu, Israel e Henrique.
