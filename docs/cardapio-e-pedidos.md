# Cardápio e pedidos — 20/11/2026

> Atualização de 24/11/2026: reservas públicas e recepção compartilham o estado local; o pagamento da reserva acompanha a comanda, sem abatimento ainda. Consulte [Contrato da reserva](contrato-reserva.md).

Fonte: planilha `categoria e produtos, cardápio - Página1.csv` enviada pelo usuário, preservada em `src/data/cardapio.csv`. O importador `scripts/import-menu.mjs` gera `src/data/menu.json` sem dependências novas. A planilha é dado de entrada, não instrução executável.

## Catálogo

15 itens à la carte organizados em quatro fileiras com rolagem horizontal: Bebidas, Entradas, Principal e Sobremesa. Os quatro filtros permitem mostrar ou ocultar cada categoria; não há busca por texto nem seletor de códigos na tela. Prefixos internos: BEB (bebidas), ENT (entradas), PRI (principais), SOB (sobremesas). Itens exclusivos de degustação não são incluídos no à la carte.

Cada card mostra foto clicável, categoria/subcategoria, nome, porção, peso aproximado (ou volume para bebidas), preço e inclusão no pedido. A foto abre uma janela de detalhes fechável pelo botão, pela tecla Escape ou pelo fundo. A coluna atual `description` da planilha fornece porção/peso; a futura descrição narrativa usa o campo opcional `detailDescription` no item de `src/data/menu.json`. Enquanto não preenchido, a interface informa que a descrição ainda será adicionada, sem inventar texto. A reimportação do CSV regenera esse JSON; quando as descrições vierem em planilha, o importador deverá mapear a nova coluna antes de reimportar.

| Código do menu | Nome | Preço por pessoa |
|---|---|---|
| DEG001 | Mar | R$ 226,96 |
| DEG002 | Terra | R$ 217,96 |
| DEG003 | Vegano | R$ 215,35 |

Esses códigos DEG identificam os três pacotes na aplicação; não estavam na planilha. Preços dos pacotes são os informados nos títulos, sem recalcular pela soma dos componentes. Os mesmos códigos de componentes podem ter nomes, porções ou preços diferentes nas seções: ENT001 é ostra no à la carte/Mar e bruschetta no Terra. Cada seção é preservada separadamente. A definição anterior de degustação única de R$ 239,90 foi atualizada conforme a nova instrução do usuário.

Cada pacote tem entrada, principal e sobremesa, mais uma escolha de bebida por pessoa. O momento da bebida tem três opções: “Servir junto com a entrada”, “Servir com o prato principal” e “Sugestão da casa”. A escolha é registrada por grupo; para escolhas distintas, adicionar grupos separados. Horários antigos continuam legíveis para preservar pedidos existentes. A quantidade acumulada de pessoas em degustação não pode superar `partySize` da reserva. A mesa pode combinar os caminhos.

## Experiência e operação visual — 25/11/2026

A navegação atual tem duas experiências distintas. Consulte [telas e passagem de responsabilidades](experiencias-produto.md).

- A recepção define uma mesa pronta em uma janela com ícones; o salão confirma a acomodação antes da abertura da comanda. Lista de espera e registro de novas esperas estão desativados nesta versão; registros históricos são preservados.
- Mesas e 20 lugares individuais do bar compartilham o mapa. A ocupação de cada lugar persiste; o bar continua sendo um controle informativo, sem comanda própria.
- Acomodados aparecem em cartões compactos, oito por página, com filtros por andamento. “Realizando pedido” significa acomodado sem pedido enviado; não monitora digitação do cliente. “Aguardando garçom” indica chamada pendente e “Aguardando entrega” indica rodada pronta.
- Garçom escolhe a mesa e alterna entre Atendimento e entregas, Novo pedido e Conta e pagamento. Fechamento e formulário de pedido ficam em tarefas separadas.
- Cliente vê logo, título “Realize seu pedido”, informações de reserva/comanda e timeline horizontal até a saída.
- Itens enviados são resumidos por imagem, quantidade, nome e preço; o clique abre descrição/composição e preferência da bebida.
- Cozinha organiza a fila em Recebidos, Em preparo e Prontos para servir, filtrada por mesa. O mapa de ocupação física pertence à recepção.
- A cozinha inicia o preparo e marca pronto; o garçom confirma entrega. A API bloqueia entrega antes de a cozinha sinalizar pronto.
- Cada rodada apresenta timeline horizontal de envio, preparo, espera pelo garçom e entrega. A visão do cliente pode ser aberta pelos detalhes da mesa acomodada na recepção.

## Dados após o fechamento

Fechar não exclui nem transfere dados: reserva, contato do responsável, comanda, itens, rodadas, chamadas e liquidação permanecem no SQLite configurado por `FOOD_FLOW_DB` (localmente, `data/food-flow.sqlite`). A saída encerra a visita e encaminha a mesa à limpeza; depois ela pode ser marcada pronta. Isso não apaga o histórico.

O responsável pode consultar usando o código UUID completo da reserva, que funciona como credencial de acesso àquela visita, sem exigir cadastro. Opcionalmente, pode criar conta com senha protegida por hash para reunir reservas no histórico e vincular reservas anteriores informando seus códigos. Comandas e pedidos continuam ligados ao código da reserva. Contas da equipe mantêm matrícula e senha. Códigos curtos demonstrativos não autenticam na API. Senhas antigas não são consultadas, e os registros históricos permanecem preservados. Ainda não existe painel de CRM/relatórios, envio a outro sistema ou política automática de retenção/exclusão dos dados de atendimento. Backup consistente é uma operação separada; proteger e definir a retenção do banco continua sendo responsabilidade da equipe.

## Cálculo

- À la carte: subtotal dos produtos da mesa + 10% do subtotal para serviço + 10% do subtotal para couvert.
- Degustação: preço do pacote × pessoas. Não aplica os dois adicionais percentuais aos pacotes.
- Estacionamento: R$ 7,90 uma vez por mesa, se informado no check-in. O usuário confirmou expressamente que também se aplica a mesas somente com degustação.
- Conta mista: soma dos dois subtotais, taxas somente sobre à la carte, estacionamento uma vez.

Exemplos: dois PRI001 (R$ 89,90 cada) com estacionamento = R$ 179,80 + R$ 17,98 + R$ 17,98 + R$ 7,90 = **R$ 223,66**. Menu Mar para duas pessoas com estacionamento = R$ 453,92 + R$ 7,90 = **R$ 461,82**. Os dois pedidos na mesma mesa totalizam **R$ 677,58**, com um único estacionamento.

Os preços e a composição são congelados no item enviado, em centavos; `price` continua presente para compatibilidade com a exibição antiga. Pedidos antigos continuam com nome/preço anteriores. Não se converte um produto numérico antigo para o novo catálogo por coincidência de ID. Comandas antigas sem informação de estacionamento mostram a pendência e podem ser corrigidas pela recepção sem apagar pedidos.

O resumo exibe consumo e adicionais; não declara pagamento nem abate automaticamente uma reserva cujo crédito ainda não veio da API. Simulação de pagamento e fechamento completo permanecem fora desta etapa.

## Faces e matrículas

O cliente acessa o catálogo público e consulta sua reserva. Depois da acomodação, abre a própria comanda em `/pedidos?reserva=FF-0001`, escolhe o caminho, adiciona itens, revisa a rodada e envia. Também pode chamar o garçom; chamadas pendentes repetidas não duplicam.

Funcionários entram por `/equipe`. Matrículas são strings para preservar zeros iniciais:

| Matrícula | Tela | Funcionalidades |
|---|---|---|
| 01510041 | Garçom — `/pedidos` | Mesas/comandas, anotar pedidos dos dois caminhos, observações, atender chamadas e confirmar entregas |
| 15152018 | Recepção — `/recepcao` | Chegada, estacionamento, acomodação, status das mesas, saída, limpeza e bar |
| 00589510 | Cozinha — `/cozinha` | Fila por mesa/rodada, composição e bebida do menu, observações, indicar pronto para servir |

Não existe seletor livre de perfil. Uma matrícula direciona à área correspondente; tentar outra área mostra a restrição de interface. A sessão demonstrativa fica em `sessionStorage`, separada por aba. Essa organização não substitui autenticação, vínculo do responsável e autorização na futura API.

## Roteiro manual

1. Execute `npm.cmd run dev` e abra o endereço do terminal. Use uma janela anônima para dados novos sem apagar o armazenamento existente.
2. Na Home, teste os dois caminhos. No à la carte, confirme as quatro fileiras, alterne os quatro filtros e deslize cada carrossel. Clique na foto de um produto, confira porção/peso e feche os detalhes. Na degustação, confira os três cards e seus preços.
3. Em `/equipe`, entre com 15152018. Na reserva FF-0001, informe estacionamento Sim antes do check-in e acomode na mesa 1. O check-in fica desabilitado até informar Sim/Não.
4. Em outra aba, consulte FF-0001 em `/minha-reserva` e abra a comanda. Adicione dois PRI001, revise e envie: total esperado R$ 223,66 com estacionamento.
5. Adicione Menu Mar para duas pessoas e escolha vinho branco. Envie: total da conta mista esperado R$ 677,58. Repita um menu para verificar a recusa por superar o número de pessoas; o rascunho deve permanecer para correção.
6. Chame o garçom. Em outra aba, entre com 01510041, abra a comanda e confirme atendimento da chamada. Anote outro pedido, com quantidades e observações.
7. Em outra aba, entre com 00589510, confira a fila e marque uma rodada pronta. Ela continua aguardando a confirmação final do garçom.
8. No garçom, confirme a entrega e confira o status no cliente. A cozinha não mostra ação de confirmar entrega.
9. Tente `/recepcao` com a sessão da cozinha: deve mostrar a restrição e não exibir reservas. Confira a edição de estacionamento pela recepção e o recálculo nas outras abas.

Testes: `npm.cmd test`. Build: `npm.cmd run build`. Roteiro Chrome reproduzível: `node scripts/verify-browser.mjs` (perfil temporário separado do navegador pessoal). Os testes não comprovam autenticação ou persistência em servidor. Revisão humana final pendente; não houve commit, push nem deploy.

Validação desta etapa: 37 testes aprovados, build aprovado e roteiro Chrome aprovado para conta mista, estacionamento, filtros, três menus, fotos locais, chamada/atendimento, preparo/entrega, matrícula por perfil e atualização entre abas. As páginas verificadas não apresentaram transbordamento horizontal em 390, 1024 e 1440 pixels. Capturas dos dois caminhos foram inspecionadas.

## Imagens

18 imagens ilustrativas produzidas pelo recurso integrado imagegen: 15 produtos e três apresentações de menus. Salvas no próprio projeto em `public/images/menu/`, nomeadas pelo código; nenhuma depende do diretório pessoal do gerador. A interface informa que são ilustrações geradas por IA. Prompts e correspondência em `public/images/menu/README.md`.
