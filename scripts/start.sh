#!/bin/bash
# Script para iniciar toda a plataforma EdWise AI
# Frontend (Vite) + Backend (Node.js)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}===========================================================${NC}"
echo -e "${CYAN}  Iniciando Plataforma EdWise AI${NC}"
echo -e "${CYAN}===========================================================${NC}"
echo ""

# Exportar variáveis de ambiente para o Redis local
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=***REMOVED_REDIS_PASSWORD***
export REDIS_DB=15

# Função para matar processos nas portas 3000 e 3001
kill_existing_processes() {
    echo -e "${YELLOW}Verificando portas 3000 e 3001...${NC}"
    
    # Matar processo na porta 3000 (Frontend)
    if lsof -i :3000 > /dev/null; then
        echo -e "${YELLOW}  Matando processo na porta 3000...${NC}"
        lsof -t -i :3000 | xargs -r kill -9
    fi
    
    # Matar processo na porta 3001 (Backend)
    if lsof -i :3001 > /dev/null; then
        echo -e "${YELLOW}  Matando processo na porta 3001...${NC}"
        lsof -t -i :3001 | xargs -r kill -9
    fi
}

# Executar limpeza inicial
kill_existing_processes

# Obter o diretório atual
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
echo "DEBUG: ROOT_DIR is $ROOT_DIR"

# Verificar se as dependências estão instaladas
echo -e "${YELLOW}[1/3] Verificando dependências...${NC}"

# Verificar node_modules no root
if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo -e "${YELLOW}  Instalando dependências do frontend...${NC}"
    cd "$ROOT_DIR"
    npm install
fi

# Verificar node_modules no server
if [ ! -d "$ROOT_DIR/server/node_modules" ]; then
    echo -e "${YELLOW}  Instalando dependências do backend...${NC}"
    cd "$ROOT_DIR/server"
    npm install
    cd "$ROOT_DIR"
fi

echo -e "${GREEN}✓ Dependências verificadas${NC}"
echo ""

# Construir a aplicação
echo -e "${YELLOW}[1.5/3] Construindo aplicação...${NC}"
cd "$ROOT_DIR"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}⚠ ERRO: Falha no build da aplicação${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build concluído${NC}"
echo ""

# Inicializar banco de dados (se necessário)
echo -e "${YELLOW}[2/3] Inicializando banco de dados...${NC}"
DB_INIT_SCRIPT="$ROOT_DIR/server/init-db.js"
if [ -f "$DB_INIT_SCRIPT" ]; then
    echo -e "${YELLOW}  Executando script de inicialização...${NC}"
    cd "$ROOT_DIR/server"
    node init-db.js
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Banco de dados inicializado${NC}"
    else
        echo -e "${RED}⚠ AVISO: Erro ao inicializar banco de dados${NC}"
        echo -e "${YELLOW}  Verifique a conexão no arquivo .env${NC}"
        read -p "Deseja continuar mesmo assim? (s/n): " continue
        if [ "$continue" != "s" ]; then
            exit 1
        fi
    fi
    cd "$ROOT_DIR"
else
    echo -e "${YELLOW}  Script de inicialização não encontrado, pulando...${NC}"
fi

echo ""

# Iniciar os serviços
echo -e "${YELLOW}[3/3] Iniciando serviços...${NC}"
echo ""

# Array para armazenar PIDs dos processos
PIDS=()

# Função para parar todos os serviços ao sair
cleanup() {
    echo ""
    echo -e "${CYAN}===========================================================${NC}"
    echo -e "${CYAN}  Encerrando serviços...${NC}"
    echo -e "${CYAN}===========================================================${NC}"
    
    for pid in "${PIDS[@]}"; do
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null
        fi
    done
    
    # Aguardar um momento para os processos terminarem
    sleep 1
    
    # Forçar encerramento se necessário
    for pid in "${PIDS[@]}"; do
        if ps -p $pid > /dev/null 2>&1; then
            kill -9 $pid 2>/dev/null
        fi
    done
    
    echo -e "${GREEN}✓ Todos os serviços foram encerrados${NC}"
    exit 0
}

# Registrar handler para Ctrl+C
trap cleanup SIGINT SIGTERM

# Iniciar Backend (porta 3001)
echo -e "${CYAN}  Iniciando Backend (http://localhost:3001)...${NC}"
(
    cd "$ROOT_DIR/server" || exit 1
    echo "Backend CWD: $(pwd)"
    node index.js > "$ROOT_DIR/backend.log" 2>&1
) &
BACKEND_PID=$!
PIDS+=($BACKEND_PID)
sleep 3

# Iniciar Frontend (porta 3000)
echo -e "${CYAN}  Iniciando Frontend (http://localhost:3000)...${NC}"
(
    cd "$ROOT_DIR" || exit 1
    echo "Frontend CWD: $(pwd)"
    npm run dev > "$ROOT_DIR/frontend.log" 2>&1
) &
FRONTEND_PID=$!
PIDS+=($FRONTEND_PID)
sleep 3

echo ""
echo -e "${GREEN}===========================================================${NC}"
echo -e "${GREEN}  ✓ Plataforma EdWise AI iniciada com sucesso!${NC}"
echo -e "${GREEN}===========================================================${NC}"
echo ""
echo -e "${WHITE}  Frontend: http://localhost:3000${NC}"
echo -e "${WHITE}  Backend:  http://localhost:3001${NC}"
echo ""
echo -e "${YELLOW}  Pressione Ctrl+C para encerrar todos os serviços${NC}"
echo ""
echo -e "${CYAN}  Logs:${NC}"
echo -e "${CYAN}    Backend:  tail -f backend.log${NC}"
echo -e "${CYAN}    Frontend: tail -f frontend.log${NC}"
echo ""

# Monitorar os processos
while true; do
    # Verificar se algum processo morreu
    for pid in "${PIDS[@]}"; do
        if ! ps -p $pid > /dev/null 2>&1; then
            echo -e "${RED}⚠ AVISO: Um dos serviços foi encerrado inesperadamente${NC}"
            cleanup
        fi
    done
    
    sleep 2
done
