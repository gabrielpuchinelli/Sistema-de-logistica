# Sistema de Logística

Sistema web para gerenciamento do fluxo de pacotes e entregadores, desenvolvido para simplificar a operação logística, o acompanhamento das entregas e o fechamento dos pagamentos.

A plataforma centraliza informações sobre entregadores, rotas, movimentação de pacotes e recebimentos, permitindo que a operação seja acompanhada de forma mais organizada e reduzindo a necessidade de controles manuais.

O sistema foi desenvolvido com foco em utilização real e possui estrutura preparada para atender diferentes empresas e operações logísticas.

## Funcionalidades

### Dashboard

Painel principal para acompanhamento da operação, permitindo visualizar de forma centralizada as principais informações relacionadas aos entregadores e ao fluxo de pacotes.

### Cadastro de entregadores

Permite cadastrar e gerenciar os entregadores responsáveis pelas rotas e operações de entrega.

### Controle do fluxo de pacotes

Registro e acompanhamento da movimentação dos pacotes dentro da operação logística, facilitando o controle entre entrada, distribuição e entrega.

### Rotas

Organização das rotas utilizadas pelos entregadores, permitindo relacionar a operação diária aos respectivos responsáveis.

### Fechamento financeiro

O sistema permite realizar o fechamento dos valores dos entregadores de acordo com diferentes períodos:

* Fechamento semanal
* Fechamento quinzenal

O objetivo é simplificar a conferência das entregas realizadas e dos valores correspondentes a cada entregador.

### Histórico

Consulta das informações e movimentações anteriores, permitindo acompanhar registros da operação e consultar dados de períodos anteriores.

### Configurações

Área destinada ao gerenciamento das configurações da aplicação e parâmetros utilizados pelo sistema.

## Controle de acesso

O sistema possui diferentes níveis de acesso para garantir que cada usuário tenha acesso somente às funcionalidades necessárias para sua função.

### Operador

O operador possui acesso às funcionalidades relacionadas à operação logística, podendo controlar:

* Fluxo de entregas
* Entregadores
* Rotas
* Registros operacionais

### Administrador

O administrador possui acesso completo ao sistema, incluindo:

* Gerenciamento de usuários
* Configurações
* Entregadores
* Operação logística
* Fechamentos
* Histórico
* Demais funcionalidades administrativas

## Estrutura do banco de dados

O sistema utiliza o Supabase como plataforma de banco de dados e backend.

Principais estruturas utilizadas:

| Tabela              | Finalidade                                                 |
| ------------------- | ---------------------------------------------------------- |
| `profiles`          | Dados e informações dos usuários do sistema                |
| `driver_private`    | Informações privadas dos entregadores                      |
| `drivers`           | Informações públicas utilizadas pela operação              |
| `warehouse_entries` | Registros relacionados à entrada e movimentação de pacotes |
| `routes`            | Informações relacionadas às rotas dos entregadores         |
| `receipts`          | Registros relacionados aos fechamentos e recebimentos      |
| `app_settings`      | Configurações da aplicação                                 |

A separação entre dados públicos e privados dos entregadores também permite uma organização mais adequada das informações e contribui para o controle de acesso aos dados.

## Tecnologias utilizadas

* HTML5
* CSS3
* JavaScript
* Supabase
* PostgreSQL, através do Supabase
* Autenticação e controle de acesso do Supabase

## Arquitetura

O projeto utiliza uma aplicação web integrada ao Supabase.

```text
┌──────────────────────────────┐
│        Aplicação Web         │
│                              │
│       HTML / CSS / JS        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│           Supabase           │
│                              │
│  Autenticação                │
│  Banco de dados              │
│  Controle de acesso          │
│  Persistência dos dados      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Dados da operação      │
│                              │
│  Entregadores                │
│  Pacotes                     │
│  Rotas                       │
│  Fechamentos                 │
│  Histórico                   │
└──────────────────────────────┘
```

## Empresas e clientes

O campo "Empresas para as rotas", em Configurações, é a lista de empresas despachantes de uma mesma operação. Cada saída e cada entrada de pacotes é vinculada a uma dessas empresas, e o estoque do galpão é controlado por empresa.

Para atender clientes diferentes, a recomendação é usar um projeto Supabase separado por cliente, com o mesmo código. O sistema não separa clientes diferentes dentro do mesmo banco de dados.

## Segurança

O sistema utiliza autenticação e controle de acesso para limitar as funcionalidades disponíveis de acordo com o perfil do usuário.

Informações sensíveis não devem ser armazenadas diretamente no código-fonte ou disponibilizadas publicamente no repositório.

As credenciais e configurações privadas do Supabase devem ser mantidas em ambiente seguro.

* O cadastro público do Supabase Auth deve ficar desligado. Novos usuários recebem o papel `operador` por padrão (trigger `create_profile_for_user`).
* A chave `anon` é pública por natureza. As políticas RLS são a proteção real dos dados.
* A chave `service_role` nunca deve ir ao front-end nem ao repositório.

> Nunca publique chaves privadas, tokens, senhas ou outras credenciais no GitHub.

## Como executar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/gabrielpuchinelli/Sistema-de-logistica.git
```

### 2. Acesse a pasta

```bash
cd Sistema-de-logistica
```

### 3. Configure o Supabase

Crie ou utilize um projeto no Supabase e configure:

* Banco de dados
* Autenticação
* Tabelas necessárias
* Políticas de acesso
* Configurações da aplicação

### 4. Configure as credenciais

Adicione as configurações necessárias para conexão com o Supabase no arquivo de configuração utilizado pelo projeto.

Não envie credenciais privadas para o repositório público.

### 5. Execute a aplicação

Como o projeto utiliza HTML, CSS e JavaScript, pode ser executado utilizando um servidor local ou serviço de hospedagem compatível com aplicações web estáticas.

## Fluxo básico da operação

```text
Cadastro / Login
       │
       ▼
    Dashboard
       │
       ▼
Cadastro de Entregadores
       │
       ▼
Controle de Pacotes
       │
       ▼
     Rotas
       │
       ▼
Registro das Entregas
       │
       ▼
Fechamento
       │
       ├── Semanal
       │
       └── Quinzenal
       │
       ▼
    Histórico
```

## Objetivo do projeto

O principal objetivo do Sistema de Logística é substituir controles manuais e descentralizados por uma plataforma única para gerenciamento da operação.

A solução busca facilitar:

* Controle dos entregadores
* Organização das rotas
* Acompanhamento dos pacotes
* Registro das movimentações
* Conferência das entregas
* Cálculo e organização dos pagamentos
* Fechamentos periódicos
* Consulta do histórico operacional

Com isso, a operação pode reduzir tarefas manuais e ter uma visão mais organizada dos dados utilizados no dia a dia.

## Roadmap

Algumas funcionalidades que podem ser incorporadas futuramente:

* [ ] Sistema completo de planos e assinaturas
* [ ] Gestão avançada de múltiplas empresas
* [ ] Relatórios financeiros
* [ ] Exportação de relatórios
* [ ] Indicadores de desempenho dos entregadores
* [ ] Histórico avançado de operações
* [ ] Notificações automáticas
* [ ] Melhorias na gestão de permissões
* [ ] Aplicativo mobile
* [ ] Integrações com outros sistemas logísticos

## Status

**Versão atual: funcional**

O sistema atualmente possui integração com banco de dados através do Supabase e conta com autenticação, controle de usuários, gerenciamento de entregadores, controle operacional, fechamentos e histórico.

O projeto continua em desenvolvimento e novas funcionalidades podem ser adicionadas conforme as necessidades da operação.

## Desenvolvedor

**Gabriel Puchinelli**

Estudante de Análise e Desenvolvimento de Sistemas e desenvolvedor responsável pelo desenvolvimento do projeto.

GitHub: [github.com/gabrielpuchinelli](https://github.com/gabrielpuchinelli)

LinkedIn: [linkedin.com/in/gabriel-puchinelli-578aa13b9](https://www.linkedin.com/in/gabriel-puchinelli-578aa13b9)

---

## Licença

Este projeto é de propriedade de Gabriel Puchinelli.

O código disponibilizado neste repositório não concede automaticamente permissão para comercialização, redistribuição ou utilização comercial do sistema.

Para utilização comercial, entre em contato com o desenvolvedor.
