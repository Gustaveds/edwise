#!/bin/bash

###############################################
# Inicialização do Backend com Whisper
# Verifica e prepara ambiente antes de iniciar
###############################################

set -e

echo "🚀 Iniciando EdWise AI Backend..."

# Verificar se Whisper está instalado (opcional)
if python3 -c "import whisper" 2>/dev/null; then
    echo "✅ Whisper disponível"
    
    # Verificar modelo medium
    if [ -f "$HOME/.cache/whisper/medium.pt" ]; then
        echo "✅ Modelo medium pronto"
    else
        echo "⚠️  Modelo medium não encontrado"
        echo "   Será baixado automaticamente no primeiro uso"
    fi
else
    echo "⚠️  Whisper não instalado"
    echo "   Transcrição automática estará DESABILITADA"
    echo "   Para habilitar: pip3 install openai-whisper"
fi

# Verificar FFmpeg (opcional)
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg disponível"
else
    echo "⚠️  FFmpeg não instalado"
    echo "   Processamento de vídeo estará LIMITADO"
fi

echo "✅ Iniciando servidor Node.js..."

# Iniciar servidor
exec node index.js
