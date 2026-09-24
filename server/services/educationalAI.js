import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { generateContentWithRetry } from './geminiRetry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * O modelo padrão (gemini-3.5-flash-lite, escolhido pela cota diária bem
 * maior que a dos modelos "flash" normais) retorna 503 sempre que
 * `generationConfig.responseMimeType: 'application/json'` é usado — com ou
 * sem responseSchema. Por isso aqui pedimos JSON via instrução no prompt e
 * fazemos o parse manual, igual já era feito em videoAI.js para as FAQs.
 */
function parseJsonResponse(text) {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
}

const QUIZ_JSON_FORMAT_INSTRUCTION = `Responda apenas utilizando o formato JSON abaixo, sem "\`\`\`json" no começo e sem "\`\`\`" no final:
{ "questions": [ { "question": string, "options": [string, string, string, string], "correctAnswer": string }, ... ] }`;

/**
 * Extract key learning points from course material
 */
export async function extractKeyPoints(context) {
    try {
        const prompt = `Com base no seguinte material de curso, extraia os 5 a 10 principais objetivos de aprendizado ou pontos-chave. Apresente-os como uma lista concisa.

Material do Curso:
---
${context}
---

Responda apenas utilizando o formato JSON abaixo, sem "\`\`\`json" no começo e sem "\`\`\`" no final:
{ "keyPoints": [string, ...] }`;

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        });

        const result = await generateContentWithRetry(model, prompt);
        const parsed = parseJsonResponse(result.response.text());

        if (parsed && Array.isArray(parsed.keyPoints)) {
            return parsed.keyPoints;
        } else {
            throw new Error('Formato de pontos-chave inválido recebido da API.');
        }
    } catch (error) {
        console.error('Erro ao extrair pontos-chave:', error);
        throw new Error('Falha ao extrair pontos-chave.');
    }
}

/**
 * Generate a quiz based on course material
 */
export async function generateQuiz(context, topic, numberOfQuestions = 4, failedQuestions = null) {
    try {
        let prompt = `Com base ESTRITAMENTE no material de curso abaixo sobre "${topic}", gere um quiz de múltipla escolha com ${numberOfQuestions} ${numberOfQuestions === 1 ? 'pergunta' : 'perguntas'} para testar a compreensão de um aluno. Cada pergunta deve ter 4 opções.

Regras importantes:
- Use APENAS informações presentes no material abaixo. Não use conhecimento geral externo.
- Se o material não tiver relação nenhuma com o tema "${topic}", gere as perguntas sobre os assuntos que de fato aparecem no material (não invente conteúdo sobre "${topic}").

Material do Curso:
---
${context}
---

${QUIZ_JSON_FORMAT_INSTRUCTION}`;

        if (failedQuestions && failedQuestions.length > 0) {
            prompt = `Um aluno teve dificuldades com as seguintes perguntas sobre "${topic}". Gere um novo quiz de múltipla escolha com ${numberOfQuestions} ${numberOfQuestions === 1 ? 'pergunta' : 'perguntas'} que foque nos mesmos conceitos subjacentes, mas com perguntas e opções diferentes.

Perguntas erradas anteriormente:
---
${JSON.stringify(failedQuestions, null, 2)}
---

Material Original do Curso:
---
${context}
---

${QUIZ_JSON_FORMAT_INSTRUCTION}`;
        }

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        });

        const result = await generateContentWithRetry(model, prompt);
        const parsed = parseJsonResponse(result.response.text());

        if (parsed && Array.isArray(parsed.questions)) {
            return parsed.questions;
        } else {
            throw new Error('Formato de quiz inválido recebido da API.');
        }
    } catch (error) {
        console.error('Erro ao gerar quiz:', error);
        throw new Error('Falha ao gerar o quiz.');
    }
}

/**
 * Answer a student question based on course material
 */
export async function answerQuestion(context, question) {
    try {
        const prompt = `Você é "EdWise", um tutor de IA amigável e prestativo. Um aluno tem uma pergunta sobre o curso. Com base APENAS no material do curso fornecido, responda à pergunta do aluno de forma clara e concisa. Se a resposta não estiver no material, diga "Desculpe, não consegui encontrar uma resposta para isso no material do curso fornecido."

Material do Curso:
---
${context}
---

Pergunta do Aluno: "${question}"`;

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        });

        const result = await generateContentWithRetry(model, prompt);
        return result.response.text();
    } catch (error) {
        console.error('Erro ao responder pergunta:', error);
        throw new Error('Falha ao obter uma resposta.');
    }
}

/**
 * Generate flashcards for a specific topic
 */
export async function generateFlashcards(context, topic) {
    try {
        const prompt = `Com base ESTRITAMENTE no seguinte material de curso, gere 5-10 flashcards sobre o tópico específico de "${topic}". Cada flashcard deve ter uma pergunta clara e uma resposta concisa.

Regras importantes:
- Use APENAS informações presentes no material abaixo. Não use conhecimento geral externo.
- Se o material não tiver relação nenhuma com o tópico "${topic}", gere os flashcards sobre os assuntos que de fato aparecem no material (não invente conteúdo sobre "${topic}").

Material do Curso:
---
${context}
---

Responda apenas utilizando o formato JSON abaixo, sem "\`\`\`json" no começo e sem "\`\`\`" no final:
{ "flashcards": [ { "question": string, "answer": string }, ... ] }`;

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        });

        const result = await generateContentWithRetry(model, prompt);
        const parsed = parseJsonResponse(result.response.text());

        if (parsed && Array.isArray(parsed.flashcards)) {
            return parsed.flashcards;
        } else {
            throw new Error('Formato de flashcards inválido recebido da API.');
        }
    } catch (error) {
        console.error('Erro ao gerar flashcards:', error);
        throw new Error('Falha ao gerar flashcards.');
    }
}

/**
 * Generate a summary of a study session
 */
export async function generateSummary(context, chatHistory) {
    try {
        const historyText = chatHistory
            .map(m => `${m.sender === 'user' ? 'Aluno' : 'IA'}: ${m.text}`)
            .join('\n');

        const prompt = `Você é EdWise, um tutor de IA. Resuma a seguinte sessão de estudo com base no histórico do chat. Identifique os principais tópicos discutidos e crie um resumo conciso.

Histórico do Chat:
---
${historyText}
---

Material do Curso para Contexto:
---
${context}
---

Responda apenas utilizando o formato JSON abaixo, sem "\`\`\`json" no começo e sem "\`\`\`" no final:
{ "title": string, "points": [string, ...] }`;

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        });

        const result = await generateContentWithRetry(model, prompt);
        const parsed = parseJsonResponse(result.response.text());

        if (parsed && parsed.title && parsed.points) {
            return parsed;
        } else {
            throw new Error('Formato de resumo inválido recebido da API.');
        }
    } catch (error) {
        console.error('Erro ao gerar resumo:', error);
        throw new Error('Falha ao gerar o resumo.');
    }
}
