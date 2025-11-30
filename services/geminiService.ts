import { GoogleGenAI, Type } from "@google/genai";
import { Question, Flashcard, Summary, ChatMessage } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const quizSchema = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            description: "Uma lista de perguntas do quiz.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: {
                        type: Type.STRING,
                        description: "O texto da pergunta."
                    },
                    options: {
                        type: Type.ARRAY,
                        description: "Uma lista de 4 opções de múltipla escolha.",
                        items: {
                            type: Type.STRING
                        }
                    },
                    correctAnswer: {
                        type: Type.STRING,
                        description: "A resposta correta dentre as opções."
                    }
                },
                required: ["question", "options", "correctAnswer"]
            }
        }
    },
    required: ["questions"]
};

const keyPointsSchema = {
    type: Type.OBJECT,
    properties: {
        keyPoints: {
            type: Type.ARRAY,
            description: "Uma lista de 5 a 10 objetivos de aprendizado chave ou pontos principais.",
            items: {
                type: Type.STRING
            }
        }
    },
    required: ["keyPoints"]
};

const flashcardSchema = {
    type: Type.OBJECT,
    properties: {
        flashcards: {
            type: Type.ARRAY,
            description: "Uma lista de flashcards, cada um com uma pergunta e uma resposta.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: {
                        type: Type.STRING,
                        description: "O lado da 'pergunta' do flashcard (um termo, conceito ou pergunta)."
                    },
                    answer: {
                        type: Type.STRING,
                        description: "O lado da 'resposta' do flashcard (a definição, explicação ou resposta)."
                    }
                },
                required: ["question", "answer"]
            }
        }
    },
    required: ["flashcards"]
};

const summarySchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "Um título conciso para o resumo da sessão."
        },
        points: {
            type: Type.ARRAY,
            description: "Uma lista de 3 a 7 pontos-chave que resumem a conversa.",
            items: {
                type: Type.STRING
            }
        }
    },
    required: ["title", "points"]
};


export const extractKeyPoints = async (context: string): Promise<string[]> => {
    try {
        const prompt = `Com base no seguinte material de curso, extraia os 5 a 10 principais objetivos de aprendizado ou pontos-chave. Apresente-os como uma lista concisa. Esta lista será mostrada ao professor para confirmar o entendimento da IA sobre o material.

        Material do Curso:
        ---
        ${context}
        ---
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: keyPointsSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (result && result.keyPoints && Array.isArray(result.keyPoints)) {
            return result.keyPoints as string[];
        } else {
            throw new Error("Formato de pontos-chave inválido recebido da API.");
        }
    } catch (error) {
        console.error("Erro ao extrair pontos-chave:", error);
        throw new Error("Falha ao extrair pontos-chave. Por favor, verifique sua chave de API e tente novamente.");
    }
};


export const generateQuiz = async (context: string, topic: string, numberOfQuestions: number = 4, failedQuestions?: Question[]): Promise<Question[]> => {
    try {
        let prompt = `Com base no seguinte material de curso sobre "${topic}", gere um quiz de múltipla escolha com ${numberOfQuestions} ${numberOfQuestions === 1 ? 'pergunta' : 'perguntas'} para testar a compreensão de um aluno. Cada pergunta deve ter 4 opções.

        Material do Curso:
        ---
        ${context}
        ---
        `;

        if (failedQuestions && failedQuestions.length > 0) {
            prompt = `Um aluno teve dificuldades com as seguintes perguntas sobre "${topic}". Gere um novo quiz de múltipla escolha com ${numberOfQuestions} ${numberOfQuestions === 1 ? 'pergunta' : 'perguntas'} que foque nos mesmos conceitos subjacentes, mas com perguntas e opções diferentes. Isso o ajudará a praticar e reforçar seu aprendizado.

             Perguntas erradas anteriormente:
             ---
             ${JSON.stringify(failedQuestions, null, 2)}
             ---
             
             Material Original do Curso para contexto:
             ---
             ${context}
             ---
             `;
        }


        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (result && result.questions && Array.isArray(result.questions)) {
            return result.questions as Question[];
        } else {
            throw new Error("Formato de quiz inválido recebido da API.");
        }
    } catch (error) {
        console.error("Erro ao gerar quiz:", error);
        throw new Error("Falha ao gerar o quiz. Por favor, verifique sua chave de API e tente novamente.");
    }
};

export const answerQuestion = async (context: string, question: string): Promise<string> => {
    try {
        const prompt = `Você é "EdWise", um tutor de IA amigável e prestativo. Um aluno tem uma pergunta sobre o curso. Com base APENAS no material do curso fornecido, responda à pergunta do aluno de forma clara e concisa. Se a resposta não estiver no material, diga "Desculpe, não consegui encontrar uma resposta para isso no material do curso fornecido."

        Material do Curso:
        ---
        ${context}
        ---

        Pergunta do Aluno: "${question}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Erro ao responder pergunta:", error);
        throw new Error("Falha ao obter uma resposta. Por favor, verifique sua chave de API e tente novamente.");
    }
};

export const generateFlashcards = async (context: string, topic: string): Promise<Flashcard[]> => {
    try {
        const prompt = `Com base no seguinte material de curso, gere 5-10 flashcards sobre o tópico específico de "${topic}". Cada flashcard deve ter uma pergunta clara e uma resposta concisa.

        Material do Curso para Contexto:
        ---
        ${context}
        ---
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: flashcardSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (result && result.flashcards && Array.isArray(result.flashcards)) {
            return result.flashcards as Flashcard[];
        } else {
            throw new Error("Formato de flashcards inválido recebido da API.");
        }
    } catch (error) {
        console.error("Erro ao gerar flashcards:", error);
        throw new Error("Falha ao gerar flashcards. Por favor, verifique sua chave de API e tente novamente.");
    }
};

export const generateSummary = async (context: string, chatHistory: ChatMessage[]): Promise<Summary> => {
    try {
        const historyText = chatHistory.map(m => `${m.sender === 'user' ? 'Aluno' : 'IA'}: ${m.text}`).join('\n');

        const prompt = `Você é EdWise, um tutor de IA. Resuma a seguinte sessão de estudo com base no histórico do chat. Identifique os principais tópicos discutidos e crie um resumo conciso para ajudar o aluno a revisar.

        Histórico do Chat:
        ---
        ${historyText}
        ---

        Material do Curso para Contexto (se necessário):
        ---
        ${context}
        ---
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: summarySchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (result && result.title && result.points) {
            return result as Summary;
        } else {
            throw new Error("Formato de resumo inválido recebido da API.");
        }
    } catch (error) {
        console.error("Erro ao gerar resumo:", error);
        throw new Error("Falha ao gerar o resumo. Por favor, verifique sua chave de API e tente novamente.");
    }
};