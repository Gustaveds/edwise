import { searchDocuments, getVideoSRT, getAllVideos } from './ragService.js';
import { generateQuiz as generateQuizBase, generateFlashcards as generateFlashcardsBase } from './educationalAI.js';

/**
 * Get RAG context for a course/video
 * @param {number} courseId - Course ID
 * @param {number|undefined} videoId - Optional video ID
 * @param {string} query - User query for context search
 * @returns {Promise<Object>} - Context object with documents, SRT, and formatted string
 */
export async function getRagContextForCourse(courseId, videoId, query) {
    try {
        // 1. Search for relevant documents using RAG
        const filter = { course_id: courseId };
        if (videoId) {
            filter.video_id = videoId;
        }

        const relevantDocs = await searchDocuments(query, 25, filter);

        // 2. Build context from relevant documents
        const contextParts = relevantDocs.map((doc, idx) => {
            const metadata = doc.metadata || {};
            return `[Documento ${idx + 1}]
Conteúdo: ${doc.content}
Metadata: ${JSON.stringify(metadata)}
Relevância: ${(1 - doc.distance).toFixed(3)}`;
        }).join('\n\n');

        // 3. Get full SRT for video if videoId provided
        let srtContext = '';
        let videoData = null;

        if (videoId) {
            videoData = await getVideoSRT(videoId);
            if (videoData && videoData.transcription) {
                srtContext = `\n[SRT Completo - ${videoData.title}]\n${videoData.transcription}\n`;
            }
        }

        // 4. Sem nenhum documento relevante e sem transcrição de vídeo, não há
        // material real para basear a geração — deixar passar aqui faz o
        // Gemini inventar conteúdo genérico (ex: perguntas sobre assuntos que
        // não têm nada a ver com o curso) em vez de admitir que não tem base.
        if (relevantDocs.length === 0 && !srtContext) {
            throw new Error(
                'Não há material suficiente indexado para este curso ainda. ' +
                'Envie vídeos ou arquivos com conteúdo relacionado ao tema e aguarde a indexação terminar antes de gerar quiz/flashcards.'
            );
        }

        // 5. Build full context string
        const fullContext = `# Contexto RAG (Documentos Relevantes):
${contextParts}

${srtContext ? `# Transcrição do Vídeo:\n${srtContext}` : ''}`;

        return {
            documents: relevantDocs,
            videoData,
            srtContext,
            fullContext
        };
    } catch (error) {
        console.error('Error getting RAG context:', error);
        throw error;
    }
}

/**
 * Generate quiz with RAG context
 * @param {number} courseId - Course ID
 * @param {number|undefined} videoId - Optional video ID
 * @param {string} topic - Topic for the quiz
 * @param {number} numberOfQuestions - Number of questions
 * @param {Array} failedQuestions - Optional failed questions for retry
 * @returns {Promise<Array>} - Quiz questions
 */
export async function generateQuizWithRag(courseId, videoId, topic, numberOfQuestions = 4, failedQuestions = null) {
    try {
        // Get RAG context
        const query = `Gerar quiz sobre ${topic}`;
        const ragContext = await getRagContextForCourse(courseId, videoId, query);

        // Generate quiz using the RAG context
        const questions = await generateQuizBase(
            ragContext.fullContext,
            topic,
            numberOfQuestions,
            failedQuestions
        );

        return questions;
    } catch (error) {
        console.error('Error generating quiz with RAG:', error);
        throw error;
    }
}

/**
 * Generate flashcards with RAG context
 * @param {number} courseId - Course ID
 * @param {number|undefined} videoId - Optional video ID
 * @param {string} topic - Topic for flashcards
 * @returns {Promise<Array>} - Flashcards
 */
export async function generateFlashcardsWithRag(courseId, videoId, topic) {
    try {
        // Get RAG context
        const query = `Gerar flashcards sobre ${topic}`;
        const ragContext = await getRagContextForCourse(courseId, videoId, query);

        // Generate flashcards using the RAG context
        const flashcards = await generateFlashcardsBase(
            ragContext.fullContext,
            topic
        );

        return flashcards;
    } catch (error) {
        console.error('Error generating flashcards with RAG:', error);
        throw error;
    }
}
