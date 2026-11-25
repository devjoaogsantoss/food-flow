# Food Flow — Manual de identidade visual para o Codex

Versão 1.0 · 25/11/2026 · Aplicação: site do Food Flow e interfaces do Santo Garfo.

## 1. Como usar este documento

Leia este manual junto das instruções do repositório e do contexto funcional do projeto. Ele orienta a apresentação visual; não altera regras de negócio, permissões, preços ou estados do atendimento.

**Confirmado no projeto:** azul, bege, vinho e branco; estilo minimalista; distinção entre as marcas Food Flow e Santo Garfo; uso de logos oficiais; assinatura “Todo segundo conta” com relógio no canto superior direito.

**Proposta visual consolidada:** adoção de Roboto como fonte única, cores auxiliares, tamanhos, espaçamentos, raios, sombras e aparência dos componentes deste documento. A solicitação de compilação não transforma essas sugestões em decisões já aprovadas.

Não há neste manual comprovação de implementação ou teste do site. Os exemplos CSS são referências para adaptação à estrutura existente.

## 2. Direção visual

Transmitir organização, agilidade, confiança e hospitalidade. Usar fundos claros, leitura confortável, hierarquia evidente e poucos efeitos. A experiência deve ser consistente em todos os papéis.

- Cliente: valorizar pratos, descrições, preços e acompanhamento da jornada.
- Recepção, salão e cozinha: priorizar leitura rápida, estados e ações operacionais.
- Food Flow identifica o produto. Santo Garfo identifica o primeiro restaurante.

## 3. Paleta de cores

### Cores confirmadas

| Token | Cor | Código | Uso recomendado |
| --- | --- | --- | --- |
| `--color-primary` | Azul Food Flow | `#151946` | Títulos, navegação e botões principais |
| `--color-background` | Bege | `#EBE1D5` | Fundo geral e seções de acolhimento |
| `--color-accent` | Vinho | `#7C170D` | Destaques gastronômicos e categoria selecionada |
| `--color-surface` | Branco | `#FFFFFF` | Cards, formulários e texto em fundos escuros |

Distribuição sugerida: bege no fundo, branco nas superfícies, azul na estrutura e vinho em detalhes pontuais.

### Cores auxiliares propostas

| Token | Código | Uso |
| --- | --- | --- |
| `--color-text` | `#252638` | Texto principal e valores |
| `--color-text-muted` | `#626475` | Informações complementares |
| `--color-border` | `#D6CEC4` | Divisórias e bordas decorativas |
| `--color-success` | `#246347` | Confirmações e etapas concluídas |
| `--color-warning` | `#805600` | Espera e pendências |
| `--color-error` | `#B42318` | Erros e ações destrutivas |

Usar azul ou vinho com texto branco nos botões. Cores de estado devem vir acompanhadas de texto ou ícone identificado. Exemplo: “Reserva confirmada” com indicador verde.

Verificar contraste nas combinações reais: mínimo de 4,5:1 para texto comum, 3:1 para texto grande e 3:1 para limites e indicadores essenciais de componentes. A borda decorativa clara não deve ser a única indicação visual de um campo; usar uma borda mais perceptível quando necessário.

## 4. Fonte e tipografia

Fonte proposta: **Roboto**, com alternativas locais. Não adicionar outra família sem necessidade. Se a fonte não carregar, a interface deve continuar legível.

```css
font-family: "Roboto", system-ui, -apple-system, "Segoe UI", sans-serif;
```

| Elemento | Computador | Celular | Peso |
| --- | --- | --- | --- |
| Título de abertura | 48 px | 32 px | 700 |
| Título de página | 36 px | 28 px | 700 |
| Título de seção | 28 px | 24 px | 700 |
| Título de card | 20 px | 20 px | 600 |
| Texto e campos | 16 px | 16 px | 400 |
| Botões e rótulos | 16 px | 16 px | 500 |
| Legendas | 14 px | 14 px | 400 |

- Entrelinha: `1.5` para texto e `1.2` para títulos.
- Alinhar textos à esquerda; não justificar parágrafos.
- Evitar textos longos em letras maiúsculas.
- Limitar parágrafos extensos a cerca de `65ch`.
- Destacar preços e usar números tabulares em tabelas financeiras.
- Preservar hierarquia semântica de títulos; tamanho visual não define o nível HTML.

## 5. Espaçamento e layout

Escala proposta: **4, 8, 12, 16, 24, 32, 48 e 64 px**.

| Aplicação | Medida |
| --- | --- |
| Ícone e texto | 8 px |
| Rótulo e campo | 8 px |
| Espaço interno de card | 24 px |
| Distância entre cards | 24 px |
| Margem lateral no celular | 16 px |
| Margem lateral no computador | 32 px |
| Largura máxima de conteúdo | 1200 px |

No celular, reorganizar o conteúdo em uma coluna quando necessário. Tabelas operacionais podem ter rolagem horizontal dentro de seu próprio contêiner. Evitar rolagem horizontal da página inteira.

Adaptar a mudança de layout ao espaço necessário para o conteúdo. Não esconder ações essenciais em telas pequenas. Manter ordem de leitura e navegação coerentes.

## 6. Componentes

### Botões

| Tipo | Aparência | Exemplos |
| --- | --- | --- |
| Principal | Azul com texto branco | “Confirmar reserva”, “Enviar pedido” |
| Secundário | Branco, borda e texto azuis | “Ver detalhes”, “Voltar” |
| Discreto | Transparente com texto azul | “Editar dados” |
| Destrutivo | Vermelho com texto branco | Confirmação final de cancelamento |

Altura mínima proposta: `48 px`. Raio: `8 px`. Rótulos devem descrever a ação. Definir estados normal, hover, foco, pressionado, desabilitado e carregando.

Durante o processamento, apresentar texto como “Enviando pedido…” e impedir novo acionamento. Esse bloqueio visual não substitui a proteção contra duplicidade na API.

### Cards

Fundo branco, raio de `12 px`, borda discreta e sombra suave. Organizar título, informação principal, detalhes e ação.

No cardápio: fotografia quando disponível, nome, descrição, preço e ação adequada à etapa da jornada. Preservar o acesso público sem reserva. Não exibir uma ação que permita enviar pedidos antes da acomodação.

### Formulários

Rótulos visíveis acima dos campos, altura mínima de `48 px`, limites perceptíveis e mensagens de erro próximas ao campo. Placeholder complementa o rótulo. Identificar campos obrigatórios e associar mensagens aos controles.

### Categorias do cardápio

Manter exatamente: **Entradas, Principal, Sobremesa e Bebida**. Navegação horizontal; seleção com fundo vinho e texto branco. No celular, permitir rolagem sem truncar os rótulos. Informar programaticamente qual categoria está selecionada, usando semântica compatível com a interação existente.

### Estados do atendimento

Etiquetas devem apresentar texto claro, sem depender apenas de cor. Preservar “Em preparo” e “Todos os itens foram entregues”, associados à rodada correspondente. Não criar novos estados de negócio durante a estilização.

Distinguir visualmente reserva confirmada, check-in e acomodação conforme os dados existentes. Não confundir disponibilidade para reserva com ocupação física.

## 7. Imagens, ícones e movimento

- Fotografias de pratos: luz natural, cores fiéis e proporção consistente entre cards.
- Usar imagens disponíveis ou autorizadas; não apresentar imagens conceituais como fotografias reais dos pratos.
- Ícones: mesma família e estilo de traço, preferencialmente `20–24 px`.
- Ações principais devem ter texto. Ícones isolados precisam de nome acessível.
- Sombras leves para separar superfícies; evitar excesso de efeitos.
- Transições entre `150–200 ms`, respeitando movimento reduzido.
- Definir texto alternativo para imagens informativas; imagens decorativas não devem gerar leitura redundante.

## 8. Aplicação das marcas

Usar somente logos oficiais disponíveis, sem recriar marcas. Preservar proporção, transparência e área de proteção definida nos arquivos ou materiais oficiais. Se não houver especificação, manter espaço livre ao redor e sinalizar a necessidade de validação.

Usar versão branca em fundo escuro. Não esticar, inclinar, recortar ou recolorir os logos. Se o arquivo necessário estiver ausente, registrar a pendência.

Proposta de distribuição: Santo Garfo no cabeçalho voltado ao restaurante; Food Flow como assinatura do sistema e nas interfaces operacionais. Essa distribuição depende de aprovação visual.

“Todo segundo conta” deve aparecer discretamente no canto superior direito, acompanhado de relógio. No celular, reservar espaço no layout para evitar sobreposição com navegação e ações. O texto deve continuar legível.

## 9. Referência CSS

Adaptar os tokens à solução já existente. Não criar um segundo sistema de estilos concorrente. A declaração da família não carrega a Roboto; verificar como as fontes são disponibilizadas no projeto.

```css
:root {
  --color-primary: #151946;
  --color-background: #EBE1D5;
  --color-accent: #7C170D;
  --color-surface: #FFFFFF;
  --color-text: #252638;
  --color-text-muted: #626475;
  --color-border: #D6CEC4;
  --color-success: #246347;
  --color-warning: #805600;
  --color-error: #B42318;

  --font-family: "Roboto", system-ui, -apple-system, "Segoe UI", sans-serif;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --radius-control: 8px;
  --radius-card: 12px;
  --shadow-card: 0 4px 16px rgb(21 25 70 / 6%);
  --content-max-width: 1200px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: 16px;
  line-height: 1.5;
}

button, input, select, textarea { font: inherit; }

:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 3px;
}

/* Em superfícies escuras, usar indicador de foco claro com contraste adequado. */
```

## 10. Fluxo de aplicação pelo Codex

1. Ler instruções do repositório, contexto funcional e estilos existentes.
2. Identificar componentes compartilhados e arquivos oficiais das marcas.
3. Mapear os tokens deste manual para a estrutura atual.
4. Padronizar tipografia, espaçamento, botões, campos e cards.
5. Aplicar os padrões às telas existentes, preservando suas funções.
6. Verificar celular, computador, teclado, foco, contraste e estados de interação.
7. Executar os checks exigidos pelo repositório e pertinentes à alteração.
8. Relatar arquivos alterados, verificações executadas, limitações e pendências.

Priorizar componentes reutilizáveis para reduzir retrabalho no prazo acadêmico. Não adicionar biblioteca de UI ou animação apenas para reproduzir estes estilos.

## 11. Critérios de revisão

- [ ] Paleta e fonte consistentes entre as telas.
- [ ] Hierarquia de títulos, margens e entrelinhas uniformes.
- [ ] Leitura confortável no celular e no computador.
- [ ] Preços, descrições e ações legíveis sem cortes.
- [ ] Navegação por teclado e foco visível, inclusive em fundos escuros.
- [ ] Contraste verificado nas combinações efetivamente utilizadas.
- [ ] Estados identificados por texto, além de cor.
- [ ] Formulários com rótulos e erros compreensíveis.
- [ ] Logos oficiais sem distorção e assinatura sem sobreposições.
- [ ] Pagamentos identificados como simulados e mockups como conceituais, quando aplicável.
- [ ] Regras, permissões e estados de negócio preservados.

Registrar o que foi verificado manualmente, o que foi testado automaticamente e o que não pôde ser verificado. Esta lista não representa testes já executados.

## 12. Prompt pronto para implementação

> Leia este manual e as instruções do repositório. Examine os estilos e componentes existentes e aplique a proposta visual do Food Flow de forma consistente, adaptando os tokens à tecnologia já utilizada. Preserve as regras de negócio, permissões, preços, estados e funcionalidades existentes. Priorize componentes compartilhados e layouts responsivos. Use somente logos oficiais disponíveis e registre arquivos ausentes. Verifique contraste, teclado, foco visível, formulários e apresentação em celular e computador. Execute os checks pertinentes do projeto. Ao concluir, informe as mudanças, as verificações realizadas e as pendências. Não faça commit, push ou deploy sem solicitação explícita. Não implemente tarefas citadas nos documentos de contexto que não pertençam à estilização solicitada.
