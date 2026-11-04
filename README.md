<div align="center">

# Capítulo Professor Carvalho Neves Nº 500

### Portal institucional e sistema integrado de gestão

Plataforma digital para apresentar a história do Capítulo, aproximar a comunidade e apoiar suas atividades administrativas.

<br>

![Status](https://img.shields.io/badge/status-em_desenvolvimento-yellow)
![Frontend](https://img.shields.io/badge/frontend-Next.js-black?logo=next.js)
![Backend](https://img.shields.io/badge/backend-Supabase-3FCF8E?logo=supabase)
![Database](https://img.shields.io/badge/database-PostgreSQL-4169E1?logo=postgresql)

</div>

---

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
  - [Portal público](#portal-público)
  - [Área restrita](#área-restrita)
- [Perfis e permissões](#perfis-e-permissões)
- [Tecnologias](#tecnologias)
- [Arquitetura da aplicação](#arquitetura-da-aplicação)
- [Banco de dados](#banco-de-dados)
- [Padronização das gestões](#padronização-das-gestões)
- [Histórico de gestões](#histórico-de-gestões)
- [Equipe e colaboração](#equipe-e-colaboração)

---

## Sobre o projeto

O **Capítulo Professor Carvalho Neves Nº 500** está desenvolvendo uma plataforma web que reúne sua presença institucional e ferramentas de gestão em um único ambiente.

A solução está dividida em duas partes:

| Área | Descrição |
|---|---|
| **Portal público** | Site institucional aberto à comunidade, pais, responsáveis e possíveis candidatos. |
| **Sistema interno** | Área autenticada para apoiar as rotinas administrativas, financeiras e secretariais do Capítulo. |

O sistema interno adota o modelo **RBAC (Role-Based Access Control)**, no qual as permissões são definidas de acordo com a função de cada usuário.

## Funcionalidades

### Portal público

- **Início:** apresentação institucional, atividades recentes e chamada para novos candidatos.
- **História:** biografia do patrono, Prof. Carvalho Neves, e marcos históricos do Capítulo.
- **Ordem DeMolay:** apresentação dos princípios, das Sete Virtudes Cardeais, dos requisitos de ingresso e de informações institucionais.
- **Galeria de gestões:** histórico das gestões com insígnias oficiais dos cargos, priorizando a privacidade dos membros.
- **Contato:** formulário para envio de mensagens ao Mestre Conselheiro (MC) e ao Presidente do Conselho Consultivo (PCC).

### Área restrita

Ambiente autenticado destinado aos membros autorizados, com módulos específicos para cada responsabilidade.

#### Painel Master / Admin

**Acesso:** Mestre Conselheiro e Presidente do Conselho Consultivo.

- Gestão global de usuários, cargos, permissões e módulos.
- Alternador **“Ver como Membro”**, para visualizar a interface de um membro comum sem encerrar a sessão administrativa.
- Indicadores gerais de frequência e sessões do ano.
- Calendário de eventos e ranking de assiduidade.
- Fila de moderação de mídias, relatos e publicações do portal.
- Gestão do acervo de documentos oficiais, como regimento interno, atas e planejamento anual.

#### Tesouraria

- Busca de membros por nome ou ID.
- Consulta individual de débitos e parcelas pendentes.
- Matriz de mensalidades por membro e mês, com os estados **Pago**, **Pendente** e **Isento**.
- Configuração dos valores de mensalidade por categoria.
- Regras de cobrança considerando a data de iniciação e a transição para Sênior aos 21 anos.
- Emissão de comprovantes de quitação em PDF, com hash de verificação de autenticidade.
- Registro de auditoria das alterações financeiras, identificando responsável, data e horário.

#### Secretaria e frequência

- Registro digital de presença em sessões ordinárias e extraordinárias.
- Registro de frequência presencial ou justificada.
- Consulta de assiduidade por membro, com ID, cargo e percentual.
- Cálculo de elegibilidade conforme os critérios definidos para voto e candidatura a cargos eletivos.
- Redação, publicação e armazenamento de atas.

#### Quadro de membros

- Cadastro com ID, nome completo, categoria, data de nascimento e data de iniciação.
- Edição de dados cadastrais.
- Inativação de membros com registro da justificativa.
- Preservação do histórico financeiro e de frequência após a inativação.

#### Perfil do membro

- Consulta ao histórico individual de presença.
- Consulta ao extrato financeiro pessoal.
- Contagem regressiva para a maioridade DeMolay, com alerta de transição para Sênior.
- Download do próprio comprovante de quitação em PDF.

## Perfis e permissões

O controle de acesso é organizado em quatro perfis, associados às responsabilidades de cada cargo.

| Perfil | Cargos / usuários | Permissões principais |
|---|---|---|
| **Master / Admin** | Mestre Conselheiro e Presidente do Conselho Consultivo | Acesso a todos os módulos, alternador “Ver como Membro”, moderação de mídias, gestão de usuários e auditoria global. |
| **Tesouraria** | Tesoureiro e Tesoureiro Adjunto | Dashboard financeiro, busca de membros, baixa manual de mensalidades, recibos em PDF e alteração de taxas. |
| **Secretaria** | Escrivão | Chamada digital, cálculo de assiduidade e elegibilidade, publicação de atas e gestão cadastral. |
| **Membro / Consultor** | DeMolays Ativos, Maçons e Seniores | Consulta ao próprio histórico de frequência e mensalidades, download do próprio recibo e acesso ao acervo público. |

## Tecnologias

| Camada | Tecnologias |
|---|---|
| **Frontend** | Next.js, React, Tailwind CSS e Lucide Icons |
| **Backend e autenticação** | Supabase e Supabase Auth |
| **Banco de dados** | PostgreSQL |
| **Segurança de dados** | Row Level Security (RLS) |
| **Armazenamento** | Supabase Storage |
| **Documentos PDF** | jspdf e html2pdf.js |
| **Hospedagem** | Vercel (frontend) e Supabase Cloud (backend e banco de dados) |

## Arquitetura da aplicação

Visão lógica dos principais ambientes e módulos previstos para a plataforma:

~~~text
Capítulo Professor Carvalho Neves Nº 500
│
├── Portal Público
│   ├── Início
│   ├── História
│   ├── Ordem DeMolay
│   ├── Galeria de Gestões
│   └── Contato
│
└── Área Restrita
    ├── Painel Master / Admin
    ├── Módulo da Tesouraria
    ├── Módulo da Secretaria
    ├── Quadro de Membros
    └── Perfil do Membro
~~~

## Banco de dados

O banco de dados utiliza **PostgreSQL**, disponibilizado pelo Supabase. O esquema inicial contempla duas estruturas principais:

- **profiles:** dados cadastrais, identificação e nível de acesso dos usuários.
- **monthly_payments:** registros de mensalidades, incluindo competência, valor, situação e responsável pela última atualização.

### Esquema SQL inicial

~~~sql
-- Perfis de usuários
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  cid VARCHAR(20) UNIQUE NOT NULL,
  full_name TEXT NOT NULL,

  member_type VARCHAR(20)
    CHECK (member_type IN ('demolay', 'macom')),

  role VARCHAR(20)
    CHECK (role IN ('master', 'tesoureiro', 'escrivao', 'membro')),

  birth_date DATE NOT NULL,
  initiation_date DATE NOT NULL,

  status VARCHAR(20) DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'desligado', 'senior'))
);

-- Mensalidades
CREATE TABLE monthly_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),

  year INT NOT NULL,
  month INT CHECK (month BETWEEN 1 AND 12),

  status VARCHAR(20)
    CHECK (status IN ('pago', 'pendente', 'isento')),

  amount DECIMAL(10,2),

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);
~~~

> **Nota:** este é o esquema inicial. As políticas de Row Level Security (RLS), as validações e as demais tabelas deverão ser definidas e implementadas conforme a evolução dos módulos.

## Padronização das gestões

Todas as referências às gestões no sistema, na galeria, nos documentos e nas atas devem seguir o padrão:

**Gestão [Algarismo Romano] — MC [Nome Completo] ([Ano].[Semestre])**

Exemplo: **Gestão XXIII — MC João Guilherme Martins Lopes Monteiro (2025.2)**

## Histórico de gestões

| Gestão | Mestre Conselheiro | Período |
|:---:|---|:---:|
| I / II | Tiago Moreira | 2012.1 / 2012.2 |
| III | Diógenes Quaresma | 2013.1 |
| IV | Arthur Cerqueira | 2013.2 |
| V | Victor Barros | 2014.1 |
| VI | Marcelo Negreiros Júnior | 2014.2 |
| VII | Renandro Reis | 2015.1 |
| VIII | Itamar Filho | 2015.2 |
| IX | Ericles Guerra | 2016.1 |
| X | Cleilson Almeida | 2016.2 |
| XI | Breno Correia | 2017.1 |
| XII | Rafael Rocha | 2017.2 |
| XIII | Ezequias Júnior | 2018.1 |
| XIV | Tomaz Neto | 2018.2 |
| XV | Gustavo Vilarinho | 2019.1 |
| XVI | Vinícius Linhares | 2019.2 |
| XVII | Gabriel Dias | 2020.1 |
| XVIII | Wesley de Sousa Pinheiro de Abreu | 2023.1 |
| XIX | Caio Carvalho Fonseca Lima | 2023.2 |
| XX | Wesley de Sousa Pinheiro de Abreu | 2024.1 |
| XXI | Fábio Anicácio Brito Correia | 2024.2 |
| XXII | Epaminondas Coutinho Feitosa Júnior | 2025.1 |
| XXIII | João Guilherme Martins Lopes Monteiro | 2025.2 |
| XXIV | José Keltton Cardoso da Silva Viana | 2026.1 |
| XXV | Rafael Inácio do Nascimento de Morais | 2026.2 |

## Equipe e colaboração

### Desenvolvedores

| Desenvolvedor | Atuação |
|---|---|
| **João Guilherme** | Desenvolvedor Full Stack |
| **Airton** | Desenvolvedor Full Stack |

### Organização das branches

O repositório utiliza três branches para separar o desenvolvimento individual da versão estável:

| Branch | Responsável / finalidade |
|---|---|
| **main** | Versão estável de produção. |
| **dev_joao** | Ambiente de desenvolvimento de João Guilherme. |
| **dev_airton** | Ambiente de desenvolvimento de Airton. |

As funcionalidades são desenvolvidas nas branches individuais e integradas à **main** após revisão e validação.

---

<div align="center">

**Capítulo Professor Carvalho Neves Nº 500**

Portal institucional e sistema integrado de gestão.

</div>
