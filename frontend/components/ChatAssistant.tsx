import React, { useState, useRef, useEffect } from 'react';
import { Course, QuizQuestion, QuizResult, ChatMessage, StudyAid } from '../types';
import { answerQuestion, generateQuiz, generateFlashcards, generateSummary } from '../services/geminiService';
import StudyAidView from './StudyAidView';
import FeedbackModal from './FeedbackModal';
import { Sparkles, User as UserIcon, Send, Loader2, ThumbsUp, ThumbsDown, MessageSquarePlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAnalytics } from '../contexts/AnalyticsContext';
import QuizModal from './QuizModal';
import LinkifiedText from './LinkifiedText';

interface ChatAssistantProps {
    course: Course;
    videoId?: number;
    externalMessages?: ChatMessage[];
    onMessagesChange?: (messages: ChatMessage[]) => void;
    onQuizSaved?: () => void;
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
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    useEffect(() => { if (messages.length > 1) scrollToBottom(); }, [messages.length]);
    useEffect(() => { onMessagesChange?.(messages); }, [messages]);
    useEffect(() => {
        if (externalMessages && externalMessages.length > 0) setMessages(externalMessages);
    }, [externalMessages]);

    useEffect(() => {
        if (messages.length === 0 && !externalMessages) {
            setMessages([{
                id: 'welcome',
                text: `Olá! Eu sou seu assistente de IA para "${course.title}".\n\nFaça uma pergunta ou use os comandos:\n\n• /quiz — gerar um quiz\n• /flashcards — gerar flashcards\n• /summary — resumir a sessão`,
                sender: 'ai',
            }]);
        }
    }, []);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMessage: ChatMessage = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const lowerInput = input.toLowerCase();
            if (input.startsWith('/quiz') || lowerInput.includes('gere quiz') || lowerInput.includes('gerar quiz') || lowerInput.includes('criar quiz')) {
                const topic = input.replace(/\/quiz|gere quiz|gerar quiz|criar quiz/gi, '').trim() || 'General';
                const quizData = await generateQuiz(Number(course.id), videoId, topic);
                setQuizQuestions(quizData.questions);
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 1).toString(),
                    text: quizData.saved
                        ? `Aqui está um quiz sobre ${topic}. Boa sorte! (Quiz salvo automaticamente)`
                        : `Aqui está um quiz sobre ${topic}. Boa sorte!`,
                    sender: 'ai',
                }]);
            } else if (input.startsWith('/flashcards') || lowerInput.includes('gere flashcard') || lowerInput.includes('gerar flashcard') || lowerInput.includes('criar flashcard')) {
                const topic = input.replace(/\/flashcards|gere flashcards?|gerar flashcards?|criar flashcards?/gi, '').trim() || 'General';
                const cards = await generateFlashcards(Number(course.id), videoId, topic);
                setStudyAid({ type: 'flashcards', content: cards });
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 1).toString(),
                    text: `Gerei alguns flashcards para você sobre ${topic}. (Salvos automaticamente)`,
                    sender: 'ai',
                }]);
            } else if (input.startsWith('/summary') || lowerInput.includes('resumir') || lowerInput.includes('resumo') || lowerInput.includes('gere resumo')) {
                const topic = input.replace(/\/summary|resumir|resumo|gere resumo|a sessão/gi, '').trim() || 'General';
                const summary = await generateSummary(course.title, messages);
                setStudyAid({ type: 'summary', content: summary });
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 1).toString(),
                    text: `Aqui está um resumo sobre ${topic}.`,
                    sender: 'ai',
                }]);
            } else {
                const response = await answerQuestion(input, Number(course.id), videoId);
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 1).toString(),
                    text: response,
                    sender: 'ai',
                }]);
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
        setMessages((prev) => [...prev, {
            id: Date.now().toString(),
            text: `Você completou o quiz! Pontuação: ${correct}/${results.length}`,
            sender: 'ai',
        }]);
        onQuizSaved?.();
    };

    const handleFeedback = (messageId: string, type: 'positive' | 'negative') => {
        setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, feedback: type } : msg));
        const msg = messages.find(m => m.id === messageId);
        if (msg) recordInteraction({ courseId: course.id, courseTitle: course.title, sender: msg.sender, text: `Feedback: ${type}` });
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
                {quizQuestions && (
                    <QuizModal
                        isOpen={true}
                        onClose={() => setQuizQuestions(null)}
                        questions={quizQuestions}
                        onComplete={handleQuizComplete}
                        courseName={course.title}
                    />
                )}

                <div className="flex-1 overflow-y-auto ds-scroll space-y-4 pr-1">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-brand-50 grid place-items-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-brand-600" />
                                </div>
                            )}
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                msg.sender === 'user'
                                    ? 'bg-brand-gradient text-white rounded-br-md shadow-glow-brand'
                                    : 'bg-ink-50 ring-1 ring-ink-200 text-ink-800 rounded-bl-md'
                            }`}>
                                <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown components={{ p: ({ children }) => <LinkifiedText>{children}</LinkifiedText> }}>
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            {msg.sender === 'ai' && (
                                <div className="flex self-center gap-0.5">
                                    <button
                                        onClick={() => handleFeedback(msg.id, 'positive')}
                                        disabled={!!msg.feedback || !!msg.feedbackText}
                                        className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 disabled:cursor-not-allowed transition-colors"
                                        title="Feedback positivo"
                                    >
                                        <ThumbsUp className={`w-3.5 h-3.5 ${msg.feedback === 'positive' ? 'text-emerald-600' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => handleFeedback(msg.id, 'negative')}
                                        disabled={!!msg.feedback || !!msg.feedbackText}
                                        className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 disabled:cursor-not-allowed transition-colors"
                                        title="Feedback negativo"
                                    >
                                        <ThumbsDown className={`w-3.5 h-3.5 ${msg.feedback === 'negative' ? 'text-red-600' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => { setSelectedMessageForFeedback(msg); setIsFeedbackModalOpen(true); }}
                                        disabled={!!msg.feedback || !!msg.feedbackText}
                                        className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 disabled:cursor-not-allowed transition-colors"
                                        title="Dar feedback detalhado"
                                    >
                                        <MessageSquarePlus className={`w-3.5 h-3.5 ${msg.feedbackText ? 'text-brand-600' : ''}`} />
                                    </button>
                                </div>
                            )}
                            {msg.sender === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-brand-gradient grid place-items-center flex-shrink-0 shadow-glow-brand">
                                    <UserIcon className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand-50 grid place-items-center flex-shrink-0">
                                <Sparkles className="w-4 h-4 text-brand-600" />
                            </div>
                            <div className="p-3 rounded-2xl bg-ink-50 ring-1 ring-ink-200 rounded-bl-md flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce" />
                                <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce delay-150" />
                                <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce delay-300" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="pt-4 border-t border-ink-200 mt-4 flex-shrink-0">
                    <div className="flex items-center relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Faça uma pergunta ou gere um recurso…"
                            className="input rounded-pill pr-14"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-glow-brand hover:brightness-105 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            aria-label="Enviar"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                </div>
            </div>
        </>
    );
};

export default ChatAssistant;
