# Configuração Redis - Local vs Produção

## ✅ Solução Implementada

O Redis já existe no seu servidor e está configurado corretamente em produção.

### Desenvolvimento Local (.env)
```bash
REDIS_HOST=***REMOVED_DB_HOST***  # IP do servidor
REDIS_PORT=6379
REDIS_PASSWORD=***REMOVED_REDIS_PASSWORD***
REDIS_DB=15
```

### Produção (docker-compose.stack.yml)
```yaml
environment:
  - REDIS_HOST=redis  # Hostname dentro da rede Docker
  - REDIS_PORT=6379
  - REDIS_PASSWORD=***REMOVED_REDIS_PASSWORD***
  - REDIS_DB=15
```

## Como Funciona

1. **Local**: Usa IP `***REMOVED_DB_HOST***` para conectar diretamente no Redis remoto
2. **Produção**: Docker Stack sobrescreve `REDIS_HOST=redis` via environment no `docker-compose.stack.yml`

## Testando

```bash
# Testar conexão local
node -e "const Redis = require('ioredis'); const r = new Redis({host: '***REMOVED_DB_HOST***', port: 6379, password: '***REMOVED_REDIS_PASSWORD***', db: 15}); r.ping().then(console.log)"

# Deve retornar: PONG
```

## Arquivos Atualizados

- ✅ `.env` - REDIS_HOST com IP para dev local
- ✅ `docker-compose.stack.yml` - REDIS_HOST=redis (já estava correto)
- ✅ `server/services/queue.js` - Lê variáveis de ambiente (já estava correto)

## Agora pode rodar:

```bash
cd scripts
./start.sh
```

Não haverá mais erro `ECONNREFUSED 127.0.0.1:6379` ✅
