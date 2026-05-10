import React, { useState } from 'react';
import { StudyAid, Flashcard, Summary } from '../types';
import { RefreshCw, ChevronLeft, ChevronRight, ListChecks, Save } from 'lucide-react';
import config from '../config';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';

const FlashcardViewer: React.FC<{ flashcards: Flashcard[] }> = ({ flashcards }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => setIsFlipped(!isFlipped);
    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
        }
    };
    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
        }
    };

    const card = flashcards[currentIndex];

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-lg h-64 perspective-1000 cursor-pointer" onClick={handleFlip}>
                <div className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}>
                    <div className="absolute w-full h-full backface-hidden bg-white ring-1 ring-ink-200 rounded-modal shadow-card flex flex-col items-center justify-center p-6 text-center">
                        <p className="text-xs font-mono uppercase tracking-wider text-brand-500 mb-2">Pergunta</p>
                        <p className="font-display text-lg font-semibold text-ink-900">{card.question}</p>
                    </div>
                    <div className="absolute w-full h-full backface-hidden bg-brand-gradient-soft ring-1 ring-brand-100 rounded-modal shadow-card flex flex-col items-center justify-center p-6 text-center rotate-y-180">
                        <p className="text-xs font-mono uppercase tracking-wider text-emerald-600 mb-2">Resposta</p>
                        <p className="text-base text-ink-800">{card.answer}</p>
                    </div>
                </div>
            </div>
            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-preserve-3d { transform-style: preserve-3d; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
            `}</style>
            <div className="flex items-center justify-between w-full max-w-lg mt-5">
                <button onClick={handlePrev} disabled={currentIndex === 0} className="btn-secondary !p-2 !rounded-full">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-mono text-ink-500">{currentIndex + 1} / {flashcards.length}</span>
                    <button onClick={handleFlip} className="text-xs text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 font-medium">
                        <RefreshCw className="w-3 h-3" /> Virar cartão
                    </button>
                </div>
                <button onClick={handleNext} disabled={currentIndex === flashcards.length - 1} className="btn-secondary !p-2 !rounded-full">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const SummaryViewer: React.FC<{ summary: Summary }> = ({ summary }) => (
    <div>
        <h4 className="font-display text-xl font-semibold text-ink-900 flex items-center gap-2 mb-4">
            <ListChecks className="w-5 h-5 text-brand-500" />
            {summary.title}
        </h4>
        <ul className="space-y-2 bg-ink-50 ring-1 ring-ink-200 rounded-card p-5">
            {summary.points.map((point, index) => (
                <li key={index} className="text-ink-700 flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{point}</span>
                </li>
            ))}
        </ul>
    </div>
);

interface StudyAidViewProps {
    aid: StudyAid;
    onClose: () => void;
    courseId: string;
}

const StudyAidView: React.FC<StudyAidViewProps> = ({ aid, onClose, courseId }) => {
    const toast = useToast();

    const handleSave = async () => {
        if (aid.type !== 'flashcards') return;
        try {
            const response = await fetch(`${config.API_URL}/api/flashcards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    course_id: courseId,
                    title: 'Flashcards gerados por IA',
                    cards: aid.content,
                }),
            });
            if (!response.ok) throw new Error('Failed to save flashcards');
            toast.success('Flashcards salvos com sucesso!');
        } catch (error) {
            console.error('Error saving flashcards:', error);
            toast.error('Erro ao salvar flashcards');
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            size="lg"
            title={aid.type === 'flashcards' ? 'Flashcards' : 'Resumo'}
            footer={
                aid.type === 'flashcards' ? (
                    <>
                        <button onClick={onClose} className="btn-secondary">Fechar</button>
                        <button onClick={handleSave} className="btn-primary">
                            <Save className="w-4 h-4" /> Salvar flashcards
                        </button>
                    </>
                ) : (
                    <button onClick={onClose} className="btn-secondary">Fechar</button>
                )
            }
        >
            {aid.type === 'flashcards' && <FlashcardViewer flashcards={aid.content as Flashcard[]} />}
            {aid.type === 'summary' && <SummaryViewer summary={aid.content as Summary} />}
        </Modal>
    );
};

export default StudyAidView;
