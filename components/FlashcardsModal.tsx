import React, { useState, useEffect } from 'react';
import { Brain, ChevronLeft, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';
import Modal from './ui/Modal';

interface Flashcard {
    question: string;
    answer: string;
}

interface SavedFlashcard {
    id: number;
    title: string;
    cards: Flashcard[];
    created_at: string;
}

interface FlashcardsModalProps {
    courseId: string;
    isOpen: boolean;
    onClose: () => void;
}

const FlashcardsModal: React.FC<FlashcardsModalProps> = ({ courseId, isOpen, onClose }) => {
    const { token } = useAuth();
    const [flashcardSets, setFlashcardSets] = useState<SavedFlashcard[]>([]);
    const [selectedSet, setSelectedSet] = useState<SavedFlashcard | null>(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { if (isOpen) fetchFlashcards(); }, [isOpen, courseId]);

    const fetchFlashcards = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${config.API_URL}/api/flashcards?course_id=${courseId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setFlashcardSets(data);
        } catch (error) {
            console.error('Error fetching flashcards:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const next = () => {
        if (selectedSet && currentCardIndex < selectedSet.cards.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
            setShowAnswer(false);
        }
    };
    const prev = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(currentCardIndex - 1);
            setShowAnswer(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            title={selectedSet ? selectedSet.title : 'Flashcards do curso'}
            description={selectedSet ? `${selectedSet.cards.length} cards` : `${flashcardSets.length} conjuntos disponíveis`}
        >
            {isLoading ? (
                <div className="py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
                </div>
            ) : selectedSet ? (
                <div className="space-y-5">
                    <button
                        onClick={() => setSelectedSet(null)}
                        className="btn-ghost !px-2 !py-1 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar para conjuntos
                    </button>

                    <div className="rounded-modal bg-brand-gradient-soft border border-brand-100 p-8 min-h-[280px] flex flex-col justify-center items-center text-center">
                        <span className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-4">
                            Card {currentCardIndex + 1} de {selectedSet.cards.length}
                        </span>
                        <p className="font-display text-xl font-semibold text-ink-900 mb-4">
                            {selectedSet.cards[currentCardIndex].question}
                        </p>
                        {showAnswer && (
                            <div className="mt-2 p-4 rounded-xl bg-white ring-1 ring-brand-100 text-left max-w-xl">
                                <p className="text-sm text-ink-700">
                                    {selectedSet.cards[currentCardIndex].answer}
                                </p>
                            </div>
                        )}
                        <button
                            onClick={() => setShowAnswer(!showAnswer)}
                            className="btn-primary mt-6"
                        >
                            {showAnswer ? 'Ocultar resposta' : 'Mostrar resposta'}
                        </button>
                    </div>

                    <div className="flex justify-between items-center">
                        <button onClick={prev} disabled={currentCardIndex === 0} className="btn-secondary">
                            <ChevronLeft className="w-4 h-4" /> Anterior
                        </button>
                        <button onClick={next} disabled={currentCardIndex === selectedSet.cards.length - 1} className="btn-secondary">
                            Próximo <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : flashcardSets.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 grid place-items-center mb-4">
                        <Brain className="w-6 h-6 text-brand-500" />
                    </div>
                    <p className="text-ink-700 font-medium">Nenhum flashcard salvo ainda</p>
                    <p className="text-sm text-ink-500 mt-1">
                        Use o assistente IA para gerar flashcards e salvá-los.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {flashcardSets.map((set) => (
                        <button
                            key={set.id}
                            onClick={() => {
                                setSelectedSet(set);
                                setCurrentCardIndex(0);
                                setShowAnswer(false);
                            }}
                            className="rounded-xl border border-ink-200 bg-white p-5 text-left hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Brain className="w-4 h-4 text-brand-500" />
                                <h3 className="font-display font-semibold text-ink-900 truncate">{set.title}</h3>
                            </div>
                            <p className="text-xs text-ink-500">{set.cards.length} cards</p>
                            <p className="text-[11px] font-mono text-ink-400 mt-1">
                                {new Date(set.created_at).toLocaleDateString('pt-BR')}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </Modal>
    );
};

export default FlashcardsModal;
