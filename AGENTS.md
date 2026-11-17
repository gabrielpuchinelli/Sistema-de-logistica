# AGENTS.md

## Contexto do projeto

Este repositório contém o **Sistema de Logística (RMSLogis)**, uma aplicação web em uso real para controle operacional de entregadores, rotas, pacotes, fechamentos e pagamentos.

A aplicação atual usa:

- HTML;
- CSS;
- JavaScript no navegador;
- Supabase Auth;
- Supabase/PostgreSQL;
- Supabase Storage;
- RPCs PostgreSQL expostas pelo Supabase.

O sistema deve ser tratado como **aplicação em produção**. Alterações aparentemente pequenas podem afetar rotas, estoque, fechamento, histórico e pagamentos ao mesmo tempo.

## Regra principal

**Analise antes de modificar.**

Antes de alterar uma função compartilhada, identifique:

1. quem chama a função;
2. quais páginas dependem dela;
3. quais estruturas de `state` ela lê ou modifica;
4. quais tabelas, RPCs ou arquivos do Storage são afetados;
5. se o comportamento é diferente para `admin` e `operador`.

Não faça refatorações amplas apenas por preferência estética.

## Fonte da verdade

Em caso de divergência:

1. o comportamento implementado no código atual é a principal referência;
2. o banco real do Supabase é a referência para schema, RPCs, triggers e RLS;
3. a documentação explica o sistema, mas não deve substituir a verificação do código/banco.

Quando algo não puder ser confirmado pelo repositório, marque explicitamente como **não confirmado**.

## Regras para alterações

- Faça mudanças pequenas e independentes.
- Preserve funcionalidades existentes salvo solicitação explícita.
- Não renomeie campos de objetos persistidos sem analisar todos os consumidores.
- Não altere o formato de `payload` sem uma migration e um plano de compatibilidade.
- Não remova validações existentes sem justificar.
- Não silencie erros de gravação.
- Não reestruture arquivos não relacionados à tarefa.
- Não faça formatação massiva de arquivos sem necessidade.
- Não introduza frameworks ou novas dependências sem solicitação explícita.
- Prefira funções pequenas, responsabilidade única e nomes claros.
- Evite duplicação quando a extração puder ser feita sem aumentar o acoplamento.

## Comentários no código

Ao criar ou alterar código, adicione comentários quando eles ajudarem a explicar regras de negócio, decisões importantes ou fluxos que não sejam óbvios.

Os comentários devem ser escritos em português e ser claros para um desenvolvedor em aprendizado.

Priorize comentários para:

- regras de negócio;
- cálculos financeiros;
- manipulação de estoque;
- mudanças de status de rotas;
- diferenças entre admin e operador;
- chamadas importantes ao Supabase;
- RPCs;
- sincronização entre state e banco;
- trechos com comportamento não intuitivo;
- soluções temporárias ou compatibilidade com código legado.

Evite comentários redundantes.

Não faça:

```js
// Soma 1
contador++;

## Supabase e banco de dados

Sem solicitação explícita, **não alterar**:

- schema do banco;
- tabelas;
- colunas;
- índices;
- constraints;
- triggers;
- funções PostgreSQL;
- RPCs;
- políticas RLS;
- configuração de Auth;
- buckets ou políticas do Storage.

Qualquer mudança futura no banco deve ser registrada em `supabase/migrations/`.

Nunca executar uma migration de produção automaticamente. Primeiro:

1. gerar o SQL;
2. revisar o SQL;
3. documentar impacto;
4. verificar backup/restauração aplicáveis;
5. aplicar no ambiente autorizado;
6. testar;
7. registrar a alteração no Git.

## Credenciais e segurança

- Nunca adicionar `service_role` ao frontend.
- Nunca adicionar senhas, tokens privados ou segredos ao Git.
- A chave pública/anon do Supabase não substitui RLS.
- Não logar documentos pessoais, chaves Pix, CPF, CNH, endereço ou outros dados privados sem necessidade.
- O bucket de documentos de entregadores deve continuar sendo tratado como conteúdo privado.
- URLs assinadas devem permanecer temporárias.

## Arquitetura atual que deve ser preservada durante refatorações

As páginas carregam, em linhas gerais:

```text
Supabase JS CDN
        ↓
supabase-config.js
        ↓
supabase-client.js
        ↓
app.js
```

`supabase-client.js` é a camada atual de comunicação com o Supabase.

`app.js` concentra:

- estado da aplicação;
- renderização;
- formulários;
- regras de interface;
- cálculos;
- relatórios;
- exportações;
- chamadas à camada Supabase.

A refatoração deve ser gradual. Não substituir toda a arquitetura de uma vez.

## Paginação de carregamento

O carregamento atual possui `loadAllRows()` para superar o limite de 1000 registros por consulta.

Essa correção deve ser preservada até que uma estratégia de consultas específicas por página substitua o carregamento global.

Ao modificar `loadState()`:

- preservar paginação;
- preservar ordenação determinística;
- preservar `recordSnapshots`;
- preservar `privateDriverSnapshots`;
- preservar tratamento específico de admin;
- verificar tabelas com mais de 1000 registros.

## Estado e snapshots

O sistema mantém dados em memória em `state`.

Estruturas centrais conhecidas:

```text
state.settings
state.user
state.role
state.drivers
state.routes
state.recebimentos
state.entradasGalpao
state.funcionarios
```

`recordSnapshots`, `privateDriverSnapshots` e `settingsSnapshot` evitam gravações desnecessárias.

Não remover ou alterar essa estratégia sem analisar `saveState()` e todos os fluxos de atualização.

## Papéis e permissões

Existem pelo menos dois papéis:

- `admin`
- `operador`

A interface restringe páginas para operador.

Atualmente o operador tem acesso às páginas operacionais:

- Dashboard;
- Entregadores;
- Nova Saída;
- Fechamento.

Não assumir que esconder interface é suficiente para segurança. Permissões reais do banco dependem de RLS/RPCs e devem ser verificadas no Supabase antes de qualquer mudança de segurança.

## Empresas

No sistema atual, `empresa` representa uma empresa despachante/operacional dentro da mesma operação.

Não confundir esse conceito com um cliente/tenant do software.

O repositório atual não implementa isolamento completo de múltiplos clientes dentro do mesmo banco.

## Rotas

Uma rota/saída normalmente possui dados como:

```text
id
data
driverId
empresa
saida
valorPacote
veiculo
observacao
status
entregues
retornados
desconto
pagamento
```

Não alterar esses nomes ou significados sem verificar:

- Dashboard;
- Nova Saída;
- Fechamento;
- Histórico;
- Relatórios;
- Fechamento semanal;
- Fechamento quinzenal;
- Pagamentos;
- estoque do galpão;
- RPCs relacionadas a rotas.

## RPCs conhecidas

O frontend atual usa pelo menos:

```text
create_route
close_route
update_route
register_driver
get_driver_details
update_driver
register_warehouse_entry
update_warehouse_entry
delete_warehouse_entry
```

Não modificar assinatura, parâmetros ou retorno dessas RPCs sem revisar todos os consumidores.

## Processo obrigatório para tarefas do Codex

Para qualquer alteração relevante:

### 1. Analisar

Descrever:

- causa do problema;
- arquivos envolvidos;
- funções envolvidas;
- riscos;
- comportamento esperado.

### 2. Implementar

Fazer a menor alteração suficiente.

### 3. Verificar

Executar, quando aplicável:

```bash
git diff --check
```

E revisar:

```bash
git diff
```

Também realizar testes funcionais relacionados à alteração.

### 4. Relatar

Ao final informar:

- arquivos modificados;
- funções modificadas;
- comportamento anterior;
- comportamento novo;
- testes executados;
- pontos que não puderam ser testados;
- qualquer impacto no Supabase.

## Ações externas

Não fazer sem solicitação explícita:

- `git commit`;
- `git push`;
- merge;
- criação/aplicação de migration no banco;
- deploy;
- exclusão de dados;
- limpeza de Storage;
- alteração de Auth/RLS.

## Critério para considerar uma refatoração segura

Uma refatoração deve manter o mesmo comportamento observável antes e depois.

Quando possível, comparar:

- contagem de registros;
- cálculos;
- filtros;
- valores financeiros;
- estados de rota;
- permissões;
- mensagens de erro;
- dados enviados às RPCs.

Se não for possível provar equivalência, tratar a mudança como alteração funcional e documentá-la.
