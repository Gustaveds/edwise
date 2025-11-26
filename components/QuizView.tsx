import React, { useState } from 'react';
import { QuizQuestion, QuizResult } from '../types';

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
        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 p-6 rounded-2xl my-4">
            <h3 className="text-xl font-bold mb-1 text-blue-800 dark:text-blue-400">Hora do Quiz!</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Pergunta {currentQuestionIndex + 1} de {questions.length}</p>

            <p className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-100">{currentQuestion.question}</p>

            <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleSelectOption(option)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            selectedOption === option
                                ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500 ring-2 ring-blue-300'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>

            <div className="flex justify-between items-center mt-6">
                <button 
                    onClick={handlePrev} 
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Anterior
                </button>
                {currentQuestionIndex === questions.length - 1 ? (
                     <button
                        onClick={handleSubmit}
                        disabled={selectedAnswers.some(a => a === null)}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
                    >
                        Enviar Quiz
                    </button>
                ) : (
                    <button 
                        onClick={handleNext} 
                        disabled={currentQuestionIndex === questions.length - 1}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Próximo
                    </button>
                )}
            </div>
        </div>
    );
};

export default QuizView;
