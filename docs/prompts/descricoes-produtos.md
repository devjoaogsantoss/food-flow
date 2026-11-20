# Descrições dos produtos — 20/11/2026

Solicitação: aplicar os textos do anexo `Texto colado.txt`, ignorando as novas descrições de bebidas conforme a mensagem do usuário. Implementação: Codex. Revisão humana final pendente.

Foram aplicadas 12 descrições: ostra, pintado, dadinho, frango, costela, salmão, cartola, cannoli, donut com geleia, bruschetta, risoto de cogumelos e donut de castanhas. Nenhum produto solicitado fora das bebidas deixou de ser localizado. As seis descrições anteriores de bebidas e as descrições gerais dos três menus foram preservadas; a nova descrição da Piña Colada Vegana também foi ignorada por ser bebida.

Fonte de preços, porções, nomes, disponibilidade e composição: `src/data/cardapio.csv`, importado para `src/data/menu.json`. Textos narrativos em `src/data/product-descriptions.json`; associação por nome para os pratos e aplicação compartilhada ao à la carte e aos componentes da degustação em `src/lib/menu.js`. Descrição e porção continuam separadas. A apresentação em `MenuCatalog.jsx` passa a incluir a descrição dos pratos dos menus; no à la carte, continua na janela aberta pela foto.

Identificação duplicada: na fonte, ENT001 serve tanto para ostra quanto bruschetta. O catálogo da aplicação passa a identificar a bruschetta como ENT004 após conferir o nome e o código; `sourceId: ENT001` preserva a referência original. Ostra mantém ENT001. Os componentes de novas degustações usam ENT004; os registros de pedidos antigos mantêm os nomes, códigos e preços congelados e não são regravados. A fonte CSV/JSON original permanece íntegra para auditoria e reimportação; a normalização é aplicada ao carregá-la.

Verificação automatizada: correspondência dos 12 nomes, descrições iguais para produtos repetidos, identificação sem colisão entre pratos, preservação dos campos da planilha e das descrições anteriores de bebidas. Testes de interface verificam leitura das descrições em 390 e 1440 pixels. Os textos são conteúdo de demonstração fornecido pelo usuário; não foi realizada verificação de fornecedores, procedência ou composição vegana. Sem commit, push ou deploy.
