# Mapa do app.js

Fase 1 do [PLANS.md](../PLANS.md). Inventário estático do [app.js](../app.js), dos HTML que o carregam e da interface publicada por [supabase-client.js](../supabase-client.js). Foram usados como referência [AGENTS.md](../AGENTS.md), [Arquitetura](ARCHITECTURE.md), [Banco de dados](DATABASE.md) e [Deploy](DEPLOY.md).

## 1. Responsabilidades e contexto de execução

- **Inicialização e sessão** — cria o estado inicial, resolve sessão e perfil, carrega dados e aplica a guarda de navegação antes de montar a tela.
- **Estado** — mantém configurações, usuário, papel, entregadores, rotas, recebimentos, entradas de galpão e funcionários em memória. A data local de referência, `today`, é capturada uma vez por carga de página.
- **Interface** — monta menu e controles móveis, liga formulários e eventos delegados e renderiza o conteúdo pelo seletor presente no documento. As 12 páginas carregam o mesmo script clássico após o cliente do Supabase.
- **Operação e finanças** — reúne tarifas, fechamento de rotas, estoque por data e empresa, documentos de entregadores, agregações de relatórios, recebimentos e marcação de pagamentos.
- **Persistência e exportações** — chama `window.rmsSupabase` para Auth, carga, gravações e documentos. No navegador, gera SpreadsheetML com extensão XLS para o Histórico e um pacote Open XML em ZIP com extensão XLSX para o Semanal.

O operador tem acesso pela guarda de interface a Dashboard, Entregadores, Nova Saída e Fechamento. O admin acessa também os demais módulos. A carga do cliente mescla dados privados dos entregadores e tenta carregar funcionários apenas para admin. O cliente implementa paginação em faixas de 1.000 ordenadas por ID, snapshots e fila de gravação. Schema implantado, RLS, triggers, políticas de Storage, grants e comportamento SQL das RPCs em produção ficam **não confirmados** nesta análise.

## 2. Inventário das funções

O inventário contém **89 declarações de nível superior** e **264 funções de seta**, incluindo IIFEs, auxiliares locais, comparadores e callbacks anônimos. Os nomes apontam para a posição atual no código. As categorias numeradas correspondem à responsabilidade principal.

| ID | Categoria | ID | Categoria |
| --- | --- | --- | --- |
| 01 | Core / inicialização | 10 | Relatório Diário |
| 02 | Autenticação e navegação | 11 | Fechamento Semanal |
| 03 | Utilitários puros | 12 | Fechamento Quinzenal |
| 04 | Componentes de interface | 13 | Pagamentos |
| 05 | Dashboard | 14 | Funcionários |
| 06 | Entregadores | 15 | Configurações |
| 07 | Nova Saída | 16 | Galpão / estoque |
| 08 | Fechamento | 17 | Exportação XLS/XLSX |
| 09 | Histórico | 18 | Funções compartilhadas entre múltiplos módulos |

| Sigla | Página | Sigla | Página |
| --- | --- | --- | --- |
| L | [Login](../index.html) | H | [Histórico](../historico.html) |
| D | [Dashboard](../dashboard.html), inclui Galpão | R | [Relatório Diário](../relatorio_Diario.html) |
| E | [Entregadores](../entregadores.html) | S | [Fechamento Semanal](../fechamento_Semanal.html) |
| N | [Nova Saída](../nova_Saida.html) | Q | [Fechamento Quinzenal](../fechamento_Quinzenal.html) |
| Fe | [Fechamento](../fechamento.html) | P | [Pagamentos](../pagamentos.html) |
| F | [Funcionários](../funcionarios.html) | C | [Configurações](../configuracoes.html) |
| T | Todas as 12 páginas | O | Todas as páginas protegidas |

**Leitura da tabela.** As colunas de estado mostram os campos lidos e escritos no corpo da função ou nas funções locais que ela define. Quando a operação está em outra função, a aresta aparece em **Dependências**. A coluna **DOM** inclui elementos recebidos por parâmetro, atributos e eventos. A coluna **Supabase** lista chamadas diretas pelo corpo ou callbacks locais e sinaliza a leitura da flag `configured`. Travessão indica ausência de acesso ou dependência identificada. **Páginas** indica o uso funcional. O asterisco marca comportamento limitado por seletor na interface atual. A chamada por `renderPage` pode ocorrer fora dessas páginas, inclusive durante o login. `renderDashboard`, `renderWeek` e `renderWarehouse` fazem leituras ou cálculos antes de verificar todos os elementos da tela. **Risco** mede a extração do código atual. Baixo indica cálculo ou adaptação local, médio indica contrato de dados, seleção, DOM ou formato e alto indica persistência, autorização, dados privados, valores financeiros agregados ou coordenação entre domínios.

### Declarações de nível superior

| Função | Cat. | Responsabilidade | Lê state | Modifica state | DOM | Supabase | Dependências no app.js | Páginas | Risco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [`makeId`](../app.js#L22) | 01 | Gera ID local com timestamp e aleatoriedade. | — | — | — | — | — | D E N Q F | baixo |
| [`loadData`](../app.js#L43) | 01 | Clona seedData para criar o estado inicial. | — | — | — | — | — | T | baixo |
| [`saveData`](../app.js#L47) | 01 | Persiste o estado recebido com o papel atual. Retorna booleano e exibe erro de gravação. | `role` | — | — | `saveState` | `toast` | E Q P F C | alto |
| [`money`](../app.js#L57) | 03 | Formata valores em reais com locale pt-BR. | — | — | — | — | — | D N Fe H S Q P F | baixo |
| [`escapeHtml`](../app.js#L61) | 03 | Escapa caracteres reservados em texto ou atributos HTML. | — | — | — | — | — | D E N Fe H R S Q P F | baixo |
| [`validatePixKey`](../app.js#L71) | 03 | Valida tipo e formato de chave Pix, incluindo dígitos de CPF/CNPJ. Funcionários usa o ramo CPF. | — | — | — | — | `digitAt`, `checkDigit` | E F | baixo |
| [`formatDate`](../app.js#L128) | 03 | Exibe data ISO como DD/MM/AAAA e usa hífen em valor vazio. | — | — | — | — | — | D N Fe H R S Q P F | baixo |
| [`addCalendarDays`](../app.js#L134) | 03 | Soma dias usando uma data à meia-noite local. Sem chamador encontrado. | — | — | — | — | — | — | baixo |
| [`sortedByName`](../app.js#L143) | 03 | Copia e ordena registros por nome em pt-BR. | — | — | — | — | — | E N H F | baixo |
| [`getDriver`](../app.js#L148) | 18 | Localiza por ID e devolve o objeto original de state.drivers. O alternador de status depende dessa referência. | `drivers` | — | — | — | — | D E N Fe H R S Q P | alto |
| [`vehicleKey`](../app.js#L152) | 03 | Remove acentos e normaliza veículo para moto, carro ou van, com moto como padrão. | — | — | — | — | — | N | baixo |
| [`routeTotal`](../app.js#L157) | 03 | Calcula entregues persistidos × valor unitário menos desconto, limitado inferiormente a zero. | — | — | — | — | — | D Fe H S Q P | médio |
| [`dailyStock`](../app.js#L161) | 16 | Soma entradas e saídas por data e empresa opcional e calcula o saldo. | `entradasGalpao`, `routes` | — | — | — | `matches` | D N | médio |
| [`setText`](../app.js#L172) | 04 | Atualiza textContent de todos os elementos que correspondem ao seletor. | — | — | Sim | — | — | O | baixo |
| [`toast`](../app.js#L178) | 04 | Substitui o aviso atual, mostra a mensagem e agenda a remoção. | — | — | Sim | — | — | T | médio |
| [`renderShell`](../app.js#L189) | 04 | Renderiza logo, menu, papel, logout e controles móveis. | `role` | — | Sim | — | `setText` | O | médio |
| [`setMobileMenuOpen`](../app.js#L233) | 04 | Sincroniza classes, atributos ARIA, backdrop e foco. | — | — | Sim | — | — | O | médio |
| [`ensureLogged`](../app.js#L249) | 02 | Valida user/role na interface e redireciona login, anônimos e operadores. | `user`, `role` | — | — | — | — | T | alto |
| [`renderEmpty`](../app.js#L272) | 04 | Preenche um tbody com a linha de estado vazio. | — | — | Sim | — | — | D E N Fe H R S Q P F | baixo |
| [`dashboardMetrics`](../app.js#L276) | 05 | Soma volumes do dia, entregadores ativos e valores das rotas fechadas hoje. | `routes`, `drivers` | — | — | — | `routeTotal` | D | médio |
| [`renderDashboard`](../app.js#L289) | 05 | Renderiza indicadores, contagem e rotas da data de carga. | `routes` | — | Sim | — | `dashboardMetrics`, `setText`, `money`, `formatDate`, `renderEmpty`, `getDriver`, `escapeHtml`, `routeTotal` | D | médio |
| [`driverDocumentsCell`](../app.js#L326) | 06 | Gera botões para documentos presentes e indica os pendentes. | — | — | — | — | `escapeHtml` | E | médio |
| [`renderDrivers`](../app.js#L342) | 06 | Lista entregadores e ações com células privadas marcadas para admin. | `drivers` | — | Sim | — | `setText`, `renderEmpty`, `sortedByName`, `escapeHtml`, `driverDocumentsCell` | E | médio |
| [`fillDriverSelects`](../app.js#L377) | 07 | Preenche seletores de entregadores com os ativos ordenados. | `drivers` | — | Sim | — | `sortedByName`, `escapeHtml` | N | médio |
| [`fillCompanySelects`](../app.js#L386) | 18 | Combina empresas configuradas e recebimentos, preservando a seleção válida. | `settings`, `recebimentos` | — | Sim | — | `escapeHtml` | D N Q | médio |
| [`fillRouteSelects`](../app.js#L401) | 08 | Popula o seletor de fechamento com rotas abertas. | `routes` | — | Sim | — | `getDriver`, `escapeHtml`, `formatDate` | Fe | médio |
| [`renderOpenRoutes`](../app.js#L413) | 07 | Lista saídas abertas com valor unitário. | `routes` | — | Sim | — | `setText`, `renderEmpty`, `getDriver`, `formatDate`, `escapeHtml`, `money` | N | médio |
| [`renderClosedRoutes`](../app.js#L441) | 08 | Lista rotas fechadas em ordem inversa do array e mostra total por rota. | `routes` | — | Sim | — | `setText`, `renderEmpty`, `getDriver`, `formatDate`, `escapeHtml`, `money`, `routeTotal` | Fe | médio |
| [`renderHistory`](../app.js#L469) | 09 | Filtra por texto, aplica ordenação e apresenta ações de edição e exclusão para rotas sem pagamento. | `routes` | — | Sim | — | `setText`, `renderEmpty`, `getDriver`, `compareDate`, `nameOf`, `compareText`, `routeTotal`, `formatDate`, `escapeHtml`, `money`, `comparadores de sorters` | H | alto |
| [`removeRoute`](../app.js#L529) | 09 | Remove a rota após resposta da API, trata retorno opcional e redesenha preservando a busca. | `routes`, `entradasGalpao` | `routes`, `entradasGalpao` | Sim | `deleteRoute` | `closeRouteEdit`, `renderHistory`, `toast` | H | alto |
| [`xlsxColumnName`](../app.js#L550) | 17 | Converte índice de coluna na referência A, Z, AA etc. | — | — | — | — | — | S | baixo |
| [`xlsxEscape`](../app.js#L561) | 17 | Remove controles inválidos e escapa caracteres usados no XML. | — | — | — | — | — | S | baixo |
| [`xlsxDateSerial`](../app.js#L567) | 17 | Converte data ISO em serial Excel via UTC. A exportação semanal atual não gera células com estilo date. | — | — | — | — | — | S (ramo dormente) | baixo |
| [`xlsxCell`](../app.js#L572) | 17 | Emite XML para célula vazia, texto, número ou data com estilo opcional. | — | — | — | — | `xlsxColumnName`, `xlsxDateSerial`, `xlsxEscape` | S | médio |
| [`xlsxSheetXml`](../app.js#L585) | 17 | Monta worksheet com cabeçalho congelado, larguras e linhas XML. | — | — | — | — | `xlsxCell` | S | médio |
| [`crc32`](../app.js#L626) | 17 | Calcula CRC-32 dos bytes usando CRC_TABLE. | — | — | — | — | `IIFE CRC_TABLE` | S | baixo |
| [`zipStore`](../app.js#L632) | 17 | Empacota arquivos ZIP sem compressão, com CRC, offsets e diretório central. | — | — | — | — | `crc32`, `u16`, `u32` | S | médio |
| [`buildXlsxBlob`](../app.js#L671) | 17 | Cria pacote Open XML com manifesto, relações, estilos e abas. | — | — | — | — | `zipStore`, `xlsxEscape`, `safeName`, `xlsxSheetXml` | S | médio |
| [`downloadXlsx`](../app.js#L713) | 17 | Dispara download pelo DOM e revoga a URL temporária. | — | — | Sim | — | `buildXlsxBlob` | S | médio |
| [`shiftDate`](../app.js#L724) | 03 | Desloca uma data pelo calendário local. No Relatório Diário, atende a performance atualmente inativa. | — | — | — | — | — | R* S | baixo |
| [`pixCell`](../app.js#L730) | 18 | Gera HTML com tipo e chave Pix ou mensagem de ausência. | — | — | — | — | `escapeHtml` | S P | médio |
| [`weekRange`](../app.js#L736) | 11 | Lê as datas e infere o intervalo de sete dias quando falta uma extremidade. | — | — | Sim | — | `shiftDate` | S | médio |
| [`weekdayName`](../app.js#L755) | 03 | Obtém o dia da semana em pt-BR com inicial maiúscula. | — | — | — | — | — | S | baixo |
| [`weekData`](../app.js#L761) | 11 | Seleciona rotas fechadas, agrupa por entregador e empresa e gera totais por dia e detalhamento. | `routes` | — | — | — | `weekRange`, `shiftDate`, `weekdayName`, `routeTotal`, `getDriver`, `compareText` | S | alto |
| [`renderWeek`](../app.js#L806) | 11 | Renderiza indicadores e tabelas semanal, por dia e por rota. | — | — | Sim | — | `weekData`, `setText`, `formatDate`, `money`, `renderEmpty`, `totalOf`, `routeTotal`, `escapeHtml`, `pixCell`, `getDriver` | S | alto |
| [`dailyMatrix`](../app.js#L884) | 11 | Monta matriz por entregador, empresa e dia usando a função pick. Sem chamador encontrado. | — | — | — | — | `dayHeader` | — | baixo |
| [`exportWeek`](../app.js#L908) | 17 | Exporta resumo semanal em uma aba XLSX com Pix e totais arredondados. | — | — | — | — | `weekData`, `toast`, `downloadXlsx`, `header`, `sum` | S | alto |
| [`paymentFilter`](../app.js#L949) | 13 | Lê os seletores de período e status esperados por app.js. Na página atual devolve os padrões vazios. | — | — | Sim | — | — | P* | médio |
| [`updatePaymentSelection`](../app.js#L957) | 13 | Atualiza total selecionado e estado do checkbox geral. | `routes` | — | Sim | — | `setText`, `money`, `routeTotal` | P | médio |
| [`renderPayments`](../app.js#L972) | 13 | Calcula totais de rotas fechadas e renderiza seleção e pagamento individual. | `routes` | — | Sim | — | `paymentFilter`, `setText`, `money`, `renderEmpty`, `updatePaymentSelection`, `routeTotal`, `getDriver`, `escapeHtml`, `formatDate`, `pixCell` | P | alto |
| [`fortnightRange`](../app.js#L1024) | 12 | Traduz mês e metade escolhidos em datas inclusivas. | — | — | Sim | — | — | Q | médio |
| [`renderFortnight`](../app.js#L1035) | 12 | Consolida recebimentos, pagos, pendentes, entregas e resultado da quinzena. | `recebimentos`, `routes` | — | Sim | — | `fortnightRange`, `setText`, `money`, `formatDate`, `renderEmpty`, `inPeriod`, `routeTotal`, `escapeHtml`, `getDriver` | Q | alto |
| [`renderSettings`](../app.js#L1121) | 15 | Preenche formulário com nome, operador, tarifas e empresas. | `settings` | — | Sim | — | — | C | médio |
| [`renderCompanyStock`](../app.js#L1133) | 16 | Detalha saldo por empresa, grupo sem empresa e total do dia. | `entradasGalpao`, `routes`, `settings` | — | Sim | — | `setText`, `formatDate`, `renderEmpty`, `dailyStock`, `escapeHtml` | D | médio |
| [`renderWarehouse`](../app.js#L1190) | 16 | Atualiza indicadores e tabela de entradas manuais ou vinculadas a rotas. | `entradasGalpao` | — | Sim | — | `renderCompanyStock`, `setText`, `formatDate`, `dailyStock`, `renderEmpty`, `escapeHtml` | D | médio |
| [`updateRoutePrice`](../app.js#L1223) | 07 | Preenche tarifa pelo veículo e atualiza saldo e avisos do formulário. | `settings` | — | Sim | — | `getDriver`, `vehicleKey`, `setText`, `refreshStockForRoute` | N | médio |
| [`refreshStockForRoute`](../app.js#L1231) | 07 | Exibe o saldo por data/empresa e controla o aviso e o link para registrar entradas. | — | — | Sim | — | `dailyStock`, `setText` | N | médio |
| [`updateClosurePreview`](../app.js#L1255) | 08 | Mostra quantidades, valor estimado e limites de retornados e desconto. | `routes` | — | Sim | — | `setText`, `money` | Fe | médio |
| [`setDriverPrivateFields`](../app.js#L1271) | 06 | Alterna visibilidade e obrigatoriedade dos campos privados. | — | — | Sim | — | — | E | médio |
| [`documentError`](../app.js#L1290) | 06 | Cria erro com mensagem destinada à interface. | — | — | — | — | — | E | baixo |
| [`loadImageFile`](../app.js#L1296) | 06 | Carrega a imagem selecionada via URL local e revoga a URL em sucesso ou erro. | — | — | Sim | — | `documentError` | E | médio |
| [`canvasToBlob`](../app.js#L1312) | 06 | Adapta canvas.toBlob para Promise. | — | — | Sim | — | — | E | baixo |
| [`prepareDocument`](../app.js#L1316) | 06 | Valida MIME e tamanho do PDF ou converte imagem redimensionada para JPEG até o limite. | — | — | Sim | — | `documentError`, `loadImageFile`, `canvasToBlob` | E | alto |
| [`openDriverDocument`](../app.js#L1349) | 06 | Abre uma aba e navega à URL assinada, com alternativa na janela atual e aviso em falha. | — | — | — | `getDriverDocumentUrl` | `toast` | E | alto |
| [`updateDocumentHints`](../app.js#L1366) | 06 | Atualiza indicação de arquivo existente, ausente ou formulário novo. | — | — | Sim | — | — | E | médio |
| [`resetDriverForm`](../app.js#L1376) | 06 | Restaura formulário de cadastro, avisos e campos privados. | — | — | Sim | — | `updateDocumentHints`, `setDriverPrivateFields` | E | médio |
| [`startDriverEdit`](../app.js#L1386) | 06 | Preenche edição e oculta campos privados para operador. | `role` | — | Sim | — | `updateDocumentHints`, `setDriverPrivateFields` | E | alto |
| [`percentLabel`](../app.js#L1407) | 03 | Formata uma fração em percentual com uma casa decimal ou hífen. | — | — | — | — | — | R | baixo |
| [`summarizeReport`](../app.js#L1412) | 10 | Agrega quantidades de saída, entregas, insucessos e rotas em aberto. | — | — | — | — | — | R | baixo |
| [`groupRoutes`](../app.js#L1429) | 10 | Agrupa rotas em Map usando a função de chave recebida. | — | — | — | — | — | R | baixo |
| [`reportCells`](../app.js#L1439) | 10 | Monta células do resumo diário e da taxa de insucesso. | — | — | — | — | `percentLabel` | R | baixo |
| [`fortnightOf`](../app.js#L1448) | 10 | Obtém a metade civil do mês para a data da performance. | — | — | — | — | — | R* | baixo |
| [`performanceLabel`](../app.js#L1456) | 10 | Formata a taxa de sucesso entre pacotes de rotas fechadas. | — | — | — | — | `summarizeReport`, `percentLabel` | R* | baixo |
| [`renderPerformance`](../app.js#L1461) | 10 | Calcula desempenho por dia, sete dias e quinzena civil, com recortes por empresa e entregador. | `routes` | — | Sim | — | `shiftDate`, `fortnightOf`, `summarizeReport`, `setText`, `percentLabel`, `formatDate`, `groupRoutes`, `renderEmpty`, `byName`, `inPeriod`, `escapeHtml`, `performanceLabel`, `perfRow`, `getDriver` | R* | médio |
| [`renderDailyReport`](../app.js#L1507) | 10 | Agrega a data escolhida e renderiza tabelas, indicadores e pendências. | `routes` | — | Sim | — | `renderPerformance`, `summarizeReport`, `setText`, `formatDate`, `percentLabel`, `groupRoutes`, `renderEmpty`, `byName`, `escapeHtml`, `reportCells`, `getDriver` | R | médio |
| [`renderEmployees`](../app.js#L1566) | 14 | Lista funcionários e soma remuneração dos ativos. | `funcionarios` | — | Sim | — | `sortedByName`, `setText`, `money`, `renderEmpty`, `escapeHtml`, `formatDate` | F | médio |
| [`resetEmployeeForm`](../app.js#L1600) | 14 | Restaura formulário de novo funcionário. | — | — | Sim | — | — | F | baixo |
| [`startEmployeeEdit`](../app.js#L1608) | 14 | Preenche formulário de edição, inclusive remuneração e dados pessoais. | — | — | Sim | — | — | F | médio |
| [`resetEntryForm`](../app.js#L1622) | 16 | Restaura formulário de entrada preservando a data. | — | — | Sim | — | `setText` | D | baixo |
| [`startEntryEdit`](../app.js#L1632) | 16 | Preenche edição de entrada, reinclui opção de empresa legada e atualiza a tabela. | — | — | Sim | — | `setText`, `renderWarehouse` | D | médio |
| [`saveEntryEdit`](../app.js#L1650) | 16 | Valida quantidade, atualiza entrada via RPC e substitui o registro local. | `entradasGalpao` | `entradasGalpao` | Sim | `updateWarehouseEntry` | `toast`, `resetEntryForm`, `renderWarehouse` | D | alto |
| [`removeWarehouseEntry`](../app.js#L1679) | 16 | Exclui entrada via RPC, atualiza o array e restaura o formulário se necessário. | `entradasGalpao` | `entradasGalpao` | Sim | `deleteWarehouseEntry` | `resetEntryForm`, `renderWarehouse`, `toast` | D | alto |
| [`closeRouteEdit`](../app.js#L1695) | 09 | Limpa e esconde o painel de edição do Histórico. | — | — | Sim | — | — | H | baixo |
| [`startRouteEdit`](../app.js#L1702) | 09 | Preenche edição e histórico de alterações e mantém opções legadas válidas. | `drivers`, `settings` | — | Sim | — | `sortedByName`, `setText`, `formatDate`, `escapeHtml` | H | médio |
| [`setupForms`](../app.js#L1742) | 01 | Inicializa formulários e períodos e registra submissões, mudanças e impressão por seletor. | `settings`, `funcionarios`, `objeto state`, `routes`, `entradasGalpao`, `drivers`, `role`, `settings (valor anterior e gravação do estado inteiro)`, `recebimentos` | `funcionarios`, `routes`, `entradasGalpao`, `drivers`, `settings`, `recebimentos` | Sim | `configured` (leitura), `signIn`, `updateRoute`, `updateDriver`, `uploadDriverDocument`, `registerDriver`, `removeDriverDocuments`, `createRoute`, `closeRoute`, `registerWarehouseEntry` | `renderDailyReport`, `weekRange`, `renderFortnight`, `toast`, `shiftDate`, `renderWeek`, `updateWeek`, `validatePixKey`, `resetEmployeeForm`, `makeId`, `saveData`, `renderEmployees`, `closeRouteEdit`, `renderHistory`, `resetDriverForm`, `renderDrivers`, `fillDriverSelects`, `prepareDocument`, `getDriver`, `updateRoutePrice`, `renderOpenRoutes`, `renderWarehouse`, `refreshStockForRoute`, `updateClosurePreview`, `fillRouteSelects`, `renderClosedRoutes`, `renderDashboard`, `renderPayments`, `saveEntryEdit`, `renderShell`, `fillCompanySelects` | T | alto |
| [`setupActions`](../app.js#L2199) | 01 | Registra ações delegadas e as ligações de busca, ordenação, filtros e seleção. | `role`, `objeto state`, `entradasGalpao`, `routes`, `funcionarios`, `drivers` | `drivers`, `funcionarios`, `routes`, `routes.pagamento`, `routes.dataPagamento` | Sim | `signOut`, `updateDriver`, `clearBusinessData` | `setMobileMenuOpen`, `getDriver`, `startDriverEdit`, `openDriverDocument`, `resetDriverForm`, `saveData`, `renderDrivers`, `toast`, `startEntryEdit`, `resetEntryForm`, `formatDate`, `removeWarehouseEntry`, `startRouteEdit`, `closeRouteEdit`, `startEmployeeEdit`, `resetEmployeeForm`, `renderEmployees`, `removeRoute`, `exportWeek`, `renderPayments`, `money`, `renderFortnight`, `exportHistory`, `fillDriverSelects`, `routeTotal`, `renderHistory`, `updatePaymentSelection` | T | alto |
| [`exportHistory`](../app.js#L2441) | 17 | Transforma todas as rotas carregadas em SpreadsheetML baixado como XLS. | `routes` | — | Sim | — | `getDriver`, `formatDate`, `routeTotal`, `escapeXml` | H | alto |
| [`renderPage`](../app.js#L2493) | 01 | Aplica a guarda, monta interface, instala eventos e chama renderizadores e prévias. | — | — | Sim | — | `ensureLogged`, `renderShell`, `setupForms`, `setupActions`, `fillDriverSelects`, `fillCompanySelects`, `fillRouteSelects`, `renderDashboard`, `renderDrivers`, `renderOpenRoutes`, `renderClosedRoutes`, `renderHistory`, `renderWeek`, `renderPayments`, `renderFortnight`, `renderSettings`, `renderWarehouse`, `renderDailyReport`, `renderEmployees`, `updateRoutePrice`, `updateClosurePreview` | T | alto |
| [`initializeApp`](../app.js#L2520) | 01 | Verifica configuração, recupera sessão e perfil, hidrata state e trata falha com logout e limpeza. | `user`, `role`, `objeto state` | `user`, `role`, `objeto state` | Sim | `configured` (leitura), `getSession`, `getProfile`, `loadState`, `signOut` | `renderPage`, `toast` | T | alto |

### Funções locais, IIFEs e callbacks

Cada ocorrência anônima é identificada por linha e coluna. Funções que recebem um item de uma coleção operam sobre esse parâmetro. A leitura da coleção está no chamador, mesmo quando o item veio do estado. As tabelas abaixo seguem a ordem do código.

<details>
<summary>Inicialização, utilitários, interface e operação até Histórico</summary>

| Função | Cat. | Responsabilidade | Lê state | Modifica state | DOM | Supabase | Dependências no app.js | Páginas | Risco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [`today` · 15:16](../app.js#L15) | 01 | Cria a data local capturada no carregamento. | — | — | — | — | — | T | baixo |
| [anônima 48:64](../app.js#L48) | 01 | Converte a conclusão da gravação em true. | — | — | — | — | — | E Q P F C | baixo |
| [anônima 48:82](../app.js#L48) | 01 | Registra a falha, exibe aviso e devolve false. | — | — | — | — | `toast` | E Q P F C | baixo |
| [anônima 62:52](../app.js#L62) | 03 | Substitui o caractere pela entidade correspondente. | — | — | — | — | — | D E N Fe H R S Q P F | baixo |
| [`digitAt` · 80:25](../app.js#L80) | 03 | Calcula um dígito verificador do CPF a partir do prefixo. | — | — | — | — | — | E F | baixo |
| [anônima 81:66](../app.js#L81) | 03 | Atualiza o acumulador `total + Number(digit) * (length + 1 - index)`. | — | — | — | — | — | E F | baixo |
| [`checkDigit` · 94:28](../app.js#L94) | 03 | Calcula um dígito do CNPJ pelas posições e pesos informados. | — | — | — | — | — | E F | baixo |
| [anônima 95:55](../app.js#L95) | 03 | Atualiza o acumulador `sum + Number(digit) * weights[index]`. | — | — | — | — | — | E F | baixo |
| [anônima 144:30](../app.js#L144) | 03 | Compara nomes com locale pt-BR e sensibilidade base. | — | — | — | — | — | E N H F | baixo |
| [anônima 149:31](../app.js#L149) | 18 | Testa a correspondência `driver.id === id`. | — | — | — | — | — | D E N Fe H R S Q P | baixo |
| [`matches` · 162:21](../app.js#L162) | 16 | Avalia `company === undefined \|\| item.empresa === company`. | — | — | — | — | — | D N | baixo |
| [anônima 164:17](../app.js#L164) | 16 | Avalia `entry.data === date && matches(entry)`. | — | — | — | — | `matches` | D N | baixo |
| [anônima 165:17](../app.js#L165) | 16 | Avalia `sum + Number(entry.quantidade \|\| 0)`. | — | — | — | — | — | D N | baixo |
| [anônima 167:17](../app.js#L167) | 16 | Avalia `route.data === date && matches(route)`. | — | — | — | — | `matches` | D N | baixo |
| [anônima 168:17](../app.js#L168) | 16 | Avalia `sum + Number(route.saida \|\| 0)`. | — | — | — | — | — | D N | baixo |
| [anônima 173:49](../app.js#L173) | 04 | Aplica texto ao elemento correspondente. | — | — | Sim | — | — | O | médio |
| [anônima 186:16](../app.js#L186) | 04 | Remove o toast após o prazo. | — | — | Sim | — | — | T | médio |
| [anônima 199:32](../app.js#L199) | 04 | Seleciona as quatro páginas permitidas ao operador. | — | — | — | — | — | O | baixo |
| [anônima 201:45](../app.js#L201) | 04 | Gera o link de menu e indica página ativa. | — | — | — | — | — | O | baixo |
| [anônima 277:46](../app.js#L277) | 05 | Testa o filtro `route.data === today`. | — | — | — | — | — | D | baixo |
| [anônima 278:45](../app.js#L278) | 05 | Testa o filtro `route.status === "Fechado"`. | — | — | — | — | — | D | baixo |
| [anônima 281:45](../app.js#L281) | 05 | Testa o filtro `driver.status === "Ativo"`. | — | — | — | — | — | D | baixo |
| [anônima 282:42](../app.js#L282) | 05 | Atualiza o acumulador `sum + Number(route.saida \|\| 0)`. | — | — | — | — | — | D | baixo |
| [anônima 283:39](../app.js#L283) | 05 | Atualiza o acumulador `sum + Number(route.entregues \|\| 0)`. | — | — | — | — | — | D | baixo |
| [anônima 284:38](../app.js#L284) | 05 | Atualiza o acumulador `sum + Number(route.retornados \|\| 0)`. | — | — | — | — | — | D | baixo |
| [anônima 285:40](../app.js#L285) | 05 | Atualiza o acumulador `sum + routeTotal(route)`. | — | — | — | — | `routeTotal` | D | médio |
| [anônima 301:46](../app.js#L301) | 05 | Testa o filtro `route.data === today`. | — | — | — | — | — | D | baixo |
| [anônima 309:40](../app.js#L309) | 05 | Gera linha do Dashboard com nome, volumes, valor e status. | — | — | — | — | `getDriver`, `escapeHtml`, `money`, `routeTotal` | D | médio |
| [anônima 353:55](../app.js#L353) | 06 | Gera linha de entregador com informações privadas e ações. | — | — | — | — | `escapeHtml`, `driverDocumentsCell` | E | baixo |
| [anônima 378:63](../app.js#L378) | 07 | Preenche cada seletor com entregadores ativos. | `drivers` | — | Sim | — | `sortedByName` | N | médio |
| [anônima 379:65](../app.js#L379) | 07 | Testa o filtro `driver.status === "Ativo"`. | — | — | — | — | — | N | baixo |
| [anônima 381:33](../app.js#L381) | 07 | Gera opção HTML a partir do item. | — | — | — | — | `escapeHtml` | N | baixo |
| [anônima 387:64](../app.js#L387) | 18 | Recria opções de empresa e restaura seleção válida. | `settings`, `recebimentos` | — | Sim | — | — | D N Q | médio |
| [anônima 391:39](../app.js#L391) | 18 | Transforma o item `receipt.empresa`. | — | — | — | — | — | D N Q | baixo |
| [anônima 395:30](../app.js#L395) | 18 | Gera opção HTML a partir do item. | — | — | — | — | `escapeHtml` | D N Q | baixo |
| [anônima 402:62](../app.js#L402) | 08 | Preenche cada seletor com as rotas abertas. | `routes` | — | Sim | — | — | Fe | médio |
| [anônima 403:48](../app.js#L403) | 08 | Testa o filtro `route.status === "Aberto"`. | — | — | — | — | — | Fe | baixo |
| [anônima 405:30](../app.js#L405) | 08 | Gera opção de rota com data, entregador, empresa e volume. | — | — | — | — | `getDriver`, `escapeHtml`, `formatDate` | Fe | médio |
| [anônima 417:44](../app.js#L417) | 07 | Testa o filtro `route.status === "Aberto"`. | — | — | — | — | — | N | baixo |
| [anônima 425:38](../app.js#L425) | 07 | Gera linha de saída aberta com tarifa unitária. | — | — | — | — | `getDriver`, `formatDate`, `escapeHtml`, `money` | N | médio |
| [anônima 445:46](../app.js#L445) | 08 | Testa o filtro `route.status === "Fechado"`. | — | — | — | — | — | Fe | baixo |
| [anônima 453:40](../app.js#L453) | 08 | Gera linha de saída fechada com quantidades e valor calculado. | — | — | — | — | `getDriver`, `formatDate`, `escapeHtml`, `money`, `routeTotal` | Fe | médio |
| [`nameOf` · 475:20](../app.js#L475) | 09 | Resolve o nome da rota por entregador para ordenação. | — | — | — | — | `getDriver` | H | médio |
| [`compareText` · 476:25](../app.js#L476) | 09 | Compara texto em pt-BR com sensibilidade base. | — | — | — | — | — | H | baixo |
| [`compareDate` · 477:25](../app.js#L477) | 09 | Compara datas ISO. | — | — | — | — | — | H | baixo |
| [`date-desc` · 479:22](../app.js#L479) | 09 | Ordena por data decrescente com desempate pelo índice inverso. | — | — | — | — | `compareDate` | H | baixo |
| [`date-asc` · 480:21](../app.js#L480) | 09 | Ordena por data crescente com desempate pelo índice. | — | — | — | — | `compareDate` | H | baixo |
| [`driver-asc` · 481:23](../app.js#L481) | 09 | Ordena por entregador crescente e data decrescente. | — | — | — | — | `nameOf`, `compareText`, `compareDate` | H | baixo |
| [`driver-desc` · 482:24](../app.js#L482) | 09 | Ordena por entregador decrescente e data decrescente. | — | — | — | — | `nameOf`, `compareText`, `compareDate` | H | baixo |
| [`company-asc` · 483:24](../app.js#L483) | 09 | Ordena por empresa crescente e data decrescente. | — | — | — | — | `compareText`, `compareDate` | H | baixo |
| [`value-desc` · 484:23](../app.js#L484) | 09 | Ordena por valor decrescente e índice inverso. | — | — | — | — | `routeTotal` | H | médio |
| [`value-asc` · 485:22](../app.js#L485) | 09 | Ordena por valor crescente e índice inverso. | — | — | — | — | `routeTotal` | H | médio |
| [`packages-desc` · 486:26](../app.js#L486) | 09 | Ordena por pacotes decrescentes e índice inverso. | — | — | — | — | — | H | baixo |
| [`packages-asc` · 487:25](../app.js#L487) | 09 | Ordena por pacotes crescentes e índice inverso. | — | — | — | — | — | H | baixo |
| [anônima 491:14](../app.js#L491) | 09 | Associa a posição original à rota. | — | — | — | — | — | H | baixo |
| [anônima 492:17](../app.js#L492) | 09 | Pesquisa nome, empresa, data e status concatenados. | — | — | — | — | `getDriver` | H | médio |
| [anônima 498:14](../app.js#L498) | 09 | Recupera a rota do item indexado. | — | — | — | — | — | H | baixo |
| [anônima 507:32](../app.js#L507) | 09 | Gera linha de Histórico, incluindo status de edição e ações condicionais. | — | — | — | — | `getDriver`, `formatDate`, `escapeHtml`, `money`, `routeTotal` | H | médio |
| [anônima 532:44](../app.js#L532) | 09 | Testa o filtro `route.id !== routeId`. | — | — | — | — | — | H | baixo |
| [anônima 534:64](../app.js#L534) | 09 | Testa o filtro `entry.id !== result.removed_entry_id`. | — | — | — | — | — | H | baixo |

</details>

<details>
<summary>XLSX, Semanal, Pagamentos e Quinzenal</summary>

| Função | Cat. | Responsabilidade | Lê state | Modifica state | DOM | Supabase | Dependências no app.js | Páginas | Risco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [anônima 564:29](../app.js#L564) | 17 | Substitui o caractere pela entidade correspondente. | — | — | — | — | — | S | baixo |
| [anônima 587:14](../app.js#L587) | 17 | Serializa uma largura de coluna em XML. | — | — | — | — | — | S | baixo |
| [anônima 590:14](../app.js#L590) | 17 | Serializa uma linha XML usando as células. | — | — | — | — | — | S | baixo |
| [anônima 590:69](../app.js#L590) | 17 | Transforma o item `xlsxCell(cell, columnIndex, rowIndex)`. | — | — | — | — | `xlsxCell` | S | baixo |
| [`CRC_TABLE` · 616:20](../app.js#L616) | 17 | Inicializa a tabela do polinômio CRC-32 para o ZIP. | — | — | — | — | — | S | baixo |
| [`u16` · 634:17](../app.js#L634) | 17 | Codifica inteiro em dois bytes little endian. | — | — | — | — | — | S | baixo |
| [`u32` · 635:17](../app.js#L635) | 17 | Codifica inteiro em quatro bytes little endian. | — | — | — | — | — | S | baixo |
| [`safeName` · 672:22](../app.js#L672) | 17 | Normaliza nome de aba e limita a 31 caracteres. | — | — | — | — | — | S | baixo |
| [anônima 681:30](../app.js#L681) | 17 | Declara o tipo da parte XML da aba no manifesto. | — | — | — | — | — | S | baixo |
| [anônima 696:41](../app.js#L696) | 17 | Gera referência de aba no workbook. | — | — | — | — | `xlsxEscape`, `safeName` | S | baixo |
| [anônima 703:30](../app.js#L703) | 17 | Gera relação entre workbook e aba. | — | — | — | — | — | S | baixo |
| [anônima 708:23](../app.js#L708) | 17 | Gera o arquivo XML da aba no pacote. | — | — | — | — | `xlsxSheetXml` | S | baixo |
| [anônima 721:16](../app.js#L721) | 17 | Revoga a URL temporária do XLSX. | — | — | — | — | — | S | baixo |
| [`compareText` · 763:25](../app.js#L763) | 11 | Compara nomes e empresas em pt-BR com sensibilidade base. | — | — | — | — | — | S | baixo |
| [anônima 764:40](../app.js#L764) | 11 | Testa o filtro `( route.status === "Fechado" && route.data >= range.start && route.data <= range.end )`. | — | — | — | — | — | S | baixo |
| [anônima 769:20](../app.js#L769) | 11 | Acumula datas, volumes e valor por entregador e empresa. | — | — | — | — | `routeTotal` | S | médio |
| [anônima 784:14](../app.js#L784) | 11 | Anexa o entregador e ordena datas do grupo. | — | — | — | — | `getDriver` | S | médio |
| [anônima 785:15](../app.js#L785) | 11 | Ordena resumo por entregador e empresa. | — | — | — | — | `compareText` | S | baixo |
| [anônima 786:40](../app.js#L786) | 11 | Ordena detalhes por data e nome do entregador. | — | — | — | — | `getDriver`, `compareText` | S | médio |
| [anônima 793:41](../app.js#L793) | 11 | Testa o filtro `route.data === date`. | — | — | — | — | — | S | baixo |
| [anônima 797:38](../app.js#L797) | 11 | Atualiza o acumulador `sum + Number(route.saida \|\| 0)`. | — | — | — | — | — | S | baixo |
| [anônima 798:41](../app.js#L798) | 11 | Atualiza o acumulador `sum + Math.max(0, Number(route.saida \|\| 0) - Number(route.retornados \|\| 0))`. | — | — | — | — | — | S | baixo |
| [anônima 799:42](../app.js#L799) | 11 | Atualiza o acumulador `sum + Number(route.retornados \|\| 0)`. | — | — | — | — | — | S | baixo |
| [anônima 800:37](../app.js#L800) | 11 | Atualiza o acumulador `sum + routeTotal(route)`. | — | — | — | — | `routeTotal` | S | médio |
| [anônima 810:54](../app.js#L810) | 11 | Atualiza o acumulador `sum + Number(route.entregues \|\| 0)`. | — | — | — | — | — | S | baixo |
| [anônima 811:53](../app.js#L811) | 11 | Atualiza o acumulador `sum + Number(route.retornados \|\| 0)`. | — | — | — | — | — | S | baixo |
| [anônima 812:56](../app.js#L812) | 11 | Atualiza o acumulador `sum + routeTotal(route)`. | — | — | — | — | `routeTotal` | S | médio |
| [anônima 813:57](../app.js#L813) | 11 | Transforma o item `route.driverId`. | — | — | — | — | — | S | baixo |
| [anônima 820:43](../app.js#L820) | 11 | Gera a linha de resumo por entregador e empresa. | — | — | — | — | `escapeHtml`, `pixCell`, `formatDate`, `money` | S | médio |
| [`totalOf` · 837:25](../app.js#L837) | 11 | Soma o campo indicado em todos os dias. | — | — | — | — | — | S | baixo |
| [anônima 837:48](../app.js#L837) | 11 | Soma o campo indicado em todos os dias. | — | — | — | — | — | S | baixo |
| [anônima 838:39](../app.js#L838) | 11 | Gera a linha de totais de um dia. | — | — | — | — | `formatDate`, `money` | S | baixo |
| [anônima 864:47](../app.js#L864) | 11 | Gera a linha de detalhe da rota com Pix e situação do pagamento. | — | — | — | — | `getDriver`, `formatDate`, `escapeHtml`, `pixCell`, `money`, `routeTotal` | S | médio |
| [`dayHeader` · 885:23](../app.js#L885) | 11 | Formata rótulo curto de data e dia da semana. | — | — | — | — | — | — | baixo |
| [anônima 887:14](../app.js#L887) | 11 | Avalia `({ value, style: "header" })`. | — | — | — | — | — | — | baixo |
| [anônima 888:30](../app.js#L888) | 11 | Monta linha por entregador e empresa com total. | — | — | — | — | — | — | baixo |
| [anônima 889:33](../app.js#L889) | 11 | Obtém a quantidade do dia com a métrica recebida em pick. | — | — | — | — | — | — | baixo |
| [anônima 890:41](../app.js#L890) | 11 | Testa o filtro `&#96;${route.driverId}\|${route.empresa \|\| ""}&#96; === item.key && route.data === day.date`. | — | — | — | — | — | — | baixo |
| [anônima 891:48](../app.js#L891) | 11 | Atualiza o acumulador `sum + pick(route)`. | — | — | — | — | — | — | baixo |
| [anônima 893:37](../app.js#L893) | 11 | Atualiza o acumulador `sum + (value === "" ? 0 : value)`. | — | — | — | — | — | — | baixo |
| [anônima 896:29](../app.js#L896) | 11 | Soma uma coluna da matriz para cada dia. | — | — | — | — | — | — | baixo |
| [anônima 896:55](../app.js#L896) | 11 | Atualiza o acumulador `sum + (row[index + 2] === "" ? 0 : row[index + 2])`. | — | — | — | — | — | — | baixo |
| [anônima 902:27](../app.js#L902) | 11 | Transforma o item `({ value, style: "bold" })`. | — | — | — | — | — | — | baixo |
| [anônima 903:36](../app.js#L903) | 11 | Atualiza o acumulador `sum + value`. | — | — | — | — | — | — | baixo |
| [`header` · 914:20](../app.js#L914) | 17 | Gera linha de cabeçalho estilizado do XLSX. | — | — | — | — | — | S | baixo |
| [anônima 914:43](../app.js#L914) | 17 | Transforma o item `({ value, style: "header" })`. | — | — | — | — | — | S | baixo |
| [`sum` · 915:17](../app.js#L915) | 17 | Soma itens usando a função de seleção. | — | — | — | — | — | S | baixo |
| [anônima 915:45](../app.js#L915) | 17 | Atualiza o acumulador `total + pick(item)`. | — | — | — | — | — | S | baixo |
| [anônima 916:35](../app.js#L916) | 17 | Transforma o item `&#96;Pacotes ${day.date.slice(8)}/${day.date.slice(5, 7)}&#96;`. | — | — | — | — | — | S | baixo |
| [anônima 919:24](../app.js#L919) | 17 | Monta linha da planilha com Pix, volumes diários e total monetário. | — | — | — | — | — | S | baixo |
| [anônima 920:46](../app.js#L920) | 17 | Testa o filtro `&#96;${route.driverId}\|${route.empresa \|\| ""}&#96; === item.key`. | — | — | — | — | — | S | baixo |
| [anônima 921:44](../app.js#L921) | 17 | Soma pacotes expedidos por dia e por grupo. | — | — | — | — | — | S | baixo |
| [anônima 922:25](../app.js#L922) | 17 | Avalia `route.data === day.date`. | — | — | — | — | — | S | baixo |
| [anônima 923:25](../app.js#L923) | 17 | Avalia `total + Number(route.saida \|\| 0)`. | — | — | — | — | — | S | baixo |
| [anônima 938:25](../app.js#L938) | 17 | Transforma o item `({ value: day.saidas, style: "bold" })`. | — | — | — | — | — | S | baixo |
| [anônima 939:35](../app.js#L939) | 17 | Avalia `item.saidas`. | — | — | — | — | — | S | baixo |
| [anônima 940:35](../app.js#L940) | 17 | Avalia `item.entregues`. | — | — | — | — | — | S | baixo |
| [anônima 941:35](../app.js#L941) | 17 | Avalia `item.retornados`. | — | — | — | — | — | S | baixo |
| [anônima 942:42](../app.js#L942) | 17 | Avalia `item.total`. | — | — | — | — | — | S | baixo |
| [anônima 946:79](../app.js#L946) | 17 | Aplica largura fixa às colunas de pacotes diários. | — | — | — | — | — | S | baixo |
| [anônima 959:34](../app.js#L959) | 13 | Testa o filtro `box.checked`. | — | — | — | — | — | P | baixo |
| [anônima 960:34](../app.js#L960) | 13 | Soma o valor das rotas correspondentes às caixas marcadas. | `routes` | — | — | — | `routeTotal` | P | médio |
| [anônima 961:41](../app.js#L961) | 13 | Testa a correspondência `item.id === box.value`. | — | — | — | — | — | P | baixo |
| [anônima 977:46](../app.js#L977) | 13 | Testa o filtro `( route.status === "Fechado" && (!from \|\| route.data >= from) && (!to \|\| route.data <= to) )`. | — | — | — | — | — | P | baixo |
| [anônima 982:41](../app.js#L982) | 13 | Testa o filtro `route.pagamento !== "Pago"`. | — | — | — | — | — | P | baixo |
| [anônima 983:38](../app.js#L983) | 13 | Testa o filtro `route.pagamento === "Pago"`. | — | — | — | — | — | P | baixo |
| [anônima 985:63](../app.js#L985) | 13 | Atualiza o acumulador `sum + routeTotal(route)`. | — | — | — | — | `routeTotal` | P | médio |
| [anônima 986:57](../app.js#L986) | 13 | Atualiza o acumulador `sum + routeTotal(route)`. | — | — | — | — | `routeTotal` | P | médio |
| [anônima 989:17](../app.js#L989) | 13 | Avalia `!status \|\| (status === "pago") === (route.pagamento === "Pago")`. | — | — | — | — | — | P | baixo |
| [anônima 990:14](../app.js#L990) | 13 | Associa a posição original à rota. | — | — | — | — | — | P | baixo |
| [anônima 991:15](../app.js#L991) | 13 | Ordena por data decrescente e posição inversa no empate. | — | — | — | — | — | P | baixo |
| [anônima 992:14](../app.js#L992) | 13 | Recupera a rota do item indexado. | — | — | — | — | — | P | baixo |
| [anônima 1002:32](../app.js#L1002) | 13 | Gera linha de pagamento com checkbox, chave Pix e ação individual. | — | — | — | — | `getDriver`, `escapeHtml`, `formatDate`, `pixCell`, `money`, `routeTotal` | P | médio |
| [`inPeriod` · 1041:22](../app.js#L1041) | 12 | Avalia `date >= range.start && date <= range.end`. | — | — | — | — | — | Q | baixo |
| [anônima 1042:48](../app.js#L1042) | 12 | Testa o filtro `inPeriod(receipt.data)`. | — | — | — | — | `inPeriod` | Q | baixo |
| [anônima 1043:46](../app.js#L1043) | 12 | Testa o filtro `route.status === "Fechado" && inPeriod(route.data)`. | — | — | — | — | `inPeriod` | Q | baixo |
| [anônima 1044:44](../app.js#L1044) | 12 | Seleciona pagas pela data de pagamento, com fallback para a data da rota. | — | — | — | — | `inPeriod` | Q | baixo |
| [anônima 1049:47](../app.js#L1049) | 12 | Testa o filtro `( route.status === "Fechado" && route.pagamento !== "Pago" && inPeriod(route.data) )`. | — | — | — | — | `inPeriod` | Q | baixo |
| [anônima 1054:43](../app.js#L1054) | 12 | Atualiza o acumulador `sum + Number(receipt.valor \|\| 0)`. | — | — | — | — | — | Q | baixo |
| [anônima 1055:41](../app.js#L1055) | 12 | Atualiza o acumulador `sum + routeTotal(route)`. | — | — | — | — | `routeTotal` | Q | médio |
| [anônima 1056:47](../app.js#L1056) | 12 | Atualiza o acumulador `sum + routeTotal(route)`. | — | — | — | — | `routeTotal` | Q | médio |
| [anônima 1058:48](../app.js#L1058) | 12 | Atualiza o acumulador `( sum + Math.max(0, Number(route.saida \|\| 0) - Number(route.retornados \|\| 0)) )`. | — | — | — | — | — | Q | baixo |
| [anônima 1077:22](../app.js#L1077) | 12 | Acumula quantidade e valor dos recebimentos por empresa. | — | — | — | — | — | Q | baixo |
| [anônima 1088:66](../app.js#L1088) | 12 | Compara itens `b[1].total - a[1].total`. | — | — | — | — | — | Q | baixo |
| [anônima 1088:105](../app.js#L1088) | 12 | Gera linha da empresa com quantidade de recebimentos e total. | — | — | — | — | `escapeHtml`, `money` | Q | baixo |
| [anônima 1098:24](../app.js#L1098) | 12 | Agrupa pagamentos por entregador e soma valor e quantidade. | — | — | — | — | `routeTotal` | Q | médio |
| [anônima 1108:63](../app.js#L1108) | 12 | Compara itens `b[1].total - a[1].total`. | — | — | — | — | — | Q | baixo |
| [anônima 1108:102](../app.js#L1108) | 12 | Gera linha de pagamentos por entregador. | — | — | — | — | `getDriver`, `escapeHtml`, `money` | Q | médio |

</details>

<details>
<summary>Galpão, Entregadores, Relatório Diário, Funcionários e formulários de edição</summary>

| Função | Cat. | Responsabilidade | Lê state | Modifica state | DOM | Supabase | Dependências no app.js | Páginas | Risco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [anônima 1138:49](../app.js#L1138) | 16 | Testa o filtro `entry.data === date`. | — | — | — | — | — | D | baixo |
| [anônima 1139:40](../app.js#L1139) | 16 | Testa o filtro `route.data === date`. | — | — | — | — | — | D | baixo |
| [anônima 1142:24](../app.js#L1142) | 16 | Transforma o item `entry.empresa`. | — | — | — | — | — | D | baixo |
| [anônima 1143:23](../app.js#L1143) | 16 | Transforma o item `route.empresa`. | — | — | — | — | — | D | baixo |
| [anônima 1145:28](../app.js#L1145) | 16 | Transforma o item `({ name, ...dailyStock(date, name) })`. | — | — | — | — | `dailyStock` | D | médio |
| [anônima 1148:17](../app.js#L1148) | 16 | Avalia `!entry.empresa`. | — | — | — | — | — | D | baixo |
| [anônima 1149:17](../app.js#L1149) | 16 | Avalia `sum + Number(entry.quantidade \|\| 0)`. | — | — | — | — | — | D | baixo |
| [anônima 1151:17](../app.js#L1151) | 16 | Avalia `!route.empresa`. | — | — | — | — | — | D | baixo |
| [anônima 1152:17](../app.js#L1152) | 16 | Avalia `sum + Number(route.saida \|\| 0)`. | — | — | — | — | — | D | baixo |
| [anônima 1167:31](../app.js#L1167) | 16 | Soma entradas, saídas e saldo para a linha de total. | — | — | — | — | — | D | baixo |
| [anônima 1173:32](../app.js#L1173) | 16 | Gera linha de estoque por empresa. | — | — | — | — | `escapeHtml` | D | baixo |
| [anônima 1202:49](../app.js#L1202) | 16 | Testa o filtro `entry.data === date`. | — | — | — | — | — | D | baixo |
| [anônima 1207:35](../app.js#L1207) | 16 | Gera linha de entrada e ações para registros manuais. | — | — | — | — | `escapeHtml` | D | baixo |
| [anônima 1256:37](../app.js#L1256) | 08 | Testa a correspondência `item.id === closeForm.elements.namedItem("routeId").value`. | — | — | Sim | — | — | Fe | médio |
| [anônima 1297:24](../app.js#L1297) | 06 | Cria URL temporária e configura o Image e os eventos de carga. | — | — | Sim | — | — | E | médio |
| [anônima 1300:24](../app.js#L1300) | 06 | Revoga a URL e resolve a imagem carregada. | — | — | Sim | — | — | E | médio |
| [anônima 1304:25](../app.js#L1304) | 06 | Revoga a URL e rejeita com mensagem de erro de imagem. | — | — | Sim | — | `documentError` | E | médio |
| [anônima 1313:24](../app.js#L1313) | 06 | Encaminha tipo e qualidade ao canvas.toBlob. | — | — | Sim | — | — | E | médio |
| [`inPeriod` · 1469:22](../app.js#L1469) | 10 | Avalia `route.data >= period.start && route.data <= period.end`. | — | — | — | — | — | R* | baixo |
| [anônima 1472:61](../app.js#L1472) | 10 | Testa o filtro `inPeriod(route, period)`. | — | — | — | — | `inPeriod` | R* | baixo |
| [anônima 1478:39](../app.js#L1478) | 10 | Testa o filtro `inPeriod(route, periods.week) \|\| inPeriod(route, periods.fortnight)`. | — | — | — | — | `inPeriod` | R* | baixo |
| [`byName` · 1479:20](../app.js#L1479) | 10 | Avalia `a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })`. | — | — | — | — | — | R* | baixo |
| [`perfRow` · 1480:21](../app.js#L1480) | 10 | Gera linha de desempenho nos três períodos. | — | — | — | — | `escapeHtml`, `performanceLabel` | R* | baixo |
| [anônima 1483:49](../app.js#L1483) | 10 | Testa o filtro `inPeriod(route, periods.day)`. | — | — | — | — | `inPeriod` | R* | baixo |
| [anônima 1484:49](../app.js#L1484) | 10 | Testa o filtro `inPeriod(route, periods.week)`. | — | — | — | — | `inPeriod` | R* | baixo |
| [anônima 1485:49](../app.js#L1485) | 10 | Testa o filtro `inPeriod(route, periods.fortnight)`. | — | — | — | — | `inPeriod` | R* | baixo |
| [anônima 1490:47](../app.js#L1490) | 10 | Avalia `route.empresa \|\| "Sem empresa"`. | — | — | — | — | — | R* | baixo |
| [anônima 1491:18](../app.js#L1491) | 10 | Avalia `({ name, items })`. | — | — | — | — | — | R* | baixo |
| [anônima 1494:49](../app.js#L1494) | 10 | Transforma o item `perfRow(group.name, group.items)`. | — | — | — | — | `perfRow` | R* | baixo |
| [anônima 1499:47](../app.js#L1499) | 10 | Avalia `route.driverId`. | — | — | — | — | — | R* | baixo |
| [anônima 1500:18](../app.js#L1500) | 10 | Avalia `({ name: getDriver(driverId)?.nome \|\| "Entregador removido", items })`. | — | — | — | — | `getDriver` | R* | médio |
| [anônima 1503:48](../app.js#L1503) | 10 | Transforma o item `perfRow(group.name, group.items)`. | — | — | — | — | `perfRow` | R* | baixo |
| [anônima 1512:40](../app.js#L1512) | 10 | Testa o filtro `route.data === date`. | — | — | — | — | — | R | baixo |
| [`byName` · 1527:20](../app.js#L1527) | 10 | Avalia `a.localeCompare(b, "pt-BR", { sensitivity: "base" })`. | — | — | — | — | — | R | baixo |
| [anônima 1531:48](../app.js#L1531) | 10 | Avalia `route.empresa \|\| "Sem empresa"`. | — | — | — | — | — | R | baixo |
| [anônima 1532:19](../app.js#L1532) | 10 | Avalia `byName(a, b)`. | — | — | — | — | `byName` | R | baixo |
| [anônima 1536:48](../app.js#L1536) | 10 | Gera linha de resumo diário por empresa. | — | — | — | — | `escapeHtml`, `reportCells`, `summarizeReport` | R | baixo |
| [anônima 1546:48](../app.js#L1546) | 10 | Avalia `route.driverId`. | — | — | — | — | — | R | baixo |
| [anônima 1547:18](../app.js#L1547) | 10 | Monta agrupamento com nome do entregador e empresas. | — | — | — | — | `getDriver` | R | médio |
| [anônima 1549:50](../app.js#L1549) | 10 | Transforma o item `route.empresa`. | — | — | — | — | — | R | baixo |
| [anônima 1552:19](../app.js#L1552) | 10 | Avalia `byName(a.name, b.name)`. | — | — | — | — | `byName` | R | baixo |
| [anônima 1556:47](../app.js#L1556) | 10 | Gera linha de resumo diário por entregador. | — | — | — | — | `escapeHtml`, `reportCells`, `summarizeReport` | R | baixo |
| [anônima 1571:32](../app.js#L1571) | 14 | Testa o filtro `employee.status === "Ativo"`. | — | — | — | — | — | F | baixo |
| [anônima 1574:69](../app.js#L1574) | 14 | Atualiza o acumulador `sum + Number(employee.remuneracao \|\| 0)`. | — | — | — | — | — | F | baixo |
| [anônima 1581:32](../app.js#L1581) | 14 | Gera linha de funcionário com remuneração e ações. | — | — | — | — | `escapeHtml`, `formatDate`, `money` | F | baixo |
| [anônima 1638:52](../app.js#L1638) | 16 | Testa existência `option.value === entry.empresa`. | — | — | — | — | — | D | baixo |
| [anônima 1664:54](../app.js#L1664) | 16 | Testa o item para obter o índice `entry.id === updated.id`. | — | — | — | — | — | D | baixo |
| [anônima 1682:60](../app.js#L1682) | 16 | Testa o filtro `entry.id !== entryId`. | — | — | — | — | — | D | baixo |
| [anônima 1711:55](../app.js#L1711) | 09 | Testa o filtro `driver.status === "Ativo" \|\| driver.id === route.driverId`. | — | — | — | — | — | H | baixo |
| [anônima 1712:42](../app.js#L1712) | 09 | Gera opção HTML a partir do item. | — | — | — | — | `escapeHtml` | H | baixo |
| [anônima 1717:45](../app.js#L1717) | 09 | Gera opção HTML a partir do item. | — | — | — | — | `escapeHtml` | H | baixo |
| [anônima 1724:63](../app.js#L1724) | 09 | Mostra ou oculta campo conforme o status Fechado. | — | — | Sim | — | — | H | médio |

</details>

<details>
<summary>Formulários, eventos delegados, exportação do Histórico e evento de carga</summary>

| Função | Cat. | Responsabilidade | Lê state | Modifica state | DOM | Supabase | Dependências no app.js | Páginas | Risco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [anônima 1745:46](../app.js#L1745) | 02 | Envia login, mapeia falhas de Auth e redireciona no sucesso. | — | — | Sim | `configured` (leitura), `signIn` | `toast` | L | alto |
| [`updateWeek` · 1786:28](../app.js#L1786) | 11 | Ajusta a outra ponta do intervalo e redesenha a semana. | — | — | Sim | — | `shiftDate`, `weekRange`, `renderWeek` | S | médio |
| [anônima 1798:46](../app.js#L1798) | 11 | Recalcula a semana ao alterar a data inicial. | — | — | Sim | — | `updateWeek` | S | médio |
| [anônima 1799:44](../app.js#L1799) | 11 | Recalcula a semana ao alterar a data final. | — | — | Sim | — | `updateWeek` | S | médio |
| [anônima 1802:60](../app.js#L1802) | 10 | Abre a impressão do relatório no navegador. | — | — | — | — | — | R | médio |
| [anônima 1806:49](../app.js#L1806) | 14 | Valida CPF e duplicidade, cadastra ou edita funcionário e grava o estado. | `funcionarios`, `objeto state` | `funcionarios` | Sim | — | `validatePixKey`, `toast`, `resetEmployeeForm`, `makeId`, `saveData`, `renderEmployees` | F | alto |
| [anônima 1820:55](../app.js#L1820) | 14 | Testa a correspondência `employee.id !== employeeId && String(employee.cpf \|\| "").replace(/\D/g, "") === cpfDigits`. | — | — | — | — | — | F | baixo |
| [anônima 1828:54](../app.js#L1828) | 14 | Testa a correspondência `employee.id === employeeId`. | — | — | — | — | — | F | baixo |
| [anônima 1848:50](../app.js#L1848) | 09 | Valida alterações de rota, chama RPC e sincroniza rota e retornos. | `routes`, `entradasGalpao` | `routes`, `entradasGalpao` | Sim | `updateRoute` | `toast`, `closeRouteEdit`, `renderHistory` | H | alto |
| [anônima 1851:45](../app.js#L1851) | 09 | Testa a correspondência `item.id === data.routeId`. | — | — | — | — | — | H | baixo |
| [anônima 1887:54](../app.js#L1887) | 09 | Testa o item para obter o índice `item.id === route.id`. | — | — | — | — | — | H | baixo |
| [anônima 1890:72](../app.js#L1890) | 09 | Testa o filtro `entry.id !== result.removed_entry_id`. | — | — | — | — | — | H | baixo |
| [anônima 1893:71](../app.js#L1893) | 09 | Testa o item para obter o índice `entry.id === result.warehouse_entry.id`. | — | — | — | — | — | H | baixo |
| [anônima 1913:47](../app.js#L1913) | 06 | Valida Pix, separa edição por papel, trata upload, cadastro e gravação. | `drivers`, `role`, `objeto state` | `drivers` | Sim | `updateDriver`, `uploadDriverDocument`, `registerDriver`, `removeDriverDocuments` | `validatePixKey`, `toast`, `resetDriverForm`, `renderDrivers`, `fillDriverSelects`, `makeId`, `prepareDocument`, `saveData` | E | alto |
| [anônima 1929:55](../app.js#L1929) | 06 | Testa a correspondência `driver.id === driverId`. | — | — | — | — | — | E | baixo |
| [anônima 1946:65](../app.js#L1946) | 06 | Testa o item para obter o índice `item.id === driverId`. | — | — | — | — | — | E | baixo |
| [anônima 1992:36](../app.js#L1992) | 06 | Registra falha ao remover arquivo substituído. | — | — | — | — | — | E | médio |
| [anônima 2015:46](../app.js#L2015) | 07 | Monta rota aberta e pendente, chama RPC de criação e atualiza estado e tela. | `routes` | `routes` | Sim | `createRoute` | `toast`, `makeId`, `getDriver`, `updateRoutePrice`, `renderOpenRoutes`, `renderWarehouse` | N | alto |
| [anônima 2058:77](../app.js#L2058) | 07 | Recalcula tarifa ao trocar entregador. | — | — | Sim | — | `updateRoutePrice` | N | médio |
| [anônima 2059:73](../app.js#L2059) | 07 | Atualiza saldo e avisos ao trocar data. | — | — | Sim | — | `refreshStockForRoute` | N | médio |
| [anônima 2060:76](../app.js#L2060) | 07 | Atualiza saldo e avisos ao trocar empresa. | — | — | Sim | — | `refreshStockForRoute` | N | médio |
| [anônima 2065:45](../app.js#L2065) | 08 | Recalcula a prévia enquanto o formulário muda. | — | — | Sim | — | `updateClosurePreview` | Fe | médio |
| [anônima 2066:76](../app.js#L2066) | 08 | Recalcula a prévia ao trocar a rota selecionada. | — | — | Sim | — | `updateClosurePreview` | Fe | médio |
| [anônima 2067:46](../app.js#L2067) | 08 | Valida e fecha rota via RPC, sincroniza retorno e atualiza telas. | `routes`, `entradasGalpao` | `routes`, `entradasGalpao` | Sim | `closeRoute` | `toast`, `fillRouteSelects`, `updateClosurePreview`, `renderClosedRoutes`, `renderDashboard`, `renderWeek`, `renderPayments`, `renderWarehouse` | Fe | alto |
| [anônima 2070:45](../app.js#L2070) | 08 | Testa a correspondência `item.id === data.routeId`. | — | — | — | — | — | Fe | baixo |
| [anônima 2111:50](../app.js#L2111) | 16 | Delega edição ou registra entrada manual via RPC e atualiza tabela. | `entradasGalpao` | `entradasGalpao` | Sim | `registerWarehouseEntry` | `saveEntryEdit`, `makeId`, `renderWarehouse`, `toast` | D | alto |
| [anônima 2141:77](../app.js#L2141) | 16 | Atualiza estoque e entradas da data selecionada. | — | — | — | — | `renderWarehouse` | D | baixo |
| [anônima 2146:49](../app.js#L2146) | 15 | Atualiza configurações e salva em segundo plano. | `settings (valor anterior e gravação do estado inteiro)` | `settings` | Sim | — | `saveData`, `renderShell`, `fillCompanySelects`, `toast` | C | alto |
| [anônima 2154:72](../app.js#L2154) | 15 | Transforma o item `company.trim()`. | — | — | — | — | — | C | baixo |
| [anônima 2180:48](../app.js#L2180) | 12 | Cria recebimento, grava em segundo plano e atualiza o quinzenal. | `recebimentos`, `objeto state` | `recebimentos` | Sim | — | `makeId`, `saveData`, `renderFortnight`, `toast` | Q | alto |
| [anônima 2200:40](../app.js#L2200) | 01 | Despacha ações por seletor, incluindo logout, cadastros, exclusões, pagamentos e exports. | `role`, `objeto state`, `entradasGalpao`, `routes`, `funcionarios`, `drivers` | `drivers`, `funcionarios`, `routes`, `routes.pagamento`, `routes.dataPagamento` | Sim | `signOut`, `updateDriver`, `clearBusinessData` | `setMobileMenuOpen`, `getDriver`, `startDriverEdit`, `openDriverDocument`, `resetDriverForm`, `saveData`, `renderDrivers`, `toast`, `startEntryEdit`, `resetEntryForm`, `formatDate`, `removeWarehouseEntry`, `startRouteEdit`, `closeRouteEdit`, `startEmployeeEdit`, `resetEmployeeForm`, `renderEmployees`, `removeRoute`, `exportWeek`, `renderPayments`, `money`, `renderFortnight`, `exportHistory`, `fillDriverSelects`, `routeTotal` | T | alto |
| [anônima 2253:29](../app.js#L2253) | 06 | Substitui o cadastro devolvido pela RPC e atualiza a interface. | `drivers` | `drivers` | — | — | `renderDrivers`, `fillDriverSelects`, `toast` | E | alto |
| [anônima 2254:69](../app.js#L2254) | 06 | Testa o item para obter o índice `item.id === driver.id`. | — | — | — | — | — | E | baixo |
| [anônima 2259:30](../app.js#L2259) | 06 | Registra a falha e exibe erro de status. | — | — | — | — | `toast` | E | baixo |
| [anônima 2274:53](../app.js#L2274) | 16 | Testa a correspondência `item.id === editEntryButton.dataset.editEntry`. | — | — | — | — | — | D | baixo |
| [anônima 2285:53](../app.js#L2285) | 16 | Testa a correspondência `item.id === deleteEntryButton.dataset.deleteEntry`. | — | — | — | — | — | D | baixo |
| [anônima 2293:45](../app.js#L2293) | 09 | Testa a correspondência `item.id === editRouteButton.dataset.editRoute`. | — | — | — | — | — | H | baixo |
| [anônima 2301:54](../app.js#L2301) | 14 | Testa a correspondência `item.id === editEmployeeButton.dataset.editEmployee`. | — | — | — | — | — | F | baixo |
| [anônima 2313:54](../app.js#L2313) | 14 | Testa a correspondência `item.id === toggleEmployeeButton.dataset.toggleEmployee`. | — | — | — | — | — | F | baixo |
| [anônima 2324:45](../app.js#L2324) | 09 | Testa a correspondência `item.id === deleteRouteButton.dataset.deleteRoute`. | — | — | — | — | — | H | baixo |
| [anônima 2339:100](../app.js#L2339) | 13 | Limpa o valor de cada filtro de pagamento. | — | — | Sim | — | — | P* | médio |
| [anônima 2346:99](../app.js#L2346) | 13 | Transforma o item `box.value`. | — | — | — | — | — | P* | baixo |
| [anônima 2348:22](../app.js#L2348) | 13 | Avalia `state.routes.find((route) => route.id === id)`. | `routes` | — | — | — | — | P* | baixo |
| [anônima 2348:48](../app.js#L2348) | 13 | Testa a correspondência `route.id === id`. | — | — | — | — | — | P* | baixo |
| [anônima 2349:25](../app.js#L2349) | 13 | Avalia `route && (route.pagamento === "Pago") !== (target === "pago")`. | — | — | — | — | — | P* | baixo |
| [anônima 2355:45](../app.js#L2355) | 13 | Atualiza o acumulador `sum + routeTotal(route)`. | — | — | — | — | `routeTotal` | P* | médio |
| [anônima 2358:36](../app.js#L2358) | 13 | Atualiza status e inclui ou remove a data de pagamento de cada rota do lote. | — | `routes.pagamento`, `routes.dataPagamento` | — | — | — | P* | alto |
| [anônima 2377:45](../app.js#L2377) | 13 | Testa a correspondência `item.id === payButton.dataset.payRoute`. | — | — | — | — | — | P | baixo |
| [anônima 2395:57](../app.js#L2395) | 15 | Redireciona ao login após limpeza. | — | — | — | — | — | C | médio |
| [anônima 2397:22](../app.js#L2397) | 15 | Registra falha da limpeza e exibe aviso. | — | — | — | — | `toast` | C | médio |
| [anônima 2410:42](../app.js#L2410) | 04 | Fecha o menu ao pressionar Escape. | — | — | Sim | — | `setMobileMenuOpen` | O | médio |
| [anônima 2418:42](../app.js#L2418) | 09 | Renderiza o histórico com o termo digitado. | — | — | Sim | — | `renderHistory` | H | médio |
| [anônima 2423:48](../app.js#L2423) | 09 | Renderiza o histórico mantendo o termo ao alterar a ordenação. | — | — | Sim | — | `renderHistory` | H | médio |
| [anônima 2426:71](../app.js#L2426) | 13 | Liga mudanças do seletor esperado ao renderizador de pagamentos. | — | — | Sim | — | `renderPayments` | P* | médio |
| [anônima 2431:41](../app.js#L2431) | 13 | Sincroniza seleção individual e geral de pagamentos. | — | — | Sim | — | `updatePaymentSelection` | P | médio |
| [anônima 2433:70](../app.js#L2433) | 13 | Replica o valor do checkbox geral em uma linha. | — | — | Sim | — | — | P | médio |
| [anônima 2443:35](../app.js#L2443) | 17 | Transforma uma rota em linha da exportação XLS. | — | — | — | — | `getDriver`, `formatDate`, `routeTotal` | H | médio |
| [`escapeXml` · 2458:23](../app.js#L2458) | 17 | Escapa texto para SpreadsheetML. | — | — | — | — | — | H | baixo |
| [anônima 2458:74](../app.js#L2458) | 17 | Substitui o caractere pela entidade correspondente. | — | — | — | — | — | H | baixo |
| [anônima 2465:51](../app.js#L2465) | 17 | Serializa linha do XLS. | — | — | — | — | — | H | baixo |
| [anônima 2466:24](../app.js#L2466) | 17 | Define tipo e estilo da célula e serializa o valor no XLS. | — | — | — | — | `escapeXml` | H | baixo |
| [anônima 2542:50](../app.js#L2542) | 02 | Absorve falha no logout durante recuperação da sessão. | — | — | — | — | — | T | baixo |
| [anônima 2549:47](../app.js#L2549) | 01 | Chama a inicialização quando o DOM está pronto. | — | — | — | — | `initializeApp` | T | alto |
| [anônima 2550:27](../app.js#L2550) | 01 | Registra erro não tratado na inicialização e exibe toast. | — | — | — | — | `toast` | T | médio |

</details>

## 3. Mapa de dependências

A coluna **Dependências no app.js** registra as funções referenciadas de cada corpo e permite seguir o grafo nos dois sentidos. O inventário de callbacks preserva a ordem e o escopo lexical pelo ponto de origem. A tabela abaixo concentra caminhos disparados por eventos, inclusive os ramos que compartilham um mesmo callback.

| Entrada | Encadeamento principal | Estado e fronteira externa |
| --- | --- | --- |
| Carga do script e `DOMContentLoaded` | `loadData` cria o estado. O evento chama `initializeApp` → `renderPage` → `ensureLogged` → `renderShell` → `setupForms` → `setupActions` → seletores e renderizadores | Auth e `profiles` determinam usuário/papel, então `loadState` carrega coleções. O login autenticado passa pela carga antes do redirecionamento. |
| Login e logout | `setupForms` [submit](../app.js#L1745) → `signIn` → Dashboard. `setupActions` [click](../app.js#L2200) → `signOut` → Login | O login e o logout por clique navegam. A resolução de `user` e `role` ocorre na inicialização da página. |
| Dashboard e Galpão | `renderDashboard` → `dashboardMetrics` → `routeTotal`. `renderWarehouse` → `renderCompanyStock` e `dailyStock`. Formulário e ações → `saveEntryEdit`, `removeWarehouseEntry` ou cadastro | Lê `routes`, `drivers`, `settings.empresas` e `entradasGalpao`. As mutações de entradas manuais usam RPCs. |
| Entregadores | `renderDrivers` → `driverDocumentsCell`. `setupActions` → `getDriver` → edição, status ou `openDriverDocument`. Submit → `validatePixKey`, `prepareDocument` e gravação por papel | Admin usa `saveData` para cadastro/edição. O operador usa `registerDriver` no cadastro e `updateDriver` na edição/status. Os caminhos de documentos passam pelo bucket `driver-docs`. |
| Nova Saída | `fillDriverSelects` e `fillCompanySelects` → `updateRoutePrice` → `refreshStockForRoute` → `dailyStock`. Submit → `createRoute` → `renderOpenRoutes` e `renderWarehouse` | Tarifa de `settings.valoresVeiculo`, entregador de `drivers`. A criação adiciona a rota retornada. O saldo muda pela saída. |
| Fechamento | `fillRouteSelects` → `updateClosurePreview`. Submit → `closeRoute` → atualiza seletor, prévia, fechadas, Dashboard, Semanal, Pagamentos e Galpão | Atualiza a rota existente e adiciona `warehouse_entry` quando devolvida. Os renderizadores operam sobre o DOM da página atual. |
| Histórico | `renderHistory` → `getDriver` e `routeTotal`. Ações → `startRouteEdit`, `removeRoute` ou `exportHistory`. Submit de edição → `updateRoute` | Atualiza rota e reconcilia a entrada de retorno informada pela RPC de edição. A exportação usa a coleção carregada inteira, independente da busca e ordenação da tabela. |
| Relatório Diário | Mudança de data → `renderDailyReport` → `summarizeReport`, `groupRoutes`, `reportCells` e `renderPerformance` | Agrega `routes` por data, empresa e entregador. O evento de impressão chama `window.print`. |
| Semanal | Mudança nas datas → `updateWeek` → `renderWeek` → `weekData` → `weekRange`, `shiftDate`, `weekdayName`, `routeTotal` e `getDriver`. Botão → `exportWeek` → `downloadXlsx` → `buildXlsxBlob` | Lê rotas fechadas e dados de entregadores, incluindo Pix na tela e na exportação. A geração segue `xlsxSheetXml` → `xlsxCell` e `zipStore` → `crc32`. |
| Quinzenal | Mês/metade → `renderFortnight` → `fortnightRange` e `routeTotal`. Novo recebimento → `saveData` → redesenha | Lê `recebimentos` e `routes`, com recortes de data diferentes para pagos e pendentes. Recebimentos são gravados em `receipts`. |
| Pagamentos | `renderPayments` → `paymentFilter` e `updatePaymentSelection`. Ação individual e ramo em lote → `saveData` → `renderPayments` e `renderFortnight` | Muda `pagamento` e `dataPagamento` no próprio objeto de `routes`. Persistência genérica em `routes.payload`. |
| Funcionários | `renderEmployees`; editar → `startEmployeeEdit`; submit → `validatePixKey` e `saveData`; status → `saveData` | Lê e modifica `funcionarios`. O cliente persiste em `employees` para admin, inclusive remuneração. |
| Configurações | `renderSettings`; submit → `saveData`, `renderShell` e `fillCompanySelects`. Limpar dados → `clearBusinessData` | Configurações de admin em `app_settings`. A limpeza chama exclusão direta de `drivers`, `routes`, `warehouse_entries` e `receipts` em sequência. |

**Dependências por campo de estado.**

- `user` e `role` controlam guarda, menu, leitura de dados privados e caminho de gravação.
- `settings` fornece empresas aos seletores de Dashboard, Nova Saída e Quinzenal e à edição do Histórico. Fornece tarifas à Nova Saída.
- `drivers` fornece nomes e veículos para as telas de rotas e Pix para Semanal e Pagamentos. `getDriver` devolve uma referência usada também na mutação de status no fluxo de admin.
- `routes` alimenta Dashboard, Nova Saída, Fechamento, Histórico, Relatório Diário, Semanal, Quinzenal, Pagamentos e o cálculo de estoque.
- `entradasGalpao` alimenta o Dashboard/Galpão e a prévia de saldo na Nova Saída. Fechamento e edição de rota também escrevem nessa coleção.
- `recebimentos` alimenta o Quinzenal e as opções de `fillCompanySelects`. `funcionarios` alimenta cadastro, status e remuneração no módulo de Funcionários.

## 4. Funções puras mais seguras para extrair primeiro

- **Primeiro lote** — `money`, `escapeHtml`, `formatDate`, `vehicleKey`, `sortedByName` e `percentLabel`. Cobrir valores nulos e vazios já aceitos, texto acentuado e formatação em pt-BR.
- **Validação e datas** — `validatePixKey`, com `digitAt` e `checkDigit` no mesmo escopo, `shiftDate` e `weekdayName`. Cobrir dados legados e viradas de mês e ano. `addCalendarDays` também é pura e está sem chamador identificado. A sua implementação e a de `shiftDate` usam construções de `Date` diferentes.
- **Cálculos com entradas explícitas** — `summarizeReport`, `groupRoutes`, `performanceLabel` e `fortnightOf`. `dailyMatrix` é uma transformação local com `pick` recebido e está sem chamador identificado. `routeTotal` é puro e tem risco médio pelo alcance financeiro. Cobrir os resultados existentes antes de movê-lo.
- **Planilhas, em etapa própria** — `xlsxColumnName`, `xlsxEscape`, `xlsxDateSerial` e `crc32` com a IIFE de `CRC_TABLE`. Depois, validar `xlsxCell`, `xlsxSheetXml`, `zipStore` e `buildXlsxBlob` juntos com planilha de referência. `downloadXlsx` usa DOM. `reportCells`, `pixCell` e `driverDocumentsCell` geram HTML a partir dos argumentos e carregam contratos da interface.
- `makeId` depende do relógio e de aleatoriedade. `loadData` depende de `seedData`. `weekRange` e `fortnightRange` leem o DOM, e `dailyStock` lê o estado global.

## 5. Funções com maior acoplamento

| Funções | Motivo |
| --- | --- |
| `initializeApp`, `renderPage`, `ensureLogged` | Ordem de sessão, perfil, carga, guarda de papel, inicialização de datas e instalação dos eventos. |
| `setupForms` e `setupActions` | Seletor e evento são parte do contrato de cada página. Os callbacks incluem validação, gravação, sincronização do estado e renderização. |
| `saveData`, `getDriver` e `fillCompanySelects` | A gravação recebe a referência do estado inteiro, a busca devolve um objeto mutável e o preenchimento de empresas combina dois domínios. |
| Submit de Nova Saída, Fechamento e edição do Histórico, `removeRoute`, `saveEntryEdit`, `removeWarehouseEntry` | Juntam RPC ou exclusão direta, snapshot no cliente, mudança local e atualização visual. O caminho de fechamento/edição mexe em rotas e retornos. |
| `weekData`, `renderWeek`, `exportWeek`, `renderFortnight`, `renderPayments`, `exportHistory` | Misturam regras de período, origem dos números, estados de pagamento, agregação, apresentação e, no Semanal/Pagamentos, dados Pix. |
| Submit de Entregadores, `startDriverEdit`, `prepareDocument` e `openDriverDocument` | Ramificam por papel e envolvem dados privados, arquivos, URL assinada e operações assíncronas. |

## 6. Funções financeiras que precisam de testes antes da refatoração

| Funções / fluxo | Casos de equivalência |
| --- | --- |
| `routeTotal`, `money`, `updateRoutePrice`, `updateClosurePreview` | Quantidades numéricas e legadas, ausência de valor, tarifa por veículo, fallback moto, desconto zero ou acima do bruto, limites dos campos e centavos. Comparar prévia com retorno da RPC de fechamento. |
| `dashboardMetrics`, `renderDashboard`, `renderClosedRoutes`, `renderHistory`, `exportHistory` | Totais e ordenação por valor, filtro por data/status, rotas abertas e fechadas, desconto e arredondamento a duas casas no XLS. Cobrir rota legada em que `entregues` difere de `saida - retornados`. |
| `weekRange`, `weekData`, `renderWeek`, `exportWeek` | Domingo, segunda e viradas de mês/ano, limites inclusivos, combinação entregador/empresa, ordenação e totais de linhas e colunas. O card de entregas soma `entregues` persistido. Resumo e detalhes calculam entregas por diferença de pacotes. A exportação arredonda valores e inclui Pix. |
| `fortnightRange`, `renderFortnight` e submit de recebimentos | Dias 15/16, fevereiro bissexto, independência entre data da rota e de pagamento, legado com `dataPagamento` ausente, pendentes pela data da rota, recebimentos por empresa e resultado `recebido - pago`. |
| `paymentFilter`, `updatePaymentSelection`, `renderPayments` e ações individual/em lote | Status inicial, valor dos selecionados, alteração e reversão, grupos mistos, data de pagamento, comportamento dos seletores reais, recarga e erro de gravação. Os cards somam as rotas fechadas do período antes do filtro de status. |
| `renderEmployees` e submit de Funcionários | Folha somando somente ativos, remuneração vazia como `null`, zero e centavos. |
| `saveData` e consumidores financeiros | Snapshot, fila, falha de persistência e recarga. Configurações, recebimentos e pagamentos apresentam feedback de sucesso sem aguardar o booleano. O resumo financeiro em memória pode refletir a mudança antes da gravação. |

`routeTotal` usa `entregues` persistido. Diversas linhas do Histórico, Fechamento, Semanal e Quinzenal mostram `Math.max(0, saida - retornados)` como quantidade. O Relatório Diário também deriva entregues por diferença. A equivalência precisa preservar as duas origens.

## 7. Funções que modificam rotas

| Função / callback | Mudança observada |
| --- | --- |
| `setupForms` → [submit de Nova Saída](../app.js#L2015) | `createRoute` → RPC `create_route`. Anexa a rota devolvida a `state.routes` com o objeto inicial em status Aberto e pagamento Pendente enviado à RPC. |
| `setupForms` → [submit de Fechamento](../app.js#L2067) | `closeRoute` → RPC `close_route`. Aplica `result.route` ao objeto existente e anexa retorno quando a resposta inclui entrada. |
| `setupForms` → [submit de edição do Histórico](../app.js#L1848) | `updateRoute` → RPC `update_route`. Substitui a rota e remove, substitui ou acrescenta a entrada indicada. |
| `removeRoute`, disparada pela [ação no Histórico](../app.js#L2322) | `deleteRoute` → exclusão direta por ID em `routes`. Remove a rota local. A remoção local de estoque é condicional a `removed_entry_id`. O cliente atual conclui a exclusão sem devolver objeto, e o efeito sobre entradas no banco está **não confirmado**. |
| `setupActions` → [pagamento individual](../app.js#L2375) e [ramo em lote](../app.js#L2343) | Modificam os campos de pagamento na rota e chamam `saveData`. |
| `setupActions` → [limpeza](../app.js#L2393) | `clearBusinessData` inclui `routes`. O callback redireciona após a promessa e a nova carga reconstrói o estado. |

`initializeApp` substitui o estado hidratado, incluindo a coleção de rotas. `startRouteEdit`, `closeRouteEdit`, `fillRouteSelects` e `updateClosurePreview` atualizam o formulário ou a exibição.

## 8. Funções que modificam estoque

- **Cadastro** — submit de [Galpão](../app.js#L2111) chama `registerWarehouseEntry` → RPC `register_warehouse_entry` e anexa a entrada retornada.
- **Edição** — `saveEntryEdit` chama `updateWarehouseEntry` → RPC `update_warehouse_entry` e substitui a entrada local correspondente.
- **Exclusão** — `removeWarehouseEntry` chama `deleteWarehouseEntry` → RPC `delete_warehouse_entry` e filtra a coleção.
- **Saída e retorno** — submit de Nova Saída diminui o saldo calculado ao adicionar a rota. Fechamento adiciona retorno opcional. Edição de rota pode mudar empresa/data/quantidade e reconcilia retorno. Exclusão muda as saídas que entram no cálculo e tem o caminho de retorno descrito na seção anterior.
- **Limpeza** — `clearBusinessData`, acionada em Configurações, inclui `warehouse_entries` e `routes`.
- `dailyStock`, `renderCompanyStock`, `renderWarehouse` e `refreshStockForRoute` leem ou apresentam o saldo. Na Nova Saída, a prévia remove o atributo `max` da quantidade e mostra o aviso. A criação é delegada à RPC.

## 9. Funções que modificam pagamentos

- **Marcar ou desfazer** — `setupActions`, ramos [individual](../app.js#L2375) e [lote](../app.js#L2343), escreve `Pago` e `dataPagamento = today`, ou `Pendente` e remove `dataPagamento`. Ambos chamam `saveData` e os renderizadores de Pagamentos e Quinzenal. O lote exige confirmação e exclui da mudança rotas já no status solicitado, mas o seletor de disparo está ausente do HTML atual.
- **Inicializar** — o submit de Nova Saída preenche `pagamento: "Pendente"`. Fechamento e edição aplicam o objeto de rota retornado pela RPC. O efeito dessas RPCs nos campos financeiros, além dos dados que o frontend envia e aplica, está **não confirmado**.
- **Excluir por consequência** — a exclusão de rota e a limpeza removem o registro que carrega o pagamento. Pelo Histórico, a tabela exibe a indicação Pago em vez dos botões para uma rota paga.
- **Recebimentos** — o submit de [Quinzenal](../app.js#L2180) modifica `recebimentos`, que compõe o resultado quinzenal. Pagamento de entregador é armazenado nos campos da rota. `renderPayments`, `renderFortnight` e `updatePaymentSelection` recalculam a apresentação.

## 10. Funções relacionadas a autenticação e navegação

- A IIFE de `today` e `loadData` precedem o evento `DOMContentLoaded`. `initializeApp` verifica `configured`, chama `getSession`, `getProfile` e `loadState`, escreve `state.user` e `state.role` e trata falha de sessão com `signOut` e limpeza local desses campos.
- `renderPage` chama `ensureLogged` antes do shell e dos eventos. `ensureLogged` encaminha sessão válida no login ao Dashboard, sessão ausente em página protegida ao login e operador fora da lista permitida ao Dashboard.
- `setupForms` [liga o login](../app.js#L1745) à autenticação por e-mail/senha e mostra erros específicos. `setupActions` [liga o logout](../app.js#L2200) a `signOut` e redireciona sem aguardar a promessa.
- `renderShell` usa o papel no menu e no DOM. `setMobileMenuOpen` e os eventos de clique/Escape administram o menu e o foco. `startDriverEdit` e os ramos de cadastro/status de Entregadores dependem do papel. `saveData` encaminha o papel ao cliente para a gravação.

## 11. Ordem sugerida de extração

1. Utilitários puros com chamadores ativos, começando por formatação, escape, veículo e ordenação. Validar datas, Pix e cálculos antes de mover suas funções.
2. Componentes compartilhados de interface, começando por `setText` e `renderEmpty`, depois `toast` e o shell móvel com seus eventos.
3. Dashboard de leitura. Tratar os indicadores e, em etapa separada, ligar o Galpão e a prévia da Nova Saída com testes de saldo e retornos.
4. Extrair páginas uma por vez. Começar pelas partes de leitura do Relatório Diário e do Histórico, depois Nova Saída e Fechamento como etapas separadas com testes de sincronização do Galpão. Mover as ações de edição/exclusão do Histórico com a mesma cobertura.
5. Semanal, Quinzenal, Pagamentos e as exportações em etapas distintas, com valores de referência, filtros e arquivos comparáveis. Manter o uso de seletores observado como dado de caracterização.
6. Entregadores, Funcionários e Configurações, preservando as diferenças por papel e a sequência dos documentos. Deixar `initializeApp`, coordenação de sessão, persistência compartilhada e estratégia de carga para depois de estabilizar os chamadores.

## 12. Diferenças e lacunas em relação ao PLANS.md

- O plano lista os domínios de página e a arquitetura de distribuição futura. O inventário acrescenta **Galpão/estoque** como domínio transversal, com UI no Dashboard e dependências em Nova Saída, Fechamento e Histórico.
- A classificação genérica de geração Excel em `utils` abrange dois formatos e camadas distintas no código. O Histórico gera XLS/SpreadsheetML e o Semanal gera XLSX/Open XML. Cada um tem preparação de dados e download acoplados ao seu fluxo.
- As nove candidatas da Fase 2 existem. `addCalendarDays` está sem chamador identificado e `routeTotal` precisa de cobertura financeira antes de mover. `dailyMatrix` também está sem chamador identificado.
- O plano prevê consultas e recortes de Pagamentos como evolução. Na interface atual, `app.js` procura `data-pay-from`, `data-pay-to`, `data-pay-status`, `data-pay-clear`, `data-pay-selected` e `data-pay-mark`. O HTML oferece `data-payment-start`, `data-payment-end`, `data-payment-bulk-status` e `data-payment-bulk-apply`. Pelo código estático, filtros, resumo da seleção e aplicação em lote ficam sem ligação correspondente. Seleção geral e ação individual têm seletores compatíveis.
- Os cartões de performance do Relatório Diário usam `data-performance`, enquanto `renderPerformance` procura `data-perf` e retorna na ausência dele. O período calculado nesse ramo é a quinzena civil. O texto do cartão descreve os últimos 15 dias. As tabelas e indicadores diários têm seletores compatíveis.
- Dois pontos de integração observados ao confrontar frontend e cliente. O fluxo de operador passa dois argumentos a `updateDriver`, enquanto a API do cliente recebe um único `record` e o envia como `p_driver`. `getDriverDetails` está disponível no cliente e não tem chamada no `app.js`. A exclusão direta de rota também não devolve o `removed_entry_id` esperado pelo consumidor. O comportamento em produção desses caminhos está **não confirmado**.
- As fases e a arquitetura alvo do plano servem como proposta. Este inventário registra o código atual e a ordem sugerida acima é documental.

A validação da Fase 1 é estática, com conferência das funções e referências, dos seletores no HTML e dos contratos do cliente. Fluxos no navegador e resultados de chamadas ao Supabase em produção permanecem **não confirmados**.
