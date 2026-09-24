#!/bin/bash
###############################################################
# EdWise — start-dev.sh
# Sobe Postgres em docker, espera ficar pronto, inicializa o
# schema (na 1ª execução), roda migrations pendentes, builda o
# frontend e inicia backend + frontend em paralelo.
###############################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$ROOT_DIR"

echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🚀 EdWise — ambiente de desenvolvimento local${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"

# ─── 0. Pré-requisitos ──────────────────────────────────────
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ docker não encontrado no PATH${NC}"; exit 1; }
command -v node   >/dev/null 2>&1 || { echo -e "${RED}❌ node não encontrado no PATH${NC}"; exit 1; }
command -v npm    >/dev/null 2>&1 || { echo -e "${RED}❌ npm não encontrado no PATH${NC}"; exit 1; }

# `docker compose` (v2) ou `docker-compose` (v1)?
if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
else
    echo -e "${RED}❌ docker compose não disponível${NC}"
    exit 1
fi

# ─── 1. .env ────────────────────────────────────────────────
if [ ! -f "$ROOT_DIR/.env" ]; then
    if [ -f "$ROOT_DIR/.env.example" ]; then
        echo -e "${YELLOW}⚠️  .env não encontrado — copiando de .env.example${NC}"
        cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    else
        echo -e "${RED}❌ Nenhum .env nem .env.example presente${NC}"
        exit 1
    fi
fi

# Carrega o .env pra que docker compose e os passos seguintes vejam as vars
set -a
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"
set +a

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_DATABASE="${DB_DATABASE:-edwise}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# ─── 2. Libera portas 3000/3001 ─────────────────────────────
echo -e "${YELLOW}[1/5] Liberando portas 3000 e 3001...${NC}"
for port in 3000 3001; do
    if command -v lsof >/dev/null 2>&1 && lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}  matando processo na porta $port${NC}"
        lsof -t -i :$port | xargs -r kill -9 || true
    fi
done

# ─── 3. Sobe Postgres + MinIO + Redis ───────────────────────
echo -e "${YELLOW}[2/5] Subindo Postgres, MinIO e Redis em docker...${NC}"
$DC -f "$ROOT_DIR/docker-compose.dev.yml" up -d db minio minio-init redis

echo -e "${YELLOW}  aguardando Postgres ficar pronto...${NC}"
for i in $(seq 1 30); do
    if docker exec edwise-db-dev pg_isready -U "$DB_USER" -d "$DB_DATABASE" >/dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Postgres pronto${NC}"
        break
    fi
    sleep 1
    if [ "$i" = "30" ]; then
        echo -e "${RED}  ❌ Postgres não respondeu em 30s${NC}"
        $DC -f "$ROOT_DIR/docker-compose.dev.yml" logs db | tail -30
        exit 1
    fi
done

echo -e "${YELLOW}  aguardando MinIO ficar pronto...${NC}"
for i in $(seq 1 30); do
    if curl -fsS http://localhost:9000/minio/health/live >/dev/null 2>&1; then
        echo -e "${GREEN}  ✓ MinIO pronto (console: http://localhost:9001)${NC}"
        break
    fi
    sleep 1
    if [ "$i" = "30" ]; then
        echo -e "${RED}  ❌ MinIO não respondeu em 30s${NC}"
        $DC -f "$ROOT_DIR/docker-compose.dev.yml" logs minio | tail -30
        exit 1
    fi
done

echo -e "${YELLOW}  aguardando Redis ficar pronto...${NC}"
for i in $(seq 1 30); do
    if docker exec edwise-redis-dev redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Redis pronto${NC}"
        break
    fi
    sleep 1
    if [ "$i" = "30" ]; then
        echo -e "${RED}  ❌ Redis não respondeu em 30s${NC}"
        $DC -f "$ROOT_DIR/docker-compose.dev.yml" logs redis | tail -30
        exit 1
    fi
done

# ─── 4. Dependências ────────────────────────────────────────
echo -e "${YELLOW}[3/5] Verificando dependências...${NC}"
if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo -e "${YELLOW}  instalando deps do frontend...${NC}"
    (cd "$ROOT_DIR" && npm install)
fi
if [ ! -d "$ROOT_DIR/server/node_modules" ]; then
    echo -e "${YELLOW}  instalando deps do backend...${NC}"
    (cd "$ROOT_DIR/server" && npm install)
fi
echo -e "${GREEN}  ✓ deps OK${NC}"

# ─── 5. Schema + migrations ─────────────────────────────────
echo -e "${YELLOW}[4/5] Preparando schema...${NC}"

# Init-db é destrutivo (drop em videos/video_segments) — só roda na 1ª vez,
# detectando ausência da tabela `users`.
# IMPORTANTE: checa via TCP em $DB_HOST/$DB_PORT — o mesmo host:porta que o
# backend usa (DATABASE_URL/.env) — e não `docker exec edwise-db-dev`, que
# consulta o Postgres DENTRO do container. Se um Postgres nativo (fora do
# Docker) também escutar em $DB_PORT, ele vence a conexão local e o container
# fica com um schema vazio para sempre, fazendo essa checagem falhar em todo
# restart e o init-db.js rodar (e apagar videos/video_segments) sempre.
USERS_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_DATABASE" -tAc \
    "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='users');" 2>/dev/null || echo "f")

if [ "$USERS_EXISTS" != "t" ]; then
    echo -e "${YELLOW}  banco vazio — rodando init-db.js (tabelas base + admin padrão)${NC}"
    (cd "$ROOT_DIR/server" && node init-db.js)
else
    echo -e "${GREEN}  ✓ schema base já existe — pulando init-db${NC}"
fi

echo -e "${YELLOW}  rodando migrations pendentes...${NC}"
(cd "$ROOT_DIR" && node server/scripts/migrate.js up)

echo -e "${YELLOW}  garantindo usuários de teste (admin/professor/student)...${NC}"
(cd "$ROOT_DIR/server" && node create-test-users.js)

# ─── 6. Sobe backend + frontend (com hot reload) ────────────
echo -e "${YELLOW}[5/5] Iniciando serviços (hot reload ativo)...${NC}"

PIDS=()

cleanup() {
    echo ""
    echo -e "${CYAN}encerrando serviços...${NC}"
    for pid in "${PIDS[@]}"; do
        ps -p "$pid" >/dev/null 2>&1 && kill "$pid" 2>/dev/null || true
    done
    sleep 1
    for pid in "${PIDS[@]}"; do
        ps -p "$pid" >/dev/null 2>&1 && kill -9 "$pid" 2>/dev/null || true
    done
    echo -e "${GREEN}✓ backend e frontend encerrados${NC}"
    echo -e "${YELLOW}  o Postgres continua rodando — pare com:${NC}"
    echo -e "${WHITE}    npm run db:down${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Backend (node --watch — reinicia automaticamente em alterações)
(
    cd "$ROOT_DIR/server" || exit 1
    node --watch index.js
) > "$ROOT_DIR/backend.log" 2>&1 &
PIDS+=($!)

# Worker (consome a fila BullMQ — FFmpeg -> Whisper -> Gemini)
(
    cd "$ROOT_DIR/server" || exit 1
    node --watch worker.js
) > "$ROOT_DIR/worker.log" 2>&1 &
PIDS+=($!)

# Frontend (Vite dev — HMR ativo)
(
    cd "$ROOT_DIR" || exit 1
    npm run dev
) > "$ROOT_DIR/frontend.log" 2>&1 &
PIDS+=($!)

sleep 3

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ EdWise rodando localmente${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${WHITE}  Frontend : http://localhost:3000${NC}"
echo -e "${WHITE}  Backend  : http://localhost:3001${NC}"
echo -e "${WHITE}  Postgres : localhost:${DB_PORT} (db=${DB_DATABASE} user=${DB_USER})${NC}"
echo ""
echo -e "${CYAN}  Logs:${NC}"
echo -e "${CYAN}    tail -f backend.log${NC}"
echo -e "${CYAN}    tail -f worker.log${NC}"
echo -e "${CYAN}    tail -f frontend.log${NC}"
echo ""
echo -e "${YELLOW}  Ctrl+C para parar backend+frontend (postgres permanece)${NC}"
echo ""

# Mantém o script vivo enquanto algum processo estiver rodando
while true; do
    for pid in "${PIDS[@]}"; do
        if ! ps -p "$pid" >/dev/null 2>&1; then
            echo -e "${RED}⚠ um dos serviços caiu — encerrando${NC}"
            cleanup
        fi
    done
    sleep 2
done
