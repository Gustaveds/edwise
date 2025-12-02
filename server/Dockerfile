FROM node:18-slim

# ========================================
# LAYER 1: Dependências do Sistema
# (Raramente muda - cache máximo)
# ========================================
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ========================================
# LAYER 2: Whisper + Modelo
# (Só refaz se mudar versão do Whisper)
# ========================================
RUN pip3 install --break-system-packages openai-whisper

# Pre-download do modelo medium (~1.5GB, fica em cache)
RUN python3 -c "import whisper; whisper.load_model('medium')"

WORKDIR /app

# ========================================
# LAYER 3: Dependências Node
# (Só refaz se package.json mudar)
# ========================================
COPY package*.json ./
RUN npm install --production

# ========================================
# LAYER 4: Código da Aplicação
# (Refaz sempre que código mudar)
# ========================================
COPY . .

# Expor porta
EXPOSE 3001

# Iniciar servidor
CMD ["node", "index.js"]
