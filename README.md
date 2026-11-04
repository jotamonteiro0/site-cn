Capítulo Professor Carvalho Neves Nº 500
Site oficial e sistema integrado de gestão do Capítulo DeMolay Professor Carvalho Neves Nº 500.

Sobre o projeto
O projeto consiste no desenvolvimento de uma plataforma web institucional e operacional para o Capítulo Professor Carvalho Neves Nº 500, organizada em duas frentes principais:
1. Portal Público: presença digital institucional voltada à comunidade, aos pais, responsáveis e a novos candidatos. Apresenta os princípios da Ordem DeMolay, a história do Capítulo, a galeria histórica de gestões e um formulário de contato.
2. Sistema Interno (Área Restrita): ambiente autenticado para gestão administrativa, financeira e secretarial, com controle de acesso baseado em funções (RBAC — Role-Based Access Control) e funcionalidades alinhadas ao Regulamento Geral da Ordem DeMolay.
Funcionalidades
Portal público
- Início: banner principal com o emblema oficial, atividades recentes e chamada para novos candidatos.
- História: apresentação da biografia do patrono, Prof. Carvalho Neves, e dos marcos históricos do Capítulo.
- Ordem DeMolay: apresentação dos princípios, das Sete Virtudes Cardeais, dos requisitos de ingresso e de informações institucionais.
- Galeria de gestões: histórico das gestões com insígnias oficiais dos cargos, priorizando a privacidade dos membros.
- Contato: formulário público para envio de mensagens ao Mestre Conselheiro (MC) e ao Presidente do Conselho Consultivo (PCC).
Sistema interno — área restrita
Painel Master / Admin
Destinado ao Mestre Conselheiro e ao Presidente do Conselho Consultivo.
- Acesso global aos módulos, usuários, cargos, permissões e auditoria.
- Alternador de visualização "Ver como Membro", permitindo conferir a interface de um membro comum sem encerrar a sessão administrativa.
- Painel com indicadores de frequência e sessões do ano.
- Calendário de eventos e ranking de assiduidade.
- Fila de moderação de mídias, relatos e publicações do portal.
- Gestão do acervo de documentos oficiais, como regimento interno, atas e planejamento anual.
Módulo da Tesouraria
- Busca de membros por nome ou ID.
- Consulta individual de débitos e parcelas pendentes.
- Matriz de mensalidades por membro e mês, com os estados Pago, Pendente e Isento.
- Configuração dos valores de mensalidade por categoria de membro.
- Regras de cobrança considerando a data de iniciação e a transição para Sênior aos 21 anos.
- Emissão de comprovantes de quitação em PDF, com hash de verificação de autenticidade.
- Registro de auditoria das alterações financeiras, identificando responsável, data e horário.
Módulo do Escrivão e frequência
- Registro digital de presença em sessões ordinárias e extraordinárias.
- Registro de frequência presencial ou justificada.
- Consulta de assiduidade por membro, com ID, cargo e percentual.
- Cálculo de elegibilidade conforme os critérios definidos para voto e candidatura a cargos eletivos.
- Redação, publicação e armazenamento de atas.
Quadro de membros
- Cadastro de membros com ID, nome completo, categoria, data de nascimento e data de iniciação.
- Edição dos dados cadastrais.
- Inativação de membros com registro da justificativa.
- Preservação do histórico financeiro e de frequência após a inativação.
Perfil do membro
- Consulta ao histórico individual de presença.
- Consulta ao extrato financeiro pessoal.
- Contagem regressiva para a maioridade DeMolay, com alerta de transição para Sênior.
- Download do próprio comprovante de quitação em PDF.
Níveis de acesso e permissões (RBAC)
O sistema prevê quatro perfis de acesso, associados às responsabilidades de cada cargo:
Perfil	Cargos / usuários	Permissões
Master / Admin	Mestre Conselheiro e Presidente do Conselho Consultivo	Acesso a todos os módulos; alternador de visualização ("Ver como Membro"); moderação de mídias; gestão de usuários e auditoria global.
Tesouraria	Tesoureiro e Tesoureiro Adjunto	Dashboard financeiro; busca de membros por nome ou ID; baixa manual de mensalidades; emissão de recibos em PDF e alteração de taxas.
Secretaria	Escrivão	Lançamento de chamadas digitais; cálculo de assiduidade e elegibilidade; publicação de atas e gestão cadastral de membros.
Membro / Consultor	DeMolays Ativos, Maçons e Seniores	Consulta ao próprio extrato de frequência e mensalidades; download do próprio recibo em PDF e visualização do acervo público.


Tecnologias utilizadas
Camada	Tecnologias
Frontend	Next.js, React, Tailwind CSS e Lucide Icons
Backend e banco de dados	Supabase, PostgreSQL, Supabase Auth, Row Level Security (RLS) e Storage
Emissão de documentos	jspdf e html2pdf.js
Hospedagem	Vercel (frontend) e Supabase Cloud (backend e banco de dados)


Estrutura geral do sistema
Capitulo-PCN-500/
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
    ├── Módulo do Escrivão
    ├── Quadro de Membros
    └── Perfil do Membro
Banco de dados
O banco de dados utiliza PostgreSQL, disponibilizado pelo Supabase. A estrutura inicial contempla os perfis dos usuários e o controle de mensalidades.
Tabela profiles
Armazena os dados cadastrais e o nível de acesso de cada usuário.
Tabela monthly_payments
Armazena os registros de mensalidades, incluindo competência, valor, situação e responsável pela última atualização.
Esquema SQL inicial
-- Tabela de perfis de usuários
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

-- Tabela de mensalidades
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
Nota: este é o esquema inicial do banco de dados. As políticas de Row Level Security (RLS) e as demais tabelas deverão ser definidas e implementadas conforme a evolução dos módulos.

Padronização das gestões
Todas as referências às gestões no sistema, na galeria, nos documentos e nas atas devem seguir o padrão:

Gestão [Algarismo Romano] — MC [Nome Completo] ([Ano].[Semestre])

Exemplo: Gestão XXIII — MC João Guilherme Martins Lopes Monteiro (2025.2)
Histórico oficial de gestões
Gestão	Mestre Conselheiro	Período
I / II	Tiago Moreira	2012.1 / 2012.2
III	Diógenes Quaresma	2013.1
IV	Arthur Cerqueira	2013.2
V	Victor Barros	2014.1
VI	Marcelo Negreiros Júnior	2014.2
VII	Renandro Reis	2015.1
VIII	Itamar Filho	2015.2
IX	Ericles Guerra	2016.1
X	Cleilson Almeida	2016.2
XI	Breno Correia	2017.1
XII	Rafael Rocha	2017.2
XIII	Ezequias Júnior	2018.1
XIV	Tomaz Neto	2018.2
XV	Gustavo Vilarinho	2019.1
XVI	Vinícius Linhares	2019.2
XVII	Gabriel Dias	2020.1
XVIII	Wesley de Sousa Pinheiro de Abreu	2023.1
XIX	Caio Carvalho Fonseca Lima	2023.2
XX	Wesley de Sousa Pinheiro de Abreu	2024.1
XXI	Fábio Anicácio Brito Correia	2024.2
XXII	Epaminondas Coutinho Feitosa Júnior	2025.1
XXIII	João Guilherme Martins Lopes Monteiro	2025.2
XXIV	José Keltton Cardoso da Silva Viana	2026.1
XXV	Rafael Inácio do Nascimento de Morais	2026.2


Equipe de desenvolvimento
Desenvolvedor	Atuação
João Guilherme	Desenvolvedor Full Stack
Airton	Desenvolvedor Full Stack


Organização das branches
O repositório utiliza três branches principais para organizar o desenvolvimento e a integração do código:
Branch	Finalidade
main	Versão estável de produção.
dev_joao	Ambiente de desenvolvimento de João Guilherme.
dev_airton	Ambiente de desenvolvimento de Airton.


As funcionalidades são desenvolvidas nas branches individuais e integradas à main após revisão e validação.
<p align="center">
  <strong>Capítulo Professor Carvalho Neves Nº 500</strong><br>
  <sub>Portal institucional e sistema integrado de gestão.</sub>
</p>
