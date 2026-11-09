## 1. Visão geral

O sistema será dividido em duas grandes áreas:

- Site institucional público.
    
- Painel administrativo privado.
    

Ambas utilizarão a mesma infraestrutura, mas terão objetivos e níveis de acesso diferentes.

## 2. Diagrama geral

```
flowchart TB
    A["Capítulo Professor Carvalho Neves nº 500"]

    A --> B["Site institucional público"]
    A --> C["Painel administrativo"]

    B --> D["História e apresentação"]
    B --> E["Gestão atual"]
    B --> F["Notícias e atividades"]
    B --> G["Galeria e contato"]

    C --> H["Dashboard"]
    C --> I["Gestão de membros"]
    C --> J["Financeiro"]
    C --> K["Frequência"]
    C --> L["Reuniões e atividades"]
    C --> M["Documentos"]
    C --> N["Usuários e permissões"]

    B --> O["Backend e serviços"]
    C --> O

    O --> P["Autenticação e autorização"]
    O --> Q["Regras de negócio"]
    O --> R["API"]

    P --> S[("PostgreSQL")]
    Q --> S
    R --> S

    S --> T["Supabase Storage"]
```

## 3. Site institucional

O site será a área pública do Capítulo.

### Páginas

- Página inicial.
    
- História do Capítulo.
    
- Gestão atual.
    
- Notícias e atividades.
    
- Galeria.
    
- Contato.
    

### Responsabilidade

A equipe de desenvolvedores será responsável pela construção, estrutura visual, manutenção e publicação.

O conteúdo público será selecionado e revisado antes de ser divulgado.

## 4. Painel administrativo

O painel será a área privada do sistema.

### Dashboard

- Indicadores gerais.
    
- Próximas reuniões.
    
- Resumo financeiro.
    
- Frequência.
    
- Avisos.
    
- Pendências.
    

### Gestão de membros

- Cadastro.
    
- Atualização de informações.
    
- Histórico.
    
- Cargos e funções.
    

### Financeiro

- Receitas.
    
- Despesas.
    
- Mensalidades.
    
- Pagamentos.
    
- Relatórios.
    

### Frequência

- Registro de presença.
    
- Registro de ausência.
    
- Percentual de frequência.
    
- Histórico.
    

### Reuniões e atividades

- Calendário.
    
- Planejamento.
    
- Cadastro de eventos.
    
- Responsáveis.
    
- Histórico.
    

### Documentos

- Arquivos.
    
- Atas.
    
- Relatórios.
    
- Documentos administrativos.
    

### Usuários e permissões

- Cadastro de usuários.
    
- Perfis de acesso.
    
- Controle de permissões.
    

## 5. Integração entre as áreas

O site poderá utilizar informações do painel, desde que sejam autorizadas para publicação.

Exemplos:

|Informação|Origem|Destino|
|---|---|---|
|Gestão atual|Painel|Site|
|Notícias aprovadas|Painel|Site|
|Eventos públicos|Painel|Site|
|Fotografias autorizadas|Painel|Galeria|
|Financeiro|Painel|Não publicado|
|Dados pessoais|Painel|Não publicados|

## 6. Estrutura técnica

```
site-cn/
│
├── app/
│   ├── public/
│   ├── dashboard/
│   ├── login/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── site/
│   └── dashboard/
│
├── modules/
│   ├── members/
│   ├── finance/
│   ├── attendance/
│   ├── events/
│   └── documents/
│
├── lib/
│   ├── supabase/
│   ├── auth/
│   └── permissions/
│
├── public/
│   └── ...
├── types/
└── ...
```

Essa estrutura é uma referência conceitual. Os desenvolvedores poderão ajustá-la conforme as necessidades técnicas do projeto.

## 7. Tecnologias previstas

- Next.js: aplicação web.
    
- React: interface.
    
- TypeScript: desenvolvimento.
    
- Tailwind CSS: estilização.
    
- Supabase: autenticação e serviços.
    
- PostgreSQL: banco de dados.
    
- Supabase Storage: armazenamento de arquivos.
    

## 8. Segurança

- Login individual.
    
- Controle de permissões.
    
- Separação entre dados públicos e privados.
    
- Proteção de dados pessoais.
    
- Registro de alterações administrativas.
    
- Políticas de acesso no banco de dados.
    
- Backup.
    

## 9. Ordem de desenvolvimento

1. Arquitetura e banco de dados.
    
2. Autenticação e permissões.
    
3. Dashboard.
    
4. Gestão de membros.
    
5. Financeiro.
    
6. Frequência.
    
7. Reuniões e atividades.
    
8. Documentos.
    
9. Site institucional.
    
10. Integração, testes e implantação.
    

## 10. Diretriz principal

O painel administrativo é o núcleo do produto.

O site institucional é um recurso complementar, construído e mantido pela equipe técnica.

A arquitetura deverá permitir que essa primeira implementação seja aproveitada futuramente na plataforma maior, destinada a outros Capítulos DeMolay e Lojas Maçônicas.
