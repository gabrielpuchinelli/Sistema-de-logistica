# Banco de dados e integração Supabase

## Escopo

Este documento registra o que pode ser identificado pelo frontend e pelo README atual.

Ele **não substitui** um dump de schema ou a inspeção direta do projeto Supabase.

Itens de DDL, RLS, triggers e implementação SQL que não aparecem no repositório são marcados como não confirmados.

---

# 1. Plataforma

Backend atual:

```text
Supabase
├── Auth
├── PostgreSQL
├── PostgREST
├── RPC
└── Storage
```

Biblioteca no frontend:

```text
@supabase/supabase-js v2
```

carregada por CDN nas páginas.

---

# 2. Tabelas observadas

## `profiles`

Uso conhecido:

- relacionar usuário autenticado a um papel;
- consulta por `id = auth user id`;
- campo lido pelo frontend: `role`.

Exemplo conceitual:

```text
profiles
├── id
└── role
```

Detalhes não confirmados:

- tipo exato de `id`;
- constraints;
- timestamps;
- RLS;
- trigger de criação.

O README informa que novos usuários recebem papel `operador` através de um trigger chamado `create_profile_for_user`.

A implementação SQL desse trigger não está versionada no repositório atual.

---

## `drivers`

Finalidade:

Dados operacionais/públicos dos entregadores.

Formato usado pelo frontend:

```text
id
payload
```

O `payload` público exclui os campos classificados como privados.

Campos operacionais observados incluem, entre outros:

```text
nome
telefone
veiculo
status
```

Detalhes exatos do schema não estão versionados.

---

## `driver_private`

Finalidade:

Dados privados dos entregadores.

Formato lido:

```text
id
payload
```

Campos privados tratados pelo frontend:

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

Carregamento desses dados:

```text
admin → sim
operador → não através de loadState()
```

Algumas operações de cadastro/edição usam RPCs específicas.

RLS e políticas do Storage precisam ser confirmadas diretamente no Supabase.

---

## `routes`

Finalidade:

Saídas/rotas dos entregadores.

Formato carregado:

```text
id
payload
```

O objeto de rota observado no frontend pode conter:

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
dataPagamento
edicoes
```

Nem todos os campos estão necessariamente presentes em todos os registros.

Estados observados:

```text
status:
- Aberto
- Fechado

pagamento:
- Pendente
- Pago
```

A criação e alterações relevantes usam RPCs.

---

## `warehouse_entries`

Finalidade:

Entradas/movimentação de pacotes no galpão.

Formato observado:

```text
id
payload
route_id
```

`route_id` é preenchido por `saveState()` quando `payload.routeId` existe.

Campos observados no uso do frontend incluem:

```text
id
data
empresa
quantidade
routeId
```

O schema completo não está versionado.

---

## `receipts`

Finalidade:

Recebimentos e informações usadas nos fechamentos financeiros.

Formato:

```text
id
payload
```

O frontend utiliza pelo menos:

```text
data
empresa
valor
```

O formato completo precisa ser confirmado com os registros/regras reais.

---

## `app_settings`

Finalidade:

Configuração global da aplicação.

Registro consultado:

```text
id = "system"
```

Formato:

```text
id
payload
```

Campos observados no estado:

```text
empresa
operador
valorPacote
empresas
valoresVeiculo
```

`valoresVeiculo` possui chaves operacionais como:

```text
moto
carro
van
```

---

## `employees`

Finalidade:

Cadastro de funcionários.

Formato observado:

```text
id
payload
```

O carregamento é feito apenas para `admin`.

O frontend manipula a coleção como:

```text
state.funcionarios
```

O README principal ainda não lista essa tabela na tabela de estruturas principais, mas o código atual a utiliza.

---

# 3. Carregamento de dados

Coleções principais mapeadas no `supabase-client.js`:

```text
drivers          → state.drivers
routes           → state.routes
warehouse_entries→ state.entradasGalpao
receipts         → state.recebimentos
```

Também:

```text
app_settings     → state.settings
driver_private   → mesclado em drivers para admin
employees        → state.funcionarios para admin
```

---

# 4. Paginação

O cliente atual possui:

```text
loadAllRows(table, columns)
```

Estratégia:

```text
pageSize = 1000
.order("id")
.range(from, from + pageSize - 1)
```

O carregamento continua até a consulta retornar menos de 1000 registros.

Isso existe para evitar carregamento parcial quando uma tabela ultrapassa o limite padrão de resposta.

---

# 5. Escrita genérica com `saveState()`

`saveState()` compara os dados atuais com snapshots.

Fluxo:

```text
state
 ↓
map para rows
 ↓
comparação JSON com snapshot
 ↓
somente registros alterados
 ↓
upsert(..., { onConflict: "id" })
```

Snapshots:

```text
recordSnapshots
privateDriverSnapshots
settingsSnapshot
```

A função utiliza `writeQueue` para serializar gravações.

Importante:

O comportamento de `saveState()` é parte da consistência atual do frontend e não deve ser substituído sem análise.

---

# 6. Regras específicas para operador

No `saveState()` existe tratamento específico para operador.

O código atual evita a persistência genérica de algumas coleções por operador:

```text
routes
entradasGalpao
```

Essas operações críticas utilizam RPCs específicas.

Isso reduz o risco de um operador gravar o estado completo dessas estruturas por `upsert` genérico.

---

# 7. RPCs observadas

## `create_route`

Chamada:

```text
create_route(p_route)
```

Uso:

Criar uma nova rota/saída.

Retorno esperado pelo frontend:

Objeto da rota salva.

---

## `close_route`

Chamada:

```text
close_route(
  p_route_id,
  p_returned,
  p_discount
)
```

Retorno esperado:

```text
route
warehouse_entry (opcional)
```

---

## `update_route`

Chamada:

```text
update_route(
  p_route_id,
  p_changes
)
```

Retorno esperado:

```text
route
removed_entry_id (opcional)
warehouse_entry (opcional)
```

---

## `register_driver`

Chamada:

```text
register_driver(
  p_driver,
  p_private
)
```

Objetivo:

Cadastrar entregador separando dados operacionais e privados.

---

## `get_driver_details`

Chamada:

```text
get_driver_details(
  p_driver_id
)
```

Objetivo:

Obter detalhes de um entregador.

---

## `update_driver`

Chamada:

```text
update_driver(
  p_driver
)
```

Objetivo:

Atualizar entregador através de operação controlada no banco.

---

## `register_warehouse_entry`

Chamada:

```text
register_warehouse_entry(
  p_entry
)
```

Objetivo:

Registrar entrada de pacotes.

---

## `update_warehouse_entry`

Chamada:

```text
update_warehouse_entry(
  p_entry_id,
  p_changes
)
```

Objetivo:

Atualizar uma entrada.

Retorno esperado:

```text
entry
```

---

## `delete_warehouse_entry`

Chamada:

```text
delete_warehouse_entry(
  p_entry_id
)
```

Objetivo:

Excluir uma entrada.

---

# 8. Operações diretas observadas

Nem toda operação usa RPC.

Exemplos do cliente atual:

- leitura de tabelas;
- `upsert` de dados alterados;
- exclusão direta de rota por `id`;
- atualização de configurações;
- carregamento de perfis.

A segurança dessas operações depende das políticas RLS.

---

# 9. Storage

Bucket conhecido:

```text
driver-docs
```

Uso:

- documento de identidade;
- comprovante de residência;
- outros caminhos vinculados aos campos do entregador.

Padrão de upload observado:

```text
<driverId>/<tipo>-<timestamp>.<extensão>
```

Visualização:

```text
createSignedUrl(path, 60)
```

Portanto, o frontend espera URLs temporárias de 60 segundos.

---

# 10. Auth

Operações observadas:

```text
getSession()
getUser()
signInWithPassword()
signOut()
```

Após autenticação:

```text
auth user
   ↓
profiles
   ↓
role
```

---

# 11. Empresas x clientes

No banco atual, `empresa` aparece dentro dos dados operacionais.

Ela representa empresas despachantes utilizadas na operação.

Não existe, confirmado pelo código atual, uma tabela de tenants/organizations que isole clientes diferentes dentro do mesmo banco.

O README atual recomenda projeto Supabase separado por cliente.

---

# 12. Itens ainda não versionados/confirmados

Para transformar o banco em infraestrutura reproduzível, ainda precisamos obter do Supabase real:

- DDL completo das tabelas;
- tipos de colunas;
- defaults;
- PKs;
- FKs;
- índices;
- constraints;
- enums;
- triggers;
- funções PostgreSQL;
- código das RPCs;
- políticas RLS;
- grants;
- políticas do Storage;
- configuração do bucket;
- trigger `create_profile_for_user`;
- configuração relevante do Auth.

Nenhum desses itens deve ser reconstruído por adivinhação.

---

# 13. Próximo passo recomendado para o banco

Antes da primeira migration de alteração:

1. extrair um baseline do banco atual;
2. revisar se o baseline contém somente objetos necessários;
3. remover qualquer segredo;
4. documentar o ambiente;
5. só então começar migrations incrementais.

A criação desse baseline deve ser tratada como tarefa separada da refatoração do frontend.
