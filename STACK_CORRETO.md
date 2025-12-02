# ✅ Docker Compose Stack Corrigido

## 🔴 Problemas Identificados e Corrigidos

### 1. **Nomes de Imagem Incorretos**
```yaml
# ❌ ERRADO
image: thiagouni/edwise-backend-v1.0.1
image: thiagouni/edwise:frontend-v1.0.1

# ✅ CORRETO  
image: thiagouni/edwise-backend:v1.0.1
image: thiagouni/edwise-frontend:v1.0.1
```

### 2. **Serviços Desnecessários Removidos**
O docker-compose anterior tinha serviços que já existem externamente:
- ❌ PostgreSQL (já roda em `***REMOVED_DB_HOST***`)
- ❌ Redis (já roda externamente na mesma máquina)
- ❌ MinIO (já roda em `s3.tgbia.com`)

✅ **Novo stack tem APENAS**:
- Backend
- Frontend

### 3. **Seções Build Removidas**
```yaml
# ❌ ERRADO - não funciona no Portainer
build: ./server
build:
  context: .

# ✅ CORRETO - só pull da imagem
image: thiagouni/edwise-backend:${IMAGE_TAG}
```

---

## 📋 Configuração Atual

### URLs:
- **Backend**: `apiedwise.tgbia.com` (porta 3010)
- **Frontend**: `edwise.tgbia.com` (porta 80)

### Serviços Externos:
- **PostgreSQL**: `***REMOVED_DB_HOST***:5432` (database: EdWise)
- **Redis**: `redis:6379` (DB 15, com senha)
- **MinIO/S3**: `https://s3.tgbia.com` (bucket: edwise)

### Rede:
- **tpr_ia** (externa, compartilhada com Traefik)

---

## 🚀 Workflow de Deploy

### 1. Build Local (com API URL correta)
```bash
cd ~/edwise/scripts
./deploy.sh
# Digite a versão: v1.0.1, v1.0.2, etc.
```

O script agora builda o frontend com:
```bash
docker build --build-arg VITE_API_URL=https://apiedwise.tgbia.com ...
```

### 2. Deploy no Portainer

**Arquivo**: `docker-compose.stack.yml`

**Variável**:
```
IMAGE_TAG=v1.0.1
```

**Passos**:
1. Portainer → Stacks → Add Stack (ou Edit Stack existente)
2. Cole o conteúdo de `docker-compose.stack.yml`
3. Adicione: `IMAGE_TAG=v1.0.1`
4. ✅ "Re-pull image and redeploy"
5. Deploy/Update

### 3. Atualizar Versão

```bash
# Local
./deploy.sh  # v1.0.2

# Portainer
Edit Stack → IMAGE_TAG=v1.0.2 → Update
```

---

## 🔍 Verificação Rápida

Antes de fazer deploy, confirme:

- [ ] Imagens: `thiagouni/edwise-backend:vX.X.X`
- [ ] Imagens: `thiagouni/edwise-frontend:vX.X.X`
- [ ] Tag separada por `:` (não no nome)
- [ ] Sem seção `build:` no docker-compose
- [ ] Apenas backend + frontend (sem db/redis/minio)
- [ ] URLs Traefik corretas (apiedwise.tgbia.com / edwise.tgbia.com)
- [ ] Rede: `tpr_ia` external

---

## 📝 Exemplo Completo

```bash
# 1. Build local
cd ~/edwise/scripts
./deploy.sh
# Responda: v1.0.1

# Output:
# ✅ thiagouni/edwise-backend:latest
# ✅ thiagouni/edwise-backend:v1.0.1
# ✅ thiagouni/edwise-frontend:latest (com VITE_API_URL=https://apiedwise.tgbia.com)
# ✅ thiagouni/edwise-frontend:v1.0.1

# 2. Portainer
# - Stack: edwise
# - Compose: docker-compose.stack.yml
# - Env: IMAGE_TAG=v1.0.1
# - Deploy

# 3. Verificar
# - https://apiedwise.tgbia.com → Backend (API)
# - https://edwise.tgbia.com → Frontend (App)
```
