# Plano de Backup, Continuidade e Recuperação de Desastres (DRP)
## Capítulo Professor Carvalho Neves Nº 500 — Teresina/PI

Este documento estabelece a política e os procedimentos operacionais padrão para salvaguarda, contingência, integridade e recuperação de dados do sistema capitular (`site-cn`).

---

### 1. Estratégia de Backup da Infraestrutura

#### 1.1 Banco de Dados Supabase (PostgreSQL 15+)
- **Backups Automáticos Diários**: O Supabase executa snapshots diários completos retidos pela infraestrutura de nuvem (AWS us-east-1).
- **Point-in-Time Recovery (PITR)**: Suporte a restauração granular para qualquer segundo prévio em planos Pro/Enterprise.
- **Backups Lógicos Manuais (Dump)**: Antes de qualquer alteração estrutural ou troca de gestão capitular semestral, deve-se gerar o dump lógico via Supabase CLI:

```bash
# Exportar esquema completo e dados:
npx supabase db dump --remote="postgresql://postgres.qvvmpskixyjbislcatso:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Exportar apenas dados (seed/registros):
npx supabase db dump --data-only --remote="postgresql://postgres.qvvmpskixyjbislcatso:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f backups/data_only_$(date +%Y%m%d_%H%M%S).sql
```

#### 1.2 Arquivos e Documentos (Supabase Storage)
- Os buckets `documentos`, `declaracoes`, `comprovantes` e `solicitacoes` residem no storage compatível com S3 com redundância multizona.
- Cópias estáticas de Atos, Editais e Atas são mantidas versionadas no repositório Git sob `public/documentos/` e `lib/data/historicalGestaoDocs.ts`, garantindo redundância independente do provedor de nuvem.

---

### 2. Procedimento de Rollback de Migrações

Todas as migrações em `supabase/migrations/` seguem convenção sequencial com timestamp UTC:
`202611..._nome_da_migracao.sql`.

#### Para reverter uma migração:
1. Identifique os objetos criados na migração alvo (tabelas, índices, policies, funções).
2. Crie uma migração de reversão imediata ou execute o script de downgrade correspondente:
```sql
-- Exemplo de reversão de índices de performance (se necessário):
DROP INDEX IF EXISTS public.idx_chapter_memberships_user_id;
DROP INDEX IF EXISTS public.idx_meetings_chapter_starts;
-- etc.
```
3. Valide o esquema com a suíte de testes automatizados:
```bash
npm test
```

---

### 3. Matriz de Resposta a Incidentes (RTO e RPO)

| Incidente | RTO (Tempo de Recuperação) | RPO (Perda Máxima de Dados) | Procedimento de Ação |
| :--- | :--- | :--- | :--- |
| **Queda do Frontend Vercel** | < 5 minutos | 0 minutos | Reversão instantânea do deploy no painel Vercel ou apontamento DNS de emergência. |
| **Corrupção de Tabela Específica** | < 30 minutos | < 24 horas | Restauração da tabela a partir do dump diário via `pg_restore` ou script Node. |
| **Perda Acidental de Registros Financeiros** | < 15 minutos | 0 minutos | Re-sincronização via webhook InfinitePay (`/api/webhooks/infinitepay`) e reemissão dos períodos. |
| **Vazamento de Credencial / Chave** | Imediato (< 10 min) | N/A | Rotação imediata da `SUPABASE_SERVICE_ROLE_KEY` e senhas no painel Supabase e Vercel Environment Variables. |

---

### 4. Responsáveis e Contatos de Emergência
- **Administrador & Mantenedor Técnico**: João Guilherme Martins Lopes Monteiro (ID 127738)
- **Mestre Conselheiro Vigente**: Gestão XXV / XXVI
- **Presidente do Conselho Consultivo (PCC)**: Conselho Consultivo das 4 Lojas Patrocinadoras
