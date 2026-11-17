# Deploy e validação

## Escopo

Este documento registra um processo seguro para testar e publicar alterações do RMSLogis.

O provedor de hospedagem de produção não é determinado pelo código do repositório. Portanto, comandos específicos de Vercel, Netlify, GitHub Pages ou outro serviço não são assumidos aqui.

---

# 1. Princípio

O sistema está em uso real.

Nenhuma alteração deve ser tratada como concluída apenas porque o código "parece correto".

Fluxo recomendado:

```text
alteração local
    ↓
revisão do diff
    ↓
teste local
    ↓
teste dos fluxos afetados
    ↓
commit
    ↓
push
    ↓
deploy
    ↓
smoke test em produção
```

---

# 2. Antes de começar

Verificar estado do repositório:

```bash
git status
```

Identificar a branch atual:

```bash
git branch --show-current
```

Evitar misturar mudanças não relacionadas no mesmo commit.

---

# 3. Antes do commit

Executar:

```bash
git diff --check
```

Revisar:

```bash
git diff
```

Confirmar:

- nenhum segredo foi adicionado;
- nenhum arquivo fora do escopo foi alterado;
- nenhuma chave `service_role` foi incluída;
- nenhuma configuração privada foi exposta;
- nenhuma alteração de banco foi embutida sem migration.

---

# 4. Testes mínimos de frontend

## Login

Testar:

- login válido;
- sessão existente;
- logout;
- redirecionamento de página protegida.

## Admin

Testar pelo menos:

- Dashboard;
- Entregadores;
- Nova Saída;
- Fechamento;
- Histórico;
- Relatório Diário;
- Fechamento Semanal;
- Fechamento Quinzenal;
- Pagamentos;
- Funcionários;
- Configurações.

## Operador

Confirmar que o menu permanece limitado a:

- Dashboard;
- Entregadores;
- Nova Saída;
- Fechamento.

Testar também que operações permitidas continuam funcionando.

---

# 5. Teste crítico de Nova Saída

Antes de deploy de mudanças em rotas:

1. selecionar entregador;
2. selecionar empresa;
3. confirmar valor unitário;
4. informar quantidade válida;
5. registrar saída;
6. confirmar mensagem de sucesso;
7. confirmar que aparece em "Saídas em aberto";
8. atualizar a página;
9. confirmar que continua aparecendo;
10. verificar o registro no Supabase.

---

# 6. Teste crítico de Fechamento

1. selecionar rota aberta;
2. informar retornados válidos;
3. informar desconto, quando aplicável;
4. fechar;
5. confirmar que deixa de ser rota aberta;
6. confirmar que aparece como fechada;
7. conferir Dashboard;
8. conferir Histórico;
9. conferir entrada de galpão relacionada quando houver;
10. conferir valores.

---

# 7. Teste do Histórico

Verificar:

- quantidade de registros;
- busca;
- ordenação;
- edição;
- exclusão autorizada;
- exportação.

## Regressão histórica importante

O sistema já atingiu mais de 1000 registros em `routes`.

Após alterações em `loadState()` ou `supabase-client.js`, testar explicitamente que registros acima da primeira faixa de 1000 continuam sendo carregados.

A presença de `loadAllRows()` deve ser preservada até que o sistema use consultas por página/período.

---

# 8. Testes financeiros

Mudanças que afetem:

- `routeTotal`;
- desconto;
- entregues;
- retornados;
- pagamento;
- recebimentos;
- fechamento semanal;
- fechamento quinzenal;

devem ser comparadas com casos conhecidos antes/depois.

Nunca aceitar pequenas diferenças de valor como "erro de arredondamento" sem investigar.

---

# 9. Teste de documentos

Para alterações em Entregadores/Storage:

- upload de documento;
- leitura do caminho salvo;
- geração de URL assinada;
- abertura do documento;
- substituição;
- remoção do arquivo antigo quando aplicável.

Não usar dados pessoais reais em testes públicos.

---

# 10. Mudanças somente de documentação

Para alterações somente `.md`:

```bash
git diff --check
```

é suficiente como verificação técnica básica, além da revisão manual.

Não é necessário executar testes operacionais se nenhum código mudou.

---

# 11. Mudanças no Supabase

Alteração de frontend e alteração de banco devem, preferencialmente, ser separadas.

Antes de qualquer mudança de banco:

- criar SQL em `supabase/migrations/`;
- revisar impacto;
- confirmar dependências no frontend;
- confirmar estratégia de recuperação;
- verificar backup adequado;
- aplicar somente no ambiente autorizado;
- validar a migration antes do deploy dependente dela.

Não alterar produção automaticamente pelo Codex.

---

# 12. Ordem para mudança banco + frontend

Quando o frontend depender de nova estrutura de banco, preferir compatibilidade progressiva.

Exemplo:

```text
1. migration compatível com código antigo
2. verificar banco
3. publicar frontend novo
4. validar
5. somente depois remover compatibilidade antiga
```

Evitar:

```text
migration destrutiva
        ↓
frontend ainda antigo
        ↓
sistema indisponível
```

---

# 13. Commits

Preferir commits pequenos e descritivos.

Exemplos:

```text
docs: document current architecture
fix: paginate Supabase state loading
refactor: extract date utilities
refactor: isolate history rendering
perf: paginate history queries
db: add route query indexes
```

Não combinar documentação, refatoração extensa e migration estrutural no mesmo commit.

---

# 14. Depois do deploy

Realizar smoke test curto em produção:

```text
login
dashboard
nova saída
histórico
```

Se o deploy afetar fechamento/pagamento, testar esses módulos também.

Verificar console do navegador para erros inesperados.

---

# 15. Rollback

## Frontend

Quando possível:

- identificar commit anterior funcional;
- reverter o commit problemático ou redeployar versão conhecida;
- evitar editar arquivos diretamente em produção.

## Banco

Rollback de banco exige cuidado.

Não executar SQL inverso improvisado em produção.

Usar:

- migration corretiva revisada;
- backup/restauração quando realmente necessário;
- validação dos dados afetados.

---

# 16. Checklist resumido

```text
[ ] git status revisado
[ ] diff revisado
[ ] git diff --check sem erro
[ ] nenhum segredo adicionado
[ ] testes do módulo alterado concluídos
[ ] admin verificado quando aplicável
[ ] operador verificado quando aplicável
[ ] Supabase validado quando aplicável
[ ] regressão >1000 registros considerada
[ ] commit pequeno
[ ] push/deploy somente após aprovação
[ ] smoke test após deploy
```
