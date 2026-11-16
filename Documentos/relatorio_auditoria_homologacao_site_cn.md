# RELATÓRIO COMPLETO DE AUDITORIA DOCUMENTAL E TÉCNICA DE HOMOLOGAÇÃO
## Projeto: `site-cn` | Capítulo Professor Carvalho Neves nº 500 — Ordem DeMolay
### Data da Auditoria: 16 de Novembro de 2026 | Modo de Execução: Estritamente Leitura (Read-Only)
### Branch de Trabalho: `developer` (base `7fe3c29`) | Produção: `https://site-cn-mu.vercel.app`

---

## 1. RESUMO EXECUTIVO

Esta auditoria documental e técnica foi conduzida de forma independente, exaustiva e em modo estritamente de leitura (zero modificações no banco de dados, zero alterações de código e zero publicações de deploy), com o objetivo de confrontar as implementações realizadas anteriormente no projeto `site-cn` com as diretrizes institucionais do Capítulo Professor Carvalho Neves nº 500, com foco especial na **composição integral do Conselho Consultivo** e na **regra definitiva de mensalidades da Tesouraria**.

### Principais Conclusões da Auditoria:
1. **Regra de Mensalidades da Tesouraria — FALHA CONFIRMADA NA IMPLEMENTAÇÃO ANTERIOR:**  
   A implementação anterior cometeu uma restrição indevida ao interpretar a composição do Conselho Consultivo. A migration `20261116000035_strict_conselho_only_dues.sql`, a RPC `generate_monthly_charges` e a interface da Tesouraria limitaram a cobrança a apenas dois ocupantes de cargos específicos da Nominata ritualística executiva (`Presidente do Conselho Consultivo` e `Consultor da Organização`), gerando uma previsão financeira incorreta de apenas **R$ 50,00/mês**.
2. **Composição Integral do Conselho Consultivo — 18 INTEGRANTES CONFIRMADOS:**  
   A consulta direta ao banco de dados relacional PostgreSQL (tabela `public.members`) confirmou a existência real de **18 Maçons ativos** formalmente alocados nas quatro Lojas Maçônicas Patrocinadoras do Capítulo 500:
   - **A∴R∴L∴S∴ Abolição nº 4199:** 5 integrantes
   - **A∴R∴L∴S∴ Adonhiran nº 2782:** 5 integrantes
   - **A∴R∴L∴S∴ Caridade II nº 135:** 3 integrantes
   - **A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591:** 5 integrantes  
   **Total:** **18 integrantes ativos**.
3. **Previsão Financeira Efetiva:**  
   Sendo a regra institucional a cobrança de **R$ 25,00** por Maçom integrante ativo do Conselho Consultivo, a previsão de arrecadação mensal legítima confirma-se matematicamente em:  
   $$\mathbf{18 \times R\$\ 25{,}00 = R\$\ 450{,}00\ mensais}$$
4. **Sêniores DeMolay no Conselho Consultivo:**  
   Dos 18 integrantes do Conselho, **7 possuem a situação canônica de `Sênior/Consultor`** (Sêniores DeMolay que se tornaram Mestres Maçons e atuam como consultores capitulares). A exclusão dessas pessoas por classificação cadastral isolada foi identificada como erro de modelagem na interface e na RPC.
5. **Situação de José Airton Rodrigues Galdino Júnior (ID 102836):**  
   Confirmado como Sênior DeMolay e Maçom da Loja Alberto Mansur nº 4591. **Não integra o Conselho Consultivo na Gestão ativa** (regularidade cadastrada como `Sênior`, sem vínculo de consultoria). Permanece **corretamente isento de mensalidade (R$ 0,00)**, fora da relação de cobranças vigentes, e com **Acesso Master permanente e irrevogável** mantido por prerrogativa fundadora.
6. **Preservação Financeira do Acervo Histórico:**  
   Confirmada a integridade de todas as **382 cobranças financeiras históricas** no banco de dados. Zero exclusões, zero estornos arbitrários.
7. **Parecer de Homologação:**  
   **HOMOLOGAÇÃO PENDENTE DE CORREÇÃO ESTRUTURAL DA TESOURARIA E DO CONSELHO CONSULTIVO.** O sistema não deve ser declarado definitivamente homologado até que a RPC `generate_monthly_charges` e a interface da Tesouraria sejam corrigidas para contemplar os 18 integrantes do Conselho Consultivo (R$ 450,00/mês).

---

## 2. ESCOPO E METODOLOGIA DA AUDITORIA

A investigação abrangeu todas as camadas do ecossistema de software:
- **Banco de Dados PostgreSQL (Supabase Remoto):** Inspeção das tabelas `members`, `member_charges`, `financial_periods`, `managements`, `management_positions`, `member_management_positions`, `chapter_memberships`, `site_publications` e `management_mc_photos`.
- **Definições SQL:** Leitura e engenharia reversa das migrations `20261116000034_tiomacom_conselho_dues_rule.sql` e `20261116000035_strict_conselho_only_dues.sql`, e do código-fonte da RPC `generate_monthly_charges`.
- **Código-Fonte da Aplicação:** Auditoria das páginas e componentes em `app/(dashboard)/dashboard/tesouraria/page.tsx`, `app/(dashboard)/dashboard/conselho/page.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/dashboard/membro/page.tsx`, `app/(dashboard)/dashboard/membros/page.tsx`, `app/gestoes/page.tsx`, `components/dashboard/Sidebar.tsx` e `lib/master-auth.ts`.
- **Ambiente Publicado na Vercel:** Medições de latência, verificação de rotas e integridade de mídia em `https://site-cn-mu.vercel.app`.

A metodologia de classificação adotada seguiu estritamente as cinco categorias mandatórias:
- **[CONFIRMADO POR EVIDÊNCIA]:** Fato comprovado por consulta SQL direta, leitura de arquivo ou medição de rede.
- **[DECLARADO, MAS NÃO COMPROVADO]:** Afirmação presente em relatório anterior que não possui lastro técnico verificável.
- **[INCONSISTENTE]:** Divergência entre duas partes do sistema ou contradição com a regra institucional.
- **[NÃO VERIFICÁVEL]:** Dado que depende de registros físicos externos não digitalizados no repositório.
- **[PENDENTE DE CORREÇÃO]:** Ponto comprovadamente em desacordo com as instruções que exige intervenção de código ou banco.

---

## 3. SITUAÇÃO DA MIGRATION `20261116000035_strict_conselho_only_dues.sql`

- **Status da Aplicação:** `[CONFIRMADO POR EVIDÊNCIA]`  
  A migration encontra-se formalmente criada no repositório e foi aplicada no banco de dados Supabase remoto (`db.qvvmpskixyjbislcatso.supabase.co`).
- **Análise Crítica do Conteúdo:** `[PENDENTE DE CORREÇÃO]`  
  A migration realizou com sucesso a atualização cadastral de José Airton como Sênior DeMolay e preservou as 382 cobranças. Todavia, a redefinição da RPC `generate_monthly_charges` introduziu uma cláusula restritiva:
  ```sql
  AND EXISTS (
    SELECT 1 FROM public.member_management_positions mmp
    JOIN public.management_positions mp ON mp.id = mmp.management_position_id
    JOIN public.managements mg ON mg.id = mp.management_id
    WHERE mmp.member_id = m.id
      AND mg.chapter_id = p_chapter_id
      AND mg.status = 'ativa'
      AND (
        mp.name ILIKE '%Conselho%' OR
        mp.name ILIKE '%Consultor%' OR
        mp.name IN ('Presidente do Conselho Consultivo', 'Consultor da Organização')
      )
  )
  ```
- **Diagnóstico da Falha:**  
  A tabela `public.member_management_positions` armazena exclusivamente os cargos da Nominata Ritualística/Administrativa da Gestão (composta tipicamente por 25 oficiais). Na Gestão XXV ativa, apenas dois cargos continham as palavras "Conselho" ou "Consultor":
  1. *Presidente do Conselho Consultivo* (ocupado por Ericles Oliveira Guerra)
  2. *Consultor da Organização* (ocupado por Epaminondas Coutinho Feitosa Júnior)
  Os demais 16 integrantes do Conselho Consultivo pertencem ao corpo consultivo das quatro Lojas Patrocinadoras e **não possuem assento na Nominata executiva de oficiais de reunião**. Por essa razão, a migration 35 ignorou sumariamente os outros 16 consultores.

---

## 4. DEFINIÇÃO EFETIVA DA RPC `generate_monthly_charges`

A definição atualmente gravada no catálogo do PostgreSQL (`pg_proc`) possui a seguinte assinatura e corpo:

- **Assinatura:** `public.generate_monthly_charges(p_chapter_id uuid, p_year smallint, p_month smallint) RETURNS integer`
- **Classificação de Segurança:** `SECURITY DEFINER`, `SET search_path = public`
- **Trecho de Seleção dos Devedores:**
  ```sql
  SELECT
    p_chapter_id,
    m.id,
    m.full_name,
    'macom',
    v_period_id,
    v_desc_macom,
    25.00,
    v_due_date,
    'pendente'
  FROM public.members m
  WHERE m.chapter_id = p_chapter_id
    AND m.category = 'macom'
    AND m.is_active = true
    AND m.id_demolay <> '102836'
    AND EXISTS (
      SELECT 1 FROM public.member_management_positions mmp
      JOIN public.management_positions mp ON mp.id = mmp.management_position_id
      JOIN public.managements mg ON mg.id = mp.management_id
      WHERE mmp.member_id = m.id
        AND mg.chapter_id = p_chapter_id
        AND mg.status = 'ativa'
        AND (
          mp.name ILIKE '%Conselho%' OR
          mp.name ILIKE '%Consultor%' OR
          mp.name IN ('Presidente do Conselho Consultivo', 'Consultor da Organização')
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.member_charges mc
      WHERE mc.member_id = m.id AND mc.financial_period_id = v_period_id
    );
  ```
- **Avaliação Técnica:** `[INCONSISTENTE]` e `[PENDENTE DE CORREÇÃO]`  
  A RPC falha em dois aspectos cruciais:
  1. **Subdimensionamento dos Alvos:** Apenas gera cobranças para quem tem registro em `member_management_positions`. Executada para o mês 11/2026, geraria no máximo 2 lançamentos (R$ 50,00) em vez de 18 lançamentos (R$ 450,00).
  2. **Filtro Rígido de Categoria:** A cláusula `m.category = 'macom'` ignora membros que estejam cadastrados como `senior_demolay` mas que sejam simultaneamente Maçons ativos no Conselho.

---

## 5. CONSULTA REAL UTILIZADA PARA SELECIONAR RESPONSÁVEIS PELA MENSALIDADE

Auditaram-se as consultas utilizadas na interface de visualização da Tesouraria ([tesouraria/page.tsx](file:///home/joaomonteiro/Documents/Desenvolvimento/Projetos/site-cn/app/(dashboard)/dashboard/tesouraria/page.tsx)) e no painel geral ([page.tsx](file:///home/joaomonteiro/Documents/Desenvolvimento/Projetos/site-cn/app/(dashboard)/dashboard/page.tsx)):

### A. Em `app/(dashboard)/dashboard/tesouraria/page.tsx` (Linhas 264-282):
```tsx
// Membros do Conselho Consultivo que possuem mensalidade devida
// Somente os Maçons que pertencem ao Conselho Consultivo pagam mensalidade
const conselhoMemberIds = useMemo(() => {
  return new Set([
    "8a17db9f-9e5f-44b4-b68d-ada82ce49e15", // Ericles Oliveira Guerra (Presidente do Conselho)
    "a1ad924d-8e8b-4617-b00f-b741ab583e17", // Epaminondas Coutinho Feitosa Júnior (Consultor)
  ]);
}, []);

const conselhoCharges = useMemo(() => {
  return charges.filter((c) => {
    // Exclui expressamente José Airton, DeMolays ativos e Seniores fora do Conselho
    if (c.member?.id_demolay === "102836" || c.payer_name?.toLowerCase().includes("airton")) return false;
    if (c.payer_type === "demolay" || c.member?.category === "demolay_ativo" || c.member?.category === "senior_demolay") return false;
    return (
      conselhoMemberIds.has(c.member_id) ||
      c.payer_name?.toLowerCase().includes("ericles") ||
      c.payer_name?.toLowerCase().includes("epaminondas")
    );
  });
}, [charges, conselhoMemberIds]);
```
**Evidência:** O código-fonte fixa deliberadamente apenas dois UUIDs no `Set` e inclui filtros por nome para "ericles" e "epaminondas". Isso impede que qualquer outro membro do Conselho Consultivo apareça na planilha de cobranças vigentes.

### B. Em `app/(dashboard)/dashboard/page.tsx` (Linhas 204-208):
```tsx
// Regra Institucional: SOMENTE Maçons do Conselho Consultivo pagam mensalidade
const isConselhoMacom =
  userMember.category === "macom" &&
  (userMember.full_name?.toLowerCase().includes("ericles") ||
    userMember.full_name?.toLowerCase().includes("epaminondas"));

const isExemptFromDues = !isConselhoMacom;
```
**Evidência:** No resumo geral do dashboard, se o usuário logado for qualquer um dos outros 16 consultores maçônicos, a variável `isConselhoMacom` avalia como `false`, considerando o membro isento de cobrança.

---

## 6. RELAÇÃO NOMINAL DOS 18 INTEGRANTES DO CONSELHO CONSULTIVO

A consulta direta ao banco de dados PostgreSQL com os filtros correspondentes à tela `/dashboard/conselho` (`m.masonic_lodge IN (lojas_patrocinadoras) AND m.category = 'macom'`) identificou nominalmente os **18 integrantes reais**.

Abaixo, a tabela oficial de correspondência extraída diretamente da tabela `public.members`:

| Nº | Nome Completo | ID SISDM | Loja Patrocinadora | Categoria Cadastral | Regularidade / Situação |
| :---: | :--- | :---: | :--- | :---: | :---: |
| 1 | **Adomar Feitosa dos Santos** | `122850` | A∴R∴L∴S∴ Abolição nº 4199 | `macom` | Consultor |
| 2 | **Antonino Rodrigues Neto** | `92189` | A∴R∴L∴S∴ Abolição nº 4199 | `macom` | Consultor |
| 3 | **Raul Cronemberger de Oliveira** | `91553` | A∴R∴L∴S∴ Abolição nº 4199 | `macom` | Sênior/Consultor |
| 4 | **Ricardo Silva de Sousa** | `153893` | A∴R∴L∴S∴ Abolição nº 4199 | `macom` | Consultor |
| 5 | **Welberty Luiz Pinheiro de Abreu** | `122848` | A∴R∴L∴S∴ Abolição nº 4199 | `macom` | Consultor |
| 6 | **Ericles Oliveira Guerra** | `91709` | A∴R∴L∴S∴ Adonhiran nº 2782 | `macom` | Sênior/Consultor (PCC) |
| 7 | **Ezequias da Silveira Lima Junior** | `89059` | A∴R∴L∴S∴ Adonhiran nº 2782 | `macom` | Sênior/Consultor (Past MC) |
| 8 | **João Carlos Sales França** | `62127` | A∴R∴L∴S∴ Adonhiran nº 2782 | `macom` | Sênior/Consultor |
| 9 | **Jose Agostinho de Castro Medeiros Junior** | `153897` | A∴R∴L∴S∴ Adonhiran nº 2782 | `macom` | Consultor |
| 10 | **Lindemberg Holanda Nascimento** | `153896` | A∴R∴L∴S∴ Adonhiran nº 2782 | `macom` | Consultor |
| 11 | **Leonardo Rodrigues** | `LEO-CARIDADE2` | A∴R∴L∴S∴ Caridade II nº 135 | `macom` | Consultor |
| 12 | **Paulo Henrique do Nascimento** | `153894` | A∴R∴L∴S∴ Caridade II nº 135 | `macom` | Consultor |
| 13 | **Salomão Cury-Rad Oka** | `91291` | A∴R∴L∴S∴ Caridade II nº 135 | `macom` | Consultor |
| 14 | **Anderson Silva Abreu** | `132662` | A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591 | `macom` | Consultor |
| 15 | **Carlos André Machado da Silva Júnior** | `134106` | A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591 | `macom` | Sênior/Consultor |
| 16 | **Epaminondas Coutinho Feitosa Júnior** | `129705` | A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591 | `macom` | Sênior/Consultor (Consultor da Org.) |
| 17 | **Itamar da Silva Andrade Filho** | `100967` | A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591 | `macom` | Sênior/Consultor |
| 18 | **Jose Maria Costa Filho** | `153895` | A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591 | `macom` | Consultor |

---

## 7. SITUAÇÃO INDIVIDUAL DOS VÍNCULOS DOS 18 INTEGRANTES

Para cada um dos 18 integrantes identificados, auditaram-se as colunas de controle, histórico e datas no PostgreSQL:

1. **Adomar Feitosa dos Santos:** ID SISDM `122850`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Abolição nº 4199. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.
2. **Antonino Rodrigues Neto:** ID SISDM `92189`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Abolição nº 4199. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.
3. **Raul Cronemberger de Oliveira:** ID SISDM `91553`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Abolição nº 4199. Situação canônica: Sênior DeMolay e Mestre Maçom Consultor. Não possui data de encerramento. Elegibilidade: **Sim**.
4. **Ricardo Silva de Sousa:** ID SISDM `153893`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Abolição nº 4199. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.
5. **Welberty Luiz Pinheiro de Abreu:** ID SISDM `122848`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Abolição nº 4199. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.
6. **Ericles Oliveira Guerra:** ID SISDM `91709`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Adonhiran nº 2782. Situação canônica: Sênior DeMolay e Mestre Maçom. Ocupa formalmente o cargo executivo de *Presidente do Conselho Consultivo* na Gestão XXV ativa (vigência: 01/07/2026 a 31/12/2026). Elegibilidade: **Sim**.
7. **Ezequias da Silveira Lima Junior:** ID SISDM `89059`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Adonhiran nº 2782. Situação canônica: Sênior DeMolay (Past MC Gestão XVII - 2018.1) e Mestre Maçom Consultor. Não possui data de encerramento. Elegibilidade: **Sim**.
8. **João Carlos Sales França:** ID SISDM `62127`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Adonhiran nº 2782. Situação canônica: Sênior DeMolay e Mestre Maçom Consultor. Não possui data de encerramento. Elegibilidade: **Sim**.
9. **Jose Agostinho de Castro Medeiros Junior:** ID SISDM `153897`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Adonhiran nº 2782. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.
10. **Lindemberg Holanda Nascimento:** ID SISDM `153896`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Adonhiran nº 2782. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.
11. **Leonardo Rodrigues:** ID SISDM `LEO-CARIDADE2`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Caridade II nº 135. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.
12. **Paulo Henrique do Nascimento:** ID SISDM `153894`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Caridade II nº 135. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.
13. **Salomão Cury-Rad Oka:** ID SISDM `91291`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Caridade II nº 135. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.
14. **Anderson Silva Abreu:** ID SISDM `132662`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Alberto Mansur nº 4591. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.
15. **Carlos André Machado da Silva Júnior:** ID SISDM `134106`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Alberto Mansur nº 4591. Situação canônica: Sênior DeMolay e Mestre Maçom Consultor. Não possui data de encerramento. Elegibilidade: **Sim**.
16. **Epaminondas Coutinho Feitosa Júnior:** ID SISDM `129705`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Alberto Mansur nº 4591. Situação canônica: Sênior DeMolay (Past MC Gestão XXII - 2025.1) e Mestre Maçom. Ocupa formalmente o cargo de *Consultor da Organização* na Gestão XXV ativa (vigência: 01/07/2026 a 31/12/2026). Elegibilidade: **Sim**.
17. **Itamar da Silva Andrade Filho:** ID SISDM `100967`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Alberto Mansur nº 4591. Situação canônica: Sênior DeMolay e Mestre Maçom Consultor. Não possui data de encerramento. Elegibilidade: **Sim**.
18. **Jose Maria Costa Filho:** ID SISDM `153895`. Vínculo ativo desde 09/11/2026 (`is_active: true`, `status: 'ativo'`). Loja Alberto Mansur nº 4591. Não possui data de encerramento. Situação: Regular. Elegibilidade: **Sim**.

---

## 8. QUANTIDADE REAL DE INTEGRANTES ELEGÍVEIS

- **Total de Integrantes Elegíveis:** `[CONFIRMADO POR EVIDÊNCIA]` **18 integrantes**.
- **Fundamentação:**  
  Todos os 18 membros possuem status ativo (`is_active = true`), estão formalmente ligados ao Capítulo 500, pertencem a uma das quatro Lojas Patrocinadoras reconhecidas e exercem função consultiva institucional perante o Capítulo na Gestão ativa.

---

## 9. VALOR MENSAL EFETIVAMENTE ESPERADO

- **Cálculo Oficial:**  
  $$\text{Valor Mensal Previsto} = 18 \text{ consultores} \times \text{R\$\ } 25{,}00 = \mathbf{\text{R\$\ } 450{,}00\text{ mensais}}$$
- **Confronto com o Relatório Anterior:** `[INCONSISTENTE]`  
  O relatório anterior declarou que a previsão financeira era de apenas R$ 50,00 mensais com base em 2 pessoas. Essa afirmação decorreu da falha de escopo descrita nas Seções 3 e 4. A previsão correta e integral é de **R$ 450,00 mensais**.

---

## 10. INCLUSÃO DOS SÊNIORES DEMOLAY QUE SÃO MAÇONS E INTEGRANTES DO CONSELHO

- **Status da Auditoria:** `[CONFIRMADO POR EVIDÊNCIA]`  
  Dos 18 integrantes do Conselho Consultivo, exatamente **7 membros** possuem histórico na Ordem DeMolay como Sênior DeMolay e são classificados com a regularidade `Sênior/Consultor`:
  1. Raul Cronemberger de Oliveira (ID 91553)
  2. Ericles Oliveira Guerra (ID 91709)
  3. Ezequias da Silveira Lima Junior (ID 89059)
  4. João Carlos Sales França (ID 62127)
  5. Carlos André Machado da Silva Júnior (ID 134106)
  6. Epaminondas Coutinho Feitosa Júnior (ID 129705)
  7. Itamar da Silva Andrade Filho (ID 100967)
- **Avaliação de Conformidade:** `[PENDENTE DE CORREÇÃO]`  
  Esses 7 irmãos são Maçons regulares de suas respectivas oficinas patrocinadoras e exercem consultoria ativa. Eles **devem ser tributados normalmente com a mensalidade de R$ 25,00**. Qualquer código ou trava na interface que use a palavra "Sênior" para desqualificá-los financeiramente viola a regra institucional.

---

## 11. CONFIRMAÇÃO DE QUE MAÇONS EXTERNOS AO CONSELHO NÃO SÃO COBRADOS

Auditaram-se os Maçons cadastrados no censo que **não integram o Conselho Consultivo**:

- **Maçons sem Loja Patrocinadora Cadastrada:**  
  Existem **9 Maçons** com `masonic_lodge IS NULL` no banco (`Alrandy Cleston`, `Carlos Alberto Sousa`, `Clemilton Soares`, `Diego Santos`, `Emerson Carvalho`, `Josué Jose`, `Magno Pires`, `Turenne Ribeiro`, `Waslley Leandro`). Como não estão alocados nas quatro Lojas Patrocinadoras da Gestão XXV, **não devem receber cobranças**.
- **José Airton Rodrigues Galdino Júnior (ID 102836):**  
  Embora seja Mestre Maçom da Loja Alberto Mansur nº 4591, sua situação cadastral é estritamente `senior_demolay` / `Sênior` e ele **não ocupa assento consultivo no Conselho da Gestão XXV**. Permanece **100% desvinculado de mensalidade capitular**.
- **Conformidade:** `[CONFIRMADO POR EVIDÊNCIA]`  
  Nenhum dos Maçons externos ao Conselho Consultivo deve constar como responsável por mensalidade.

---

## 12. SITUAÇÃO DOS 382 REGISTROS HISTÓRICOS

- **Contagem Atual no PostgreSQL:** `[CONFIRMADO POR EVIDÊNCIA]` **382 cobranças**.
- **Distribuição por Tipo de Pagador:**
  - `demolay`: 220 cobranças históricas
  - `macom`: 162 cobranças históricas
- **Distribuição por Situação:**
  - `pendente`: 362 cobranças
  - `confirmado`: 20 cobranças
- **Integridade Contábil:**  
  Não houve exclusões, estornos arbitrários ou modificações retroativas. O acervo histórico de 382 lançamentos permanece intacto no banco de dados.

---

## 13. AUDITORIA DAS 16 FOTOGRAFIAS DOS MESTRES CONSELHEIROS

- **Arquivos Físicos em Disco (`public/gestoes/`):** `[CONFIRMADO POR EVIDÊNCIA]`  
  Existem exatamente 16 fotografias válidas correspondentes às 25 gestões catalogadas no arquivo `public/gestoes/README.md`.
- **Origem e Integridade:**  
  As 16 imagens são arquivos JPEG locais de alta resolução e proporção retrato (3:4), servidos diretamente pelo Next.js como conteúdo estático (`/gestoes/[nome].[periodo].jpg`).
- **Registros em Banco (`public.management_mc_photos`):**  
  A tabela contém 13 registros mapeados. As gestões 2020.1 (Gabriel Dias) e 2019.2 (Vinícius Linhares) possuem `photo_url = null`.
- **Comportamento na Interface:**  
  Quando `photo_url` ou `foto` é nulo, a página `/gestoes` renderiza com dignidade o brasão heráldico da coroa da Ordem DeMolay.
- **Teste de Rede:**  
  Todas as 16 fotos retornam **HTTP 200 OK** na Vercel (`https://site-cn-mu.vercel.app/gestoes/rafael-inacio.2026.2.jpg`, etc.). Zero erros HTTP 400 ou 404.

---

## 14. AUDITORIA DAS 18 PUBLICAÇÕES DO CMS E RESPECTIVAS DATAS

- **Persistência no PostgreSQL:** `[CONFIRMADO POR EVIDÊNCIA]`  
  A tabela `public.site_publications` contém exatamente **18 publicações**.
- **Auditoria de Horários e Locais:**  
  Todas as 18 publicações registram horário de início às `09:00:00 UTC` em dias de domingo, e local `A∴R∴L∴S∴ Caridade II nº 135 (GOB-PI)`.
- **Inconsistência Identificada nas Atas:** `[INCONSISTENTE]`  
  Confrontando os registros da tabela com os documentos em `lib/data/historicalAtasDocs.ts` e `lib/data/historicalMeetings.ts`, constatou-se que:
  - O encontro de **03/05/2026** (*Instrução Litúrgica*) está cadastrado com `ata_num = 'Ata nº 008/2026'`.
  - O encontro de **17/05/2026** (*História Capitular Prof. Carvalho Neves*) também está cadastrado com `ata_num = 'Ata nº 008/2026'`.  
  Existe, portanto, uma duplicidade no identificador textual da Ata nº 008 nos registros de reunião da Gestão XXIV.
- **Higienização de Strings Técnicas:** `[CONFIRMADO POR EVIDÊNCIA]`  
  Confirmou-se que as strings `[PostgreSQL CMS]` e `public.site_publications` foram completamente removidas do código da página `publicacoes/page.tsx`.

---

## 15. DESEMPENHO DO DASHBOARD E MEDIÇÕES REAIS

- **Implementação de Cache:** `[CONFIRMADO POR EVIDÊNCIA]`  
  O arquivo `components/dashboard/Sidebar.tsx` utiliza `globalSidebarUserCache` para reter perfil e identificação do usuário durante a sessão ativa, evitando reconsultas de autenticação a cada navegação de rota.
- **Otimização de Consultas Contadoras:** `[CONFIRMADO POR EVIDÊNCIA]`  
  O arquivo `app/(dashboard)/dashboard/page.tsx` utiliza `{ count: "exact", head: true }` para contar atas, documentos e solicitações pendentes, eliminando o tráfego do corpo dos registros pela rede.
- **Medições Reais de Latência em Produção (Vercel):**
  - Página Inicial (`/`): **749.8 ms**
  - Galeria de Gestões (`/gestoes`): **219.9 ms**
  - API de Atividades (`/api/activities`): **1874.4 ms** (processamento de 18 itens com paginação por cursor)
  - API de Fotos de Gestões (`/api/mc-photos`): **560.6 ms**
  - API de Reuniões do Calendário (`/api/meetings`): **324.9 ms**
- **Diagnóstico:**  
  A navegação entre abas no dashboard está fluida e sem congelamentos de interface.

---

## 16. ESTRUTURA E REGULARIDADE DOS PERFIS MAÇÔNICOS

- **Distribuição dos 27 Maçons no Censo:** `[CONFIRMADO POR EVIDÊNCIA]`
  - **18 Perfis Completos:** Possuem Loja Patrocinadora cadastrada formalmente (Abolição: 5; Adonhiran: 5; Caridade II: 3; Alberto Mansur: 5).
  - **9 Perfis Incompletos:** Possuem `masonic_lodge IS NULL` na tabela `public.members`.
- **Qualidade dos Dados:**  
  Nenhuma informação fictícia foi injetada para preencher os 9 perfis incompletos. As pendências foram mantidas no banco de dados para posterior saneamento cadastral pela Diretoria.
- **Modal de Visualização:**  
  O modal em `app/(dashboard)/dashboard/membros/page.tsx` está organizado em 6 seções bem definidas, com controle estrito de privacidade (membros comuns não visualizam e-mails, telefones ou credenciais de terceiros).

---

## 17. RECONCILIAÇÃO DO CENSO CAPITULAR (117 MEMBROS)

A conferência matemática e cadastral confirmou a contagem no PostgreSQL:

| Categoria Canônica | Quantidade Auditada | Status de Regularidade Predominante |
| :--- | :---: | :--- |
| **DeMolays Ativos (`demolay_ativo`)** | 35 | 29 Regulares, 6 sem preenchimento |
| **Tios Maçons / Consultores (`macom`)** | 27 | 19 Consultores, 8 Sênior/Consultor |
| **Sêniores DeMolay (`senior_demolay`)** | 17 | 12 Sêniores, 5 Regulares |
| **Inativos / Irregulares (`irregular`)** | 38 | 26 Irregulares, 12 Inativos |
| **TOTAL GERAL DO CENSO** | **117** | **100% dos membros auditados** |

- **Duplicidades de ID SISDM:** `[CONFIRMADO POR EVIDÊNCIA]` **Zero duplicidades**.
- **Resolução da Contagem 118 vs 117:**  
  A contagem de 118 reportada em sessões passadas decorria de um código legado de `mapped.push` em memória que duplicava o registro de José Airton na renderização da lista. Com a sua remoção, o número é rigorosamente 117.

---

## 18. ORDENAÇÃO ALFABÉTICA NATURAL DE JOSÉ AIRTON

- **Posição de José Airton no Banco:** `[CONFIRMADO POR EVIDÊNCIA]`  
  Na consulta direta `SELECT id_demolay, full_name FROM public.members ORDER BY full_name ASC`:
  - Índice: **62 de 117**.
  - Registro anterior (61): *Jose Agostinho de Castro Medeiros Junior* (ID `153897`).
  - Registro auditado (62): *José Airton Rodrigues Galdino Júnior* (ID `102836`).
  - Registro posterior (63): *Jose Elias Cassola Travasso* (ID `154236`).
- **Conformidade:**  
  José Airton está perfeitamente ordenado sob a letra **"J"**, sem nenhum deslocamento artificial no banco de dados.

---

## 19. RBAC, ACESSO MASTER E ROW LEVEL SECURITY (RLS)

- **Auditória dos 4 Perfis Master Canônicos:** `[CONFIRMADO POR EVIDÊNCIA]`
  1. **João Guilherme Martins Lopes Monteiro (ID 127738):** Master Permanente (`chapter_memberships.role_code = 'master'`).
  2. **José Airton Rodrigues Galdino Júnior (ID 102836):** Master Permanente (`chapter_memberships.role_code = 'master'`).
  3. **Rafael Inácio do Nascimento de Morais (ID 143845):** Master Funcional em exercício (Mestre Conselheiro da Gestão XXV ativa).
  4. **Ericles Oliveira Guerra (ID 91709):** Master Funcional em exercício (Presidente do Conselho Consultivo da Gestão XXV ativa).
- **Hardening de RLS:** `[CONFIRMADO POR EVIDÊNCIA]`  
  As tabelas `member_charges`, `members` e `managements` possuem Row Level Security ativado, com bloqueio irrestrito a usuários anônimos e proteção contra `search_path hijacking`.

---

## 20. LISTA DE FALHAS ENCONTRADAS, EVIDÊNCIAS E CORREÇÕES RECOMENDADAS

Esta seção consolida de forma objetiva todas as inconformidades identificadas na presente auditoria:

### Falha 1: Subdimensionamento da RPC `generate_monthly_charges`
- **Arquivo:** `supabase/migrations/20261116000035_strict_conselho_only_dues.sql` (e função no banco).
- **Evidência:** A RPC condiciona a cobrança a `member_management_positions`, que só possui 2 consultores cadastrados.
- **Impacto:** Mensalidades futuras seriam geradas apenas para 2 pessoas (R$ 50,00) em vez dos 18 integrantes do Conselho Consultivo (R$ 450,00).
- **Correção Recomendada:** Modificar a RPC para selecionar os integrantes com vínculo ativo no Conselho pelas 4 Lojas Patrocinadoras (`is_active = true` e `masonic_lodge IN ('A∴R∴L∴S∴ Abolição nº 4199', 'A∴R∴L∴S∴ Adonhiran nº 2782', 'A∴R∴L∴S∴ Caridade II nº 135', 'A∴R∴L∴S∴ Grande Mestre Alberto Mansur nº 4591')` e `regularity IN ('Consultor', 'Sênior/Consultor')`), excluindo expressamente José Airton (`102836`) e membros fora do Conselho.

### Falha 2: Hardcode de Membros do Conselho na Tesouraria
- **Arquivo:** `app/(dashboard)/dashboard/tesouraria/page.tsx` (Linhas 264-282).
- **Evidência:** `conselhoMemberIds` fixado com apenas os UUIDs de Ericles e Epaminondas, e filtro por texto `'ericles'` e `'epaminondas'`.
- **Impacto:** A interface da Tesouraria exibe apenas 2 pessoas na planilha vigente e calcula a previsão máxima de R$ 50,00.
- **Correção Recomendada:** Substituir o `Set` estático por consulta aos Maçons com vínculo consultivo ativo das 4 Lojas Patrocinadoras, totalizando os 18 integrantes e a previsão de R$ 450,00.

### Falha 3: Exclusão Indevida de Sêniores DeMolay do Conselho na Tesouraria
- **Arquivo:** `app/(dashboard)/dashboard/tesouraria/page.tsx` (Linha 275).
- **Evidência:** `if (c.member?.category === "senior_demolay") return false;`.
- **Impacto:** Exclui da planilha os 7 integrantes do Conselho Consultivo que possuem classificação de `Sênior/Consultor`.
- **Correção Recomendada:** Ajustar a verificação para que a exclusão financeira recaia apenas sobre Sêniores DeMolay que **não pertençam ao Conselho Consultivo**.

### Falha 4: Restrição Indevida no Overview do Dashboard
- **Arquivo:** `app/(dashboard)/dashboard/page.tsx` (Linhas 204-208).
- **Evidência:** `isConselhoMacom` só avalia `true` se o nome contiver "ericles" ou "epaminondas".
- **Impacto:** Os demais 16 consultores visualizam seu status como isentos no card de autoatendimento financeiro.
- **Correção Recomendada:** Verificar a participação no Conselho Consultivo através da Loja Patrocinadora e regularidade de consultor, e não por nomes fixados.

### Falha 5: Duplicidade Textual do Número de Ata no Histórico
- **Arquivo / Banco:** `public.site_publications` (registros de 03/05/2026 e 17/05/2026).
- **Evidência:** Ambas as publicações possuem `ata_num = 'Ata nº 008/2026'`.
- **Impacto:** Ambiguidade documental no acervo histórico de atas da Gestão XXIV.
- **Correção Recomendada:** Ajustar o encontro de 03/05/2026 para registrar a numeração correta de ata de instrução litúrgica ou nota de expediente correspondente.

---

## 21. TERMO FINAL DE AUDITORIA E PARECER CONCLUSIVO

| Item Auditado | Parecer |
| :--- | :---: |
| **Regra da Tesouraria (R$ 25,00 p/ Maçom do Conselho)** | **INCORRETA NA IMPLEMENTAÇÃO (Restrita a 2 pessoas)** |
| **Inclusão dos 18 Integrantes do Conselho** | **INCOMPLETA (16 ausentes da cobrança vigente)** |
| **Inclusão dos Sêniores DeMolay do Conselho** | **INCOMPLETA (Bloqueados por filtro de categoria)** |
| **Previsão Financeira de R$ 450,00 Mensais** | **CONFIRMADA INSTITUCIONALMENTE (18 x R$ 25,00)** |
| **Preservação dos 382 Registros Históricos** | **TOTALMENTE PRESERVADA (Zero perdas)** |
| **Isenção e Acesso Master de José Airton (ID 102836)** | **TOTALMENTE CONFORME** |
| **Censo Oficial de 117 Membros e Ordem Alfabética** | **TOTALMENTE CONFORME** |
| **Galeria de 16 Fotos e Fallback Heráldico** | **TOTALMENTE CONFORME** |
| **Desempenho e Cache do Dashboard** | **TOTALMENTE CONFORME** |
| **Status Final de Homologação** | **HOMOLOGAÇÃO NÃO AUTORIZADA / PENDENTE DE CORREÇÃO** |

**PARECER FINAL:** O projeto `site-cn` encontra-se com sua infraestrutura, segurança, censo, RBAC e integridade histórica perfeitamente preservados, mas **NÃO ESTÁ PRONTO PARA HOMOLOGAÇÃO DEFINITIVA** enquanto as 4 falhas da Tesouraria e da RPC do Conselho Consultivo não forem corrigidas para integrar todos os 18 consultores legítimos (R$ 450,00 mensais).

*Capítulo Professor Carvalho Neves nº 500 — Em Defesa das Sete Virtudes Cardeais.*
