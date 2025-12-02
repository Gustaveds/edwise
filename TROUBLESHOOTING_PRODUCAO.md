# 🔍 Troubleshooting: Erro de Conexão em Produção

## 🔴 Erro Atual

```
ERR_BLOCKED_BY_CLIENT
TypeError: Failed to fetch
```

## 🎯 Causas Possíveis

### 1. **Ad Blocker (Mais Comum)**

**Sintoma**: `ERR_BLOCKED_BY_CLIENT`

**Causa**: Extensões de navegador (uBlock Origin, AdBlock, Brave Shields, etc.) bloqueiam requisições que parecem "suspeitas"

**Solução**:
```
1. Abrir DevTools (F12)
2. Console → Verificar se tem "blocked by client"
3. Desabilitar ad blocker para edwise.tgbia.com
4. Adicionar à whitelist:
   - edwise.tgbia.com
   - apiedwise.tgbia.com
```

**Como desabilitar**:
- **uBlock Origin**: Clique no ícone → Clique no botão power (desliga para este site)
- **AdBlock Plus**: Clique no ícone → "Pause on this site"
- **Brave**: Shields → Desabilitar shields para este site

---

### 2. **Backend Não Está Rodando**

**Verificar no Portainer**:
```
1. Stacks → edwise
2. Verificar status de "edwise_backend"
3. Se não está "running" → Ver logs
```

**Ver logs do backend**:
```
1. Portainer → Containers
2. Clique em "edwise_backend"
3. Logs → Ver se tem erros
```

**Erro comum nos logs**:
```
❌ Error: connect ECONNREFUSED ***REMOVED_DB_HOST***:5432
```

---

### 3. **Banco de Dados Não Acessível**

**Causa**: O servidor Docker não consegue acessar `***REMOVED_DB_HOST***:5432`

**Teste de conectividade no Portainer**:
```
1. Containers → edwise_backend → Console
2. Executar:
   nc -zv ***REMOVED_DB_HOST*** 5432
   
Esperado: "Connection to ***REMOVED_DB_HOST*** 5432 succeeded"
Se falhar: "Connection refused" ou "timeout"
```

**Teste de DNS/Ping**:
```
ping ***REMOVED_DB_HOST***
```

**Soluções**:
- Verificar se o PostgreSQL está rodando em `***REMOVED_DB_HOST***`
- Verificar firewall/security group permitindo conexões da porta 5432
- Verificar se o IP está correto

---

### 4. **Variáveis de Ambiente Incorretas**

**Verificar no Portainer**:
```
1. Stacks → edwise → Editor
2. Verificar:
   - DB_HOST=***REMOVED_DB_HOST***
   - DB_USER=postgres
   - DB_PASSWORD=(senha correta)
   - DB_DATABASE=EdWise
   - DB_PORT=5432
```

**Testar credenciais manualmente**:
```bash
# Do seu computador/servidor:
psql -h ***REMOVED_DB_HOST*** -p 5432 -U postgres -d EdWise
# Digite a senha: ***REMOVED_DB_PASSWORD***
```

Se funcionar localmente mas não no Docker:
- Problema de rede/firewall entre Docker e DB

---

### 5. **CORS Issues (Menos Provável)**

**Sintoma**: Requisições bloqueadas de `edwise.tgbia.com` para `apiedwise.tgbia.com`

**Verificar**: 
O docker-compose tem configurações CORS corretas:
```yaml
- "traefik.http.middlewares.edwise_cors.headers.accessControlAllowOriginList=https://edwise.tgbia.com"
```

**Teste**:
```javascript
// No console do navegador (F12)
fetch('https://apiedwise.tgbia.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Esperado: `{status: 'ok', time: '...'}`

---

## 🔧 Checklist de Diagnóstico

Execute na ordem:

### 1. Verificar Ad Blocker
- [ ] Desabilitado para edwise.tgbia.com?
- [ ] Desabilitado para apiedwise.tgbia.com?
- [ ] Testar em aba anônima (sem extensões)

### 2. Verificar Backend
- [ ] Container `edwise_backend` está "running"?
- [ ] Logs do backend mostram "Connected to PostgreSQL"?
- [ ] Endpoint `/api/health` responde?

### 3. Verificar Conectividade DB
- [ ] `nc -zv ***REMOVED_DB_HOST*** 5432` funciona do container?
- [ ] Credenciais estão corretas?
- [ ] PostgreSQL aceita conexões remotas?

### 4. Verificar Frontend
- [ ] Frontend carregou corretamente?
- [ ] Console do browser mostra erro específico?
- [ ] URL da API está correta? (`https://apiedwise.tgbia.com`)

---

## 🚀 Comandos Úteis

### Testar Conectividade do Backend

**Exec no container backend**:
```bash
# No Portainer → Container → Console
nc -zv ***REMOVED_DB_HOST*** 5432       # Teste porta PostgreSQL
nc -zv redis 6379                # Teste Redis
ping ***REMOVED_DB_HOST***               # Teste rede
```

**Teste psql**:
```bash
# Se tiver psql instalado no container
psql -h ***REMOVED_DB_HOST*** -U postgres -d EdWise -c "SELECT NOW();"
```

### Ver Logs em Tempo Real

**Portainer**:
```
Containers → edwise_backend → Logs → Auto-refresh ON
```

**Docker CLI**:
```bash
docker service logs -f edwise_backend --tail 100
```

### Reiniciar Stack

**Portainer**:
```
Stacks → edwise → Stop → Start
```

---

## 💡 Solução Rápida (Teste)

**1. Desabilitar Ad Blocker**

**2. Testar endpoint direto**:
```
Abrir em nova aba:
https://apiedwise.tgbia.com/api/health

Esperado:
{"status":"ok","time":"2025..."}

Se não funcionar → Problema no backend
```

**3. Ver logs do Portainer**:
```
Containers → edwise_backend → Logs

Procurar por:
✓ Connected to PostgreSQL
❌ Error connecting to database
```

---

## 📞 Próximos Passos

1. **Desabilitar ad blocker** e tentar novamente
2. **Verificar logs** do backend no Portainer
3. **Testar** `/api/health` diretamente
4. **Reportar** qual erro específico aparece nos logs

Se o erro persistir, me envie:
- Screenshot dos logs do backend
- Resultado de `https://apiedwise.tgbia.com/api/health`
- Console do browser (F12)
