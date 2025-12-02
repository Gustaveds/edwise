#!/bin/bash

echo "🔍 Procurando arquivos que usam config.API_URL mas não importam config..."

# Encontrar arquivos que usam config.API_URL
files_using_config=$(grep -rl "config\.API_URL" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v "config.ts")

for file in $files_using_config; do
    # Verificar se já tem import de config
    if ! grep -q "import.*config.*from.*['\"].*config" "$file"; then
        echo "📝 Adicionando import em: $file"
        
        # Calcular o caminho relativo correto
        dir=$(dirname "$file")
        # Contar níveis de profundidade
        depth=$(echo "$dir" | tr -cd '/' | wc -c)
        
        # Construir caminho relativo (cada nível adiciona ../)
        if [ "$depth" -eq 1 ]; then
            import_path="../config"
        elif [ "$depth" -eq 2 ]; then
            import_path="../../config"
        else
            import_path="./config"
        fi
        
        # Adicionar import no início do arquivo (depois de outros imports)
        # Procura pela última linha de import e adiciona depois
        if grep -q "^import " "$file"; then
            # Tem imports, adicionar depois do último
            last_import_line=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)
            sed -i "${last_import_line}a import config from '$import_path';" "$file"
        else
            # Não tem imports, adicionar no início
            sed -i "1i import config from '$import_path';" "$file"
        fi
    fi
done

echo "✅ Imports adicionados!"
echo ""
echo "🔍 Verificando arquivos corrigidos..."
for file in $files_using_config; do
    if grep -q "import.*config" "$file"; then
        echo "✅ $file"
    else
        echo "❌ $file - FALTA IMPORT"
    fi
done
