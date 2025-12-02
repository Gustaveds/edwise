import React, { useState, useRef, useEffect } from 'react';
import { Course, QuizQuestion, QuizResult, ChatMessage, StudyAid } from '../types';
import { answerQuestion, generateQuiz, generateFlashcards, generateSummary } from '../services/geminiService';
import QuizView from './QuizView';
import StudyAidView from './StudyAidView';
import FeedbackModal from './FeedbackModal';
import { Bot, User as UserIcon, Send, Loader2, ThumbsUp, ThumbsDown, MessageSquarePlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAnalytics } from '../contexts/AnalyticsContext';
import QuizModal from './QuizModal';


interface ChatAssistantProps {
    course: Course;
    videoId?: number;
    externalMessages?: ChatMessage[];
    onMessagesChange?: (messages: ChatMessage[]) => void;
    onQuizSaved?: () => void; // Callback when quiz is saved
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ course, videoId, externalMessages, onMessagesChange, onQuizSaved }) => {
    const { recordInteraction } = useAnalytics();
    const [messages, setMessages] = useState<ChatMessage[]>(externalMessages || []);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
    const [studyAid, setStudyAid] = useState<StudyAid | null>(null);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [selectedMessageForFeedback, setSelectedMessageForFeedback] = useState<ChatMessage | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Sync messages with parent component
    useEffect(() => {
        if (onMessagesChange) {
            onMessagesChange(messages);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    // Load external messages when provided
    useEffect(() => {
        if (externalMessages && externalMessages.length > 0) {
            setMessages(externalMessages);
        }
    }, [externalMessages]);

    // Add welcome message on mount if no messages
    useEffect(() => {
        if (messages.length === 0 && !externalMessages) {
            const welcomeMessage: ChatMessage = {
                id: 'welcome',
                text: `Olá! Eu sou seu assistente de IA para **"${course.title}"**. Faça uma pergunta ou use os comandos:\n\n• \`/quiz\` - Gerar um quiz \n • \`/flashcards\` - Gerar flashcards \n • \`/summary\` - Resumir a sessão`,
                sender: 'ai',
            };
            setMessages([welcomeMessage]);
        }
    }, []);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const lowerInput = input.toLowerCase();

            // Detect quiz generation (with or without slash)
            if (input.startsWith('/quiz') || lowerInput.includes('gere quiz') || lowerInput.includes('gerar quiz') || lowerInput.includes('criar quiz')) {
                const topic = input.replace('/quiz', '').replace(/gere quiz/i, '').replace(/gerar quiz/i, '').replace(/criar quiz/i, '').trim() || 'General';
                const quizData = await generateQuiz(Number(course.id), videoId, topic);
                setQuizQuestions(quizData.questions);
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    text: quizData.saved
                        ? `Aqui está um quiz sobre ${topic}. Boa sorte! (Quiz salvo automaticamente)`
                        : `Aqui está um quiz sobre ${topic}. Boa sorte!`,
                    sender: 'ai',
                };
                setMessages((prev) => [...prev, aiMessage]);
            }
            // Detect flashcards generation
            else if (input.startsWith('/flashcards') || lowerInput.includes('gere flashcard') || lowerInput.includes('gerar flashcard') || lowerInput.includes('criar flashcard')) {
                const topic = input.replace('/flashcards', '').replace(/gere flashcards?/i, '').replace(/gerar flashcards?/i, '').replace(/criar flashcards?/i, '').trim() || 'General';
                const cards = await generateFlashcards(Number(course.id), videoId, topic);
                setStudyAid({ type: 'flashcards', content: cards });
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    text: `Gerei alguns flashcards para você sobre ${topic}. (Salvos automaticamente)`,
                    sender: 'ai',
                };
                setMessages((prev) => [...prev, aiMessage]);
            }
            // Detect summary generation
            else if (input.startsWith('/summary') || lowerInput.includes('resumir') || lowerInput.includes('resumo') || lowerInput.includes('gere resumo')) {
                const topic = input.replace('/summary', '').replace(/resumir/i, '').replace(/resumo/i, '').replace(/gere resumo/i, '').replace(/a sessão/i, '').trim() || 'General';
                const summary = await generateSummary(course.title, messages);
                setStudyAid({ type: 'summary', content: summary });
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    text: `Aqui está um resumo sobre ${topic}.`,
                    sender: 'ai',
                };
                setMessages((prev) => [...prev, aiMessage]);
            }
            // Regular question
            else {
                const response = await answerQuestion(input, Number(course.id), videoId);
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    text: response,
                    sender: 'ai',
                };
                setMessages((prev) => [...prev, aiMessage]);
            }
            recordInteraction({ courseId: course.id, courseTitle: course.title, sender: 'user', text: input });
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Falha ao obter resposta. Por favor, tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuizComplete = async (results: QuizResult[]) => {
        setQuizQuestions(null);
        const correct = results.filter(r => r.isCorrect).length;
        const total = results.length;
        const aiMessage: ChatMessage = {
            id: Date.now().toString(),
            text: `Você completou o quiz! Pontuação: ${correct}/${total}`,
            sender: 'ai',
        };
        setMessages((prev) => [...prev, aiMessage]);

        // Notify parent that quiz was completed (it was auto-saved on generation)
        if (onQuizSaved) {
            onQuizSaved();
        }
    };


    const handleFeedback = (messageId: string, type: 'positive' | 'negative') => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, feedback: type } : msg
        ));
        const msg = messages.find(m => m.id === messageId);
        if (msg) {
            recordInteraction({ courseId: course.id, courseTitle: course.title, sender: msg.sender, text: `Feedback: ${type}` });
        }
    };

    const handleOpenFeedbackModal = (message: ChatMessage) => {
        setSelectedMessageForFeedback(message);
        setIsFeedbackModalOpen(true);
    };

    const handleFeedbackSubmit = (text: string) => {
        if (selectedMessageForFeedback) {
            setMessages(prev => prev.map(msg =>
                msg.id === selectedMessageForFeedback.id ? { ...msg, feedbackText: text } : msg
            ));
            recordInteraction({ courseId: course.id, courseTitle: course.title, sender: 'user', text: `Detailed feedback: ${text}` });
        }
        setIsFeedbackModalOpen(false);
        setSelectedMessageForFeedback(null);
    };

    return (
        <>
            {studyAid && <StudyAidView aid={studyAid} onClose={() => setStudyAid(null)} courseId={course.id} />}
            <FeedbackModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                onSubmit={handleFeedbackSubmit}
                messageText={selectedMessageForFeedback?.text || ''}
            />

            <div className="h-full flex flex-col">
                {/* Quiz Modal - Opens separately */}
                {quizQuestions && (
                    <QuizModal
                        isOpen={true}
                        onClose={() => setQuizQuestions(null)}
                        questions={quizQuestions}
                        onComplete={handleQuizComplete}
                        courseName={course.title}
                    />
                )}

                {/* Chat messages - always visible */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'
                                } `}
                        >
                            {msg.sender === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                                </div>
                            )}
                            <div
                                className={`max-w-[85%] p-3 rounded-2xl ${msg.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                                    } `}
                            >
                                <div className="prose prose-sm dark:prose-invert max-w-none">
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
                                            className={`w-4 h-4 transition-colors ${msg.feedback === 'positive'
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
                                            className={`w-4 h-4 transition-colors ${msg.feedback === 'negative'
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
                                            className={`w-4 h-4 transition-colors ${msg.feedbackText
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
                            <div className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-800 rounded-bl-none flex items-center space-x-2">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-0" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input field - always visible */}
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
        </>
    );
};

export default ChatAssistant;
