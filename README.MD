# EdWise AI - LMS & Assistente de Ensino Inteligente

O **EdWise** é uma plataforma SaaS B2B voltada para instituições de ensino, projetada para fornecer um assistente de inteligência artificial contextualizado e de alta precisão. Integrado nativamente ao WhatsApp e via webchat, o sistema atua na resolução de dúvidas acadêmicas e institucionais 24 horas por dia, visando mitigar a sobrecarga docente e reduzir os índices de evasão escolar. 

Diferentemente de soluções conversacionais genéricas, a plataforma processa vídeos, PDFs e documentos de texto de forma autônoma, transformando-os em uma base de conhecimento vetorizada estruturada para recuperação semântica (RAG - Retrieval-Augmented Generation). Isso garante respostas estritamente fundamentadas no material da instituição, acompanhadas de links e referências de tempo (timestamps) exatas[cite: 1, 2].

---

## Principais Funcionalidades

* **Assistente RAG Multi-base:** Roteamento inteligente de consultas, permitindo que a IA alterne dinamicamente entre uma base institucional (dúvidas sobre matrículas e processos administrativos) e uma base acadêmica (conteúdo específico das disciplinas)[cite: 1, 2].
* **Pipeline de Processamento Assíncrono:** Orquestração de tarefas pesadas de transcrição de áudio e geração de embeddings via mensageria, garantindo que a thread principal do servidor web permaneça livre de bloqueios[cite: 1, 2].
* **Geração Automática de Conteúdo (Generative AI):** Criação autônoma de transcrições indexadas, resumos detalhados, FAQs, flashcards e quizzes a partir dos materiais base submetidos, utilizando modelos de linguagem avançados[cite: 1, 2].
* **Arquitetura Multi-tenant:** Isolamento rigoroso e escalável de dados, métricas e usuários por instituição parceira no banco de dados, garantindo conformidade e segurança[cite: 1, 2].
* **LMS e Dashboard Analítico:** Interface administrativa completa voltada para a gestão de cursos, upload multipart de materiais, acompanhamento do status de processamento via polling e análise de engajamento[cite: 1, 2].

---

## Arquitetura e Stack Tecnológica

O sistema foi arquitetado em 5 camadas independentes, priorizando escalabilidade e responsabilidade única[cite: 1, 2]:

### Backend Core & Integrações
* **Node.js (v22+) & Express.js:** Núcleo da API RESTful, estruturado em arquitetura monolítica modular (Routes, Controllers, Services)[cite: 1, 2].
* **PostgreSQL (15+) com pgvector:** Banco de dados relacional primário, responsável por armazenar entidades tradicionais e executar cálculos de distância cosseno (índices ivfflat) sobre vetores semânticos[cite: 1, 2].
* **Redis & BullMQ:** Sistema de cache em memória e gerenciamento de filas para execução isolada do Worker de inteligência artificial[cite: 1, 2].
* **MinIO S3:** Object storage self-hosted para persistência e streaming de arquivos de mídia[cite: 1, 2].

### Motor de Inteligência Artificial
* **Google Gemini 2.0 Flash:** LLM responsável pelo processamento de linguagem natural, formatação de respostas RAG e extração de insights[cite: 1, 2].
* **Google Gemini Embeddings (1536d):** Transformação matemática de blocos de texto (chunks) em arrays vetoriais[cite: 1, 2].
* **OpenAI Whisper & FFmpeg:** Transcodificação pura e transcrição de áudio de alta precisão executadas no Worker local[cite: 1, 2].

### Apresentação (Frontend)
* **React 19.2.0 + Vite + TypeScript:** Aplicação SPA tipada, operando com gerenciamento de estado via Context API e hooks customizados.
* **TailwindCSS:** Estilização baseada em utility-classes, integrando um Design System proprietário com suporte nativo a Dark Mode e componentes dinâmicos (CalendarView, MyCourses, Modals).

---

## Estrutura do Monorepo

```text
edwise/
├── frontend/           # Aplicação Client-side (React + Vite) contendo o LMS web e componentes de UI
├── server/             # Backend Node.js contendo roteamento, serviços, lógica transacional e middlewares (JWT/RBAC)
├── worker.js           # Processo executável subjacente (BullMQ) para consumo de fila e execução do pipeline de IA
├── database/           # Scripts DDL para inicialização do schema, extensões (pgvector) e arquivos de migration[cite: 1, 2]
├── docker-compose.yml  # Manifesto de orquestração de containers para provisionamento do ambiente local
└── README.md           # Documentação técnica do repositório
