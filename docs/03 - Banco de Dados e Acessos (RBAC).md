# 03 - Banco de Dados e Acessos (RBAC)

## 1. Níveis de Acesso (RBAC)

Cada usuário autenticado possui uma função (`role`) no sistema que determina o que ele pode visualizar ou alterar:

```mermaid
flowchart TD
    subgraph ROLES["Perfis de Usuários"]
        M["👑 Master / Admin<br><i>(MC e PCC)</i>"]
        T["💰 Tesoureiro<br><i>(Tesouraria)</i>"]
        E["📝 Escrivão<br><i>(Secretaria)</i>"]
        U["👤 Membro Comum<br><i>(Ativos, Seniores e Consultores)</i>"]
    end

    subgraph ACESSO["Permissões"]
        A_ALL["Controle total + Auditoria + Usuários"]
        A_FIN["Lançar e baixar mensalidades + Recibos"]
        A_FREQ["Chamada de sessões + Livro de atas"]
        A_SELF["Visualizar próprio extrato e assiduidade"]
    end

    M --> A_ALL
    M --> A_FIN
    M --> A_FREQ
    M --> A_SELF

    T --> A_FIN
    T --> A_SELF

    E --> A_FREQ
    E --> A_SELF

    U --> A_SELF
```

---

## 2. Estrutura das Tabelas (Schema Inicial)

```mermaid
erDiagram
    profiles ||--o{ monthly_payments : possui
    profiles ||--o{ attendance_records : registra
    sessions ||--o{ attendance_records : contem

    profiles {
        uuid id PK "ID do usuário"
        varchar id_demolay UK "Número ID DeMolay Oficial"
        text full_name "Nome completo"
        varchar role "master | tesoureiro | escrivao | membro"
        varchar member_type "demolay | macom"
        date birth_date "Nascimento"
        date initiation_date "Data de Iniciação"
        varchar status "ativo | senior | desligado"
    }

    monthly_payments {
        uuid id PK
        uuid user_id FK "Referência ao membro"
        int year "Ano de competência"
        int month "Mês (1 a 12)"
        varchar status "pago | pendente | isento"
        decimal amount "Valor da parcela"
        timestamptz updated_at "Data do último registro"
    }

    sessions {
        uuid id PK
        date session_date "Data da sessão"
        varchar session_type "ordinaria | extraordinaria | publica"
        text topic "Tema ou ata"
    }

    attendance_records {
        uuid id PK
        uuid session_id FK "Sessão"
        uuid user_id FK "Membro"
        varchar status "presente | ausente | justificado"
    }
```

---

## 3. Segurança dos Dados (Row Level Security - RLS)

- Ninguém acessa os dados de outro membro a menos que seu perfil permita.
- O membro comum só consegue consultar as suas próprias linhas na tabela de mensalidades e presenças.
- Apenas usuários com `role = 'tesoureiro'` ou `'master'` podem atualizar o status de pagamentos.
