import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from './ui/Modal';

interface Flashcard {
    question: string;
    answer: string;
}

interface FlashcardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    cards: Flashcard[];
}

const FlashcardsModal: React.FC<FlashcardsModalProps> = ({ isOpen, onClose, title, cards }) => {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentCardIndex(0);
            setShowAnswer(false);
        }
    }, [isOpen]);

    const next = () => {
        if (currentCardIndex < cards.length - 1) {
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

    if (cards.length === 0) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            title={title}
            description={`${cards.length} cards`}
        >
            <div className="space-y-5">
                <div className="rounded-modal bg-brand-gradient-soft border border-brand-100 p-8 min-h-[280px] flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-4">
                        Card {currentCardIndex + 1} de {cards.length}
                    </span>
                    <p className="font-display text-xl font-semibold text-ink-900 mb-4">
                        {cards[currentCardIndex].question}
                    </p>
                    {showAnswer && (
                        <div className="mt-2 p-4 rounded-xl bg-white ring-1 ring-brand-100 text-left max-w-xl">
                            <p className="text-sm text-ink-700">
                                {cards[currentCardIndex].answer}
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
                    <button onClick={next} disabled={currentCardIndex === cards.length - 1} className="btn-secondary">
                        Próximo <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default FlashcardsModal;
