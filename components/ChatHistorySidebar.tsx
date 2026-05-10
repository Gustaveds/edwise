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
    courseId, isOpen, onClose, onLoadChat, onNewChat,
}) => {
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) fetchChatHistory();
    }, [isOpen, courseId]);

    const fetchChatHistory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${config.API_URL}/api/chat-history?course_id=${courseId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            setChatHistory(await response.json());
        } catch (error) {
            console.error('Error fetching chat history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-80 bg-white/80 border-r border-ink-200 flex flex-col z-10">
            <div className="flex items-center justify-between p-4 border-b border-ink-200">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-brand-500" />
                    <h3 className="font-display font-semibold text-ink-900">Conversas</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition-colors"
                    aria-label="Fechar histórico"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 border-b border-ink-200">
                <button
                    onClick={() => { onNewChat(); onClose(); }}
                    className="btn-primary w-full justify-center"
                >
                    <MessageSquarePlus className="w-4 h-4" />
                    Nova conversa
                </button>
            </div>

            <div className="flex-1 overflow-y-auto ds-scroll p-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                    </div>
                ) : chatHistory.length === 0 ? (
                    <div className="text-center py-8 text-ink-500">
                        <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhuma conversa salva</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {chatHistory.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { onLoadChat(item.messages); onClose(); }}
                                className="w-full p-3 rounded-xl hover:bg-ink-50 transition-colors text-left group"
                            >
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <span className="text-sm font-medium text-ink-900 group-hover:text-brand-700 transition-colors">
                                        {item.messages.length} mensagens
                                    </span>
                                    <span className="text-[11px] font-mono text-ink-400 flex-shrink-0">
                                        {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                                <p className="text-xs text-ink-600 line-clamp-2">
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
