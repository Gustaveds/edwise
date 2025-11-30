FROM node:18-slim

# Instalar dependências do sistema (Python, FFmpeg, etc)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependências Node
RUN npm install --production

# Instalar Whisper
RUN pip3 install --break-system-packages openai-whisper

# Pre-download do modelo medium (cache)
RUN python3 -c "import whisper; whisper.load_model('medium')"

# Copiar código
COPY . .

# Expor porta
EXPOSE 3001

# Iniciar servidor
CMD ["node", "index.js"]
