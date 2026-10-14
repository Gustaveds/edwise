import React, { useState, useEffect } from 'react';
import { MessageSquare, Brain, FileText, ChevronRight, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';
import { useDialog } from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';
import Modal from './ui/Modal';

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

type TabType = 'flashcards' | 'chats' | 'notes';

const SavedItemsView: React.FC<{ courseId?: string }> = ({ courseId }) => {
    const { token } = useAuth();
    const { confirm } = useDialog();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('flashcards');
    const [flashcards, setFlashcards] = useState<SavedFlashcard[]>([]);
    const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    useEffect(() => { fetchData(); }, [activeTab, courseId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            switch (activeTab) {
                case 'flashcards': await fetchFlashcards(); break;
                case 'chats':      await fetchChatHistories(); break;
                case 'notes':      /* not yet implemented */ break;
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
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        setFlashcards(await res.json());
    };

    const fetchChatHistories = async () => {
        const url = courseId
            ? `${config.API_URL}/api/chat-history?course_id=${courseId}`
            : `${config.API_URL}/api/chat-history`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        setChatHistories(await res.json());
    };

    const deleteItem = async (id: number, type: TabType) => {
        const ok = await confirm({
            title: 'Deletar este item?',
            message: 'Esta ação não pode ser desfeita.',
            confirmLabel: 'Deletar',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            const endpoint = type === 'flashcards' ? `/api/flashcards/${id}`
                : type === 'chats' ? `/api/chat-history/${id}`
                : `/api/notes/${id}`;
            await fetch(`${config.API_URL}${endpoint}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Item deletado');
            fetchData();
        } catch (err) {
            console.error('Error deleting item:', err);
            toast.error('Erro ao deletar item');
        }
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

    const tabBtn = (key: TabType, label: string, Icon: any) => (
        <button
            onClick={() => setActiveTab(key)}
            className={`py-3 px-1 inline-flex items-center gap-2 text-sm font-medium border-b-2 transition-colors
                ${activeTab === key ? 'text-brand-600 border-brand-500' : 'text-ink-500 hover:text-ink-900 border-transparent'}`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );

    return (
        <div className="space-y-8">
            <div>
                <span className="label">Biblioteca</span>
                <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink-900">
                    Meus recursos salvos
                </h2>
                <p className="mt-2 text-base text-ink-600">
                    Acesse seus flashcards, conversas e anotações.
                </p>
            </div>

            <div className="border-b border-ink-200">
                <nav className="-mb-px flex gap-6">
                    {tabBtn('flashcards', 'Flashcards', Brain)}
                    {tabBtn('chats', 'Conversas', MessageSquare)}
                    {tabBtn('notes', 'Notas', FileText)}
                </nav>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-card bg-ink-100 animate-pulse" />)}
                </div>
            ) : (
                <>
                    {activeTab === 'flashcards' && (
                        flashcards.length === 0 ? (
                            <EmptyState icon={Brain} text="Nenhum flashcard salvo ainda." />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {flashcards.map(item => (
                                    <ItemCard
                                        key={item.id}
                                        title={item.title}
                                        subtitle={`${item.cards?.length || 0} cards`}
                                        date={formatDate(item.created_at)}
                                        onView={() => setSelectedItem(item)}
                                        onDelete={() => deleteItem(item.id, 'flashcards')}
                                        accent="bg-brand-50 text-brand-600"
                                        Icon={Brain}
                                    />
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'chats' && (
                        chatHistories.length === 0 ? (
                            <EmptyState icon={MessageSquare} text="Nenhuma conversa salva ainda." />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {chatHistories.map(item => (
                                    <ItemCard
                                        key={item.id}
                                        title="Conversa"
                                        subtitle={`${item.messages?.length || 0} mensagens`}
                                        date={formatDate(item.created_at)}
                                        onView={() => setSelectedItem(item)}
                                        onDelete={() => deleteItem(item.id, 'chats')}
                                        accent="bg-blue-50 text-blue-600"
                                        Icon={MessageSquare}
                                    />
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'notes' && (
                        <EmptyState icon={FileText} text="Visualização de notas em desenvolvimento." />
                    )}
                </>
            )}

            <Modal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                size="lg"
                title={selectedItem?.title || 'Detalhes'}
            >
                <div className="space-y-3 max-h-[60vh] overflow-y-auto ds-scroll">
                    {activeTab === 'flashcards' && selectedItem?.cards?.map((card: any, idx: number) => (
                        <div key={idx} className="rounded-xl ring-1 ring-ink-200 p-4">
                            <p className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-1">Pergunta</p>
                            <p className="font-medium text-ink-900 mb-3">{card.question}</p>
                            <p className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-1">Resposta</p>
                            <p className="text-ink-700">{card.answer}</p>
                        </div>
                    ))}
                    {activeTab === 'chats' && selectedItem?.messages?.map((msg: any, idx: number) => (
                        <div key={idx} className={`p-3 rounded-xl text-sm ${msg.sender === 'user' ? 'bg-brand-50 ring-1 ring-brand-100 ml-8' : 'bg-ink-50 ring-1 ring-ink-200 mr-8'}`}>
                            <p className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-1">{msg.sender === 'user' ? 'Você' : 'IA'}</p>
                            <p className="text-ink-800">{msg.text}</p>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

const EmptyState: React.FC<{ icon: any; text: string }> = ({ icon: Icon, text }) => (
    <div className="surface p-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 grid place-items-center mb-4">
            <Icon className="w-6 h-6 text-brand-500" />
        </div>
        <p className="text-ink-600">{text}</p>
    </div>
);

const ItemCard: React.FC<{
    title: string;
    subtitle: string;
    date: string;
    onView: () => void;
    onDelete: () => void;
    accent: string;
    Icon: any;
}> = ({ title, subtitle, date, onView, onDelete, accent, Icon }) => (
    <div className="surface p-5 hover:shadow-card-hover transition-shadow">
        <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 ${accent}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-display font-semibold text-ink-900 truncate">{title}</h3>
            </div>
            <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                title="Deletar"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
        <p className="text-sm text-ink-600 mb-4">{subtitle}</p>
        <div className="flex items-center justify-between pt-3 border-t border-ink-100">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-ink-500">
                <Calendar className="w-3 h-3" />
                {date}
            </div>
            <button onClick={onView} className="text-xs font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-0.5">
                Ver <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </div>
    </div>
);

export default SavedItemsView;
