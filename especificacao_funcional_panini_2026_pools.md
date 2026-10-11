# ESPECIFICAÇÃO FUNCIONAL DETALHADA
## Portal de Troca de Cromos — Panini Mundial 2026
### Cenário: Matching em Pools de 4 Pessoas
### Versão: 1.0 | Fase 1
### Data: 07/07/2026

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 Propósito
Plataforma web/mobile-first que permite a coleccionadores de cromos da caderneta oficial Panini do Mundial 2026 (edição Portugal) encontrarem grupos de 4 pessoas na sua zona geográfica para troca eficiente de cromos repetidos, maximizando o número de trocas possíveis entre todos os membros do grupo.

### 1.2 Âmbito da Fase 1 (MVP — Pools)
- Apenas cenário de matching em pools de 4 pessoas
- Apenas território nacional (Portugal Continental, Açores e Madeira)
- Matching baseado em maximização de trocas bidireccionais
- Integração com WhatsApp para agendamento de encontros
- Sem sistema de pagamentos, pontos ou reputação (futuras fases)

### 1.3 Definições e Acrónimos
| Termo | Definição |
|-------|-----------|
| **Pool** | Grupo de 4 utilizadores com match óptimo de cromos |
| **Cromo** | Figurinha individual da caderneta Panini |
| **Repetido** | Cromo que o utilizador possui em duplicado ou mais |
| **Falta** | Cromo que o utilizador não possui na sua colecção |
| **Match Score** | Métrica calculada que quantifica o potencial de troca num pool |
| **Zona** | Área geográfica definida por raio de distância (km) |
| **Sala** | Espaço virtual (link WhatsApp) criado após match bem-sucedido |

---

## 2. PERSONAS

### 2.1 Persona Primária: "O Pai/Mãe Coleccionador"
- **Idade:** 30-50 anos
- **Contexto:** Ajuda o filho a completar a caderneta. Valoriza segurança (encontro em grupo), conveniência e proximidade geográfica.
- **Frustrações:** Não quer encontrar-se sozinho com desconhecidos. Dificuldade em encontrar pessoas com cromos específicos.
- **Objectivos:** Completar a caderneta do filho de forma rápida e segura.

### 2.2 Persona Secundária: "O Coleccionador Adulto"
- **Idade:** 25-45 anos
- **Contexto:** Coleciona por hobby próprio. Organizado, tem lista de repetidos e faltas actualizada.
- **Frustrações:** Perder tempo com trocas desequilibradas. Dificuldade em encontrar pessoas com múltiplos cromos que lhe faltam.
- **Objectivos:** Maximizar eficiência das trocas, completar a caderneta com o mínimo de encontros possível.

---

## 3. ARQUITECTURA DA INFORMAÇÃO

### 3.1 Mapa do Site (Fase 1)
```
├── Landing Page
├── Autenticação
│   ├── Registo (3 passos)
│   └── Login
├── Dashboard (Home autenticada)
│   ├── Minha Colecção
│   │   ├── Gerir Repetidos
│   │   └── Gerir Faltas
│   ├── Procurar Pool
│   │   ├── Configurar Pesquisa
│   │   └── Resultados de Match
│   ├── Pool Activa
│   │   ├── Detalhes do Grupo
│   │   └── Sala WhatsApp
│   └── Perfil
│       ├── Dados Pessoais
│       └── Localização
└── Onboarding (primeiro acesso)
```

### 3.2 Estados do Utilizador
| Estado | Descrição |
|--------|-----------|
| **Novo** | Registado, mas sem cromos registados |
| **Activo** | Com cromos registados, disponível para matching |
| **Em Pool** | Já integrado num pool activo, não disponível para novo matching |
| **Inactivo** | Não entrou há mais de 30 dias |

---

## 4. FLUXOS DE UTILIZADOR DETALHADOS

---

### 4.1 FLUXO 1: REGISTO E ONBOARDING

#### 4.1.1 Ecrã: Landing Page
**URL:** `/`

**Elementos:**
- Hero section com imagem da caderneta Panini 2026
- Headline: "Completa a tua caderneta do Mundial 2026 — em grupo e perto de ti"
- Subheadline: "Encontra 3 pessoas na tua zona com os cromos que precisas. Troca em segurança."
- CTA primário: "Começar a trocar" (leva a registo)
- CTA secundário: "Já tenho conta — Entrar"
- Secção "Como funciona" (3 passos ilustrados)
- Secção de segurança: "Troca em grupo de 4 — mais cromos, mais segurança"

**Regras:**
- Se utilizador já autenticado, redireccionar automaticamente para `/dashboard`

---

#### 4.1.2 Ecrã: Registo — Passo 1 (Dados Pessoais)
**URL:** `/registo/passo-1`

**Campos do formulário:**
| Campo | Tipo | Obrigatório | Validação | UX Notes |
|-------|------|-------------|-----------|----------|
| Nome/Alcunha | Texto | Sim | 2-50 caracteres | Placeholder: "Como queres ser chamado?" |
| Email | Email | Sim | Formato válido, único | Validação em tempo real |
| Palavra-passe | Password | Sim | Mín. 8 chars, 1 maiúscula, 1 número | Indicador de força da password |
| Confirmar Palavra-passe | Password | Sim | Igual ao campo anterior | Validação em tempo real |
| Telemóvel | Tel | Sim | Formato PT (+351 ou 9xxxxxxxx) | Usado para link WhatsApp |

**Acções:**
- Botão "Continuar" (valida e avança)
- Link "Já tenho conta? Entrar"

**Feedback:**
- Erros de validação inline, abaixo de cada campo, com ícone de alerta vermelho
- Sucesso: transição suave para passo 2

---

#### 4.1.3 Ecrã: Registo — Passo 2 (Localização)
**URL:** `/registo/passo-2`

**Objectivo:** Definir zona de preferência para encontros de troca.

**Elementos:**
- Título: "Onde queres trocar cromos?"
- Subtítulo: "Vamos procurar pessoas perto de ti."
- Campo de pesquisa: "Procurar localidade" (autocomplete com localidades de Portugal)
- Mapa interativo (Leaflet/Mapbox) centrado em Portugal
- Marcador arrastável para ajuste fino da localização
- Slider de raio: "Distância máxima para encontro" — opções: 5km, 10km, 15km, 20km, 30km, 50km
- Checkbox: "Também disponível para encontros em [cidade mais próxima]" (sugestão automática)

**Acções:**
- Botão "Voltar" (guarda progresso)
- Botão "Continuar"

**Regras de Negócio:**
- A localização é armazenada como coordenadas geográficas (lat, lng)
- O raio define a área de busca para o matching
- Utilizador pode alterar localização posteriormente no perfil

---

#### 4.1.4 Ecrã: Registo — Passo 3 (Caderneta)
**URL:** `/registo/passo-3`

**Objectivo:** Registar cromos repetidos e em falta.

**Layout:**
- Abas (Tabs): "Os meus repetidos" | "O que me falta"
- Grid visual de cromos (layout tipo galeria, 4 colunas mobile, 6 desktop)
- Cada cromo mostra: miniatura, número, nome do jogador/equipa
- Estados visuais por cromo:
  - **Neutro:** Cinza — não possui
  - **Repetido:** Verde com badge de quantidade (1x, 2x, 3x+)
  - **Falta:** Vermelho com ícone de alerta

**Interacção:**
- Toque/clique no cromo abre modal:
  - "Quantos deste cromo tens?" (0 / 1 / 2 / 3+)
  - "Precisas deste cromo?" (Sim / Não)
  - Botão "Confirmar"
- Possibilidade de marcar múltiplos cromos em bloco (selecção múltipla)

**Barra de progresso:**
- "X de 680 cromos registados" (contador animado)
- Botão "Preencher depois" (permite saltar, mas mostra alerta: "Sem cromos registados não poderás fazer matching")

**Acções:**
- Botão "Concluir registo"
- Link "Preencher mais tarde"

**Regras:**
- Mínimo de 5 cromos registados (repetidos ou faltas) para activar matching
- Dados guardados em tempo real (auto-save a cada acção)

---

#### 4.1.5 Ecrã: Onboarding Pós-Registo
**URL:** `/onboarding`

**Conteúdo (3 slides carrossel):**
1. "A tua caderneta está registada" — ilustração de caderneta completa
2. "Nós encontramos o melhor grupo para ti" — ilustração de 4 pessoas a trocar
3. "Marca o encontro via WhatsApp" — ilustração de telemóvel com WhatsApp

**CTA final:** "Ir para o Dashboard"

---

### 4.2 FLUXO 2: GESTÃO DA COLECÇÃO

#### 4.2.1 Ecrã: Dashboard Principal
**URL:** `/dashboard`

**Layout (Mobile-first):**

**Header:**
- Logo + Notificações (sino com badge)
- Avatar do utilizador (acesso ao perfil)

**Secção de Estado:**
- Card principal com estado actual:
  - Se **Activo**: "Estás pronto para trocar! 🎉"
  - Se **Em Pool**: "Tens um pool activo" + resumo do grupo
  - Se **Novo**: "Completa a tua caderneta para começar"

**Secção de Estatísticas Rápidas (3 cards horizontais):**
- "Repetidos": X cromos (badge verde)
- "Em falta": X cromos (badge vermelho)
- "Completude": X% da caderneta

**Secção Principal — CTA:**
- Botão grande, primário: "🔍 Procurar Pool de Troca"
  - Subtexto: "Encontra 3 pessoas na tua zona"
  - Desactivado se utilizador em pool activo ou sem cromos suficientes

**Secção Secundária:**
- Card "Gerir a minha caderneta" (link para `/colecao`)
- Card "O meu perfil" (link para `/perfil`)

**Bottom Navigation (fixo):**
- Início (dashboard) | Caderneta | Procurar | Perfil

---

#### 4.2.2 Ecrã: Gerir Colecção
**URL:** `/colecao`

**Elementos:**
- Tabs: "Todos os cromos" | "Repetidos" | "Em falta"
- Barra de pesquisa: "Procurar por nome, número ou equipa"
- Filtros: "Equipas" (dropdown), "Tipo" (Jogador, Escudo, Especial)
- Grid de cromos (mesmo sistema visual do registo)
- Botão flutuante (FAB): "+ Adicionar cromos em massa"

**Interacção:**
- Toque no cromo abre bottom sheet:
  - Visualização ampliada do cromo
  - Stepper: "Quantos tens: [-] 2 [+]"
  - Toggle: "Preciso deste cromo: [ ]"
  - Botão "Guardar"

**Regras:**
- Alterações reflectem-se imediatamente no algoritmo de matching
- Se utilizador estiver em pool activo, mostrar alerta: "Alterar cromos pode afectar futuros matches. O teu pool actual mantém-se."

---

### 4.3 FLUXO 3: PROCURA DE POOL (CORE DA FASE 1)

#### 4.3.1 Ecrã: Configurar Pesquisa de Pool
**URL:** `/procurar`

**Elementos:**
- Título: "Encontrar grupo de troca"
- Card de resumo do utilizador:
  - "Tens X repetidos e Y em falta"
  - "A tua zona: [Localidade] (raio de X km)"
  - Link: "Alterar localização ou raio"

**Opções de Matching:**
- Radio buttons:
  - [ ] "Procurar pool imediatamente" (sistema calcula automaticamente)
  - [ ] "Agendar procura para mais tarde" (datetime picker — útil se ainda vai comprar mais cromos)

**Preferências de Pool (opcional):**
- Checkbox: "Preferência por encontro em espaço público" (café, centro comercial)
- Checkbox: "Apenas utilizadores verificados" (futuro — desactivado por agora)
- Horário preferencial: "Manhã" | "Tarde" | "Noite" | "Fim de semana" (multi-select)

**CTA:**
- Botão primário grande: "🔍 Procurar Pool"
- Subtexto: "Isto pode levar alguns segundos..."

**Regras:**
- Só é possível iniciar procura se:
  - Utilizador tem ≥5 cromos registados
  - Utilizador não está em pool activo
  - Utilizador tem pelo menos 1 repetido E 1 em falta

---

#### 4.3.2 Ecrã: Processamento de Matching (Loading)
**URL:** `/procurar/processamento`

**Estado:** Após submeter procura, o sistema processa o algoritmo.

**UI:**
- Animação de processamento (ex: 4 cromos a girar e a formar um grupo)
- Mensagens dinâmicas (rotativas, a cada 3 segundos):
  - "A analisar cromos repetidos na tua zona..."
  - "A calcular combinações óptimas..."
  - "A verificar compatibilidade geográfica..."
  - "Quase lá... a finalizar o melhor grupo para ti!"
- Barra de progresso indeterminada (shimmer)
- Estimativa: "Isto costuma demorar 5-10 segundos"

**Timeout:**
- Se >30 segundos, mostrar: "A procura está a demorar mais do que o normal. A expandir raio de pesquisa..."

**Regras:**
- Utilizador pode cancelar (botão "Cancelar" abaixo)
- Cancelamento não consome "crédito" de procura

---

#### 4.3.3 Ecrã: Resultado — Pool Encontrado
**URL:** `/procurar/resultado`

**Estado:** Algoritmo encontrou pool óptimo.

**Layout:**
- Banner de sucesso: "🎉 Encontrámos o grupo perfeito para ti!"
- Card principal: "Pool #XXXXX" (ID único do pool)

**Secção: Resumo do Match**
- Grid de 4 avatares (utilizador + 3 matches)
- Cada avatar com:
  - Nome/Alcunha
  - Localidade (cidade)
  - Distância ao utilizador (ex: "a 3.2 km")
  - Badge: "X cromos para ti" (quantos cromos essa pessoa tem que o utilizador precisa)

**Secção: Estatísticas do Pool**
- Card com métricas:
  - "Total de trocas possíveis no grupo: XX cromos"
  - "Cromos que vais receber: X"
  - "Cromos que vais dar: X"
  - "Cromos trocados entre os outros: X" (trocas que não envolvem o utilizador mas enriquecem o pool)
- Visualização em diagrama simples (4 nós ligados por linhas, espessura da linha = quantidade de trocas)

**Secção: Detalhes das Trocas**
- Accordion por pessoa:
  - "[Nome] vai dar-te: [lista de cromos]"
  - "Tu vais dar a [Nome]: [lista de cromos]"
  - Cromos listados com miniatura + número + nome

**Secção: Análise de Viabilidade**
- Indicador de "Viabilidade do encontro":
  - 🟢 "Excelente — todos na mesma zona"
  - 🟡 "Boa — deslocação média de X km"
  - 🔴 "Disperso — considera ajustar localização"

**CTAs:**
- Botão primário grande: "✅ Aceitar e entrar no Pool"
- Botão secundário: "❌ Rejeitar e procurar outro"
- Link terciário: "Ver detalhes completos das trocas"

**Regras:**
- O utilizador tem **24 horas** para aceitar o pool
- Se rejeitar, o sistema oferece: "Procurar alternativa" ou "Ajustar preferências"
- Se aceitar, o utilizador entra em estado "Em Pool" e os outros 3 membros recebem notificação

---

#### 4.3.4 Ecrã: Resultado — Sem Pool Disponível
**URL:** `/procurar/sem-resultados`

**Estado:** Não foi possível formar pool óptimo.

**UI:**
- Ilustração de caderneta vazia/triste
- Título: "Ainda não há grupo perfeito para ti"
- Explicação: "Não encontrámos 3 pessoas na tua zona com match suficiente de cromos."

**Opções:**
- Card 1: "Aumentar raio de pesquisa"
  - Slider para aumentar distância
  - Previsão: "Com 30km, há X utilizadores compatíveis"
- Card 2: "Ser notificado quando aparecer match"
  - Toggle: "Notificar-me quando houver pool disponível"
  - Texto: "Vamos procurar automaticamente e avisamos-te."
- Card 3: "Convidar amigos"
  - Botão "Partilhar link" (gera link de convite)
  - Texto: "Se 3 amigos teus entrarem, formam um pool garantido!"

**CTA:**
- Botão: "Voltar ao Dashboard"

---

### 4.4 FLUXO 4: POOL ACTIVA

#### 4.4.1 Ecrã: Pool Activa — Dashboard do Grupo
**URL:** `/pool/:id`

**Estado:** Utilizador aceitou pool e grupo está formado.

**Layout:**

**Header:**
- Título: "Pool #XXXX"
- Badge de estado: "Activa" (verde) | "A aguardar confirmações" (amarelo) | "Concluída" (cinza)
- Menu (3 pontos): "Sair do pool" | "Reportar problema"

**Secção: Membros do Grupo**
- Grid 2x2 de cards de membro:
  - Avatar + Nome
  - Localidade
  - Badge: "Confirmado" / "A aguardar"
  - "X cromos para ti"

**Secção: Sala de Encontro**
- Card destacado:
  - Ícone WhatsApp
  - Título: "Sala do Grupo"
  - Descrição: "Entra no grupo de WhatsApp para marcarem o encontro"
  - Botão: "🔗 Abrir link WhatsApp" (abre WhatsApp Web/App com link de convite)
  - Informação: "Link válido por 7 dias. Se expirar, pede novo link."

**Secção: Resumo de Trocas**
- Tabela/Lista:
  - "Tu vais receber: X cromos (de Y pessoas)"
  - "Tu vais dar: X cromos (a Y pessoas)"
  - Lista detalhada por pessoa (accordion)

**Secção: Acções do Grupo**
- Botão: "📅 Sugerir data/hora" (abre modal com picker, envia notificação aos outros)
- Botão: "📍 Sugerir local" (mapa com pins de sugestão, votação)
- Botão: "✅ Confirmar troca realizada" (futuro — para tracking)

**Timeline do Pool:**
- Visualização vertical:
  - [✓] Pool formada
  - [✓] Todos confirmaram
  - [ ] Encontro agendado
  - [ ] Troca realizada
  - [ ] Caderneta mais completa! 🎉

**Regras:**
- Pool só é considerada "Activa" quando todos os 4 membros confirmarem
- Se um membro não confirmar em 24h, o sistema:
  - Notifica o membro via email/SMS
  - Se ainda não confirmar em 48h, dissolve o slot e procura substituto
- Link WhatsApp é gerado automaticamente via API do WhatsApp (wa.me links)

---

#### 4.4.2 Ecrã: Detalhes de Trocas
**URL:** `/pool/:id/trocas`

**Layout:**
- Matriz 4x4 de trocas:
  - Linhas: Quem dá
  - Colunas: Quem recebe
  - Células: Lista de cromos + quantidade
  - Células vazias: "Sem troca directa"

**Secção: Cromos em Circulação no Pool**
- Lista de todos os cromos que serão trocados no grupo
- Indicação de origem → destino

---

### 4.5 FLUXO 5: PERFIL E CONFIGURAÇÕES

#### 4.5.1 Ecrã: Perfil
**URL:** `/perfil`

**Secções:**
- Dados pessoais (editáveis)
- Localização (mapa + raio, editável)
- Preferências de notificação:
  - Email: Novos matches / Lembranças / Novidades
  - SMS: Urgente apenas
- Histórico de Pools (futuro)
- Estatísticas pessoais:
  - "Cromos trocados: X"
  - "Pools participadas: X"
  - "Caderneta completada: X%"

---

## 5. ALGORITMO DE MATCHING — ESPECIFICAÇÃO TÉCNICA

### 5.1 Objectivo do Algoritmo
Maximizar o número total de cromos trocados dentro de um grupo de 4 pessoas, considerando:
- Cromos repetidos de cada pessoa (oferta)
- Cromos em falta de cada pessoa (procura)
- Proximidade geográfica entre todos os membros
- Viabilidade logística do encontro

### 5.2 Dados de Entrada
Para cada utilizador `U`:
- `U.location`: (lat, lng)
- `U.radius`: raio máximo de deslocação (km)
- `U.repetidos`: Set de IDs de cromos (com quantidades)
- `U.faltas`: Set de IDs de cromos necessários

### 5.3 Métricas de Avaliação

#### 5.3.1 Match Score Individual (par a par)
Para dois utilizadores A e B:
```
match_par(A, B) = |A.repetidos ∩ B.faltas| + |B.repetidos ∩ A.faltas|
```
(Quantidade de cromos que A pode dar a B + que B pode dar a A)

#### 5.3.2 Pool Score (grupo de 4)
Para um pool P = {U1, U2, U3, U4}:

**a) Score de Troca (ponderado 70%):**
```
troca_total(P) = Σ match_par(Ui, Uj) para todo i < j
```
Soma de todas as trocas bidireccionais possíveis entre todos os pares do grupo.

**b) Score de Completude (ponderado 20%):**
```
completude(P) = Σ (cromos_recebidos_por_Ui / cromos_em_falta_de_Ui) / 4
```
Média da percentagem de necessidades cobertas por cada membro.

**c) Score Geográfico (ponderado 10%):**
```
geo_score(P) = 1 - (distancia_media_centroide / distancia_maxima_aceitavel)
```
- Calcula o centróide geográfico do grupo
- Média das distâncias de cada membro ao centróide
- Normalizado pelo raio máximo definido

**d) Pool Score Final:**
```
pool_score(P) = 0.7 * normalize(troca_total) + 0.3 * normalize(completude) + 0.1 * normalize(geo_score)
```

### 5.4 Processo de Selecção

**Passo 1: Filtragem Geográfica**
- Para o utilizador solicitante `U`, encontrar todos `V` tal que:
  - `dist(U, V) ≤ max(U.radius, V.radius)`
- Ordenar por proximidade
- Selecionar top 100 candidatos

**Passo 2: Combinações**
- Das 100 pessoas, gerar combinações C(100,3) = 161.700 possíveis pools
- Para cada combinação, calcular `pool_score`

**Passo 3: Otimização**
- Ordenar pools por `pool_score` descendente
- Selecionar top 10 pools
- Aplicar filtro de viabilidade: todos os pares devem ter `match_par ≥ 2` (mínimo de 2 cromos trocáveis por par)

**Passo 4: Apresentação**
- Apresentar o melhor pool ao utilizador
- Guardar alternativas (top 2-5) caso o utilizador rejeite

### 5.5 Regras de Negócio do Algoritmo

| Regra | Descrição |
|-------|-----------|
| **Mínimo de troca** | Pool só é válida se `troca_total ≥ 8` (mínimo 8 cromos trocados no grupo) |
| **Cobertura mínima** | Cada membro deve receber pelo menos 1 cromo que precisa |
| **Raio respeitado** | Nenhum par pode exceder a distância máxima definida por ambos |
| **Exclusividade** | Utilizador em pool activo não entra no conjunto de candidatos |
| **Freshness** | Dados de cromos com mais de 7 dias sem actualização têm peso reduzido (0.7x) |
| **Diversidade** | Preferência por pools onde o utilizador recebe cromos de múltiplas pessoas (não só de uma) |

### 5.6 Exemplo Ilustrativo

**Utilizador A (Solicitante):**
- Local: Lisboa (raio: 15km)
- Repetidos: {Cromo 5, Cromo 12, Cromo 23, Cromo 45}
- Faltas: {Cromo 7, Cromo 15, Cromo 30}

**Pool Encontrado:**
| Membro | Local | Repetidos | Faltas | Dá a A | Recebe de A |
|--------|-------|-----------|--------|--------|-------------|
| B | Amadora | {7, 15, 40} | {5, 12} | 7, 15 | 5, 12 |
| C | Oeiras | {30, 55} | {23, 45} | 30 | 23, 45 |
| D | Lisboa | {15, 30} | {12, 45} | — | 45 |

**Cálculo:**
- A↔B: 2 + 2 = 4
- A↔C: 1 + 2 = 3
- A↔D: 0 + 1 = 1
- B↔C: 0 + 0 = 0
- B↔D: 1 + 1 = 2
- C↔D: 1 + 1 = 2
- **Troca Total: 13 cromos**
- **A recebe: 3 cromos (7, 15, 30) → 100% das faltas cobertas!**

---

## 6. SISTEMA DE NOTIFICAÇÕES

### 6.1 Tipos de Notificação

| Gatilho | Canal | Conteúdo |
|---------|-------|----------|
| Pool encontrada | Email + In-app | "Encontrámos um grupo perfeito para ti! Tens 24h para aceitar." |
| Novo membro no pool | In-app + WhatsApp | "[Nome] entrou no teu pool! Faltam X confirmações." |
| Pool confirmada | Email + WhatsApp | "O vosso grupo está completo! Link da sala: [URL]" |
| Lembrete 24h | Email | "Ainda não confirmaste o teu pool. Expira em 24h." |
| Pool expirada | Email | "O teu pool expirou. Queres procurar outro?" |
| Sem resultados | Email (opcional) | "Ainda não há match, mas continuamos à procura!" |
| Cromos actualizados | In-app | "A tua caderneta foi actualizada. Novos matches possíveis!" |

### 6.2 Gestão de Preferências
- Utilizador pode desactivar notificações por canal
- Notificações críticas (expiração de pool) sempre enviadas

---

## 7. SISTEMA DE SALAS WHATSAPP

### 7.1 Geração de Links
- Utilizar API do WhatsApp (wa.me) ou WhatsApp Business API
- Formato: `https://chat.whatsapp.com/[código_invite]`
- Link gerado automaticamente quando pool atinge 4 confirmações

### 7.2 Fluxo de Criação
1. Sistema cria grupo via WhatsApp Business API (se disponível) ou gera link de convite
2. Link é apresentado no dashboard do pool
3. Cada membro recebe notificação com o link
4. Ao clicar, abre WhatsApp com mensagem pré-preenchida:
   - "Olá! Sou [Nome], do Pool #XXXX para troca de cromos Panini 2026. Vamos marcar o encontro? 🎴"

### 7.3 Regras
- Link expira em 7 dias (configurável)
- Se expirar, botão "Gerar novo link" disponível para qualquer membro
- Sistema não monitora conversas (privacidade)
- Sistema pode enviar lembrete: "Não se esqueçam de marcar o encontro!"

---

## 8. CASOS DE ERRO E ESTADOS ALTERNATIVOS

### 8.1 Erros de Sistema

| Código | Cenário | Mensagem ao Utilizador | Acção |
|--------|---------|------------------------|-------|
| E001 | Algoritmo timeout | "A procura demorou mais do que esperado. Tenta novamente ou aumenta o raio." | Retry automático x1 |
| E002 | Pool dissolvida (membro saiu) | "Um membro saiu do teu pool. Vamos procurar um substituto." | Re-match automático |
| E003 | WhatsApp link expirado | "O link do grupo expirou. Clica para gerar um novo." | Gerar novo link |
| E004 | Dados incompletos | "Precisas de registar pelo menos 5 cromos para procurar pools." | Redireccionar para caderneta |
| E005 | Localização inválida | "Não conseguimos determinar a tua localização. Verifica as permissões." | Fallback para input manual |

### 8.2 Estados de Excepção

**Pool Incompleta (membro abandona):**
- Estado muda para "A aguardar substituto"
- Sistema procura novo membro que faça match com os 3 restantes
- Se não encontrar em 48h, pool é dissolvida e todos regressam a "Activo"

**Conflito de Cromos (dados desactualizados):**
- Se no encontro real se verificar que cromos não existem:
- Botão "Reportar discrepância" no pool
- Sistema regista e ajusta algoritmo para futuro (peso reduzido)

---

## 9. REQUISITOS NÃO-FUNCIONAIS (UX/UI)

### 9.1 Performance
- Tempo de carregamento da dashboard: <2s (3G)
- Algoritmo de matching: <10s para 90% dos casos
- Auto-save da caderneta: <500ms feedback visual

### 9.2 Acessibilidade
- WCAG 2.1 AA compliance
- Contraste mínimo 4.5:1
- Suporte a screen readers nos grids de cromos
- Navegação por teclado completa

### 9.3 Responsividade
- Mobile-first (320px base)
- Tablet: layout adaptativo de grid
- Desktop: sidebar + conteúdo principal

### 9.4 Design System (Resumo)

**Cores:**
- Primário: Verde Panini (#00A651) — acções principais, sucesso
- Secundário: Azul escuro (#1A3A5C) — headers, textos principais
- Alerta: Laranja (#FF6B35) — avisos, estados pendentes
- Erro: Vermelho (#E63946) — erros, faltas
- Neutro: Cinzas (#F8F9FA, #E9ECEF, #ADB5BD, #495057)

**Tipografia:**
- Títulos: Inter ou Poppins, bold
- Corpo: Inter, regular
- Tamanhos: 12px (legendas), 16px (corpo), 20px (subtítulos), 28px (títulos)

**Componentes:**
- Cards com sombra suave (0 2px 8px rgba(0,0,0,0.08))
- Botões com border-radius 8px
- Inputs com border-radius 6px, border 1px #DEE2E6
- Bottom navigation fixo em mobile

---

## 10. REQUISITOS DE BACKEND (Resumo para Especificação Técnica)

### 10.1 Modelos de Dados Principais

**Utilizador:**
- id, nome, email, telemovel, password_hash, localizacao (point), raio_km, estado, created_at, updated_at

**Cromo:**
- id, numero, nome, equipa, tipo, imagem_url

**ColecaoUtilizador:**
- id, utilizador_id, cromo_id, quantidade_tem, precisa (boolean), updated_at

**Pool:**
- id, estado (formando, activa, concluida, cancelada), created_at, whatsapp_link, expires_at

**PoolMembro:**
- id, pool_id, utilizador_id, estado (convidado, confirmado, recusado, saiu), joined_at

**TrocaPool:**
- id, pool_id, de_utilizador_id, para_utilizador_id, cromo_id, quantidade, estado

### 10.2 API Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/auth/registo | Registo de utilizador |
| POST | /api/auth/login | Autenticação |
| GET | /api/cromos | Lista todos os cromos |
| PUT | /api/colecao | Actualiza cromos do utilizador |
| POST | /api/pools/procurar | Inicia algoritmo de matching |
| GET | /api/pools/resultado/:id | Obtém resultado do match |
| POST | /api/pools/:id/aceitar | Aceita pool |
| POST | /api/pools/:id/rejeitar | Rejeita pool |
| GET | /api/pools/:id | Detalhes da pool |
| POST | /api/pools/:id/whatsapp | Gera novo link WhatsApp |

---

## 11. FLUXOGRAMA DO SISTEMA (Descrição Textual)

```
[Utilizador regista-se]
    ↓
[Preenche localização + cromos]
    ↓
[Estado: Activo]
    ↓
[Clica "Procurar Pool"]
    ↓
[Sistema valida pré-condições]
    ↓
[Algoritmo executa matching]
    ↓
    ├─→ [Pool encontrada] → [Apresenta resultado] → [Utilizador aceita?]
    │       ├─→ Sim → [Estado: Em Pool] → [Aguarda confirmações dos outros 3]
    │       │       ↓
    │       │   [Todos confirmaram?]
    │       │       ├─→ Sim → [Gerar link WhatsApp] → [Pool Activa]
    │       │       └─→ Não (timeout) → [Dissolver] → [Voltar a Activo]
    │       │
    │       └─→ Não → [Procurar alternativa] ou [Ajustar preferências]
    │
    └─→ [Sem pool] → [Oferecer opções] → [Notificar quando disponível]
```

---

## 12. PRÓXIMAS FASES (Fora do âmbito da Fase 1)

- Matching 1-1 (individual)
- Sistema de reputação e avaliações
- Verificação de identidade
- Chat interno (alternativa ao WhatsApp)
- Notificações push
- App nativo iOS/Android
- Gamificação (badges, rankings)
- Integração com catálogo Panini oficial
- Marketplace (venda de cromos)
- Expansão internacional (Espanha, Brasil, etc.)

---

## 13. GLOSSÁRIO DE INTERFACE

| Termo na UI | Significado |
|-------------|-------------|
| "Pool" | Grupo de 4 pessoas para troca |
| "Match" | Compatibilidade de cromos entre pessoas |
| "Sala" | Grupo de WhatsApp para agendamento |
| "Repetidos" | Cromos que tens em duplicado |
| "Faltas" | Cromos que te faltam na caderneta |
| "Confirmar" | Aceitar participar num pool encontrado |
| "Caderneta" | Área onde registas os teus cromos |

---

*Documento elaborado para a Fase 1 do projeto de Troca de Cromos Panini 2026 — Cenário de Pools.*
*Autor: Especificação Funcional UX/UI*
*Versão 1.0 — 07/07/2026*
