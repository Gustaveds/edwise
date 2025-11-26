# Documentação de Integração: Front-end Legado vs. Automação

**Arquivos Analisados:**
- `AUTOMAÇÕES/old_front.html` (Interface de Upload)
- `AUTOMAÇÕES/old_chat.html` (Interface de Chat)
- `AUTOMAÇÕES/P.I (2).json` (Fluxo n8n)

## 1. `old_front.html` (Upload de Conteúdo)

### Funcionalidade
Esta interface permite que o usuário envie vídeos do YouTube ou faça upload de arquivos para o sistema.

### Integração com n8n
- **Método:** `POST`
- **Payload (YouTube):**
  ```json
  {
    "type": "youtube",
    "videoUrl": "...",
    "videoId": "...",
    "timestamp": "..."
  }
  ```
- **Payload (Arquivo):** `FormData` com arquivos anexados.
- **Status Atual:**
  - O código aponta para `https://webhooks.tgbia.com/webhook/abc`.
  - **Ação Necessária:** Para funcionar com o fluxo `P.I (2).json`, esta URL deve ser atualizada para o Webhook de produção do n8n correspondente ao nó de entrada do fluxo de ingestão (provavelmente o nó `Webhook1` com ID `65454564aawdaw-awdawaw64565` ou o `Webhook` com ID `bf857838...` dependendo de qual ramo trata o input).
  - O fluxo `P.I (2).json` está preparado para processar esses dados (extrair legendas, gerar resumo, criar embeddings), o que alinha perfeitamente com o propósito desta tela.

## 2. `old_chat.html` (Chat do Aluno)

### Funcionalidade
Interface de chat onde o aluno pode fazer perguntas sobre o conteúdo das aulas.

### Integração com n8n
- **Método:** `POST`
- **Payload:**
  ```json
  {
    "message": "Texto da pergunta do usuário"
  }
  ```
- **Expectativa de Resposta:**
  ```json
  {
    "reply": "Resposta do bot"
  }
  ```
- **Status Atual:**
  - Aponta para `https://webhooks.tgbia.com/webhook/chat123`.
  - **Análise de Compatibilidade:** O fluxo `P.I (2).json` analisado é um fluxo de **Ingestão e Processamento** (ETL), não um fluxo de **Chat/Recuperação** (RAG Retrieval).
  - O fluxo `P.I (2).json` termina respondendo apenas `{ "success": true }` após processar o vídeo. Ele **não** possui a lógica para receber uma pergunta, buscar no banco vetorial e gerar uma resposta com LLM.
  - **Conclusão:** Este front-end (`old_chat.html`) **não** funcionará com o `P.I (2).json` como está. É necessário criar um segundo fluxo no n8n (Workflow de Chat) que:
    1.  Receba a mensagem do webhook.
    2.  Converta a pergunta em vetor (Embedding).
    3.  Busque documentos relevantes no PostgreSQL (usando a função `match_documents` criada pelo `P.I (2).json`).
    4.  Envie o contexto + pergunta para o GPT-4.
    5.  Retorne a resposta no formato `{ "reply": "..." }`.

## Resumo da Arquitetura

| Componente | Função | Conecta com `P.I (2).json`? | Observação |
| :--- | :--- | :--- | :--- |
| **old_front.html** | Enviar Vídeos/Arquivos | **Sim** (Conceitualmente) | Precisa atualizar a URL do Webhook para bater com o ID do n8n. |
| **old_chat.html** | Tirar Dúvidas | **Não** | O `P.I (2).json` apenas *prepara* os dados. É necessário um novo fluxo de n8n para *consultar* os dados. |
