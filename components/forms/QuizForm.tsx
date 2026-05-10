import React, { useState } from 'react';
import { MaterialType, Question } from '../../types';
import { Plus, Trash2, CheckCircle2, Circle, X, Save } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface QuizFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
    initialData?: any;
}

const QuizForm: React.FC<QuizFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [passingScore, setPassingScore] = useState(initialData?.passing_score || 70);
    const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);
    const toast = useToast();

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
        const next = [...questions];
        next.splice(index, 1);
        setQuestions(next);
    };

    const updateQuestionText = (index: number, text: string) => {
        const next = [...questions];
        next[index].question_text = text;
        setQuestions(next);
    };

    const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
        const next = [...questions];
        next[qIndex].options[oIndex].text = text;
        setQuestions(next);
    };

    const toggleCorrectOption = (qIndex: number, oIndex: number) => {
        const next = [...questions];
        next[qIndex].options.forEach((opt, idx) => { opt.isCorrect = idx === oIndex; });
        setQuestions(next);
    };

    const addOption = (qIndex: number) => {
        const next = [...questions];
        next[qIndex].options.push({ text: '', isCorrect: false });
        setQuestions(next);
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const next = [...questions];
        next[qIndex].options.splice(oIndex, 1);
        setQuestions(next);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            title,
            type: MaterialType.Quiz,
            content: 'quiz_placeholder',
            passing_score: passingScore,
            questions,
        });
        toast.success('Quiz salvo');
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                    <label className="label">Título do quiz</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input"
                        placeholder="Ex: Avaliação do Módulo 1"
                        required
                    />
                </div>
                <div>
                    <label className="label">Nota mínima (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={passingScore}
                        onChange={(e) => setPassingScore(Number(e.target.value))}
                        className="input"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="rounded-card border border-ink-200 bg-ink-50 p-5">
                        <div className="flex items-start justify-between mb-3">
                            <span className="chip-brand">Questão {qIndex + 1}</span>
                            <button
                                type="button"
                                onClick={() => removeQuestion(qIndex)}
                                className="p-1.5 rounded-lg text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Remover questão"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <input
                            type="text"
                            value={q.question_text}
                            onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                            className="input mb-4"
                            placeholder="Digite a pergunta..."
                            required
                        />

                        <div className="space-y-2 pl-3 border-l-2 border-brand-200">
                            {q.options.map((opt, oIndex) => (
                                <div key={oIndex} className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleCorrectOption(qIndex, oIndex)}
                                        className={`p-1 ${opt.isCorrect ? 'text-emerald-600' : 'text-ink-300 hover:text-ink-500'} transition-colors`}
                                        title={opt.isCorrect ? 'Resposta correta' : 'Marcar como correta'}
                                    >
                                        {opt.isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                    </button>
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                                        className="input !py-1.5 text-sm flex-1"
                                        placeholder={`Opção ${oIndex + 1}`}
                                        required
                                    />
                                    {q.options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => removeOption(qIndex, oIndex)}
                                            className="p-1 rounded text-ink-400 hover:text-red-600 hover:bg-red-50"
                                            title="Remover opção"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addOption(qIndex)}
                                className="text-xs text-brand-600 hover:text-brand-700 font-medium mt-2 inline-flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Adicionar opção
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addQuestion}
                className="w-full py-4 rounded-card border-2 border-dashed border-ink-200 text-sm text-ink-500 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/40 transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" /> Adicionar questão
            </button>

            <div className="flex justify-end gap-3 pt-6 border-t border-ink-100">
                <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">
                    <Save className="w-4 h-4" /> Salvar quiz
                </button>
            </div>
        </form>
    );
};

export default QuizForm;
