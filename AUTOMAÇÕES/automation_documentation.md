# Documentação da Automação (n8n)

**Arquivo Fonte:** `AUTOMAÇÕES/P.I (2).json`

## Visão Geral
Este fluxo de trabalho do n8n foi projetado para automatizar o processamento de vídeos (provavelmente do YouTube), gerando resumos, FAQs, descrições detalhadas e preparando os dados para um sistema de RAG (Retrieval-Augmented Generation).

## Principais Funcionalidades

### 1. Configuração do Banco de Dados (PostgreSQL)
O fluxo inicia garantindo que a infraestrutura de dados esteja pronta:
- **Extensão Vector:** Ativa a extensão `pgvector` para trabalhar com embeddings.
- **Tabela `documents`:** Cria uma tabela para armazenar os vetores (embeddings) dos documentos, usada para busca semântica.
- **Tabela `videos`:** Cria uma tabela para armazenar metadados dos vídeos, incluindo ID do YouTube, título, legendas, FAQ gerado, URL, etc.
- **Função de Busca:** Cria uma função SQL `match_documents` para realizar a busca por similaridade de vetores.

### 2. Processamento de Legendas (SRT)
- **Parsing:** Um nó de código (`parseSRT`) converte o formato de legenda SRT cru em um formato estruturado (JSON), agrupando textos por minuto para facilitar o processamento.

### 3. Geração de Conteúdo com IA (LLM)
O fluxo utiliza cadeias do LangChain com modelos OpenAI (GPT-4) para:
- **Resumo do Vídeo:** Gera um resumo conciso focado em tópicos principais e ferramentas.
- **Geração de Perguntas (FAQ):** Analisa as legendas e o resumo para criar perguntas e respostas relevantes, incluindo o timestamp exato (`t=mm:ss`) onde a resposta pode ser encontrada no vídeo.
- **Descrição Detalhada:** Cria uma descrição rica em Markdown, listando ferramentas mencionadas no vídeo com seus respectivos tempos e descrições.

### 4. RAG (Retrieval-Augmented Generation)
- **Embeddings:** O texto das legendas/FAQ é dividido em chunks e convertido em vetores (embeddings) usando o modelo `text-embedding-3-large` da OpenAI.
- **Armazenamento:** Esses vetores são salvos na tabela `documents` do PostgreSQL, permitindo que o sistema (ex: chatbot) busque trechos relevantes do vídeo baseados em perguntas do usuário.

### 5. Integração via Webhook
- O fluxo possui nós de **Webhook** (`POST`), sugerindo que ele é acionado externamente (provavelmente quando um novo vídeo é cadastrado ou enviado).
- Ele também responde ao webhook confirmando o sucesso da operação.

## Fluxo de Dados Simplificado

1.  **Recebimento:** O fluxo recebe dados do vídeo (provavelmente via webhook ou leitura inicial do banco).
2.  **Extração:** As legendas (SRT) são processadas.
3.  **Inteligência:**
    *   O LLM gera o resumo.
    *   O LLM gera perguntas e respostas com timestamps.
    *   O LLM gera a descrição final.
4.  **Persistência:**
    *   O FAQ e a descrição são atualizados na tabela `videos`.
    *   Os embeddings são gerados e salvos na tabela `documents`.

## Requisitos de Infraestrutura
- **n8n:** Para rodar o fluxo.
- **PostgreSQL:** Com extensão `pgvector` instalada.
- **OpenAI API:** Chave de API configurada para usar modelos GPT-4 e Embeddings.
