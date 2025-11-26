# Plataforma EdWise AI – Guia do Projeto

Este repositório contém o front-end da Plataforma EdWise AI, uma aplicação de apoio a professores e alunos com recursos de IA para:

- Enviar e gerenciar conteúdos (vídeos, arquivos, materiais).
- Extrair pontos-chave de conteúdos.
- Gerar quizzes, flashcards e resumos automáticos.
- Oferecer um chat inteligente para alunos, conectado ao conteúdo do curso.
- Acompanhar análises de engajamento e feedback dos alunos em um painel para professores.

A interface é construída em React + Vite, usa Tailwind CSS via CDN e dá suporte completo a modo claro/escuro.

---

## 1. Paleta de Cores e Tema (Light/Dark)

O sistema de cores é construído com [Tailwind CSS](https://tailwindcss.com/) e foi pensado para funcionar em ambos os temas:

- **Modo claro:** foco em fundo claro (`gray-50`/`gray-100`) e textos escuros.
- **Modo escuro:** classe `dark` aplicada no `<html>` e no `<body>`, ativando variantes `dark:*` em toda a aplicação.

O tema é controlado por:

- Script em `index.html` que lê `localStorage.theme` e/ou `prefers-color-scheme`.
- `ThemeProvider` em `contexts/ThemeContext.tsx`, que:
  - Lê o tema inicial (localStorage ou sistema).
  - Adiciona/remove a classe `dark`.
  - Persiste a escolha em `localStorage`.
  - Expõe `theme` e `toggleTheme` via `useTheme`.
- O botão de alternância de tema fica no header (`components/WebhookDocs.tsx`), usando o contexto para mudar entre `light` e `dark`.

### 1.1 Cores Primárias (Azul)

O azul é a cor principal da marca, usada para ações primárias, links, estados ativos e destaques.

| Cor       | Hex       | Uso (Modo Claro)                                                                                     | Uso (Modo Escuro)                                                                                  |
|----------|-----------|-------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `blue-50`  | `#eff6ff` | Fundo de hover para D&D de arquivos, fundo de flashcards (verso).                                   | —                                                                                                  |
| `blue-100` | `#dbeafe` | Fundo de ícones em cards, fundo de opções selecionadas no quiz, fundo do botão de "Configurações" ativo. | —                                                                                                  |
| `blue-300` | `#93c5fd` | Borda de flashcards, anel de foco em opções de quiz.                                                | —                                                                                                  |
| `blue-400` | `#60a5fa` | —                                                                                                   | Texto de botões de abas ativas, links, texto do botão "Configurações" ativo.                      |
| `blue-500` | `#3b82f6` | Cor do anel de foco para inputs, ícones de pontos-chave extraídos, marcador de resumo.             | Borda de hover para D&D de arquivos.                                                              |
| `blue-600` | `#2563eb` | Botões primários, links, bolha de chat do usuário, abas ativas, barra de progresso.                | Igual ao modo claro.                                                                              |
| `blue-700` | `#1d4ed8` | Cor de hover para botões primários, texto de abas ativas.                                          | Igual ao modo claro.                                                                              |
| `blue-800` | `#1e40af` | Títulos principais do logo, texto do cabeçalho do quiz.                                            | Borda de flashcards.                                                                              |
| `blue-900` | `#1e3a8a` | Gradiente do painel de login.                                                                      | Fundo de hover para D&D de arquivos, fundo de flashcards (verso), fundo de ícones.               |

### 1.2 Cores Neutras (Cinza, Branco, Preto)

As cores neutras formam a base da interface: fundos, texto, bordas e painéis.

| Cor               | Uso (Modo Claro)                                                                                      | Uso (Modo Escuro)                                                                                      |
|-------------------|--------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| `white` / `black` | Fundo principal / Texto principal.                                                                    | Texto principal / Fundo de modais.                                                                    |
| `gray-50`         | Fundo de itens de feedback, fundo de listas de resultados, fundo do container do quiz.               | —                                                                                                      |
| `gray-100`        | Fundo principal do corpo da página, fundo de abas, fundo da bolha de chat da IA.                     | —                                                                                                      |
| `gray-200`        | Borda de botões secundários, fundo de botões de navegação do quiz, fundo do botão de cancelar.       | —                                                                                                      |
| `gray-300`        | Texto de descrições, bordas de inputs, cor de hover para botões secundários.                         | Texto de descrições.                                                                                  |
| `gray-400`        | Texto de placeholders, ícones em inputs, texto secundário.                                            | Texto de placeholders, ícones, texto secundário.                                                      |
| `gray-500`        | Texto de parágrafos e legendas.                                                                       | Botão de envio de chat desabilitado.                                                                  |
| `gray-600`        | Texto de abas inativas, bordas de inputs.                                                             | Botões de navegação do quiz, botão de fechar modal.                                                   |
| `gray-700`        | Texto de botões secundários, fundo de abas ativas (escuro).                                           | Fundo de painéis, abas ativas, bolha de chat da IA, fundo de flashcards (frente).                     |
| `gray-800`        | Texto principal, fundo de painéis (escuro).                                                           | Fundo de painéis principais, fundo do corpo da página, fundo de inputs.                               |
| `gray-900`        | Fundo de abas (escuro), fundo de inputs (escuro).                                                     | Fundo do corpo da página, fundo de abas.                                                              |

### 1.3 Cores de Feedback e Status

Usadas para comunicar sucesso, erro, alerta ou informação ao usuário.

| Cor          | Categoria | Uso                                                                                                          |
|--------------|----------|--------------------------------------------------------------------------------------------------------------|
| `green-100`  | Sucesso  | Fundo de mensagens de sucesso.                                                                              |
| `green-500`  | Sucesso  | Ícone de "joinha" no feedback, ícone de sucesso no modal de "Esqueci a Senha".                            |
| `green-600`  | Sucesso  | Botão de "Enviar Quiz".                                                                                    |
| `green-800`  | Sucesso  | Texto de mensagens de sucesso.                                                                              |
| `red-100`    | Erro     | Fundo de mensagens de erro.                                                                                 |
| `red-500`    | Erro     | Ícone de "não joinha", ícone de PDF, ícone de perguntas críticas, ícone de deletar arquivo.               |
| `red-600`    | Erro     | Cor do texto para ícones de alerta.                                                                         |
| `red-800`    | Erro     | Texto de mensagens de erro.                                                                                 |
| `yellow-100` | Alerta   | Fundo do ícone do card "Principal Tópico de Dúvida".                                                      |
| `yellow-600` | Alerta   | Cor do ícone no card "Principal Tópico de Dúvida".                                                        |
| `orange-500` | Destaque | Ícone para arquivos de apresentação (PPTX).                                                                 |
| `purple-100` | Destaque | Fundo da tag de tópico no relatório de feedback.                                                            |
| `purple-500` | Destaque | Ícone do título "Relatório de Feedback dos Alunos".                                                       |
| `purple-800` | Destaque | Texto da tag de tópico no relatório de feedback.                                                            |

### 1.4 Cores de Gráficos (Analytics)

Paleta vibrante usada nos gráficos do painel de análises.

| Cor   | Hex       |
|-------|-----------|
| Azul  | `#0088FE` |
| Verde | `#00C49F` |
| Amarelo | `#FFBB28` |
| Laranja | `#FF8042` |
| Roxo  | `#AF19FF` |

---

## 2. Como Rodar o Projeto

### 2.1 Pré-requisitos

- Node.js 18+ instalado.
- npm ou yarn (o projeto usa npm nos scripts).

### 2.2 Instalação

Na pasta do projeto:

```bash
npm install
```

### 2.3 Ambiente

O projeto usa a API do Gemini via `@google/genai`. A chave é lida de `process.env.API_KEY`, configurada pelo Vite a partir de `GEMINI_API_KEY`.

Crie um arquivo `.env.local` na raiz (se ainda não existir) com:

```bash
GEMINI_API_KEY=SUAS_CHAVE_DO_GEMINI_AQUI
```

### 2.4 Rodando em modo desenvolvimento

```bash
npm run dev
```

O Vite subirá por padrão em `http://localhost:3000` (conforme `vite.config.ts`).

### 2.5 Build para produção

```bash
npm run build
```

E para servir o build:

```bash
npm run preview
```

---

## 3. Arquitetura do Front-end (Visão Geral)

- `index.html`: carrega Tailwind via CDN, configura `darkMode: 'class'` e aplica o tema inicial baseado em `localStorage` e nas preferências do sistema.
- `index.tsx`: cria a raiz React, envolve a aplicação com `ThemeProvider` e `AnalyticsProvider`.
- `App.tsx`: controla autenticação fake (login “simulado”), alterna entre:
  - Painel do Professor (`ProfessorDashboard`).
  - Painel do Aluno (`StudentDashboard`).
  - Configurações (`SettingsDashboard`).
- `components/`:
  - `Login`, `ForgotPassword`: tela de autenticação.
  - `ProfessorDashboard`: abas para upload, extração de pontos-chave e analytics.
  - `StudentDashboard`: lista de cursos e acesso ao `ChatAssistant`.
  - `ChatAssistant`: chat com IA, geração de quiz, flashcards, resumo, envio de webhooks e registro de analytics.
  - `AnalyticsDashboard`: visualização de interações/quizzes/feedbacks.
  - Outros componentes de UI (quiz, flashcards, feedback modal, etc.).
- `contexts/`:
  - `ThemeContext`: controle de tema claro/escuro.
  - `AnalyticsContext`: coleta interações, quizzes concluídos e feedbacks para exibição no painel do professor.
- `services/`:
  - `geminiService.ts`: integrações com a API do Gemini (perguntas, quizzes, flashcards, resumos).
  - `webhookService.ts`: envio de webhooks para o back-end.

---

## 4. Conectando o Front às Funcionalidades do Back via Webhook

### 4.1 Modelo de Integração

O back-end está exposto via um **endpoint de webhook** (por exemplo, `https://minha-api.com/webhook`).  
Neste projeto, o front não conversa diretamente com o back via REST tradicional em todos os fluxos, mas usa webhooks em pontos estratégicos:

- Quando o aluno conclui um quiz.
- Opcionalmente, quando conteúdos são enviados (poderia ser estendido).

O arquivo central dessa integração é:

- `services/webhookService.ts`

Ele define:

- `saveWebhookUrl(url: string)`: salva a URL do webhook no `localStorage`.
- `getWebhookUrl()`: lê a URL salva.
- `sendWebhook(payload: WebhookPayload)`: envia um `POST` com JSON para o webhook configurado.

A URL é configurada pelo usuário na tela de configurações:

- `components/SettingsDashboard.tsx`:
  - Input para a URL do webhook.
  - Botão “Salvar URL” que chama `saveWebhookUrl`.

### 4.2 Formato dos Payloads

Os tipos estão em `types.ts`:

- `WebhookEvent`:
  - `CONTENT_UPLOADED = 'content.uploaded'`
  - `QUIZ_COMPLETED = 'quiz.completed'`
- `YoutubeUploadPayload` / `FileUploadPayload`:
  - Informações sobre o conteúdo enviado (YouTube ou arquivo).
- `QuizCompletionPayload`:
  - `eventType: WebhookEvent.QUIZ_COMPLETED`
  - `courseId`, `courseTitle`
  - `results`: array de `QuizResult` (questão, resposta do usuário, se está correta).
  - `score`, `total`, `timestamp`.

O front, ao enviar `sendWebhook(payload)`, faz:

```ts
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

O back-end deve:

- Receber `POST /webhook` (ou rota equivalente).
- Ler o `eventType` do payload.
- Tratar cada tipo:
  - `content.uploaded`: atualizar banco com novos conteúdos.
  - `quiz.completed`: registrar tentativa de quiz, nota, questões erradas, etc.
- Retornar `2xx` (idealmente `200` ou `204`) para indicar sucesso.

### 4.3 Fluxo de “Quiz Completed” (Aluno ? Back-end ? Analytics)

1. **Aluno responde o quiz** no `ChatAssistant` (`QuizView` + `handleQuizComplete`).
2. `handleQuizComplete`:
   - Calcula acertos e nota.
   - Atualiza o chat com uma mensagem de resultado.
   - Chama:
     - `recordQuizCompletion(...)` (AnalyticsContext) para o painel do professor.
     - `sendWebhook({...})` com um `QuizCompletionPayload`.
3. **Back-end (webhook)**:
   - Recebe o JSON com `eventType: 'quiz.completed'`.
   - Valida e persiste em banco (por exemplo, `quiz_attempts`).
   - Pode disparar outros fluxos (notificações, recomendações, etc.).
4. **Professor (AnalyticsDashboard)**:
   - Ao abrir a aba de “Análises dos Alunos”, vê:
     - Número total de interações.
     - Quantidade de quizzes concluídos.
     - Feedbacks agregados (positivos/negativos, texto).
   - O que vem do webhook/back-end pode complementar essa visão no futuro (por exemplo, comparando dados reais do servidor com o que foi capturado no front).

### 4.4 Boas práticas para conectar front e back

1. **Definir contratos claros de payload**  
   - Use os tipos de `types.ts` como referência para o que o back-end deve esperar.
   - Qualquer alteração de campos deve ser refletida tanto no front quanto no back.

2. **Usar uma única URL de webhook configurável na UI**  
   - A tela de configurações (`SettingsDashboard`) já permite configurar a URL.
   - Em produção, mantenha essa URL apontando para o endpoint público do seu back-end.

3. **Tratar erros de rede de forma “silenciosa” para o usuário**  
   - `sendWebhook` já faz `console.error` sem quebrar a UI.
   - Para produção, você pode adicionar:
     - Monitoramento (Sentry/LogRocket).
     - Re-tentativas ou fila local, se necessário.

4. **Logar eventos importantes no back-end**  
   - Cada payload recebido deve gerar logs estruturados (eventType, userId, courseId).
   - Isso ajuda a debugar casos em que o front enviou, mas o dado não chegou onde deveria.

5. **Sincronizar Analytics do front com o back**  
   - Hoje, o `AnalyticsContext` mantém um snapshot local das interações da sessão.
   - Uma evolução natural:
     - Persistir essas interações via webhook ou API REST.
     - No painel do professor, buscar os dados agregados diretamente do back (em vez de só da memória do front).

### 4.5 Exemplo de implementação no back (conceitual)

Suponha um back em Node/Express:

```ts
app.post('/webhook', express.json(), (req, res) => {
  const event = req.body;

  switch (event.eventType) {
    case 'quiz.completed':
      // salvar tentativa de quiz, nota, etc.
      // ex: QuizAttempt.create(event);
      break;
    case 'content.uploaded':
      // registrar conteúdo enviado
      break;
    default:
      console.warn('Evento de webhook desconhecido:', event.eventType);
  }

  res.status(200).send({ ok: true });
});
```

No front, basta garantir que:

- A URL configurada em `SettingsDashboard` aponte para esse endpoint.
- O payload enviado por `sendWebhook` corresponda exatamente ao que o back espera.

---

## 5. Próximos Passos

- Integrar o painel de analytics com dados reais do back-end (além dos dados coletados em memória).
- Estender o uso do webhook para outros eventos (por exemplo, upload de conteúdo, feedbacks textuais, etc.).
- Adicionar autenticação real no front, consumindo um endpoint de login do back-end, e ligar os eventos de analytics a um `userId` real.  

Com isso, você terá:

- Um front responsivo, com tema claro/escuro bem definido.
- Fluxos de aluno e professor integrados.
- Uma base sólida para conectar e expandir funcionalidades com o seu back-end já hospedado.
