-- 0000 — Extensões base
-- PostGIS: pesquisa geográfica por raio (índice GIST).
-- pg_cron: jobs de safety-net (timeouts de pools, limpeza) — Fases 3/4.
create extension if not exists postgis with schema extensions;
create extension if not exists pg_cron;

-- Verificação rápida (correr manualmente): select postgis_version();
