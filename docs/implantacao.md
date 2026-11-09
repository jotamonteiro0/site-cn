# Implantação

## Variáveis necessárias

Copie `.env.example` para `.env.local` e preencha a URL e a chave pública do projeto Supabase. Na Vercel, adicione as mesmas variáveis nos ambientes Preview e Production. `SUPABASE_SERVICE_ROLE_KEY`, se vier a ser necessária para rotas administrativas, é exclusivamente variável de servidor.

## Aplicação da migration

Após autenticar e vincular o projeto correto:

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto-cn>
npx supabase db push
```

Não use `db reset` no projeto remoto. Antes do push, execute `npx supabase db diff` e revise a alteração.

## Estado atual

O repositório possui CLI e migration, mas não há Docker local nem credenciais Supabase configuradas. Portanto, a migration ainda não foi validada por PostgreSQL local nem aplicada remotamente.
