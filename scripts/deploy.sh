#!/bin/bash

# 🚀 EdWise Deployment Script with Versioning

set -e

# ==========================================
# CORES & CONFIGURAÇÕES
# ==========================================
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Use separate Docker config for this project (allows multiple logins)
export DOCKER_CONFIG=$HOME/.docker-edwise
export DOCKER_BUILDKIT=0

# Mudar para o diretório raiz do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Arquivo para armazenar a tag atual (no diretório raiz do projeto)
TAG_FILE=".current-tag"
DEFAULT_TAG="v1.0.0"

# ==========================================
# FUNÇÕES DE VERSIONAMENTO
# ==========================================
get_current_tag() {
    if [ -f "$TAG_FILE" ]; then
        cat "$TAG_FILE"
    else
        echo "$DEFAULT_TAG"
    fi
}

save_tag() {
    echo "$1" > "$TAG_FILE"
}

validate_tag() {
    # Valida formato semântico: v1.0.0, v1.2.3-beta, v2.0.0-rc.1, etc.
    if [[ $1 =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
        return 0
    else
        return 1
    fi
}

# ==========================================
# INÍCIO DO DEPLOY
# ==========================================
echo -e "${CYAN}🚀 EdWise Deploy - Build para Docker Hub com Versionamento${NC}"
echo ""

# Mostrar tag atual
CURRENT_TAG=$(get_current_tag)
echo -e "${BLUE}📌 Tag/Versão atual: ${GREEN}${CURRENT_TAG}${NC}"
echo ""

# Perguntar se quer usar a mesma tag ou criar nova
read -p "Continuar com a tag atual '$CURRENT_TAG'? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    # Usuário quer mudar a tag
    while true; do
        echo ""
        echo -e "${YELLOW}Formato de tag: v{major}.{minor}.{patch}[-sufixo]${NC}"
        echo -e "${YELLOW}Exemplos: v1.0.0, v1.2.3, v2.0.0-beta, v1.5.0-rc.1${NC}"
        echo ""
        read -p "Digite a nova tag: " NEW_TAG

        if validate_tag "$NEW_TAG"; then
            CURRENT_TAG="$NEW_TAG"
            save_tag "$CURRENT_TAG"
            echo -e "${GREEN}✅ Tag atualizada para: ${CURRENT_TAG}${NC}"
            break
        else
            echo -e "${RED}❌ Tag inválida! Use o formato v{major}.{minor}.{patch}[-sufixo]${NC}"
            read -p "Tentar novamente? (Y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
                echo -e "${RED}❌ Deploy cancelado${NC}"
                exit 1
            fi
        fi
    done
else
    echo -e "${GREEN}✓ Usando tag: ${CURRENT_TAG}${NC}"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}  Versão do Deploy: ${GREEN}${CURRENT_TAG}${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# ==========================================
# PREPARAÇÃO DO AMBIENTE
# ==========================================
echo "🚀 Starting deployment process..."

# Create network if it doesn't exist
echo "🌐 Checking network..."
docker network inspect tpr_ia > /dev/null 2>&1 || \
    docker network create tpr_ia

# ==========================================
# BUILD DAS IMAGENS
# ==========================================
echo "📦 Building images..."

# Build backend com múltiplas tags
echo -e "${YELLOW}🔧 Building backend (latest + ${CURRENT_TAG})...${NC}"
docker build \
    -t thiagouni/edwise-backend:latest \
    -t thiagouni/edwise-backend:${CURRENT_TAG} \
    server/

# Build frontend com múltiplas tags  
echo -e "${YELLOW}🎨 Building frontend (latest + ${CURRENT_TAG})...${NC}"
docker build \
    --build-arg VITE_API_URL=https://apiedwise.tgbia.com \
    -t thiagouni/edwise-frontend:latest \
    -t thiagouni/edwise-frontend:${CURRENT_TAG} \
    .

# ==========================================
# AUTENTICAÇÃO NO DOCKER HUB
# ==========================================
echo ""
echo "🔑 Verificando autenticação no Docker Hub..."
mkdir -p "$DOCKER_CONFIG"
if [ ! -f "$DOCKER_CONFIG/config.json" ] || ! grep -q '"auth"' "$DOCKER_CONFIG/config.json" 2>/dev/null; then
    echo -e "${YELLOW}Login necessário...${NC}"
    docker login -u thiagouni
else
    echo -e "${GREEN}✓ Já autenticado no Docker Hub${NC}"
fi

# ==========================================
# PUSH PARA DOCKER HUB
# ==========================================
echo ""
echo "⬆️ Pushing images to Docker Hub (thiagouni/edwise)..."

# Push backend (ambas as tags)
echo -e "${YELLOW}📤 Pushing backend (latest + ${CURRENT_TAG})...${NC}"
docker push thiagouni/edwise-backend:latest
docker push thiagouni/edwise-backend:${CURRENT_TAG}

# Push frontend (ambas as tags)
echo -e "${YELLOW}📤 Pushing frontend (latest + ${CURRENT_TAG})...${NC}"
docker push thiagouni/edwise-frontend:latest
docker push thiagouni/edwise-frontend:${CURRENT_TAG}

# ==========================================
# FINALIZAÇÃO
# ==========================================
echo ""
echo -e "${GREEN}✅ Build and Push finished successfully!${NC}"
echo ""
echo -e "${CYAN}📋 Imagens criadas:${NC}"
echo -e "   ${BLUE}Backend:${NC}"
echo -e "   - thiagouni/edwise-backend:latest"
echo -e "   - thiagouni/edwise-backend:${CURRENT_TAG}"
echo -e "   ${BLUE}Frontend:${NC}"
echo -e "   - thiagouni/edwise-frontend:latest"
echo -e "   - thiagouni/edwise-frontend:${CURRENT_TAG}"
echo ""
echo -e "${YELLOW}💡 Para usar esta versão no servidor:${NC}"
echo -e "   ${GREEN}IMAGE_TAG=${CURRENT_TAG} docker-compose up -d${NC}"
echo ""
