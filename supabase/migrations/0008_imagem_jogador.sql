-- Foto real do jogador (fonte livre de licença — Wikimedia Commons), quando
-- encontrada com confiança suficiente. Nula para escudos/especiais e para
-- jogadores sem foto livre identificada — nesses casos mantém-se o cartão
-- placeholder gerado (ver app/api/cromo-img/[id]/route.tsx).
alter table public.cromos
  add column imagem_url text;
