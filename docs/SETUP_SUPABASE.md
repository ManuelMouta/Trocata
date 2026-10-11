# Ligar o Trocata a um Supabase real

Segue estes passos uma vez. Demora ~5 minutos.

## 1. Criar o projecto

1. Vai a <https://supabase.com> → **Sign in** (GitHub/email) → **New project**.
2. Nome: `trocata`. Define uma **Database Password** (guarda-a).
3. Região: **West EU (London)** ou **Frankfurt** (mais perto de PT).
4. Plano: **Free**. Cria e espera ~2 min pelo provisionamento.

## 2. Activar extensões

No dashboard → **Database** → **Extensions**, activa (procura e liga):
- **postgis** (pesquisa geográfica)
- **pg_cron** (jobs — usado nas Fases 3/4)

## 3. Correr o schema

No dashboard → **SQL Editor** → **New query**:
- Abre o ficheiro [`supabase/setup.sql`](../supabase/setup.sql) deste repositório,
  copia **tudo**, cola no editor e carrega em **Run**.
- Deve terminar sem erros. (Se as extensões já estavam activas no passo 2, as
  linhas `create extension` são no-op.)

Confirma no editor:
```sql
select postgis_version();
select count(*) from public.utilizadores;  -- 0
```

## 4. Desligar confirmação de email (MVP)

Dashboard → **Authentication** → **Providers** → **Email** → desliga
**"Confirm email"** (para o wizard de registo em 3 passos não bloquear).
Guarda.

Isto é só para desenvolvimento. Numa versão usada por outras pessoas, deixa a confirmação de email ligada.

## 5. Copiar as chaves para o projecto

Dashboard → **Project Settings** → **API**. Copia:
- **Project URL**
- **anon public** key
- **service_role** key (secreta — só backend)

Cola no ficheiro `.env.local` (na raiz do repositório):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<o-teu-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 6. Semear os cromos placeholder

```bash
npm run seed:cromos   # insere o catálogo de cromos
```

## 7. Testar

```bash
npm run dev
```
Abre <http://localhost:3000> → **Começar a trocar** → percorre os 3 passos.
Confirma no dashboard Supabase (**Table Editor**) que aparecem linhas em
`utilizadores`, `colecao_utilizador` e que `repetidos_cache`/`faltas_cache` se
preenchem ao marcares cromos.

## Base já criada

Se o schema antigo já estava aplicado, corre só
[`supabase/migrations/0009_hardening.sql`](../supabase/migrations/0009_hardening.sql)
no SQL Editor. Sem este passo o perfil autenticado deixa de carregar.
