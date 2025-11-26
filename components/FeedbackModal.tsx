import React, { useState } from 'react';
import { X } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (feedbackText: string) => void;
    messageText: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, messageText }) => {
    const [feedback, setFeedback] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedback.trim()) {
            onSubmit(feedback);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10">
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Fornecer Feedback Detalhado</h3>
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Resposta da IA:</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 italic">"{messageText}"</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Qual foi o problema ou o que você gostou? Seja específico..."
                        className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        required
                    />
                    <div className="flex justify-end space-x-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                            Enviar Feedback
                        </button>
                    </div>
                </form>
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

export default FeedbackModal;
