# 🚀 Deploy no Portainer - Guia de Uso

## ❌ Problema com `:latest`

Quando você usa a tag `:latest` no Portainer/Docker Swarm, o sistema **NÃO consegue detectar** que há uma nova versão da imagem, porque a tag permanece a mesma. Isso resulta em erros como:

```
Failure
Unable to get task: task x197sd0fod0nsa9dcsfbsv6tc not found
```

## ✅ Solução: Sempre Use Tags Versionadas

### 1. Build Local e Push para Docker Hub

No seu computador local, execute:

```bash
cd ~/edwise/scripts
./deploy.sh
```

O script vai:
- Perguntar qual versão você quer usar (ex: `v1.0.1`, `v1.0.2`, etc.)
- Fazer build das imagens
- Fazer push para Docker Hub com a versão específica

### 2. Deploy no Portainer

#### Opção A: Via Interface do Portainer (RECOMENDADO)

1. **Acesse o Portainer**
2. **Vá em Stacks → Add Stack**
3. **Cole o conteúdo do arquivo**: `docker-compose.stack.yml`
4. **Adicione a Variável de Ambiente**:
   ```
   IMAGE_TAG=v1.0.1
   ```
   
   > **Nota**: As outras variáveis (DB, Redis, MinIO, etc.) já estão configuradas diretamente no arquivo docker-compose.

5. **Deploy the stack**

#### Opção B: Via Git Repository no Portainer

1. **Configure um repositório Git** com o `docker-compose.portainer.yml`
2. **No Portainer**: Stacks → Add Stack → Git Repository
3. **Configure as variáveis de ambiente** (mesmas acima)
4. **Deploy**

### 3. Atualizar para Nova Versão

Sempre que quiser fazer deploy de uma nova versão:

1. **No seu computador local**:
   ```bash
   cd ~/edwise/scripts
   ./deploy.sh
   # Digite a nova versão (ex: v1.0.2)
   ```

2. **No Portainer**:
   - Vá na sua Stack
   - Clique em **Edit**
   - **Mude a variável** `IMAGE_TAG=v1.0.2`
   - Clique em **Update the stack**
   - ✅ **Marque**: "Re-pull image and redeploy"

### 4. Rollback para Versão Anterior

Se algo der errado, você pode voltar para uma versão anterior:

1. **No Portainer**: Edite a Stack
2. **Mude** `IMAGE_TAG` para a versão anterior (ex: `v1.0.1`)
3. **Update the stack** com "Re-pull image and redeploy"

## 📋 Resumo das Regras

| ❌ NUNCA FAÇA | ✅ SEMPRE FAÇA |
|---------------|----------------|
| `IMAGE_TAG=latest` | `IMAGE_TAG=v1.0.1` |
| Editar stack sem mudar a tag | Incrementar a versão a cada deploy |
| Usar `:latest` em produção | Usar tags versionadas específicas |

## 🔍 Verificar Versões Disponíveis

Para ver todas as versões publicadas no Docker Hub:

- Backend: https://hub.docker.com/r/thiagouni/edwise-backend/tags
- Frontend: https://hub.docker.com/r/thiagouni/edwise-frontend/tags

## 🆘 Troubleshooting

### Erro: "task not found"
- **Causa**: Você está usando `:latest` ou não mudou a tag
- **Solução**: Use uma tag versionada específica

### Erro: "image not found"
- **Causa**: Você definiu uma tag que não existe no Docker Hub
- **Solução**: Verifique as tags disponíveis no Docker Hub ou faça build+push primeiro

### Stack não atualiza
- **Causa**: Você não marcou "Re-pull image and redeploy"
- **Solução**: Sempre marque essa opção ao atualizar

## 📝 Exemplo Completo de Workflow

```bash
# 1. No seu computador local
cd ~/edwise/scripts
./deploy.sh
# Responda: v1.0.2

# 2. No Portainer
# - Vá na Stack
# - Edit
# - Mude: IMAGE_TAG=v1.0.2
# - ✅ Re-pull image and redeploy
# - Update the stack

# 3. Verifique os logs
# - Clique na Stack
# - Veja os containers rodando
# - Confira os logs de cada serviço
```

## 🎯 Arquivo para Usar no Portainer

Use sempre o arquivo: **`docker-compose.stack.yml`**

Este arquivo:
- ✅ Não tem fallback para `:latest` (mas suporta via variável)
- ✅ Usa a rede externa `tpr_ia` (já existente)
- ✅ Tem configurações de update para zero-downtime
- ✅ Tem labels Traefik configuradas para SSL/HTTPS
- ✅ Usa as credenciais corretas de DB, Redis e MinIO
