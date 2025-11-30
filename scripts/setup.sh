#!/bin/bash

##############################################
# EdWise AI - Setup Completo Automático
# Instala todas as dependências necessárias
##############################################

set -e  # Exit on error

echo "==========================================================="
echo "  🚀 EdWise AI - Instalação Automática Completa"
echo "==========================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo -e "${YELLOW}[1/6] Verificando sistema...${NC}"

# Check if running on Linux/WSL
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}⚠️  Este script foi feito para Linux/WSL${NC}"
    echo "Para outros sistemas, instale manualmente."
    exit 1
fi

echo -e "${YELLOW}[2/6] Instalando dependências do sistema...${NC}"

# Update package list
echo "Atualizando lista de pacotes..."
sudo apt update -qq

# Install Python3 and pip3
if ! command -v python3 &> /dev/null; then
    echo "Instalando Python3..."
    sudo apt install -y python3 python3-pip python3-venv
else
    echo "✓ Python3 já instalado"
    # Ensure pip3 is installed
    if ! command -v pip3 &> /dev/null; then
        echo "Instalando pip3..."
        sudo apt install -y python3-pip
    fi
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✓ Node.js já instalado"
fi

# Install FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "Instalando FFmpeg..."
    sudo apt install -y ffmpeg
else
    echo "✓ FFmpeg já instalado"
fi

echo -e "${GREEN}✓ Dependências do sistema instaladas${NC}"

echo ""
echo -e "${YELLOW}[3/6] Instalando dependências Node.js...${NC}"

# Install backend dependencies
cd "$ROOT_DIR/server"
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Instalando dependências do backend..."
    npm install
else
    echo "✓ Dependências do backend já instaladas"
fi

# Install frontend dependencies
cd "$ROOT_DIR"
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Instalando dependências do frontend..."
    npm install
else
    echo "✓ Dependências do frontend já instaladas"
fi

echo -e "${GREEN}✓ Dependências Node.js instaladas${NC}"

echo ""
echo -e "${YELLOW}[4/6] Instalando Whisper para transcrição...${NC}"

# Check if Whisper is installed
if python3 -c "import whisper" 2>/dev/null; then
    echo -e "${GREEN}✓ Whisper já instalado${NC}"
else
    echo "Instalando OpenAI Whisper..."
    
    # Try to install with pip3
    if pip3 install --user openai-whisper 2>/dev/null; then
        echo -e "${GREEN}✓ Whisper instalado com sucesso${NC}"
    else
        echo -e "${YELLOW}Tentando com sudo...${NC}"
        sudo pip3 install openai-whisper || {
            echo -e "${RED}❌ Falha ao instalar Whisper${NC}"
            echo "Transcrição automática estará DESABILITADA"
        }
    fi
    
    # Add user bin to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        export PATH="$HOME/.local/bin:$PATH"
        echo -e "${GREEN}✓ PATH atualizado${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}[5/6] Configurando variáveis de ambiente...${NC}"

# Check if .env exists in server
if [ ! -f "$ROOT_DIR/server/.env" ]; then
    if [ -f "$ROOT_DIR/server/.env.example" ]; then
        echo "Copiando .env.example para .env..."
        cp "$ROOT_DIR/server/.env.example" "$ROOT_DIR/server/.env"
        echo -e "${YELLOW}⚠️  Configure suas variáveis em: server/.env${NC}"
    else
        echo "Criando arquivo .env..."
        cat > "$ROOT_DIR/server/.env" << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:password@***REMOVED_DB_HOST***:5432/EdWise

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# MinIO/S3
MINIO_SERVER_URL=https://s3.tgbia.com
MINIO_ACCESS_KEY=***REMOVED_MINIO_ACCESS_KEY***
MINIO_SECRET_KEY=***REMOVED_MINIO_SECRET_KEY***
MINIO_BUCKET=edwise

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Server
PORT=3001
NODE_ENV=development
EOF
        echo -e "${YELLOW}⚠️  Arquivo .env criado. CONFIGURE suas variáveis!${NC}"
    fi
else
    echo -e "${GREEN}✓ Arquivo .env já existe${NC}"
fi

echo ""
echo -e "${YELLOW}[6/6] Baixando modelo Whisper Medium (opcional)...${NC}"

# Pre-download Whisper medium model if Whisper is installed
if python3 -c "import whisper" 2>/dev/null; then
    if [ ! -f "$HOME/.cache/whisper/medium.pt" ]; then
        echo "Baixando modelo medium (~1.5GB)..."
        echo "Isso pode demorar alguns minutos..."
        
        python3 << 'PYTHON_SCRIPT' || echo "⚠️  Modelo será baixado no primeiro uso"
try:
    import whisper
    print("Carregando modelo medium...")
    model = whisper.load_model("medium")
    print("✓ Modelo medium baixado!")
except Exception as e:
    print(f"⚠️  Erro: {e}")
    print("Modelo será baixado automaticamente no primeiro uso")
PYTHON_SCRIPT
    else
        echo -e "${GREEN}✓ Modelo medium já disponível${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Whisper não instalado, pulando download do modelo${NC}"
fi

echo ""
echo "==========================================================="
echo -e "  ${GREEN}✓ Instalação Completa!${NC}"
echo "==========================================================="
echo ""
echo -e "${GREEN}Sistema pronto para uso!${NC}"
echo ""
echo "Próximos passos:"
echo ""
echo "  1. Configure suas variáveis de ambiente:"
echo -e "     ${YELLOW}nano server/.env${NC}"
echo ""
echo "  2. Inicie a plataforma:"
echo -e "     ${YELLOW}cd scripts && ./start.sh${NC}"
echo ""
echo "  3. Acesse:"
echo "     Frontend: http://localhost:3000"
echo "     Backend:  http://localhost:3001"
echo ""
echo "==========================================================="
echo ""
echo -e "${GREEN}Ferramentas instaladas:${NC}"
command -v node &> /dev/null && echo "  ✓ Node.js $(node --version)"
command -v npm &> /dev/null && echo "  ✓ NPM $(npm --version)"
command -v python3 &> /dev/null && echo "  ✓ Python $(python3 --version 2>&1 | cut -d' ' -f2)"
command -v pip3 &> /dev/null && echo "  ✓ pip3 $(pip3 --version | cut -d' ' -f2)"
command -v ffmpeg &> /dev/null && echo "  ✓ FFmpeg $(ffmpeg -version 2>&1 | head -n1 | cut -d' ' -f3)"
python3 -c "import whisper; print('  ✓ Whisper ' + whisper.__version__)" 2>/dev/null || echo "  ⚠️  Whisper não instalado"
echo ""
