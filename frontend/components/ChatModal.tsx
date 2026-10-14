import React, { useState } from 'react';
import { X, Maximize2, Minimize2, History, Sparkles } from 'lucide-react';
import ChatAssistant from './ChatAssistant';
import ChatHistorySidebar from './ChatHistorySidebar';
import { Course, ChatMessage } from '../types';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: Course;
    activeContent?: any;
    onQuizSaved?: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, course, activeContent, onQuizSaved }) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    if (!isOpen) return null;
    const videoId = activeContent?.video_id;

    return (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6 animate-fade-in-up">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm cursor-default"
            />
            <div
                onClick={(e) => e.stopPropagation()}
                className={`relative glass flex overflow-hidden transition-all duration-300 ${
                    isMaximized
                        ? 'w-full h-[calc(100vh-32px)] max-w-none'
                        : 'w-full max-w-4xl h-[85vh]'
                }`}
            >
                <ChatHistorySidebar
                    courseId={Number(course.id)}
                    isOpen={showHistory}
                    onClose={() => setShowHistory(false)}
                    onLoadChat={setMessages}
                    onNewChat={() => setMessages([])}
                />

                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200 bg-white/70">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-brand-50 grid place-items-center flex-shrink-0">
                                <Sparkles className="w-4 h-4 text-brand-600" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-display font-semibold text-ink-900 truncate">Assistente IA</h2>
                                <p className="text-xs text-ink-500 truncate">{course.title}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900'}`}
                                title="Histórico de conversas"
                            >
                                <History className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsMaximized(!isMaximized)}
                                className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition-colors"
                                title={isMaximized ? 'Minimizar' : 'Maximizar'}
                            >
                                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition-colors"
                                aria-label="Fechar chat"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden p-6">
                        <ChatAssistant
                            course={course}
                            videoId={videoId}
                            externalMessages={messages.length > 0 ? messages : undefined}
                            onMessagesChange={setMessages}
                            onQuizSaved={onQuizSaved}
                        />
                    </div>

                    <div className="px-6 py-3 border-t border-ink-200 bg-white/60">
                        <p className="text-xs text-ink-500 text-center">
                            Faça perguntas sobre o curso e receba respostas baseadas no conteúdo
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
