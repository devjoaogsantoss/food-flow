# Cardápio: à la carte e degustação

Data: 20/11/2026. Implementação assistida: Codex, por solicitação do usuário. Dados do cardápio e regras: fornecidos pelo usuário. Revisão humana final pendente.

Objetivo: integrar a planilha enviada, apresentar dois caminhos, calcular consumo/adicionais/estacionamento, permitir anotação pelo garçom e ilustrar os pratos. Incorporar o contexto anterior de site do cliente e telas da equipe por matrícula.

Prompt relevante: apresentar pedido à la carte filtrado pelos códigos e três menus degustação; à la carte soma produtos da mesa, serviço de 10%, couvert de 10% e estacionamento de R$ 7,90 se utilizado; degustação multiplica preço escolhido por pessoas; informar estacionamento no check-in; criar fluxo do garçom, fotos a partir dos nomes e cards de degustação. O usuário confirmou que estacionamento também se aplica à degustação. Exemplos de matrículas foram fornecidos anteriormente pelo próprio usuário.

Decisões: cada percentual é calculado separadamente sobre o subtotal à la carte; estacionamento é único por mesa; preços dos pacotes vêm dos títulos do CSV. Códigos repetidos são mantidos dentro de cada seção. Imagens ilustrativas via recurso integrado imagegen, com prompts completos em `public/images/menu/README.md`. Matrículas organizam o protótipo em telas por perfil, sem declarar autenticação de servidor ou pagamento implementado.

Arquivos: CSV/JSON em `src/data/`; importador; catálogo e cards; compositor, rodadas e resumo da conta; regras de catálogo/cálculo; serviços de pedidos/recepção; check-in com estacionamento; acesso da equipe e cozinha; rotas; CSS; testes e documentação. Pedidos antigos e alterações anteriores foram preservados; sem commit, push ou deploy.

Verificação: 37 testes aprovados; build Vite aprovado; roteiro Chrome com perfil temporário aprovado, incluindo conta mista R$ 677,58, atualização entre abas e restrição das telas por matrícula. Fotos verificadas como arquivos locais carregáveis e capturas de à la carte/degustação inspecionadas. Roteiro em `docs/cardapio-e-pedidos.md`.

Ajuste posterior solicitado pelo usuário: substituir busca/seletor por quatro filtros de categoria e fileiras horizontais independentes de Bebidas, Entradas, Principal e Sobremesa. Cards reorganizados em foto clicável, categoria, nome, porção, peso/volume, preço e inclusão no pedido. Descrição narrativa futura no campo `detailDescription`, com aviso de conteúdo ainda não adicionado. Implementação em `ALaCarteCatalog.jsx`; preservados o envio de pedidos e os dados da planilha. Revisão humana continua pendente.
