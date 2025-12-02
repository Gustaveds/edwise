import React, { useState } from 'react';
import { X, MessageSquare, Maximize2, Minimize2, History } from 'lucide-react';
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

    const handleLoadChat = (loadedMessages: ChatMessage[]) => {
        setMessages(loadedMessages);
    };

    const handleNewChat = () => {
        setMessages([]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 flex overflow-hidden transition-all duration-300 ${isMaximized
                    ? 'w-full h-full max-w-full rounded-none'
                    : 'w-full max-w-4xl h-[85vh] mx-4'
                    }`}
            >
                {/* History Sidebar */}
                <ChatHistorySidebar
                    courseId={Number(course.id)}
                    isOpen={showHistory}
                    onClose={() => setShowHistory(false)}
                    onLoadChat={handleLoadChat}
                    onNewChat={handleNewChat}
                />

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/95">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <MessageSquare className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Assistente IA</h2>
                                <p className="text-sm text-gray-400">{course.title}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`p-2 rounded-lg transition-colors ${showHistory
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }`}
                                title="Histórico de conversas"
                            >
                                <History className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setIsMaximized(!isMaximized)}
                                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                                title={isMaximized ? "Minimizar" : "Maximizar"}
                            >
                                {isMaximized ? (
                                    <Minimize2 className="w-5 h-5" />
                                ) : (
                                    <Maximize2 className="w-5 h-5" />
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                                aria-label="Fechar chat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 overflow-hidden p-6">
                        <ChatAssistant
                            course={course}
                            videoId={videoId}
                            externalMessages={messages.length > 0 ? messages : undefined}
                            onMessagesChange={setMessages}
                            onQuizSaved={onQuizSaved}
                        />
                    </div>

                    {/* Footer hint */}
                    <div className="px-6 py-3 border-t border-gray-800 bg-gray-900/50">
                        <p className="text-xs text-gray-500 text-center">
                            Faça perguntas sobre o curso e receba respostas baseadas no conteúdo
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
