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
- [Identidade visual e experiência](#identidade-visual-e-experiência)
  - [Paleta institucional](#paleta-institucional)
  - [Direção visual do portal público](#direção-visual-do-portal-público)
  - [Direção visual da área restrita](#direção-visual-da-área-restrita)
  - [Componentes e interações](#componentes-e-interações)
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

## Identidade visual e experiência

A interface deverá ter uma identidade própria, reconhecível e consistente com o Capítulo. A referência estética é um design institucional contemporâneo, com acabamento elegante, tipografia bem trabalhada, imagens em destaque, transparências e microinterações — sem reproduzir diretamente a identidade visual de outros sites.

A experiência será dividida em duas linguagens complementares:

- **Portal público:** institucional, acolhedor e histórico, com composição editorial, fotografias e predominância do verde.
- **Área restrita:** tecnológica e funcional, com dashboard moderno, painéis translúcidos e efeitos de Glassmorphism aplicados com moderação.

### Paleta institucional

O verde é a cor principal da identidade do Capítulo e deve ter presença predominante em toda a plataforma. O dourado funciona como cor de destaque; branco e tons claros garantem contraste e respiro visual.

| Cor | Código | Aplicação |
|---|---|---|
| **Verde institucional** | `#087443` | Cor principal, botões, links ativos e elementos de identidade. |
| **Verde profundo** | `#064D32` | Cabeçalho, rodapé, fundos escuros e navegação. |
| **Dourado** | `#D9AA45` | Detalhes, divisores, ícones e chamadas de destaque. |
| **Branco** | `#FFFFFF` | Superfícies e áreas de conteúdo. |
| **Verde acinzentado claro** | `#F2F5F1` | Fundos alternativos e cartões em páginas claras. |

**Diretrizes de uso:**

- O verde deve ser imediatamente reconhecível como a cor dominante.
- O dourado deve ser usado com equilíbrio, sem competir com o verde.
- O branco e os tons claros devem manter a leitura confortável.
- Gradientes podem combinar verdes da paleta, sem introduzir cores que descaracterizem a identidade.
- O brasão oficial deve ser preservado: não redesenhar, distorcer, recolorir ou substituir seus elementos.

### Direção visual do portal público

O portal deve transmitir tradição, fraternidade e continuidade histórica com uma apresentação moderna.

- **Cabeçalho:** navegação limpa, brasão original, nome do Capítulo e acesso à área restrita.
- **Destaque inicial (hero):** seção ampla com fotografia institucional, título marcante e chamada para conhecer o Capítulo.
- **História:** linha do tempo visual com datas, gestões e acontecimentos relevantes.
- **Ordem DeMolay:** conteúdo institucional organizado em seções de leitura agradável.
- **Gestões:** cartões com identificação da gestão, período e fotografia ou composição visual correspondente.
- **Galeria:** imagens em grade responsiva, com visualização ampliada.
- **Notícias e atividades:** cartões editoriais para registros e novidades.
- **Contato:** seção objetiva com canais de comunicação.
- **Rodapé:** identificação institucional, navegação complementar e informações relevantes.

A composição deve alternar fundos verde profundo e superfícies claras, usando dourado em pequenos detalhes. Fotografias reais do Capítulo devem ter destaque, sem excesso de elementos decorativos.

### Direção visual da área restrita

A área autenticada terá uma linguagem de dashboard SaaS, com visual mais tecnológico e foco na produtividade.

O conceito principal é o **Glassmorphism**: painéis com transparência, desfoque de fundo, bordas sutis e iluminação discreta. O efeito deve complementar a interface, não prejudicar a leitura.

- **Plano de fundo:** tons escuros de verde, com gradientes suaves.
- **Menu lateral:** navegação persistente, ícones consistentes e indicação clara da seção ativa.
- **Cabeçalho do painel:** título da página, identificação do usuário e ações rápidas.
- **Cards de indicadores:** números em destaque, descrições curtas e ícones.
- **Painéis:** superfícies translúcidas com `backdrop-filter`, bordas discretas e contraste adequado.
- **Gráficos:** visualizações limpas para frequência, movimentação financeira e indicadores administrativos.
- **Tabelas:** leitura objetiva, filtros, busca e estados visuais para registros.
- **Formulários:** campos consistentes, validação clara e mensagens de retorno.
- **Responsividade:** menu adaptável para telas menores, sem perda de funcionalidades.

O Glassmorphism será mais presente no painel administrativo. Não é necessário aplicar transparência em todos os elementos: tabelas, formulários e conteúdos densos devem priorizar legibilidade.

### Componentes e interações

Os elementos visuais devem ser reutilizáveis para manter consistência entre páginas e módulos.

| Componente | Diretriz |
|---|---|
| **Botões** | Estados de hover, foco, carregamento e desabilitado; verde como ação principal. |
| **Cards** | Cantos discretamente arredondados, espaçamento consistente e bordas suaves. |
| **Navegação** | Estado ativo evidente, ícones Lucide e comportamento responsivo. |
| **Modais** | Fundo sobreposto, hierarquia clara e fechamento acessível. |
| **Notificações** | Mensagens objetivas para sucesso, erro e confirmação. |
| **Gráficos** | Legendas, unidades e informações acessíveis, sem excesso de efeitos. |
| **Animações** | Transições curtas e suaves em entradas, menus e interações. |

As animações devem ser discretas e respeitar a preferência do sistema por redução de movimento (`prefers-reduced-motion`). A interface também deve manter contraste, navegação por teclado, foco visível e semântica adequada.

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
| **Frontend** | Next.js, React, Tailwind CSS e Lucide React |
| **Animações** | Framer Motion |
| **Gráficos** | Recharts |
| **Backend e autenticação** | Supabase e Supabase Auth |
| **Banco de dados** | PostgreSQL |
| **Segurança de dados** | Row Level Security (RLS) |
| **Armazenamento** | Supabase Storage |
| **Documentos PDF** | jspdf e html2pdf.js |
| **Hospedagem** | Vercel (frontend) e Supabase Cloud (backend e banco de dados) |

> Framer Motion e Recharts fazem parte da direção técnica prevista para as animações e visualizações do painel. Devem ser adicionados às dependências do projeto quando esses componentes forem implementados.

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
│   ├── Notícias e Atividades
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
