import React from 'react';
import { X } from 'lucide-react';
import QuizView from './QuizView';
import { QuizQuestion, QuizResult } from '../types';

interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    questions: QuizQuestion[];
    onComplete: (results: QuizResult[]) => void;
    courseName: string;
}

const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose, questions, onComplete, courseName }) => {
    if (!isOpen) return null;

    const handleComplete = (results: QuizResult[]) => {
        onComplete(results);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/95 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Quiz</h2>
                        <p className="text-sm text-gray-400">{courseName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                        aria-label="Fechar quiz"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Quiz Content - Full Height */}
                <div className="flex-1 overflow-hidden">
                    <QuizView questions={questions} onComplete={handleComplete} />
                </div>
            </div>
        </div>
    );
};

export default QuizModal;
