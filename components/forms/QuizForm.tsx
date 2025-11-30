import React, { useState } from 'react';
import { MaterialType, Question } from '../../types';
import { Plus, Trash2, CheckCircle, Circle } from 'lucide-react';

interface QuizFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
    initialData?: any;
}

const QuizForm: React.FC<QuizFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [passingScore, setPassingScore] = useState(initialData?.passing_score || 70);
    const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                question_text: '',
                question_type: 'multiple_choice',
                options: [
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false }
                ]
            }
        ]);
    };

    const removeQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const updateQuestionText = (index: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[index].question_text = text;
        setQuestions(newQuestions);
    };

    const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex].text = text;
        setQuestions(newQuestions);
    };

    const toggleCorrectOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        // For multiple choice (single answer), uncheck others
        newQuestions[qIndex].options.forEach((opt, idx) => {
            opt.isCorrect = idx === oIndex;
        });
        setQuestions(newQuestions);
    };

    const addOption = (qIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push({ text: '', isCorrect: false });
        setQuestions(newQuestions);
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.splice(oIndex, 1);
        setQuestions(newQuestions);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            title,
            type: MaterialType.Quiz,
            content: 'quiz_placeholder', // Backend handles the specific tables
            passing_score: passingScore,
            questions
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Título do Quiz
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Avaliação do Módulo 1"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nota Mínima (%)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={passingScore}
                        onChange={(e) => setPassingScore(Number(e.target.value))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="space-y-6">
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-medium text-gray-900 dark:text-white">Questão {qIndex + 1}</h4>
                            <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <input
                            type="text"
                            value={q.question_text}
                            onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                            className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Digite a pergunta..."
                            required
                        />

                        <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                            {q.options.map((opt, oIndex) => (
                                <div key={oIndex} className="flex items-center space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => toggleCorrectOption(qIndex, oIndex)}
                                        className={`${opt.isCorrect ? 'text-green-500' : 'text-gray-400 hover:text-gray-500'}`}
                                    >
                                        {opt.isCorrect ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                    </button>
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        placeholder={`Opção ${oIndex + 1}`}
                                        required
                                    />
                                    <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="text-gray-400 hover:text-red-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addOption(qIndex)}
                                className="text-xs text-blue-500 hover:text-blue-600 font-medium mt-2 flex items-center"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Adicionar Opção
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addQuestion}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center font-medium"
            >
                <Plus className="w-5 h-5 mr-2" /> Adicionar Questão
            </button>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                >
                    Salvar Quiz
                </button>
            </div>
        </form>
    );
};

// Helper for X icon since it wasn't imported
const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export default QuizForm;
