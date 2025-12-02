import React, { useState, useEffect } from 'react';
import { X, History, Loader2, MessageSquarePlus } from 'lucide-react';
import { ChatMessage } from '../types';
import config from '../config';

interface ChatHistorySidebarProps {
    courseId: number;
    isOpen: boolean;
    onClose: () => void;
    onLoadChat: (messages: ChatMessage[]) => void;
    onNewChat: () => void;
}

interface ChatHistoryItem {
    id: number;
    messages: ChatMessage[];
    created_at: string;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
    courseId,
    isOpen,
    onClose,
    onLoadChat,
    onNewChat
}) => {
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchChatHistory();
        }
    }, [isOpen, courseId]);

    const fetchChatHistory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${config.API_URL}/api/chat-history?course_id=${courseId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
            const data = await response.json();
            setChatHistory(data);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadChat = (item: ChatHistoryItem) => {
        onLoadChat(item.messages);
        onClose();
    };

    const handleNewChat = () => {
        onNewChat();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 left-0 bottom-0 w-80 bg-gray-800 border-r border-gray-700 flex flex-col z-10 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Conversas</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* New Chat Button */}
            <div className="p-4 border-b border-gray-700">
                <button
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    <MessageSquarePlus className="w-5 h-5" />
                    Nova Conversa
                </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    </div>
                ) : chatHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Nenhuma conversa salva</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {chatHistory.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleLoadChat(item)}
                                className="w-full p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-left group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                        {item.messages.length} mensagens
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(item.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: 'short'
                                        })}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-2">
                                    {item.messages[0]?.text || 'Conversa vazia'}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatHistorySidebar;
