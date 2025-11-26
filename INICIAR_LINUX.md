# Como Iniciar a Plataforma EdWise AI no Linux/WSL

## Pré-requisitos

Certifique-se de ter instalado:
- **Node.js** (versão 18 ou superior)
- **npm** (geralmente vem com Node.js)
- **Git** (opcional, para controle de versão)

## Instruções de Uso

### 1️⃣ Primeira Execução

Na primeira vez que for executar o projeto, siga estes passos:

```bash
# Navegue até o diretório do projeto
cd /home/thiago/edwise

# Torne o script executável (só precisa fazer isso uma vez)
chmod +x start.sh

# Execute o script
./start.sh
```

### 2️⃣ Execuções Posteriores

Nas próximas vezes, basta executar:

```bash
cd /home/thiago/edwise
./start.sh
```

## O que o Script Faz

O script `start.sh` realiza as seguintes operações automaticamente:

1. **Verifica e Instala Dependências**
   - Instala dependências do frontend (se necessário)
   - Instala dependências do backend (se necessário)

2. **Inicializa o Banco de Dados**
   - Executa o script `server/init-db.js` (se existir)
   - Solicita confirmação se houver erro na inicialização

3. **Inicia os Serviços**
   - **Backend**: Inicia na porta 3001
   - **Frontend**: Inicia na porta 3000

## URLs de Acesso

Após a inicialização bem-sucedida:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

## Logs

Os logs são salvos em arquivos separados:

```bash
# Ver logs do backend em tempo real
tail -f backend.log

# Ver logs do frontend em tempo real
tail -f frontend.log
```

## Encerrar os Serviços

Para encerrar todos os serviços:

```bash
# Pressione Ctrl+C no terminal onde o script está rodando
```

O script irá automaticamente encerrar todos os processos (frontend e backend).

## Solução de Problemas

### Erro de Permissão

Se receber erro de permissão ao executar o script:

```bash
chmod +x start.sh
```

### Porta em Uso

Se alguma porta estiver em uso, você pode encontrar e matar o processo:

```bash
# Encontrar processo usando a porta 3000
lsof -i :3000

# Matar processo (substitua PID pelo número do processo)
kill -9 PID
```

### Limpar node_modules

Se tiver problemas com dependências:

```bash
# Limpar node_modules do frontend
rm -rf node_modules

# Limpar node_modules do backend
rm -rf server/node_modules

# Executar o script novamente (ele reinstalará as dependências)
./start.sh
```

## Diferenças do Windows

Este script substitui os seguintes arquivos do Windows:

- **START.bat** → **start.sh**
- **start.ps1** → funcionalidade integrada no start.sh

---

## Executar Diretamente do Windows (PowerShell)

Se preferir executar a partir do PowerShell do Windows:

```powershell
wsl bash /home/thiago/edwise/start.sh
```

