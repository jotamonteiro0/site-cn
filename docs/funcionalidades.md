# Rastreio de Funcionalidades — Sistema Carvalho Neves Nº 500

| Funcionalidade | Estado | Detalhes |
|---|---|---|
| **Portal Institucional Público** | ✅ Concluído | Hero com brasão, história, encontros com scroll, galeria de MCs, documentos e contato. |
| **Galeria de Gestões / MCs** | ✅ Concluído | Sincronização automática do README via script de build. |
| **Supabase Auth & ReCAPTCHA** | ✅ Concluído | Google reCAPTCHA v2 com validação no backend, login seguro e isolamento de rotas. |
| **Banco de Dados & RLS** | ✅ Concluído | 13 migrations aplicadas remotamente, 53 tabelas com RLS ativo (100% protegido). |
| **Supabase Storage** | ✅ Concluído | 8 buckets criados e protegidos com políticas RLS para comprovantes, atas e fotos. |
| **Quadro de Membros & Lojas** | ✅ Concluído | 116 membros (35 DeMolays ativos, 27 Tios Maçons com filiação, 16 sêniores, 38 irregulares). |
| **Calendário, Sessões & Chamada** | ✅ Concluído | Reuniões, chamada em tempo real com presença/falta/justificativa, registro de maçons visitantes. |
| **Tesouraria Operacional por Mês** | ✅ Concluído | DeMolay R$ 22, Maçom R$ 25, vencimento dia 28, baixas manuais, estornos, filtros e métricas. |
| **Autoatendimento do Membro** | ✅ Concluído | Assiduidade pessoal com filtro de datas, RSVP para sessões, minhas mensalidades, maioridade. |
| **Gestões & Nominata (RBAC Sync)** | ✅ Concluído | Nominata da Gestão XXV (22 oficiais) e transmissão automática de papéis (master, escrivão, tesoureiro). |
| **Emissão de Declarações Oficiais** | ✅ Concluído | Certidão de Quitação e Frequência com código autenticador único (`CN-DECL-XXXXXXXX`). |
| **InfinitePay Webhook** | ✅ Concluído | Rota `/api/webhooks/infinitepay` implementada no Next.js para conciliação automática. |
| **Solicitações & Ouvidoria** | ✅ Concluído | Protocolos `CN-XXXXX` direcionados ao MC/PCC, Escrivão ou Tesoureiro. |
