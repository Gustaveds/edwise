#!/bin/bash
###############################################################
# EdWise — run-tests.sh
# Roda toda a suíte de testes automatizados do projeto (seção 24
# do Documento de Especificação):
#   - Testes unitários do backend (funções puras, sem dependências)
#   - Testes unitários do frontend (vitest)
#   - Testes de integração do backend (API real, com login e RBAC
#     dos 3 perfis), subindo Postgres/MinIO/Redis/backend se
#     ainda não estiverem rodando.
#
# Uso:
#   ./scripts/run-tests.sh            # roda tudo (unitários + integração)
#   ./scripts/run-tests.sh --unit     # só os testes unitários (rápido,
#                                        não precisa de Docker)
###############################################################

set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$ROOT_DIR"

UNIT_ONLY=false
if [ "${1:-}" = "--unit" ]; then
    UNIT_ONLY=true
fi

FAILED=0
BACKEND_PID=""

cleanup() {
    if [ -n "$BACKEND_PID" ] && ps -p "$BACKEND_PID" >/dev/null 2>&1; then
        echo -e "${CYAN}encerrando backend de teste (PID $BACKEND_PID)...${NC}"
        kill "$BACKEND_PID" 2>/dev/null
        wait "$BACKEND_PID" 2>/dev/null
    fi
}
trap cleanup EXIT

echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🧪 EdWise — suíte de testes${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"

# ─── 1. Testes unitários (não precisam de Docker nem de servidor) ──
echo -e "${YELLOW}[1/3] Testes unitários do backend...${NC}"
(cd "$ROOT_DIR/backend" && npm test) || FAILED=1

echo -e "${YELLOW}[2/3] Testes unitários do frontend...${NC}"
(cd "$ROOT_DIR/frontend" && npm test) || FAILED=1

if [ "$UNIT_ONLY" = true ]; then
    echo ""
    if [ "$FAILED" -eq 0 ]; then
        echo -e "${GREEN}✓ Testes unitários OK (integração pulada: --unit)${NC}"
    else
        echo -e "${RED}✗ Algum teste unitário falhou${NC}"
    fi
    exit $FAILED
fi

# ─── 2. Testes de integração (precisam do ambiente completo) ───────
echo -e "${YELLOW}[3/3] Testes de integração do backend...${NC}"

if [ ! -f "$ROOT_DIR/.env" ]; then
    echo -e "${RED}❌ .env não encontrado na raiz — copie .env.example antes de rodar os testes de integração${NC}"
    exit 1
fi
set -a
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"
set +a

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_DATABASE="${DB_DATABASE:-edwise}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

SERVER_WAS_RUNNING=false
if curl -fsS http://localhost:3001/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}  ✓ backend já está rodando em localhost:3001 — reaproveitando${NC}"
    SERVER_WAS_RUNNING=true
else
    echo -e "${YELLOW}  subindo Postgres, MinIO e Redis em docker...${NC}"
    docker compose -f "$ROOT_DIR/docker-compose.dev.yml" up -d db minio minio-init redis >/dev/null

    for i in $(seq 1 30); do
        docker exec edwise-db-dev pg_isready -U "$DB_USER" -d "$DB_DATABASE" >/dev/null 2>&1 && break
        sleep 1
    done

    # Mesma checagem do start-dev.sh: init-db é destrutivo (drop em
    # videos/video_segments), só roda na 1ª vez, detectando ausência da
    # tabela `users`.
    USERS_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_DATABASE" -tAc \
        "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='users');" 2>/dev/null || echo "f")

    if [ "$USERS_EXISTS" != "t" ]; then
        echo -e "${YELLOW}  banco vazio — rodando init-db.js (tabelas base + admin padrão)${NC}"
        (cd "$ROOT_DIR/backend" && node init-db.js) || { echo -e "${RED}❌ init-db falhou${NC}"; exit 1; }
    fi

    echo -e "${YELLOW}  rodando migrations pendentes...${NC}"
    (cd "$ROOT_DIR" && node backend/scripts/migrate.js up) || { echo -e "${RED}❌ migrations falharam${NC}"; exit 1; }

    echo -e "${YELLOW}  garantindo usuários de teste (admin/professor/student)...${NC}"
    (cd "$ROOT_DIR/backend" && node create-test-users.js) || { echo -e "${RED}❌ seed de usuários falhou${NC}"; exit 1; }

    echo -e "${YELLOW}  iniciando backend de teste...${NC}"
    (cd "$ROOT_DIR/backend" && node index.js) > "$ROOT_DIR/test-backend.log" 2>&1 &
    BACKEND_PID=$!

    for i in $(seq 1 30); do
        if curl -fsS http://localhost:3001/api/health >/dev/null 2>&1; then
            echo -e "${GREEN}  ✓ backend de teste pronto${NC}"
            break
        fi
        if [ "$i" = "30" ]; then
            echo -e "${RED}❌ backend de teste não respondeu em 30s — veja test-backend.log${NC}"
            exit 1
        fi
        sleep 1
    done
fi

(cd "$ROOT_DIR/backend" && npm run test:integration) || FAILED=1

echo ""
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ Todos os testes passaram${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
else
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ✗ Algum teste falhou — veja o log acima${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
fi

exit $FAILED
