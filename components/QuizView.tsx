import React, { useState } from 'react';
import { QuizQuestion, QuizResult } from '../types';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Send, Sparkles } from 'lucide-react';

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
        const next = [...selectedAnswers];
        next[currentQuestionIndex] = option;
        setSelectedAnswers(next);
    };

    const handleSubmit = () => {
        setIsSubmitted(true);
        const results: QuizResult[] = questions.map((q, i) => ({
            question: q,
            userAnswer: selectedAnswers[i] || '',
            isCorrect: selectedAnswers[i] === q.correctAnswer,
        }));
        onComplete(results);
    };

    const currentQuestion = questions[currentQuestionIndex];
    const selectedOption = selectedAnswers[currentQuestionIndex];
    const answeredCount = selectedAnswers.filter(a => a !== null).length;

    return (
        <div className="flex flex-col bg-brand-gradient-soft">
            <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-ink-200">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-500" />
                        <span className="font-display font-semibold text-ink-900">Hora do quiz</span>
                    </div>
                    <span className="chip-brand">
                        {currentQuestionIndex + 1} / {questions.length}
                    </span>
                </div>
                <div className="flex gap-1.5">
                    {questions.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                                idx === currentQuestionIndex ? 'bg-brand-gradient'
                                : selectedAnswers[idx] ? 'bg-brand-300'
                                : 'bg-ink-200'
                            }`}
                        />
                    ))}
                </div>
            </div>

            <div className="px-6 py-6 max-w-3xl mx-auto w-full">
                <h4 className="font-display text-lg md:text-xl font-semibold text-ink-900 mb-5 leading-snug">
                    {currentQuestion.question}
                </h4>

                <div className="flex flex-col gap-2.5">
                    {currentQuestion.options && currentQuestion.options.length > 0 ? (
                        currentQuestion.options.map((option, index) => {
                            const isSelected = selectedOption === option;
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSelectOption(option)}
                                    className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 flex items-center gap-3
                                        ${isSelected
                                            ? 'bg-brand-500 border-brand-500 text-white shadow-glow-brand'
                                            : 'bg-white border-ink-200 hover:border-brand-300 hover:bg-brand-50/30 text-ink-900'}`}
                                >
                                    {isSelected
                                        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                        : <Circle className="w-5 h-5 text-ink-300 flex-shrink-0" />}
                                    <span className="text-sm font-medium leading-snug">{option}</span>
                                </button>
                            );
                        })
                    ) : (
                        <div className="text-center py-6 text-ink-500 text-sm">Nenhuma opção disponível</div>
                    )}
                </div>
            </div>

            <div className="flex-shrink-0 border-t border-ink-200 bg-white px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                    <button
                        onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="btn-secondary"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                    </button>

                    <span className="text-xs font-mono text-ink-500">
                        {answeredCount} de {questions.length} respondidas
                    </span>

                    {currentQuestionIndex === questions.length - 1 ? (
                        <button
                            onClick={handleSubmit}
                            disabled={selectedAnswers.some(a => a === null)}
                            className="btn-primary"
                        >
                            <Send className="w-4 h-4" /> Enviar quiz
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentQuestionIndex(p => Math.min(questions.length - 1, p + 1))}
                            className="btn-primary"
                        >
                            Próximo <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizView;
