# Supabase no RMSLogis

## Objetivo desta pasta

Esta pasta passa a ser o local versionado para documentação e futuras mudanças estruturais do Supabase.

Estrutura:

```text
supabase/
├── README.md
└── migrations/
```

A criação desta pasta **não altera o banco atual**.

---

# 1. Estado atual

O frontend utiliza Supabase para:

- autenticação;
- banco PostgreSQL;
- RPCs;
- Storage;
- controle de acesso através de políticas do backend.

Tabelas conhecidas pelo frontend:

```text
profiles
drivers
driver_private
routes
warehouse_entries
receipts
app_settings
employees
```

Bucket conhecido:

```text
driver-docs
```

RPCs conhecidas:

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

---

# 2. Regra para migrations

A partir do momento em que o baseline do banco for documentado, mudanças de schema devem ser versionadas.

Convenção recomendada:

```text
YYYYMMDDHHMMSS_descricao.sql
```

Exemplo:

```text
20261113210000_add_routes_date_index.sql
```

Nunca reutilizar o mesmo timestamp/nome para migrations diferentes.

---

# 3. O que deve virar migration

Exemplos:

- criar tabela;
- adicionar coluna;
- alterar coluna;
- criar índice;
- criar constraint;
- criar trigger;
- criar/alterar função;
- criar/alterar RPC;
- criar/alterar política RLS;
- alterações relevantes de Storage policy.

Mudanças de dados também podem exigir migration quando fizerem parte de uma transformação estrutural controlada.

---

# 4. O que não colocar em migration

Não incluir:

- senhas;
- `service_role`;
- access tokens;
- refresh tokens;
- chaves privadas;
- dados pessoais reais;
- documentos de entregadores;
- dumps de produção com informações pessoais.

---

# 5. Antes da primeira migration de alteração

Ainda falta versionar o baseline real.

Antes de criar uma migration que modifique produção:

1. extrair schema atual do Supabase;
2. listar tabelas/colunas;
3. listar índices;
4. listar constraints;
5. listar triggers;
6. exportar funções/RPCs;
7. listar RLS;
8. listar políticas do Storage;
9. revisar dados sensíveis;
10. registrar o baseline de forma segura.

Não reconstruir esse baseline por suposição a partir do JavaScript.

---

# 6. Aplicação de migrations

O Codex pode:

- escrever a migration;
- revisar dependências;
- explicar impacto;
- sugerir testes.

O Codex não deve aplicar automaticamente uma migration no banco real sem autorização explícita.

Fluxo:

```text
criar SQL
   ↓
revisar
   ↓
git diff
   ↓
validar backup/recuperação
   ↓
aplicar no ambiente autorizado
   ↓
testar
   ↓
commit/push
```

A ordem de commit/aplicação pode variar conforme a estratégia de deploy, mas a migration deve sempre estar versionada.

---

# 7. Compatibilidade

Preferir migrations compatíveis com o frontend atual.

Exemplo seguro:

```text
adicionar nova coluna opcional
        ↓
publicar frontend que passa a usá-la
        ↓
preencher dados/backfill
        ↓
só depois tornar obrigatória, se necessário
```

Evitar renomear/remover campos usados por `payload` sem uma estratégia de transição.

---

# 8. RLS

A chave `anon` é utilizada no frontend.

Por isso, RLS é parte crítica da segurança.

Antes de mudar qualquer policy:

- identificar papel do usuário;
- identificar tabela;
- identificar operação (`select`, `insert`, `update`, `delete`);
- testar admin;
- testar operador;
- confirmar que dados privados não ficaram acessíveis.

A visibilidade de botões no frontend não substitui RLS.

---

# 9. RPCs

Antes de alterar uma RPC existente, verificar:

- nome;
- parâmetros;
- tipos;
- retorno;
- exceções;
- validações;
- políticas/permissões;
- consumidores no frontend.

Exemplo:

`close_route` não é apenas uma atualização visual: o frontend espera que ela possa devolver também uma `warehouse_entry`.

Uma alteração no retorno pode quebrar sincronização de estoque.

---

# 10. Storage

Bucket conhecido:

```text
driver-docs
```

O frontend:

- envia documentos;
- salva caminhos;
- gera URL assinada temporária;
- remove arquivos antigos em alguns fluxos.

Não alterar nome do bucket ou estrutura de caminhos sem migration/plano de compatibilidade para registros existentes.

---

# 11. Próximas tarefas desta pasta

```text
[ ] obter baseline real do schema
[ ] versionar funções/RPCs atuais
[ ] documentar RLS
[ ] documentar Storage policies
[ ] documentar trigger de profiles
[ ] verificar Auth settings relevantes
[ ] só então iniciar migrations incrementais
```
