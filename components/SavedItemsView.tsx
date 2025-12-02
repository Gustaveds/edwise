import React, { useState, useEffect } from 'react';
import { BookMarked, MessageSquare, Brain, FileText, ChevronRight, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

interface SavedFlashcard {
    id: number;
    title: string;
    cards: { question: string; answer: string }[];
    created_at: string;
    course_id: number;
}

interface ChatHistory {
    id: number;
    messages: any[];
    created_at: string;
    course_id: number;
}

interface SavedNote {
    id: number;
    note: string;
    content_id: number;
    created_at: string;
    updated_at: string;
}

type TabType = 'flashcards' | 'chats' | 'notes';

const SavedItemsView: React.FC<{ courseId?: string }> = ({ courseId }) => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('flashcards');
    const [flashcards, setFlashcards] = useState<SavedFlashcard[]>([]);
    const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
    const [notes, setNotes] = useState<SavedNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, [activeTab, courseId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            switch (activeTab) {
                case 'flashcards':
                    await fetchFlashcards();
                    break;
                case 'chats':
                    await fetchChatHistories();
                    break;
                case 'notes':
                    await fetchNotes();
                    break;
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFlashcards = async () => {
        const url = courseId
            ? `${config.API_URL}/api/flashcards?course_id=${courseId}`
            : `${config.API_URL}/api/flashcards`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setFlashcards(data);
    };

    const fetchChatHistories = async () => {
        const url = courseId
            ? `${config.API_URL}/api/chat-history?course_id=${courseId}`
            : `${config.API_URL}/api/chat-history`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setChatHistories(data);
    };

    const fetchNotes = async () => {
        // Notes API needs content_id, so we'll fetch all or per course
        // For now, let's leave it empty or implement differently
        setNotes([]);
    };

    const deleteItem = async (id: number, type: TabType) => {
        if (!confirm('Tem certeza que deseja deletar este item?')) return;

        try {
            let endpoint = '';
            switch (type) {
                case 'flashcards':
                    endpoint = `/api/flashcards/${id}`;
                    break;
                case 'chats':
                    endpoint = `/api/chat-history/${id}`;
                    break;
                case 'notes':
                    endpoint = `/api/notes/${id}`;
                    break;
            }

            await fetch(`${config.API_URL}${endpoint}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchData();
        } catch (err) {
            console.error('Error deleting item:', err);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Meus Recursos Salvos</h2>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Acesse seus flashcards, conversas e notas.</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('flashcards')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${activeTab === 'flashcards'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <Brain className="w-5 h-5" />
                        <span>Flashcards</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('chats')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${activeTab === 'chats'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <MessageSquare className="w-5 h-5" />
                        <span>Conversas</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${activeTab === 'notes'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <FileText className="w-5 h-5" />
                        <span>Notas</span>
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <>
                        {activeTab === 'flashcards' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {flashcards.length === 0 ? (
                                    <div className="col-span-full text-center py-12">
                                        <Brain className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400">Nenhum flashcard salvo ainda.</p>
                                    </div>
                                ) : (
                                    flashcards.map(item => (
                                        <div
                                            key={item.id}
                                            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{item.title}</h3>
                                                <button
                                                    onClick={() => deleteItem(item.id, 'flashcards')}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Deletar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                {item.cards?.length || 0} cards
                                            </p>
                                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                                                <div className="flex items-center">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {formatDate(item.created_at)}
                                                </div>
                                                <button
                                                    onClick={() => setSelectedItem(item)}
                                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center"
                                                >
                                                    Ver <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'chats' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {chatHistories.length === 0 ? (
                                    <div className="col-span-full text-center py-12">
                                        <MessageSquare className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400">Nenhuma conversa salva ainda.</p>
                                    </div>
                                ) : (
                                    chatHistories.map(item => (
                                        <div
                                            key={item.id}
                                            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Conversa</h3>
                                                <button
                                                    onClick={() => deleteItem(item.id, 'chats')}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Deletar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                {item.messages?.length || 0} mensagens
                                            </p>
                                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                                                <div className="flex items-center">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {formatDate(item.created_at)}
                                                </div>
                                                <button
                                                    onClick={() => setSelectedItem(item)}
                                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center"
                                                >
                                                    Ver <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="col-span-full text-center py-12">
                                <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">Visualização de notas em desenvolvimento.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {selectedItem.title || 'Detalhes'}
                            </h3>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-4">
                            {activeTab === 'flashcards' && selectedItem.cards && (
                                selectedItem.cards.map((card: any, idx: number) => (
                                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <p className="font-semibold text-gray-900 dark:text-white mb-2">Q: {card.question}</p>
                                        <p className="text-gray-600 dark:text-gray-400">A: {card.answer}</p>
                                    </div>
                                ))
                            )}
                            {activeTab === 'chats' && selectedItem.messages && (
                                selectedItem.messages.map((msg: any, idx: number) => (
                                    <div key={idx} className={`p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-100 dark:bg-blue-900/30 ml-8' : 'bg-gray-100 dark:bg-gray-700 mr-8'}`}>
                                        <p className="text-sm font-semibold mb-1">{msg.sender === 'user' ? 'Você' : 'IA'}</p>
                                        <p className="text-gray-800 dark:text-gray-200">{msg.text}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SavedItemsView;
