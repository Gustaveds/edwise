import React, { useState, useRef, useEffect } from 'react';
import { Course, QuizQuestion, QuizResult, WebhookEvent, ChatMessage, StudyAid } from '../types';
import { answerQuestion, generateQuiz, generateFlashcards, generateSummary } from '../services/geminiService';
import { saveQuiz } from '../services/quizService';
import { sendWebhook } from '../services/webhookService';
import QuizView from './QuizView';
import StudyAidView from './StudyAidView';
import FeedbackModal from './FeedbackModal';
import { Bot, User as UserIcon, Send, BrainCircuit, Loader2, ThumbsUp, ThumbsDown, MessageSquarePlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAnalytics } from '../contexts/AnalyticsContext';

interface ChatAssistantProps {
    course: Course;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ course }) => {
    const { recordInteraction, recordQuizCompletion, recordFeedback } = useAnalytics();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
    const [quizResults, setQuizResults] = useState<QuizResult[] | null>(null);
    const [studyAid, setStudyAid] = useState<StudyAid | null>(null);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [selectedMessageForFeedback, setSelectedMessageForFeedback] = useState<ChatMessage | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const createUniqueId = () => `${Date.now()} -${Math.random()} `;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    useEffect(() => {
        const initialMessage: ChatMessage = {
            id: createUniqueId(),
            sender: 'ai',
            text: `Olá! Eu sou seu assistente de IA para ** ${course.title}**.Faça uma pergunta, peça para 'gerar um quiz', 'gerar flashcards' ou 'resumir a sessão'.`,
        };
        setMessages([initialMessage]);
        recordInteraction({
            courseId: course.id,
            courseTitle: course.title,
            sender: initialMessage.sender,
            text: initialMessage.text,
        });
        setQuizQuestions(null);
        setQuizResults(null);
        setStudyAid(null);
    }, [course, recordInteraction]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: createUniqueId(), sender: 'user', text: input };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        recordInteraction({
            courseId: course.id,
            courseTitle: course.title,
            sender: userMessage.sender,
            text: userMessage.text,
        });

        // Send webhook for student question
        sendWebhook({
            eventType: WebhookEvent.STUDENT_QUESTION,
            courseId: course.id,
            courseTitle: course.title,
            studentMessage: userMessage.text,
            timestamp: new Date().toISOString(),
        }).catch((err) => {
            console.error('Failed to send student question webhook:', err);
        });

        const userInput = input;
        setInput('');
        setIsLoading(true);
        setError(null);
        setQuizQuestions(null);
        setStudyAid(null);

        try {
            const courseContext = course.materials
                .map((m) => `Title: ${m.title} \nContent: ${m.content} `)
                .join('\n\n');
            let aiResponse: string | null = null;

            const lowerCaseInput = userInput.toLowerCase();

            if (lowerCaseInput.includes('flashcard')) {
                const topicMatch = lowerCaseInput.match(/(?:sobre|de)\s+(.+)/);
                const topic = topicMatch ? topicMatch[1] : course.title;
                const flashcards = await generateFlashcards(courseContext, topic);
                setStudyAid({ type: 'flashcards', content: flashcards });
                aiResponse = `Claro! Preparei alguns flashcards sobre "${topic}" para você.`;
            } else if (lowerCaseInput.includes('resuma') || lowerCaseInput.includes('resumo')) {
                const summary = await generateSummary(courseContext, updatedMessages);
                setStudyAid({ type: 'summary', content: summary });
                aiResponse = 'Aqui está um resumo da nossa conversa até agora.';
            } else if (lowerCaseInput.includes('quiz')) {
                const numberMatch = lowerCaseInput.match(/\d+/);
                let numQuestions = 4;
                if (numberMatch) {
                    numQuestions = parseInt(numberMatch[0], 10);
                }

                const clampedNumQuestions = Math.max(1, Math.min(20, numQuestions));

                const questions = await generateQuiz(
                    courseContext,
                    course.title,
                    clampedNumQuestions,
                    quizResults?.filter((r) => !r.isCorrect).map((r) => r.question),
                );
                setQuizQuestions(questions);
                await saveQuiz(course.id, `Quiz: ${course.title}`, questions);
                aiResponse = `Eu gerei um quiz com ${questions.length} ${questions.length === 1 ? 'pergunta' : 'perguntas'
                    } para você! Por favor, responda às perguntas abaixo.`;
            } else {
                // Call local backend agent
                try {
                    const response = await fetch('http://localhost:3001/api/agent', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: userInput,
                            courseId: course.id,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Backend error: ${response.status} `);
                    }

                    const data = await response.json();
                    aiResponse = data.reply;
                } catch (backendError) {
                    console.error("Error calling local backend:", backendError);
                    // Fallback to Gemini or show error
                    aiResponse = "Erro ao conectar com o agente local. Verifique se o servidor está rodando.";
                }
            }

            if (aiResponse) {
                const aiMessage: ChatMessage = { id: createUniqueId(), sender: 'ai', text: aiResponse };
                setMessages((prev) => [...prev, aiMessage]);
                recordInteraction({
                    courseId: course.id,
                    courseTitle: course.title,
                    sender: aiMessage.sender,
                    text: aiMessage.text,
                });
            }
        } catch (e: any) {
            const messageText = e?.message || 'Ocorreu um erro inesperado.';
            setError(messageText);
            const errorMessage: ChatMessage = {
                id: createUniqueId(),
                sender: 'ai',
                text: `Desculpe, encontrei um erro: ${messageText} `,
            };
            setMessages((prev) => [...prev, errorMessage]);
            recordInteraction({
                courseId: course.id,
                courseTitle: course.title,
                sender: errorMessage.sender,
                text: errorMessage.text,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuizComplete = (results: QuizResult[]) => {
        setQuizResults(results);
        setQuizQuestions(null);

        const correctAnswers = results.filter((r) => r.isCorrect).length;
        const totalQuestions = results.length;
        const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        const messageText = `Quiz completo! Você acertou ${correctAnswers} de ${totalQuestions}.` +
            `Gostaria de tentar outro quiz focado nos tópicos em que errou ? É só pedir para 'gerar um quiz' novamente.`;

        const aiMessage: ChatMessage = {
            id: createUniqueId(),
            sender: 'ai',
            text: messageText,
        };
        setMessages((prev) => [...prev, aiMessage]);
        recordInteraction({
            courseId: course.id,
            courseTitle: course.title,
            sender: aiMessage.sender,
            text: aiMessage.text,
        });

        recordQuizCompletion({
            courseId: course.id,
            courseTitle: course.title,
            results,
        });

        sendWebhook({
            eventType: WebhookEvent.QUIZ_COMPLETED,
            courseId: course.id,
            courseTitle: course.title,
            results,
            score,
            total: totalQuestions,
            timestamp: new Date().toISOString(),
        }).catch((err) => {
            console.error('Failed to send quiz completion webhook:', err);
        });
    };

    const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
        setMessages((prevMessages) => {
            const next = prevMessages.map((msg) =>
                msg.id === messageId ? { ...msg, feedback } : msg,
            );

            const target = prevMessages.find((msg) => msg.id === messageId);
            if (target) {
                recordFeedback({
                    courseId: course.id,
                    courseTitle: course.title,
                    type: feedback,
                    message: target.text,
                });
            }

            return next;
        });
    };

    const handleOpenFeedbackModal = (message: ChatMessage) => {
        setSelectedMessageForFeedback(message);
        setIsFeedbackModalOpen(true);
    };

    const handleFeedbackSubmit = (feedbackText: string) => {
        if (!selectedMessageForFeedback) return;

        setMessages((prevMessages) =>
            prevMessages.map((msg) =>
                msg.id === selectedMessageForFeedback.id ? { ...msg, feedbackText } : msg,
            ),
        );

        recordFeedback({
            courseId: course.id,
            courseTitle: course.title,
            type: 'negative',
            message: selectedMessageForFeedback.text,
            feedbackText,
        });

        setIsFeedbackModalOpen(false);
        setSelectedMessageForFeedback(null);
    };

    return (
        <>
            {studyAid && <StudyAidView aid={studyAid} onClose={() => setStudyAid(null)} />}
            <FeedbackModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                onSubmit={handleFeedbackSubmit}
                messageText={selectedMessageForFeedback?.text || ''}
            />
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex flex-col h-[70vh] max-h-[800px]">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                        <BrainCircuit className="w-6 h-6 text-blue-700 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Assistente de IA</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Curso: {course.title}</p>
                    </div>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex items - end gap - 2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'
                                } `}
                        >
                            {msg.sender === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                                </div>
                            )}
                            <div
                                className={`max - w - md p - 3 rounded - 2xl ${msg.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                                    } `}
                            >
                                <div className="prose prose-sm dark:prose-invert">
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                            </div>
                            {msg.sender === 'ai' && (
                                <div className="flex self-center space-x-1">
                                    <button
                                        onClick={() => handleFeedback(msg.id, 'positive')}
                                        disabled={!!msg.feedback || !!msg.feedbackText}
                                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:cursor-not-allowed"
                                        aria-label="Feedback Positivo"
                                        title="Feedback Positivo"
                                    >
                                        <ThumbsUp
                                            className={`w - 4 h - 4 transition - colors ${msg.feedback === 'positive'
                                                ? 'text-blue-600'
                                                : 'text-gray-400 hover:text-blue-600'
                                                } `}
                                        />
                                    </button>
                                    <button
                                        onClick={() => handleFeedback(msg.id, 'negative')}
                                        disabled={!!msg.feedback || !!msg.feedbackText}
                                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:cursor-not-allowed"
                                        aria-label="Feedback Negativo"
                                        title="Feedback Negativo"
                                    >
                                        <ThumbsDown
                                            className={`w - 4 h - 4 transition - colors ${msg.feedback === 'negative'
                                                ? 'text-red-600'
                                                : 'text-gray-400 hover:text-red-600'
                                                } `}
                                        />
                                    </button>
                                    <button
                                        onClick={() => handleOpenFeedbackModal(msg)}
                                        disabled={!!msg.feedback || !!msg.feedbackText}
                                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:cursor-not-allowed"
                                        aria-label="Dar feedback detalhado"
                                        title="Dar feedback detalhado"
                                    >
                                        <MessageSquarePlus
                                            className={`w - 4 h - 4 transition - colors ${msg.feedbackText
                                                ? 'text-blue-600'
                                                : 'text-gray-400 hover:text-blue-600'
                                                } `}
                                        />
                                    </button>
                                </div>
                            )}
                            {msg.sender === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                    <UserIcon className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                            </div>
                            <div className="max-w-md p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-800 rounded-bl-none flex items-center space-x-2">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-0" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300" />
                            </div>
                        </div>
                    )}
                    {quizQuestions && <QuizView questions={quizQuestions} onComplete={handleQuizComplete} />}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Faça uma pergunta ou gere um recurso..."
                            className="w-full pl-5 pr-14 py-3 bg-gray-100 text-gray-900 placeholder-gray-500 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow border border-gray-300 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400 dark:border-gray-700"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 text-white bg-blue-600 rounded-full transition-all duration-200 ease-in-out hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                    {error && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
};

export default ChatAssistant;

