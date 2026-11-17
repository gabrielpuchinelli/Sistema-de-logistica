# Diagnóstico de integração

Escopo restrito aos quatro pontos do [mapa do app.js](APP_JS_MAP.md), com [AGENTS.md](../AGENTS.md), [PLANS.md](../PLANS.md), [Arquitetura](ARCHITECTURE.md) e [Banco de dados](DATABASE.md) como referências. As recomendações abaixo são propostas para uma etapa posterior.

## 1. Pagamentos

**Status** — desconexão confirmada no frontend. A tela usa atributos diferentes dos consultados por `paymentFilter()`, `updatePaymentSelection()` e `setupActions()`. [pagamentos.html](../pagamentos.html#L39) · [Leitura dos filtros e seleção](../app.js#L949) · [Ações](../app.js#L2338) · [Eventos de mudança](../app.js#L2426)

| Controle ou saída | Contrato atual no JavaScript | HTML atual e comportamento |
| --- | --- | --- |
| Data inicial e final | `data-pay-from` e `data-pay-to`, lidos no filtro e ligados a `change` | Usa `data-payment-start` e `data-payment-end`. Os campos aceitam datas, mas o filtro recebe strings vazias e o `change` fica sem listener. |
| Filtro de situação da lista | `data-pay-status`, com vazio para todos, `pago` para pagos e qualquer outro valor não vazio interpretado como pendente | A lista fica sem filtro de situação. O seletor `data-payment-bulk-status` expressa a situação **a aplicar ao lote**, com valores `Pago` e `Pendente`. |
| Limpar filtros | Clique em `data-pay-clear`, que zera os três campos esperados e renderiza de novo | O botão está ausente. O ramo está sem elemento de disparo. |
| Resumo da seleção | `data-pay-selected` recebe quantidade selecionada e valor total | O alvo está ausente. O total é calculado, mas fica sem saída visual. `data-payment-count` mostra a quantidade de linhas renderizadas. |
| Aplicar ao lote | Clique em `data-pay-mark`, lendo `dataset.payMark`. O valor `pago` escolhe Pago e o outro ramo escolhe Pendente | O botão tem `data-payment-bulk-apply` e a situação está no seletor `data-payment-bulk-status`. O clique fica sem correspondência, confirmação, alteração de estado ou gravação. |

**Impacto** — os cards e a tabela usam todas as rotas fechadas carregadas. Alterar as datas não muda o recorte e o botão em lote fica inoperante. As caixas por linha e a opção **Selecionar todos** se comunicam, inclusive no estado indeterminado. A ação individual tem seletor compatível e aciona a persistência já existente. O frontend restringe a página ao admin. [Renderização e controle individual](../app.js#L972) · [Marcar ou desfazer](../app.js#L2375) · [Seleção](../app.js#L2431) · [Guarda de navegação](../app.js#L249)

**Correção mínima recomendada** — usar os atributos existentes como contrato dos controles visíveis. Ler `data-payment-start` e `data-payment-end` e registrar `change` nesses campos. Usar a data da rota com limites inclusivos, mantendo os cards sobre as rotas fechadas do período e a tabela sobre o mesmo recorte. Ligar `data-payment-bulk-apply` ao ramo existente de confirmação e ler `data-payment-bulk-status` aceitando explicitamente `Pago` ou `Pendente`. Preservar a gravação em `routes.payload` e a lógica atual de `dataPagamento`. Se o produto precisar de filtro de situação da lista, limpeza e resumo da seleção, dar a cada item um elemento próprio com `data-pay-status`, `data-pay-clear` e `data-pay-selected`. O seletor de situação do lote continua independente do filtro da lista. [Filtro e totais](../app.js#L949) · [Fluxo do lote](../app.js#L2343) · [Persistência](../supabase-client.js#L99)

**Testes necessários** — com rotas abertas e fechadas, pagas e pendentes, testar alteração de cada ponta do intervalo, datas de fronteira e intervalos vazios. Conferir cards, linhas e quantidade. Testar seleção parcial/total, clique em lote vazio, confirmação e cancelamento, lote misto nos dois sentidos, rotas já na situação alvo, `dataPagamento` e ação individual. Se forem incluídos, testar filtro de situação, limpeza e total selecionado nos próprios elementos. Cobrir falha de gravação e recarga.

**Verificar no Supabase** — dispensável para comprovar os seletores e o evento desconectado. Validar a persistência de uma futura correção com uma conta admin em ambiente autorizado, incluindo recarga após marcar e desfazer.

## 2. Relatório Diário

**Status** — bug de renderização confirmado no frontend. `renderPage()` chama `renderDailyReport()` na carga. A mudança da data também chama `renderDailyReport()`. Ela invoca `renderPerformance(date)`, que entra na função e retorna na primeira guarda por ausência de `[data-perf]`. Os três cartões ficam no hífen inicial mesmo com rotas fechadas no período. [Carga](../app.js#L2493) · [Evento de data](../app.js#L1775) · [Guarda](../app.js#L1461) · [Cartões](../relatorio_Diario.html#L29)

| Período | Atributo no HTML | Atributo que recebe o valor no JavaScript | Faixa prevista no JavaScript |
| --- | --- | --- | --- |
| Diário | `data-performance="daily"` | `data-perf="day"` | Data selecionada |
| Semanal | `data-performance="weekly"` | `data-perf="week"` | Data selecionada e seis dias anteriores |
| Quinzenal | `data-performance="fortnight"` | `data-perf="fortnight"` | Quinzena civil da data selecionada, dias 1–15 ou 16–fim do mês |

**Impacto** — há divergência tanto no atributo quanto nas chaves diária e semanal. Ajustar só a guarda ainda deixaria os cartões sem correspondência. Os alvos de detalhe `data-perf-detail` e as tabelas `data-perf-company-table` e `data-perf-driver-table` existem como referências no JavaScript e estão ausentes do HTML. Os totais do dia, a taxa de insucesso e as tabelas diárias por empresa e entregador usam `data-report-*` e seguem o seu fluxo. O texto “Últimos 15 dias” também diverge da quinzena civil calculada, que pode incluir datas posteriores à selecionada. [Agregação da performance](../app.js#L1448) · [Relatório diário](../app.js#L1507) · [Tabelas diárias](../relatorio_Diario.html#L54)

**Correção mínima recomendada** — alinhar a guarda e as escritas aos três cartões existentes, fazendo o mapeamento explícito `day → daily`, `week → weekly` e `fortnight → fortnight`. Para preservar a fórmula atual, ajustar o texto do cartão para indicar **quinzena civil**. Se a operação confirmar que a regra é “últimos 15 dias”, usar uma janela inclusiva de `data selecionada − 14 dias` a `data selecionada`. A decisão afeta o resultado e deve ser validada com a operação. Os três cartões atuais são o escopo mínimo de interface. [Períodos e atribuição](../app.js#L1464) · [Descrições dos cartões](../relatorio_Diario.html#L29)

**Testes necessários** — verificar carga inicial e mudança da data com rotas fechadas e abertas, insucessos, dia sem fechamentos e percentual zero. Usar amostras que separem 7 de 8 dias, 15 de 16 dias e incluam viradas de mês, ano e quinzena. Conferir o mesmo recorte no cartão e no rótulo, e verificar os totais e tabelas diárias.

**Verificar no Supabase** — dispensável para o diagnóstico e para validar a ligação dos cartões com dados controlados. A regra do período quinzenal é uma decisão de produto.

## 3. `updateDriver()` no fluxo de operador

**Status** — incompatibilidade de argumentos confirmada nas duas chamadas do repositório. O cliente publica `updateDriver(record)` e envia seu único argumento como `{ p_driver: record }` à RPC `update_driver`. As duas chamadas do operador passam um ID como primeiro argumento e os campos como segundo. O segundo argumento é ignorado pelo wrapper e `p_driver` recebe o ID escalar. [Cliente e RPC](../supabase-client.js#L248) · [API pública](../supabase-client.js#L291)

| Origem | Forma atual | Chamada à RPC resultante |
| --- | --- | --- |
| Envio do formulário para editar entregador existente | `updateDriver(driverId, { nome, telefone, veiculo, status })` | `{ p_driver: driverId }` |
| Clique em Ativar/Inativar | `updateDriver(driver.id, { nome, telefone, veiculo, status: nextStatus })` | `{ p_driver: driver.id }` |

**Impacto** — nome, telefone, veículo e status deixam de ser enviados em ambos os fluxos. A provável consequência é erro ou ausência da alteração esperada para o operador. A reação exata da RPC em produção está **não confirmada**. O cadastro de operador usa `registerDriver()`. Edição e status de admin usam `saveData()`. [Edição pelo operador](../app.js#L1936) · [Cadastro e edição por papel](../app.js#L1982) · [Ativar/Inativar](../app.js#L2242)

**Correção mínima recomendada** — alterar as duas chamadas do `app.js` para fornecer um único objeto `{ id, nome, telefone, veiculo, status }`, usando `driverId` no formulário e `driver.id` na ação de status. Preservar normalizações já aplicadas e usar somente os campos operacionais dos dois fluxos. Manter `updateDriver(record)` e `update_driver` com a assinatura atual. [Formulário](../app.js#L1940) · [Ação de status](../app.js#L2248) · [Wrapper](../supabase-client.js#L248)

**Testes necessários** — inspecionar o payload dos dois caminhos com cliente simulado. Em ambiente autorizado, confirmar edição, inativação e reativação como operador, retorno com o ID correto, atualização do estado e persistência após recarga. Cobrir erro de RPC e regressão dos caminhos de admin e do cadastro de operador.

**Verificar no Supabase** — dispensável para confirmar a perda do segundo argumento. Necessário para confirmar a estrutura efetivamente validada por `update_driver`, seu retorno e a autorização do papel operador antes de aprovar a correção.

## 4. `deleteRoute()` e retorno de galpão

**Status** — erro de contrato confirmado sempre que o wrapper resolve com sucesso. `deleteRoute(routeId)` executa `delete().eq("id", routeId)` em `routes` e remove o snapshot da rota. A promessa resolve com `undefined`. `removeRoute()` filtra a rota em memória e, em seguida, lê `result.removed_entry_id`, o que lança `TypeError` mesmo quando a rota não tem retorno. O `catch` mostra o aviso genérico de falha, o Histórico fica sem a atualização explícita dessa ação e a eventual entrada de retorno fica no estado local. Se a requisição falha antes de resolver, a remoção local não é executada. [Consumidor](../app.js#L529) · [Wrapper](../supabase-client.js#L216)

| Relação investigada | Evidência no repositório |
| --- | --- |
| RPC na exclusão de rota | O caminho do Histórico faz exclusão direta em `routes`. A RPC `delete_warehouse_entry` é chamada pelo caminho de exclusão de entrada do Galpão e fica fora da exclusão de rota. |
| RPCs de fechamento e edição | `close_route` pode devolver `warehouse_entry`. `update_route` pode devolver `removed_entry_id` e `warehouse_entry`. O cliente e o `app.js` sincronizam snapshots e estado nesses fluxos. |
| Chave de ligação no código | `saveState()` mapeia `payload.routeId` para `warehouse_entries.route_id`. A carga lê o `payload`. Isso evidencia a associação usada pelo frontend, com existência e ação de FK no banco **não confirmadas**. |
| Trigger, FK ou outra automação no banco | Efeito **não confirmado**. As migrations versionadas não contêm SQL que permita determinar se há cascata, bloqueio, retorno órfão ou outra ação. |
| Estado local | O ramo para remover a entrada depende de `removed_entry_id` e é interrompido antes de executá-lo. `dailyStock()` usa `entradasGalpao` para somar entradas e `routes` para subtrair saídas. |

Fontes do vínculo e dos fluxos. [Carga](../supabase-client.js#L53) · [Gravação de route_id](../supabase-client.js#L99) · [RPCs e exclusão direta](../supabase-client.js#L169) · [Saldo](../app.js#L161) · [Confirmação na interface](../app.js#L2322) · [Migrations](../supabase/migrations/)

**Impacto** — a UI pode indicar falha depois de o banco já ter removido a rota. No mesmo carregamento, a rota sai da coleção, mas a tabela ainda mostra o registro até ser renderizada de novo. Se o banco remove o retorno, mantê-lo em memória deixaria o estoque local acima do persistido. Se mantém o retorno, a mensagem que promete removê-lo fica incorreta e pode restar uma entrada associada a uma rota excluída. A confirmação da UI deduz a existência do retorno a partir de `Fechado` e `retornados > 0`. A operação direta também só verifica `error`, então o código atual não distingue sucesso com zero linhas afetadas. [Remoção e aviso](../app.js#L529) · [Mensagem de confirmação](../app.js#L2322) · [Consulta de exclusão](../supabase-client.js#L216)

**Correção mínima recomendada** — alinhar `removeRoute()` ao contrato sem retorno de `deleteRoute()` e completar a atualização do Histórico após a exclusão confirmada. Antes de alterar a mensagem ou a sincronização do Galpão, verificar o comportamento do banco. Se a exclusão já elimina os retornos, recarregar as coleções relevantes do Supabase após a operação, com os snapshots correspondentes, para refletir o resultado persistido. Se o banco preserva ou bloqueia a entrada, alinhar a confirmação e o tratamento ao comportamento autorizado. Qualquer mudança da regra de remoção de retornos requer uma decisão separada. [Carga e snapshots](../supabase-client.js#L53) · [Remoção local](../app.js#L529)

**Testes necessários** — cobrir rota aberta, fechada sem retorno, fechada com entrada vinculada e entrada manual independente. Verificar cancelamento, falha do banco, resposta sem linha afetada, filtros ativos do Histórico, aviso da UI e saldo por data/empresa após exclusão e recarga. Conferir os IDs persistidos de `routes` e `warehouse_entries` e verificar que a ação permanece indisponível na tabela para rotas pagas.

**Verificar no Supabase** — necessário. Inspecionar a FK de `warehouse_entries.route_id` para `routes.id`, inclusive sua ação `ON DELETE`, triggers de exclusão nas tabelas envolvidas, funções chamadas pelos triggers e políticas de exclusão de rotas. Confirmar o resultado com dados fictícios em ambiente autorizado. O repositório confirma a incompatibilidade de retorno no JavaScript e o vínculo lógico. A remoção efetiva de entradas de galpão em produção permanece **não confirmada**.

## Validação deste diagnóstico

Os trechos dos quatro fluxos foram executados em memória, com DOM e cliente Supabase simulados. A reprodução confirmou que as datas e o lote de Pagamentos não acionam o efeito esperado, que os cartões de performance ficam no hífen enquanto o resumo diário é atualizado, que o wrapper de entregadores envia somente o ID e que o sucesso simulado da exclusão provoca `TypeError` depois da alteração local. A validação no navegador e no Supabase real fica para os testes de uma futura correção.
