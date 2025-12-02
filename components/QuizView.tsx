import React, { useState } from 'react';
import { QuizQuestion, QuizResult } from '../types';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';

interface QuizViewProps {
    questions: QuizQuestion[];
    onComplete: (results: QuizResult[]) => void;
}

const QuizView: React.FC<QuizViewProps> = ({ questions, onComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>(Array(questions.length).fill(null));
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSelectOption = (option: string) => {
        if (isSubmitted) return;
        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestionIndex] = option;
        setSelectedAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        setIsSubmitted(true);
        const results: QuizResult[] = questions.map((q, i) => ({
            question: q,
            userAnswer: selectedAnswers[i] || '',
            isCorrect: selectedAnswers[i] === q.correctAnswer
        }));
        onComplete(results);
    }

    const currentQuestion = questions[currentQuestionIndex];
    const selectedOption = selectedAnswers[currentQuestionIndex];

    return (
        <div className="h-full w-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden">
            {/* Header - Compacto */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 px-4 py-3 text-white">
                <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-lg font-bold">🎯 Hora do Quiz!</h3>
                    <span className="text-xs font-medium px-2.5 py-0.5 bg-white/20 rounded-full">
                        {currentQuestionIndex + 1} / {questions.length}
                    </span>
                </div>
                <div className="flex gap-1.5">
                    {questions.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 flex-1 rounded-full transition-all ${idx === currentQuestionIndex
                                    ? 'bg-white scale-105'
                                    : selectedAnswers[idx]
                                        ? 'bg-blue-300'
                                        : 'bg-white/30'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Question & Options - Sem scroll, apenas overflow-y-auto como fallback */}
            <div className="flex-1 flex flex-col min-h-0 px-4 py-4">
                <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
                    {/* Question - Compacta */}
                    <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 leading-snug">
                        {currentQuestion.question}
                    </h4>

                    {/* Options Grid - Compacto com altura máxima controlada */}
                    <div className="flex-1 flex flex-col gap-2.5 min-h-0">
                        {currentQuestion.options && currentQuestion.options.length > 0 ? (
                            currentQuestion.options.map((option, index) => {
                                const isSelected = selectedOption === option;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectOption(option)}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 flex-shrink-0 ${isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md text-gray-900 dark:text-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0">
                                                {isSelected ? (
                                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                                ) : (
                                                    <Circle className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <span className="flex-1 text-base font-medium leading-snug">
                                                {option}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="text-center py-6 text-gray-500">
                                Nenhuma opção disponível
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Footer - Compacto */}
            <div className="flex-shrink-0 border-t-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                    <button
                        onClick={handlePrev}
                        disabled={currentQuestionIndex === 0}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                    </button>

                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {selectedAnswers.filter(a => a !== null).length} de {questions.length} respondidas
                    </div>

                    {currentQuestionIndex === questions.length - 1 ? (
                        <button
                            onClick={handleSubmit}
                            disabled={selectedAnswers.some(a => a === null)}
                            className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg transition-all text-sm"
                        >
                            ✓ Enviar Quiz
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            disabled={currentQuestionIndex === questions.length - 1}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg transition-all text-sm"
                        >
                            Próximo
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizView;
