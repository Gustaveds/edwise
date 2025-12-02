import React, { useState, useEffect } from 'react';
import { Brain, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

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

    useEffect(() => {
        if (isOpen) {
            fetchFlashcards();
        }
    }, [isOpen, courseId]);

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

    const handleNextCard = () => {
        if (selectedSet && currentCardIndex < selectedSet.cards.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
            setShowAnswer(false);
        }
    };

    const handlePrevCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(currentCardIndex - 1);
            setShowAnswer(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-800 flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Brain className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {selectedSet ? selectedSet.title : 'Flashcards do Curso'}
                            </h2>
                            <p className="text-sm text-gray-400">
                                {selectedSet ? `${selectedSet.cards.length} cards` : `${flashcardSets.length} conjuntos`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                        </div>
                    ) : selectedSet ? (
                        /* Flashcard Viewer */
                        <div className="space-y-6">
                            <button
                                onClick={() => setSelectedSet(null)}
                                className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Voltar para conjuntos
                            </button>

                            {/* Card Display */}
                            <div className="relative">
                                <div className="bg-gray-800 rounded-xl p-8 min-h-[300px] flex flex-col justify-center items-center">
                                    <div className="w-full text-center mb-4">
                                        <span className="text-sm text-gray-500">
                                            Card {currentCardIndex + 1} de {selectedSet.cards.length}
                                        </span>
                                    </div>
                                    <div className="w-full">
                                        <p className="text-xl font-semibold text-white mb-6">
                                            {selectedSet.cards[currentCardIndex].question}
                                        </p>
                                        {showAnswer && (
                                            <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                <p className="text-gray-300">
                                                    {selectedSet.cards[currentCardIndex].answer}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowAnswer(!showAnswer)}
                                        className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        {showAnswer ? 'Ocultar Resposta' : 'Mostrar Resposta'}
                                    </button>
                                </div>

                                {/* Navigation */}
                                <div className="flex justify-between items-center mt-6">
                                    <button
                                        onClick={handlePrevCard}
                                        disabled={currentCardIndex === 0}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        Anterior
                                    </button>
                                    <button
                                        onClick={handleNextCard}
                                        disabled={currentCardIndex === selectedSet.cards.length - 1}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                    >
                                        Próximo
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : flashcardSets.length === 0 ? (
                        /* Empty State */
                        <div className="text-center py-12">
                            <Brain className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                            <p className="text-gray-400 mb-4">Nenhum flashcard salvo ainda para este curso.</p>
                            <p className="text-sm text-gray-500">
                                Use o Assistente IA para gerar flashcards e salvá-los.
                            </p>
                        </div>
                    ) : (
                        /* Flashcard Sets List */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {flashcardSets.map((set) => (
                                <button
                                    key={set.id}
                                    onClick={() => {
                                        setSelectedSet(set);
                                        setCurrentCardIndex(0);
                                        setShowAnswer(false);
                                    }}
                                    className="bg-gray-800 hover:bg-gray-700 rounded-xl p-5 text-left transition-colors border border-gray-700 hover:border-blue-500/50"
                                >
                                    <h3 className="font-bold text-lg text-white mb-2">{set.title}</h3>
                                    <p className="text-sm text-gray-400 mb-3">
                                        {set.cards.length} flashcards
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(set.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FlashcardsModal;
