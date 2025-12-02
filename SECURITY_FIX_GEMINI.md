# 🔴 PROBLEMA CRÍTICO DE SEGURANÇA: Gemini API no Frontend

## ❌ Erro Atual

```
Uncaught Error: An API Key must be set when running in a browser
```

## 🚨 O Problema

O **frontend está tentando usar a API do Gemini diretamente no browser**, o que é um **problema CRÍTICO de segurança**:

1. ❌ **Chave da API exposta** - qualquer pessoa pode ver sua `GEMINI_API_KEY` no código JavaScript
2. ❌ **Custo ilimitado** - qualquer pessoa pode fazer requisições infinitas usando sua chave
3. ❌ **Violação de segurança** - a chave deveria estar APENAS no servidor

## 📁 Arquivos Problemáticos

### Frontend (❌ **INSEGURO**)
- `package.json` - tem `"@google/genai": "^1.29.1"`
- `services/geminiService.ts` - chama Gemini diretamente
- `components/ChatAssistant.tsx` - usa `geminiService`
- `components/KeyPointsExtractor.tsx` - usa `geminiService`

### Backend (✅ **SEGURO**)
- `server/services/geminiAgent.js` - ✅ Correto
- `server/services/videoAI.js` - ✅ Correto
- `server/index.js` - rota `/api/agent` - ✅ Correto

---

## ✅ Solução

### 1. Remover Gemini do Frontend

```bash
cd ~/edwise
npm uninstall @google/genai
```

### 2. Deletar Arquivo Inseguro

```bash
rm services/geminiService.ts
```

### 3. Criar Service Seguro no Frontend

Arquivo: `services/apiService.ts`
```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adicionar token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Chat Assistant via Backend
export const sendMessage = async (message: string, courseId?: number) => {
  const response = await api.post('/api/agent', { message, courseId });
  return response.data.reply;
};

// TODO: Adicionar endpoints no backend para:
// - generateQuiz()
// - generateFlashcards()
// - extractKeyPoints()
// - generateSummary()
```

### 4. Atualizar Componentes

#### ChatAssistant.tsx
```typescript
// ❌ ANTES
import { answerQuestion } from '../services/geminiService';

// ✅ DEPOIS
import { sendMessage } from '../services/apiService';

// Uso:
const reply = await sendMessage(message, courseId);
```

#### KeyPointsExtractor.tsx
```typescript
// ❌ ANTES
import { extractKeyPoints } from '../services/geminiService';

// ✅ DEPOIS
// Criar endpoint no backend primeiro
// POST /api/extract-key-points { context: string }
```

### 5. Criar Rotas Faltantes no Backend

Se alguma funcionalidade do `geminiService.ts` não tiver endpoint no backend, você precisa criar. Exemplo:

```javascript
// server/index.js

// Extrair Key Points
app.post('/api/extract-key-points', authenticateToken, async (req, res) => {
  if (req.user.role !== 'professor') return res.sendStatus(403);
  
  const { context } = req.body;
  
  try {
    // Usar geminiAgent.js ou videoAI.js
    const keyPoints = await extractKeyPoints(context);
    res.json({ keyPoints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  }
});

// Generate Quiz
app.post('/api/generate-quiz', authenticateToken, async (req, res) => {
  const { context, topic, numberOfQuestions } = req.body;
  
  try {
    const quiz = await  generateQuizWithGemini(context, topic, numberOfQuestions);
    res.json({ quiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ... etc
```

---

## 🔒 Regra de Ouro

| ❌ NUNCA | ✅ SEMPRE |
|----------|-----------|
| Chamar Gemini no frontend | Chamar Gemini no backend |
| Expor API keys no browser | Guardar API keys no servidor |
| `import { GoogleGenAI }` no frontend | `import { GoogleGenerativeAI }` no servidor |

---

## 📋 Checklist de Segurança

- [ ] Remover `@google/genai` do `package.json` (frontend)
- [ ] Deletar `services/geminiService.ts`
- [ ] Criar `services/apiService.ts` para chamadas ao backend
- [ ] Atualizar todos os componentes para usar `apiService`
- [ ] Criar rotas backend faltantes (se necessário)
- [ ] Testar que não há erros de "API Key must be set" no browser
- [ ] Verificar que nenhuma variável `GEMINI_API_KEY` existe no frontend

---

## 🚀 Deploy Após Correção

Depois de fazer essas mudanças:

```bash
# 1. Build local
cd ~/edwise/scripts
./deploy.sh
# Digite: v1.0.2 (nova versão)

# 2. Portainer
# Edit Stack → IMAGE_TAG=v1.0.2 → Update
```

---

## 📖 Por Que Isso é Importante?

**Cenário Real**:
1. Alguém abre o DevTools no browser
2. Vê seu código JavaScript
3. Encontra a chave da API: `***REMOVED_GEMINI_API_KEY***`
4. ✅ Usa sua chave para fazer milhares de requisições
5. 💸 Você recebe uma conta de milhares de dólares

**Com backend**:
1. A chave fica APENAS no servidor
2. Ninguém pode ver
3. Você controla o acesso com autenticação JWT
4. 🔒 Seguro!
