import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Schema definitions for structured output
const quizSchema = {
    type: 'object',
    properties: {
        questions: {
            type: 'array',
            description: 'Uma lista de perguntas do quiz.',
            items: {
                type: 'object',
                properties: {
                    question: {
                        type: 'string',
                        description: 'O texto da pergunta.'
                    },
                    options: {
                        type: 'array',
                        description: 'Uma lista de 4 opções de múltipla escolha.',
                        items: {
                            type: 'string'
                        }
                    },
                    correctAnswer: {
                        type: 'string',
                        description: 'A resposta correta dentre as opções.'
                    }
                },
                required: ['question', 'options', 'correctAnswer']
            }
        }
    },
    required: ['questions']
};

const keyPointsSchema = {
    type: 'object',
    properties: {
        keyPoints: {
            type: 'array',
            description: 'Uma lista de 5 a 10 objetivos de aprendizado chave ou pontos principais.',
            items: {
                type: 'string'
            }
        }
    },
    required: ['keyPoints']
};

const flashcardSchema = {
    type: 'object',
    properties: {
        flashcards: {
            type: 'array',
            description: 'Uma lista de flashcards, cada um com uma pergunta e uma resposta.',
            items: {
                type: 'object',
                properties: {
                    question: {
                        type: 'string',
                        description: 'O lado da "pergunta" do flashcard.'
                    },
                    answer: {
                        type: 'string',
                        description: 'O lado da "resposta" do flashcard.'
                    }
                },
                required: ['question', 'answer']
            }
        }
    },
    required: ['flashcards']
};

const summarySchema = {
    type: 'object',
    properties: {
        title: {
            type: 'string',
            description: 'Um título conciso para o resumo da sessão.'
        },
        points: {
            type: 'array',
            description: 'Uma lista de 3 a 7 pontos-chave que resumem a conversa.',
            items: {
                type: 'string'
            }
        }
    },
    required: ['title', 'points']
};

/**
 * Extract key learning points from course material
 */
export async function extractKeyPoints(context) {
    try {
        const prompt = `Com base no seguinte material de curso, extraia os 5 a 10 principais objetivos de aprendizado ou pontos-chave. Apresente-os como uma lista concisa.

Material do Curso:
---
${context}
---`;

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: keyPointsSchema,
            },
        });

        const result = await model.generateContent(prompt);
        const jsonText = result.response.text().trim();
        const parsed = JSON.parse(jsonText);

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
        let prompt = `Com base no seguinte material de curso sobre "${topic}", gere um quiz de múltipla escolha com ${numberOfQuestions} ${numberOfQuestions === 1 ? 'pergunta' : 'perguntas'} para testar a compreensão de um aluno. Cada pergunta deve ter 4 opções.

Material do Curso:
---
${context}
---`;

        if (failedQuestions && failedQuestions.length > 0) {
            prompt = `Um aluno teve dificuldades com as seguintes perguntas sobre "${topic}". Gere um novo quiz de múltipla escolha com ${numberOfQuestions} ${numberOfQuestions === 1 ? 'pergunta' : 'perguntas'} que foque nos mesmos conceitos subjacentes, mas com perguntas e opções diferentes.

Perguntas erradas anteriormente:
---
${JSON.stringify(failedQuestions, null, 2)}
---

Material Original do Curso:
---
${context}
---`;
        }

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: quizSchema,
            },
        });

        const result = await model.generateContent(prompt);
        const jsonText = result.response.text().trim();
        const parsed = JSON.parse(jsonText);

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
            model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
        });

        const result = await model.generateContent(prompt);
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
        const prompt = `Com base no seguinte material de curso, gere 5-10 flashcards sobre o tópico específico de "${topic}". Cada flashcard deve ter uma pergunta clara e uma resposta concisa.

Material do Curso:
---
${context}
---`;

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: flashcardSchema,
            },
        });

        const result = await model.generateContent(prompt);
        const jsonText = result.response.text().trim();
        const parsed = JSON.parse(jsonText);

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
---`;

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: summarySchema,
            },
        });

        const result = await model.generateContent(prompt);
        const jsonText = result.response.text().trim();
        const parsed = JSON.parse(jsonText);

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
