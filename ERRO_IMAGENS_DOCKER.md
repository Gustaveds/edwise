# ❌ Erros vs ✅ Soluções

## Problema: Nomes de Imagem Incorretos

### ❌ ERRADO (seu docker-compose atual)
```yaml
backend:
  build: ./server  # ❌ Build não funciona no Portainer
  image: thiagouni/edwise-backend-v1.0.1  # ❌ Versão no NOME da imagem

frontend:
  build:
    context: .  # ❌ Build não funciona no Portainer
  image: thiagouni/edwise:frontend-v1.0.1  # ❌ Nome errado do repositório
```

### ✅ CORRETO (docker-compose.stack.yml)
```yaml
backend:
  # ✅ Nome da imagem + tag separados por ":"
  image: thiagouni/edwise-backend:${IMAGE_TAG:-v1.0.1}

frontend:
  # ✅ Repositório correto: edwise-frontend
  image: thiagouni/edwise-frontend:${IMAGE_TAG:-v1.0.1}
```

---

## Diferença Crucial

### Nomenclatura de Imagens Docker

**Formato**: `usuario/repositorio:tag`

| Componente | Exemplo |
|------------|---------|
| Usuário | `thiagouni` |
| Repositório | `edwise-backend` ou `edwise-frontend` |
| Tag (versão) | `v1.0.1` ou `latest` |

**Imagem completa**: `thiagouni/edwise-backend:v1.0.1`

### ❌ Seus Erros

1. **Backend**: `thiagouni/edwise-backend-v1.0.1`
   - Problema: Versão está NO NOME (`edwise-backend-v1.0.1`)
   - Deveria ser: `thiagouni/edwise-backend:v1.0.1`

2. **Frontend**: `thiagouni/edwise:frontend-v1.0.1`
   - Problemas:
     - Repositório errado (`edwise` em vez de `edwise-frontend`)
     - Versão no nome em vez de ser tag
   - Deveria ser: `thiagouni/edwise-frontend:v1.0.1`

---

## O Que o Script deploy.sh Cria

Quando você roda `./deploy.sh` e define versão `v1.0.1`, ele cria:

```bash
docker push thiagouni/edwise-backend:latest
docker push thiagouni/edwise-backend:v1.0.1

docker push thiagouni/edwise-frontend:latest
docker push thiagouni/edwise-frontend:v1.0.1
```

Repositórios no Docker Hub:
- `thiagouni/edwise-backend` (com tags: `latest`, `v1.0.1`)
- `thiagouni/edwise-frontend` (com tags: `latest`, `v1.0.1`)

---

## ✅ Solução Final

### 1. Use o arquivo correto
**Arquivo**: `docker-compose.stack.yml`

### 2. No Portainer
- **Stack Name**: edwise
- **Environment Variable**:
  ```
  IMAGE_TAG=v1.0.1
  ```

### 3. Workflow Completo

```bash
# Local: Build e Push
cd ~/edwise/scripts
./deploy.sh
# Digite: v1.0.1

# Portainer: Deploy
1. Stacks → Add Stack
2. Cole conteúdo de: docker-compose.stack.yml
3. Environment Variable: IMAGE_TAG=v1.0.1
4. Deploy

# Portainer: Atualizar
1. Local: ./deploy.sh → v1.0.2
2. Portainer: Edit Stack → IMAGE_TAG=v1.0.2
3. ✅ "Re-pull image and redeploy"
4. Update the stack
```

---

## 🎯 Checklist Rápido

Antes de fazer deploy, verifique:

- [ ] Imagens têm formato: `thiagouni/edwise-backend:v1.0.1`
- [ ] Tags são separadas por `:` (não fazem parte do nome)
- [ ] Repositório frontend é `edwise-frontend` (não `edwise`)
- [ ] Não tem seção `build:` no docker-compose
- [ ] Variável `IMAGE_TAG` está definida no Portainer
- [ ] A tag existe no Docker Hub (verificar antes)
