import React, { useState } from 'react';
import { StudyAid, Flashcard, Summary } from '../types';
import { X, RefreshCw, ChevronLeft, ChevronRight, ListChecks, Save } from 'lucide-react';
import config from '../config';

// Flashcard Component
const FlashcardViewer: React.FC<{ flashcards: Flashcard[] }> = ({ flashcards }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => setIsFlipped(!isFlipped);
    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setIsFlipped(false); // Show front of next card
            setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
        }
    };
    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false); // Show front of previous card
            setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
        }
    };

    const card = flashcards[currentIndex];

    return (
        <div className="flex flex-col items-center">
            <div
                className="w-full max-w-lg h-64 perspective-1000"
                onClick={handleFlip}
            >
                <div
                    className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}
                >
                    {/* Front */}
                    <div className="absolute w-full h-full backface-hidden bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-800 rounded-xl shadow-lg flex flex-col items-center justify-center p-6 text-center">
                        <p className="text-xs text-blue-500 dark:text-blue-400 font-semibold mb-2">PERGUNTA</p>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{card.question}</p>
                    </div>
                    {/* Back */}
                    <div className="absolute w-full h-full backface-hidden bg-blue-50 dark:bg-blue-900/50 border-2 border-blue-300 dark:border-blue-800 rounded-xl shadow-lg flex flex-col items-center justify-center p-6 text-center rotate-y-180">
                        <p className="text-xs text-green-500 dark:text-green-400 font-semibold mb-2">RESPOSTA</p>
                        <p className="text-md text-gray-700 dark:text-gray-200">{card.answer}</p>
                    </div>
                </div>
            </div>
            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-preserve-3d { transform-style: preserve-3d; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
            `}</style>
            <div className="flex items-center justify-between w-full max-w-lg mt-4">
                <button onClick={handlePrev} disabled={currentIndex === 0} className="p-3 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 text-gray-700 dark:text-gray-200">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        {currentIndex + 1} / {flashcards.length}
                    </span>
                    <button onClick={handleFlip} className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center mt-1">
                        <RefreshCw className="w-3 h-3 mr-1" /> Virar Cartão
                    </button>
                </div>
                <button onClick={handleNext} disabled={currentIndex === flashcards.length - 1} className="p-3 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 text-gray-700 dark:text-gray-200">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

// Summary Component
const SummaryViewer: React.FC<{ summary: Summary }> = ({ summary }) => {
    return (
        <div className="w-full max-w-2xl mx-auto">
            <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center mb-4">
                <ListChecks className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
                {summary.title}
            </h4>
            <ul className="space-y-3 bg-gray-50 dark:bg-gray-700 p-5 rounded-lg border dark:border-gray-600">
                {summary.points.map((point, index) => (
                    <li key={index} className="text-gray-700 dark:text-gray-200 flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span>{point}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}



// ... FlashcardViewer and SummaryViewer components

interface StudyAidViewProps {
    aid: StudyAid;
    onClose: () => void;
    courseId: string;
}

const StudyAidView: React.FC<StudyAidViewProps> = ({ aid, onClose, courseId }) => {
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
                    title: 'Flashcards gerados por IA', // Could prompt for title
                    cards: aid.content,
                }),
            });

            if (!response.ok) throw new Error('Failed to save flashcards');
            alert('Flashcards salvos com sucesso!');
        } catch (error) {
            console.error('Error saving flashcards:', error);
            alert('Erro ao salvar flashcards.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-3xl animate-fade-in-up">
                <div className="absolute top-4 right-4 flex space-x-2 z-10">
                    {aid.type === 'flashcards' && (
                        <button
                            onClick={handleSave}
                            className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-blue-600 dark:text-blue-400"
                            title="Salvar Flashcards"
                        >
                            <Save className="w-5 h-5" />
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    </button>
                </div>

                {aid.type === 'flashcards' && <FlashcardViewer flashcards={aid.content as Flashcard[]} />}
                {aid.type === 'summary' && <SummaryViewer summary={aid.content as Summary} />}

            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default StudyAidView;
