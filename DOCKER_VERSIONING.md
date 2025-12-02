# Versionamento Docker - EdWise

Este arquivo armazena a versão/tag atual usada nos deploys.

**Formato**: Semantic Versioning (v{major}.{minor}.{patch}[-sufixo])

## Como Usar

### Deploy Normal (mesma versão)
```bash
./scripts/deploy.sh
# Pergunta se quer continuar com v1.0.0
# Pressione Y para continuar
```

### Alterar Versão
```bash
./scripts/deploy.sh
# Quando perguntado, pressione 'n'
# Digite a nova versão: v1.1.0
```

### Usar Versão Específica no Servidor

#### Desenvolvimento Local
```bash
# Rodar com versão específica
IMAGE_TAG=v1.0.0 docker-compose up -d

# Ou usar latest (apenas em desenvolvimento)
docker-compose up -d
```

#### ⚠️ Produção / Portainer

> **IMPORTANTE**: NUNCA use `:latest` em produção ou no Portainer!

```bash
# ✅ CORRETO - sempre use versão específica
IMAGE_TAG=v1.0.1 docker-compose -f docker-compose.portainer.yml up -d

# ❌ ERRADO - vai causar erros no Portainer
IMAGE_TAG=latest docker-compose up -d
```

**Por quê?** O Docker Swarm/Portainer não consegue detectar atualizações quando a tag permanece `latest`, resultando em erros como:
```
Unable to get task: task xyz not found
```

📖 **Veja o guia completo**: [PORTAINER_DEPLOY.md](./PORTAINER_DEPLOY.md)

## Exemplos de Tags Válidas

✅ **Válidas:**
- `v1.0.0` - Release estável
- `v1.2.3` - Versão com bugfixes
- `v2.0.0-beta` - Beta release
- `v1.5.0-rc.1` - Release candidate
- `v0.1.0-alpha` - Alpha release

❌ **Inválidas:**
- `1.0.0` (falta o `v`)
- `v1.0` (falta patch version)
- `latest` (não é semântico)
- `dev` (não é semântico)

## Changelog

Quando mudar a versão, documente aqui o que mudou:

### v1.0.0 (Inicial)
- Deploy inicial com versionamento
- Backend monolítico com Whisper
- Frontend React com Vite
