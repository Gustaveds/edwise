#!/bin/bash

# Script para substituir localhost:3001 por config.API_URL

echo "🔍 Procurando por localhost:3001 em arquivos TS/TSX..."

# Contar ocorrências
count=$(grep -r "localhost:3001" --include="*.ts" --include="*.tsx" . | grep -v node_modules | wc -l)
echo "Encontradas $count ocorrências"

# Substituir em todos os arquivos
echo "🔧 Substituindo..."

# Para arquivos .ts e .tsx (exceto node_modules)
find . -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" -exec sed -i \
  -e "s|'http://localhost:3001/|config.API_URL + '/|g" \
  -e 's|"http://localhost:3001/|config.API_URL + "/|g' \
  -e 's|`http://localhost:3001/|`${config.API_URL}/|g' \
  {} \;

echo "✅ Substituição concluída!"
echo ""
echo "🔍 Verificando se ainda existem ocorrências..."
remaining=$(grep -r "localhost:3001" --include="*.ts" --include="*.tsx" . | grep -v node_modules | wc -l)
echo "Restantes: $remaining"

if [ $remaining -gt 0 ]; then
  echo ""
  echo "⚠️  Arquivos que ainda contêm localhost:3001:"
  grep -r "localhost:3001" --include="*.ts" --include="*.tsx" . | grep -v node_modules
fi
