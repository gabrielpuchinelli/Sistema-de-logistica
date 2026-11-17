# PLANS.md

## Objetivo

Evoluir o RMSLogis de uma aplicação funcional concentrada em poucos arquivos para uma estrutura mais modular, escalável e fácil de manter, sem interromper a operação atual.

A refatoração será incremental.

## Princípios

- Não reescrever do zero.
- Não trocar a stack sem necessidade.
- Uma fase deve poder ser testada e revertida isoladamente.
- Banco de dados não deve ser alterado durante uma refatoração puramente de frontend.
- Mudanças de arquitetura e mudanças de regra de negócio devem ser separadas.
- Cada etapa deve terminar com teste e revisão de `git diff`.

---

# Fase 0 — Baseline e documentação

Status: **em andamento**

Objetivos:

- documentar arquitetura atual;
- documentar banco conhecido pelo frontend;
- registrar regras para Codex/IA;
- criar diretório de migrations;
- estabelecer checklist de deploy.

Arquivos:

```text
AGENTS.md
PLANS.md
docs/ARCHITECTURE.md
docs/DATABASE.md
docs/DEPLOY.md
supabase/README.md
supabase/migrations/
```

Nenhuma funcionalidade deve mudar nesta fase.

---

# Fase 1 — Mapear responsabilidades do `app.js`

Objetivo:

Separar conceitualmente o arquivo antes de movê-lo.

Categorias atuais:

```text
core
├── estado
├── inicialização
├── autenticação de interface
└── navegação

utils
├── datas
├── moeda
├── validação
├── escape/format
└── geração de arquivos Excel

pages/domains
├── dashboard
├── entregadores
├── nova saída
├── fechamento
├── histórico
├── relatório diário
├── fechamento semanal
├── fechamento quinzenal
├── pagamentos
├── funcionários
└── configurações

ui
├── sidebar
├── toast
├── tabela vazia
└── menu mobile
```

Nesta fase ainda é aceitável não mover funções.

Entrega esperada:

- mapa de funções;
- dependências entre funções;
- lista de funções puras;
- lista de funções que dependem de DOM;
- lista de funções que modificam `state`;
- lista de funções que fazem persistência.

---

# Fase 2 — Extrair utilitários puros

Começar pelas funções com menor risco.

Candidatas:

```text
money
escapeHtml
validatePixKey
formatDate
addCalendarDays
shiftDate
weekdayName
vehicleKey
routeTotal
```

Também isolar, posteriormente, utilitários de geração XLSX.

Estrutura alvo inicial:

```text
js/
└── utils/
    ├── dates.js
    ├── format.js
    ├── validation.js
    └── xlsx.js
```

Requisito:

O comportamento e os valores gerados devem permanecer idênticos.

---

# Fase 3 — Extrair componentes de interface compartilhados

Candidatos:

```text
renderShell
setMobileMenuOpen
toast
renderEmpty
setText
```

Estrutura alvo:

```text
js/
└── components/
    ├── shell.js
    ├── toast.js
    └── table.js
```

Não alterar visual nesta fase.

---

# Fase 4 — Separar lógica por página

Objetivo:

Deixar cada página responsável apenas por sua funcionalidade.

Estrutura alvo:

```text
js/
└── pages/
    ├── dashboard.js
    ├── entregadores.js
    ├── nova-saida.js
    ├── fechamento.js
    ├── historico.js
    ├── relatorio-diario.js
    ├── fechamento-semanal.js
    ├── fechamento-quinzenal.js
    ├── pagamentos.js
    ├── funcionarios.js
    └── configuracoes.js
```

A extração deve ser feita uma página por vez.

Ordem recomendada:

1. Dashboard;
2. Nova Saída;
3. Fechamento;
4. Histórico;
5. Relatórios;
6. Pagamentos;
7. Entregadores;
8. Funcionários;
9. Configurações.

A ordem pode mudar após análise de dependências.

---

# Fase 5 — Separar serviços de acesso a dados

O `supabase-client.js` já funciona como uma camada de dados, mas concentra vários domínios.

Estrutura futura possível:

```text
js/
└── services/
    ├── supabase.js
    ├── auth.service.js
    ├── routes.service.js
    ├── drivers.service.js
    ├── warehouse.service.js
    ├── receipts.service.js
    ├── employees.service.js
    └── settings.service.js
```

Durante a transição, preservar a API pública `window.rmsSupabase` ou fornecer uma camada de compatibilidade até que todos os consumidores sejam migrados.

---

# Fase 6 — Reduzir carregamento global

A paginação atual evita o limite de 1000 registros, mas ainda carrega grandes conjuntos de dados para a memória.

Objetivo futuro:

```text
Dashboard
→ consultar apenas período necessário

Nova Saída
→ consultar rotas abertas necessárias

Fechamento
→ consultar rotas abertas

Histórico
→ paginação real no servidor

Relatório Diário
→ consultar apenas a data escolhida

Fechamento Semanal
→ consultar apenas o intervalo

Fechamento Quinzenal
→ consultar apenas o intervalo

Pagamentos
→ consultar somente registros relevantes
```

Essa fase exige planejamento maior porque hoje várias telas compartilham `state`.

Não remover o carregamento global antes de cada consumidor possuir uma fonte de dados substituta.

---

# Fase 7 — Paginação do Histórico

Objetivo:

Não renderizar nem carregar todo o histórico de rotas de uma vez.

Possível comportamento:

```text
50 registros por página
ordenação no banco
filtro no banco
busca por período
busca por entregador
busca por empresa
```

Antes de implementar:

- definir filtros suportados;
- verificar índices;
- validar cálculos que dependam de conjuntos completos;
- manter exportação completa separada da tabela paginada, quando necessário.

---

# Fase 8 — Versionamento completo do Supabase

Antes de qualquer mudança estrutural de banco:

1. obter baseline do schema atual;
2. documentar tabelas;
3. documentar constraints;
4. exportar funções/RPCs;
5. documentar triggers;
6. documentar políticas RLS;
7. documentar Storage policies;
8. verificar Auth.

Depois disso, toda alteração deve virar migration.

Estrutura:

```text
supabase/
├── README.md
└── migrations/
    ├── YYYYMMDDHHMMSS_descricao.sql
    └── ...
```

---

# Fase 9 — Índices e consultas

Somente após observar consultas reais.

Candidatos de análise:

- data da rota;
- status;
- empresa;
- entregador;
- pagamento;
- relacionamento de entradas com rota.

Não criar índices apenas por suposição.

Medir/validar primeiro.

---

# Fase 10 — Normalização gradual do banco

Hoje uma parte relevante da informação é persistida em `payload`.

Uma arquitetura futura pode mover campos frequentemente consultados para colunas próprias.

Exemplo conceitual para `routes`:

```text
id
driver_id
company_id / empresa
route_date
packages_out
packages_delivered
packages_returned
unit_value
discount
status
payment_status
created_at
updated_at
```

Essa é uma mudança de alto impacto.

Não implementar sem:

- migration;
- compatibilidade temporária;
- plano de backfill;
- validação de relatórios;
- validação de pagamentos;
- rollback/recuperação.

---

# Fase 11 — Separar cliente do software de empresa operacional

No modelo atual, `empresa` representa empresa despachante dentro da operação.

Se o produto evoluir para múltiplos clientes no mesmo banco, será necessário um conceito separado, por exemplo:

```text
organizations
organization_users
companies
drivers
routes
warehouse_entries
receipts
employees
app_settings
```

Nesse modelo:

```text
organization
= cliente/galpão que usa o RMSLogis

company
= empresa despachante/operacional daquele cliente
```

Essa fase só deve existir se houver decisão real de multi-tenant no mesmo projeto Supabase.

Até lá, o modelo documentado no README atual continua sendo um projeto Supabase separado por cliente.

---

# Fase 12 — Testes automatizados

Adicionar gradualmente testes para funções críticas:

- `routeTotal`;
- datas;
- faixas semanais;
- faixas quinzenais;
- validações;
- cálculos de pagamento;
- estoque;
- transformação de dados.

Posteriormente adicionar testes dos fluxos de integração mais importantes.

---

# Resultado desejado

Arquitetura futura aproximada:

```text
HTML
  ↓
page controller
  ↓
domain/service
  ↓
Supabase client
  ↓
RPC / tabela / Storage
```

Com:

- arquivos menores;
- responsabilidades claras;
- consultas escaláveis;
- banco versionado;
- mudanças auditáveis;
- menor risco de regressão.
