# Opções para Resolver Redis ECONNREFUSED

## ❌ Problema
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

O worker de processamento de vídeo precisa do Redis (BullMQ queue), mas o Redis não está rodando localmente.

---

## ✅ Solução 1: Usar Docker para Redis (Recomendado)

### Passo 1: Iniciar Redis com Docker Compose

```bash
# No diretório do projeto
docker-compose -f docker-compose.local.yml up -d redis
```

Isso iniciará apenas o Redis em background na porta 6379.

### Passo 2: Iniciar o sistema normalmente

```bash
cd scripts
./start.sh
```

### Para parar o Redis depois:
```bash
docker-compose -f docker-compose.local.yml down
```

---

## ✅ Solução 2: Instalar Redis Localmente

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server -y
sudo systemctl start redis
sudo systemctl enable redis

# Verificar se está rodando
redis-cli ping
# Deve retornar: PONG
```

Depois execute:
```bash
cd scripts
./start.sh
```

---

## ✅ Solução 3: Desabilitar Worker Temporariamente

Se você **não precisa processar vídeos agora** (para testes simples), pode desabilitar o worker:

### Edite `server/index.js`

Comente as linhas que inicializam a queue:

```javascript
// Linha ~55-57
// import { videoQueue } from './services/queue.js';
// import './worker.js';  // Comentar esta linha para desabilitar worker
```

> ⚠️ **ATENÇÃO**: Com essa opção, vídeos **NÃO serão processados** automaticamente. Você precisará processar manualmente via API depois.

---

## 🔍 Verificar Status do Redis

```bash
# Verificar se está rodando
redis-cli ping

# Ver conexões
redis-cli client list

# Ver logs (Docker)
docker logs edwise-redis-local
```

---

## 📝 Arquivos Modificados

- ✅ `.env` - Adicionadas variáveis `REDIS_HOST`, `REDIS_PORT`, etc.
- ✅ `docker-compose.local.yml` - Novo arquivo para desenvolvimento local

---

## 💡 Recomendação

Use **Solução 1** (Docker) pois:
- Não polui seu sistema com instalações globais
- Fácil de iniciar/parar
- Mesma configuração que produção
- Já configurado no `docker-compose.local.yml`
