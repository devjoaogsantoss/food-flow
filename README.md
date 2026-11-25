# Food Flow

Reservas, recepção, pedidos e cozinha integrados por API Express e SQLite compartilhado. Veja [como executar o servidor, criar senhas e conectar dispositivos](docs/servidor-e-banco.md). Veja [contrato, valores aprovados e pendências](docs/contrato-reserva.md).

[Resumo da entrega e créditos de Manasses, Matheus e Henrique](docs/resumo-integracao-reservas.md).

Food Flow é o projeto acadêmico da AV2 de Coding, uma soluão Whitelabel multitenant focado em atender restaurantes. Criamos um case com o restaurante fictício Santo Garfo: uma semana de atendimento de terça a sábado, com reserva, pedido, cozinha e fechamento no mesmo sistema.

O repositório contém aplicação React/Vite, API Express autenticada, banco SQLite e testes automatizados. A redução de carga e tempo ainda são hipóteses a validar. Consulte a [lista única de pendências atuais](docs/pendencias-atuais.md).

Produção: configuração Docker/Compose, HTTPS, volume SQLite, contas iniciais e variáveis em [preparação de deploy](docs/deploy.md). A configuração está preparada; publicação e certificado público ainda dependem do servidor de destino.

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

Use Node 22.19+, `npm.cmd ci`, `npm.cmd run db:setup` e `npm.cmd run dev` no PowerShell. Esse comando inicia API e interface juntas. Cliente: `/` e `/minha-reserva`, com código e senha. Equipe: `/equipe`, com matrícula e senha; credenciais iniciais em `data/initial-access.txt`. Testes: `npm.cmd test`; build: `npm.cmd run build`. O modo antigo de navegador é explícito: `npm.cmd run dev:local`.

O modo padrão conecta reservas, recepção, pedidos e cozinha pela API autenticada e SQLite compartilhado. `dev:local` mantém a demonstração explícita no navegador. O [registro da integração de Matheus](docs/integracao-matheus.md) preserva o histórico da primeira integração.

O [cardápio e roteiro dos dois caminhos](docs/cardapio-e-pedidos.md) descreve a planilha integrada, preços, estacionamento e matrículas de teste. Para atualizar o catálogo a partir de `src/data/cardapio.csv`, execute `node scripts/import-menu.mjs`.

## Equipe

João, Manasses, Vinicius, Matheus, Dudu, Israel e Henrique.
