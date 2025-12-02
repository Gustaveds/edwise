import axios from 'axios';
import { Question, Flashcard, Summary, ChatMessage, QuizQuestion } from '../types';
import config from '../config';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || config.API_URL + '';

// Create axios instance with auth interceptor
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add JWT token to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Extract key learning points from course material
 */
export const extractKeyPoints = async (context: string): Promise<string[]> => {
    try {
        const response = await api.post('/api/ai/extract-key-points', { context });
        return response.data.keyPoints;
    } catch (error: any) {
        console.error("Erro ao extrair pontos-chave:", error);
        throw new Error(error.response?.data?.error || "Falha ao extrair pontos-chave.");
    }
};

/**
 * Generate a quiz based on course material using RAG
 */
export const generateQuiz = async (
    courseId: number,
    videoId: number | undefined,
    topic: string,
    numberOfQuestions: number = 4,
    failedQuestions?: QuizQuestion[]
): Promise<{ id: number; questions: QuizQuestion[]; saved: boolean }> => {
    try {
        const response = await api.post('/api/ai/generate-quiz', {
            courseId,
            videoId,
            topic,
            numberOfQuestions,
            failedQuestions
        });
        return response.data;
    } catch (error: any) {
        console.error("Erro ao gerar quiz:", error);
        throw new Error(error.response?.data?.error || "Falha ao gerar o quiz.");
    }
};

/**
 * Answer a student question based on course material using RAG
 */
export const answerQuestion = async (question: string, courseId: number, videoId?: number): Promise<string> => {
    try {
        const response = await api.post('/api/ai/answer-question', {
            question,
            courseId,
            videoId
        });
        return response.data.answer;
    } catch (error: any) {
        console.error("Erro ao responder pergunta:", error);
        throw new Error(error.response?.data?.error || "Falha ao obter uma resposta.");
    }
};

/**
 * Generate flashcards for a specific topic using RAG
 */
export const generateFlashcards = async (courseId: number, videoId: number | undefined, topic: string): Promise<Flashcard[]> => {
    try {
        const response = await api.post('/api/ai/generate-flashcards', {
            courseId,
            videoId,
            topic
        });
        return response.data.flashcards;
    } catch (error: any) {
        console.error("Erro ao gerar flashcards:", error);
        throw new Error(error.response?.data?.error || "Falha ao gerar flashcards.");
    }
};

/**
 * Generate a summary of a study session
 */
export const generateSummary = async (context: string, chatHistory: ChatMessage[]): Promise<Summary> => {
    try {
        const response = await api.post('/api/ai/generate-summary', {
            context,
            chatHistory
        });
        return response.data.summary;
    } catch (error: any) {
        console.error("Erro ao gerar resumo:", error);
        throw new Error(error.response?.data?.error || "Falha ao gerar o resumo.");
    }
};