# Arquitetura atual do RMSLogis

## Escopo deste documento

Este documento descreve a arquitetura observável no repositório atual.

Ele não tenta inventar detalhes do Supabase que não estejam disponíveis no código.

Detalhes de schema, RLS, triggers e implementação SQL das RPCs devem ser confirmados diretamente no projeto Supabase.

---

# 1. Visão geral

O RMSLogis é uma aplicação web estática baseada em HTML, CSS e JavaScript, usando o Supabase como backend.

Arquitetura atual:

```text
Navegador
│
├── HTML
├── style.css
├── app.js
├── supabase-config.js
└── supabase-client.js
        │
        ▼
Supabase
├── Auth
├── PostgreSQL
├── RPCs
└── Storage
```

Não existe, no repositório atual, um backend próprio Node/PHP entre o navegador e o Supabase.

---

# 2. Estrutura atual do repositório

Arquivos principais observados:

```text
README.md
app.js
style.css
supabase-client.js
supabase-config.js

index.html
dashboard.html
entregadores.html
nova_Saida.html
fechamento.html
historico.html
relatorio_Diario.html
fechamento_Semanal.html
fechamento_Quinzenal.html
pagamentos.html
funcionarios.html
configuracoes.html

rms-logo.svg
```

A maior parte da lógica da aplicação está atualmente em `app.js`.

A integração com Supabase está concentrada em `supabase-client.js`.

---

# 3. Carregamento das páginas

As páginas operacionais seguem o padrão:

```text
@supabase/supabase-js
        ↓
supabase-config.js
        ↓
supabase-client.js
        ↓
app.js
```

`supabase-config.js` fornece a configuração usada para criar o cliente.

`supabase-client.js` publica a API:

```javascript
window.rmsSupabase
```

`app.js` utiliza essa API para autenticação, carregamento e persistência.

---

# 4. Estado da aplicação

O estado inicial é criado no navegador.

Estrutura principal:

```text
state
├── settings
├── user
├── role
├── drivers
├── routes
├── recebimentos
├── entradasGalpao
└── funcionarios
```

O estado funciona como fonte de dados para grande parte das telas.

Exemplo atual:

```text
Supabase
   ↓
loadState()
   ↓
state.routes
   ├── Dashboard
   ├── Nova Saída
   ├── Fechamento
   ├── Histórico
   ├── Fechamento Semanal
   ├── Fechamento Quinzenal
   └── Pagamentos/relatórios
```

Isso simplifica o frontend, mas cria acoplamento entre páginas e aumenta o custo de carregamento conforme o banco cresce.

---

# 5. Inicialização

Fluxo atual:

```text
DOMContentLoaded
      ↓
initializeApp()
      ↓
getSession()
      │
      ├── sem sessão
      │      ↓
      │   renderPage()
      │
      └── com sessão
             ↓
          getProfile()
             ↓
        define user/role
             ↓
          loadState()
             ↓
          renderPage()
```

Em falha de sessão/carregamento:

- o erro é registrado no console;
- o sistema tenta encerrar a sessão;
- `state.user` e `state.role` são limpos.

---

# 6. Autenticação e papéis

A autenticação usa Supabase Auth.

Depois de obter a sessão, o frontend consulta `profiles` para obter `role`.

Papéis conhecidos:

```text
admin
operador
```

## Operador

A navegação do operador é limitada pelo frontend a:

```text
Dashboard
Entregadores
Nova Saída
Fechamento
```

## Admin

O administrador visualiza todos os módulos disponíveis no menu.

Importante:

A restrição de páginas no frontend é apenas uma camada de interface.

A segurança real de leitura/escrita precisa ser garantida pelas políticas e funções do Supabase.

---

# 7. Persistência e snapshots

`supabase-client.js` mantém snapshots locais:

```text
recordSnapshots
privateDriverSnapshots
settingsSnapshot
```

Objetivo:

Evitar `upsert` de registros que não sofreram alteração.

Existe também:

```text
writeQueue
```

que serializa operações realizadas por `saveState()`.

Fluxo conceitual:

```text
state
  ↓
saveState()
  ↓
compara com snapshot
  ↓
somente alterados
  ↓
upsert
  ↓
atualiza snapshot
```

---

# 8. Carregamento paginado

O repositório atual possui `loadAllRows()`.

Fluxo:

```text
tabela
  ↓
1000 registros
  ↓
próxima faixa
  ↓
1000 registros
  ↓
...
  ↓
página incompleta
  ↓
fim
```

A consulta usa ordenação por `id` e `.range()`.

Essa implementação corrige o problema em que tabelas com mais de 1000 registros eram carregadas parcialmente.

Atualmente esse mecanismo é aplicado ao carregamento das coleções principais e também a dados privados/funcionários quando necessários.

Isso resolve o limite imediato, mas ainda significa que o sistema pode carregar uma quantidade crescente de registros para a memória.

---

# 9. Fluxo de Nova Saída

Página:

```text
nova_Saida.html
```

Fluxo:

```text
usuário preenche formulário
        ↓
validação de entregador/empresa/dados
        ↓
monta objeto route
        ↓
rmsSupabase.createRoute(route)
        ↓
RPC create_route
        ↓
retorno da rota salva
        ↓
state.routes.push(...)
        ↓
renderOpenRoutes()
        ↓
renderWarehouse()
```

Estado inicial observado para uma nova rota:

```text
status = "Aberto"
entregues = 0
retornados = 0
desconto = 0
pagamento = "Pendente"
```

A criação de rota é delegada a uma RPC, o que permite que validações críticas também sejam feitas no banco.

---

# 10. Fluxo de Fechamento

Fluxo:

```text
seleciona rota aberta
      ↓
informa retornados/desconto
      ↓
valida quantidades
      ↓
rmsSupabase.closeRoute(...)
      ↓
RPC close_route
      ↓
retorna route atualizada
+ possível warehouse_entry
      ↓
atualiza state
      ↓
atualiza telas relacionadas
```

Após o fechamento, o frontend pode atualizar:

- lista de rotas abertas;
- rotas fechadas;
- Dashboard;
- fechamento semanal;
- pagamentos;
- galpão.

Isso mostra que fechamento é uma operação central e de alto impacto.

---

# 11. Edição de rota

O Histórico permite iniciar edição de rota.

O frontend envia alterações através de:

```text
update_route
```

A resposta pode conter:

```text
route
removed_entry_id
warehouse_entry
```

O frontend então sincroniza `state.routes` e `state.entradasGalpao`.

Esse acoplamento deve ser preservado durante refatorações.

---

# 12. Entregadores

Os dados de entregador são separados em duas categorias.

## Dados operacionais/públicos

Tabela:

```text
drivers
```

## Dados privados

Tabela:

```text
driver_private
```

Campos tratados como privados pelo frontend incluem:

```text
cpf
cnh
endereco
email
pixTipo
pixChave
docIdentidade
docResidencia
```

Para administrador, o carregamento combina os dados públicos e privados em um único objeto de `state.drivers`.

---

# 13. Documentos dos entregadores

Bucket:

```text
driver-docs
```

Fluxo:

```text
arquivo selecionado
      ↓
preparação no navegador
      ↓
uploadDriverDocument()
      ↓
Supabase Storage
```

Para visualização, o frontend cria URL assinada temporária.

O código atual solicita URL com validade de 60 segundos.

---

# 14. Galpão / estoque

Coleção:

```text
state.entradasGalpao
```

Tabela:

```text
warehouse_entries
```

O estoque disponível é calculado por data e, quando aplicável, por empresa:

```text
entradas
-
saídas
=
saldo disponível
```

As rotas e as entradas possuem relação operacional importante.

Algumas RPCs de rota podem criar, remover ou atualizar uma entrada relacionada.

---

# 15. Empresas operacionais

`state.settings.empresas` contém opções utilizadas para rotas.

A lista também pode considerar empresas presentes em recebimentos.

No modelo atual:

```text
empresa
= empresa despachante dentro da mesma operação
```

O estoque pode ser calculado separadamente por empresa.

Isso não equivale a multi-tenancy.

O README atual define que clientes diferentes devem usar projetos Supabase separados.

---

# 16. Dashboard

O Dashboard calcula indicadores a partir do estado carregado.

Exemplos:

- entregadores ativos;
- pacotes em saída;
- entregues;
- retornados;
- valor total;
- rotas do dia.

A implementação atual filtra `state.routes` pela data atual no navegador.

---

# 17. Histórico

O Histórico trabalha sobre `state.routes`.

Ele realiza no navegador:

- busca textual;
- ordenação;
- exibição;
- edição;
- exclusão;
- exportação.

A arquitetura atual não usa paginação de Histórico no servidor.

Mesmo com `loadAllRows()`, esse módulo é candidato prioritário para paginação futura.

---

# 18. Fechamento semanal

O fechamento semanal seleciona rotas com:

```text
status = "Fechado"
```

dentro do intervalo escolhido.

Os dados são agrupados por entregador/empresa e usados para resumos e detalhes.

---

# 19. Fechamento quinzenal e pagamentos

O frontend contém lógica própria para:

- intervalo quinzenal;
- recebimentos;
- rotas pagas;
- rotas pendentes;
- valores;
- seleção/marcação de pagamentos.

Essas regras atualmente ficam no mesmo `app.js`.

Por envolver valores financeiros, devem ser extraídas somente com testes de equivalência.

---

# 20. Funcionários

O sistema possui suporte a:

```text
employees
```

No frontend, a coleção correspondente é:

```text
state.funcionarios
```

O carregamento é realizado apenas para administrador.

O cadastro e atualização passam atualmente por `saveState()`.

---

# 21. Configurações

Tabela:

```text
app_settings
```

Registro esperado pelo frontend:

```text
id = "system"
```

O `payload` contém configurações compartilhadas.

Campos observados no estado inicial:

```text
empresa
operador
valorPacote
empresas
valoresVeiculo
```

Somente admin persiste alterações de configurações através de `saveState()`.

---

# 22. Pontos de acoplamento importantes

## `app.js`

Atualmente concentra dezenas de funções e múltiplos domínios.

Risco:

Uma mudança em uma função compartilhada pode afetar várias páginas.

## `state`

Grande parte das páginas depende de dados globais.

Risco:

Separar uma página sem mapear dependências pode produzir telas inconsistentes.

## `payload`

Os registros persistem estruturas de objeto dentro de `payload`.

Risco:

Renomear campos dentro desses objetos pode quebrar dados históricos sem erro explícito de schema.

## RPCs

Criação/fechamento/edição de rota dependem de comportamento no banco.

Risco:

O frontend não contém todas as regras de negócio.

---

# 23. Direção arquitetural futura

Sem necessidade de reescrever a aplicação, a direção recomendada é:

```text
HTML
 ↓
js/pages/<pagina>.js
 ↓
js/services/<dominio>.service.js
 ↓
Supabase
```

Com utilitários:

```text
js/utils/
```

e componentes comuns:

```text
js/components/
```

A migração deve ocorrer por etapas e manter compatibilidade durante a transição.

---

# 24. Próximo gargalo de escala

O problema dos 1000 registros foi resolvido por paginação de carregamento.

O próximo gargalo provável é diferente:

```text
muitos registros no banco
        ↓
loadState carrega todos
        ↓
mais memória
        ↓
mais tempo de rede
        ↓
mais renderização/filtragem local
```

A solução de longo prazo é fazer consultas específicas por módulo/período e paginação real no Histórico, não aumentar indefinidamente o tamanho do estado global.
