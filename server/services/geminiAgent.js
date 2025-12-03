import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchDocuments, getVideoSRT, getAllVideos } from './ragService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt adapted from n8n workflow
const SYSTEM_PROMPT = `# Quem você é:
Você é o assistente de IA da EdWise, uma comunidade focada em desenvolvimento de Agentes de IA.

# Sua função:
Sua função é usar o sistema RAG para localizar respostas nos vídeos da EdWise e responder os clientes com a resposta + o link do youtube agregando o &t=<tempo> no final da URL aonde <tempo> é o valor da chave "tempo" que vier no json.

# Onde encontrar a URL do vídeo:
A URL estará no contexto fornecido.

# Chamar informações de SRT quando necessário:
Quando encontrar o vídeo pelo RAG, sempre considere o SRT completo do video para responder o usuário com precisão e também para indicar a URL e o tempo corretamente.

# Formato de link:
Quando colocar o link de videos, não use nenhum formato em volta do link, apenas coloque o link no texto. Não use [] ou () em volta de um link.

# Guidelines:
- Coloque até no máximo 2 links que sejam sobre o que o user está perguntando.
- Responda de forma simples, objetiva e curta com no máximo 300 caracteres.
- Sempre forneça o link da aula que responde a dúvida do aluno e verifique o melhor tempo do vídeo que responde a dúvida seguindo a formatação em minutos e segundos ex "t=7m50s" ou "t=0m11s".
- Use formatação simples e clara, sem markdown excessivo.`;

/**
 * Generate a response using Gemini 2.5 Pro with RAG context
 * @param {string} userMessage - The user's question
 * @param {string} courseId - The course ID (for context)
 * @returns {Promise<string>} - The agent's response
 */
import db from '../db.js';
// ... imports

/**
 * Generate a response using Gemini 2.5 Pro with RAG context
 * @param {string} userMessage - The user's question
 * @param {string} courseId - The course ID (for context)
 * @param {number} userId - The user ID (for logging)
 * @returns {Promise<string>} - The agent's response
 */
async function generateResponse(userMessage, courseId, userId) {
    try {
        // 1. Get all videos for reference
        const videos = await getAllVideos();
        const videosContext = videos.map(v => {
            // Construct MinIO URL following the pattern from videoAI.js:301-303
            const videoUrl = v.s3_key
                ? `${process.env.MINIO_SERVER_URL}/${process.env.MINIO_BUCKET}/${v.s3_key}`
                : '';
            return `<video>\n  <title>${v.title}</title>\n  <video_id>${v.id}</video_id>\n  <url>${videoUrl}</url>\n</video>`;
        }).join('\n');

        // 2. Search for relevant documents using RAG
        const relevantDocs = await searchDocuments(userMessage, 25, { course_id: Number(courseId) });

        // 3. Build context from relevant documents
        const contextParts = relevantDocs.map((doc, idx) => {
            const metadata = doc.metadata || {};
            return `[Documento ${idx + 1}]
Conteúdo: ${doc.content}
Metadata: ${JSON.stringify(metadata)}
Relevância: ${(1 - doc.distance).toFixed(3)}`;
        }).join('\n\n');

        // 4. Check if we need to fetch full SRT for any video
        // Extract video IDs from top results
        const videoIds = new Set();
        relevantDocs.slice(0, 3).forEach(doc => {
            if (doc.metadata && doc.metadata.video_id) {
                videoIds.add(doc.metadata.video_id);
            }
        });

        // Fetch SRT for top videos
        let srtContext = '';
        for (const videoId of videoIds) {
            const videoData = await getVideoSRT(videoId);
            if (videoData && videoData.srt) {
                srtContext += `\n[SRT Completo - ${videoData.title}]\n${videoData.srt}\n`;
            }
        }

        // 5. Build the full prompt
        const fullSystemPrompt = `${SYSTEM_PROMPT}

<videos>
${videosContext}
</videos>

# Contexto RAG (Documentos Relevantes):
${contextParts}

${srtContext ? `# SRT dos Vídeos Mais Relevantes:\n${srtContext}` : ''}`;

        // 6. Call Gemini 2.5 Pro
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp', // Using available model
            systemInstruction: fullSystemPrompt
        });

        const result = await model.generateContent(userMessage);
        const response = result.response;
        const responseText = response.text();

        // 7. Log interaction
        if (userId) {
            await db.query(
                'INSERT INTO ai_logs (user_id, course_id, message, response, metadata) VALUES ($1, $2, $3, $4, $5)',
                [userId, courseId, userMessage, responseText, { model: 'gemini-2.0-flash-exp', context_docs: relevantDocs.length }]
            );
        }

        return responseText;

    } catch (error) {
        console.error('Error generating response:', error);
        throw error;
    }
}

export {
    generateResponse,
};
