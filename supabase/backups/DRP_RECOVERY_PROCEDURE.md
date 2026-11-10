# Procedimento Operacional Padrão: Backup, Restauração e DRP
**Capítulo Professor Carvalho Neves Nº 500**

Este documento detalha o procedimento auditado para geração de backup lógico e recuperação de desastres (Disaster Recovery Plan - DRP), garantindo integridade referencial, segurança e isolamento institucional.

---

## 1. Inventário de Objetos Estruturais (Schema `public`)

Conforme inventário auditado em `supabase/backups/drp_audit_inventory.json`:
* **58 Entidades**: 56 tabelas relacionais e 2 views (`view_member_birthdays`, `view_member_majority_status`).
* **98 Chaves Estrangeiras (Foreign Keys)**: Garantem integridade referencial estrita entre membros, cobranças, presenças, gestões e atas.
* **47 Políticas RLS (Row Level Security)**: Protegem 100% das tabelas contra acesso anônimo ou cross-tenant.
* **2 Triggers de Sistema**: Atualização automática de `updated_at` e integridade temporal.
* **17 Migrações Versionadas**: De `20261109000000_cn_core` a `20261110000016_performance_indexes_and_rls_initplan`.

---

## 2. Componentes NÃO Contemplados pelo Dump Exclusivo do Schema `public`

Um dump restrito ao schema `public` (`--schema=public`) **não contém**:
1. **Schema `auth` (`auth.users`, `auth.identities`, `auth.sessions`)**:
   * Contém os hashes de senha (bcrypt/argon2), emails confirmados, fatores MFA e tokens de acesso.
   * *Ação de DRP*: O backup de contas de autenticação deve incluir o schema `auth` ou ser exportado via Supabase Management API (`supabase auth users export`).
2. **Schema `storage` e Arquivos Físicos (PDFs e Fotos)**:
   * O schema `storage` contém metadados de buckets (`documents`, `member-photos`).
   * Os arquivos binários reais residem no object store S3 do Supabase, não nos bytes do banco relacional.
   * *Ação de DRP*: Sincronização periódica do bucket S3 via AWS CLI ou script de espelhamento (`aws s3 sync`).
3. **Variáveis de Ambiente e Segredos**:
   * `INFINITEPAY_WEBHOOK_SECRET`, `RECAPTCHA_SECRET_KEY`, chaves de API e tokens residem na Vercel e no painel Supabase.
   * *Ação de DRP*: Manter cofre de segredos institucional cifrado e documentado.

---

## 3. Procedimento Reproduzível de Backup (Exportação)

### A. Dump Estrutural e de Dados via CLI
Execute no terminal local ou servidor de backup:

```bash
# 1. Exportação do Schema Público Completo (DDL + Políticas RLS + Triggers)
npx supabase db dump \
  --remote="postgresql://postgres.qvvmpskixyjbislcatso:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  --schema=public \
  -f supabase/backups/schema_public_$(date +%Y%m%d).sql

# 2. Exportação dos Dados Lógicos (Data-only com integridade referencial)
npx supabase db dump \
  --remote="postgresql://postgres.qvvmpskixyjbislcatso:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  --data-only \
  --use-copy \
  --schema=public \
  -f supabase/backups/data_public_$(date +%Y%m%d).sql
```

---

## 4. Procedimento de Restauração em Ambiente Secundário (Staging/DRP)

> [!CAUTION]
> **NUNCA EXECUTE ESTE PROCEDIMENTO APONTANDO PARA A URI DE PRODUÇÃO.**
> O cluster de destino deve ser uma instância separada (ex.: projeto Supabase `cn-staging` ou container PostgreSQL local).

### Requisitos Prévios:
1. Uma instância secundária do PostgreSQL 15+ ou novo projeto Supabase provisionado.
2. URI de conexão da base secundária: `postgresql://postgres.[staging-ref]:[senha]@[host]:[port]/postgres`.
3. Certifique-se de que as extensões básicas estejam habilitadas (`uuid-ossp`, `pgcrypto`).

### Passo a Passo de Execução:
```bash
# Passo 1: Aplicar migrações estruturais na base de destino
export TARGET_DB="postgresql://postgres.[staging-ref]:[senha]@[host]:6543/postgres"

# Opção A: Via Supabase CLI migrations
npx supabase db push --db-url "$TARGET_DB"

# Opção B: Via Script SQL de DRP
psql "$TARGET_DB" -f supabase/backups/schema_public_*.sql

# Passo 2: Importar os dados institucionais
psql "$TARGET_DB" -f supabase/backups/data_public_*.sql

# Passo 3: Validação da Integridade Pós-Restauração
# Executar a suíte de testes apontando para a base de staging restaurada:
NEXT_PUBLIC_SUPABASE_URL="https://[staging-ref].supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="[staging-service-role-key]" \
npm test
```
