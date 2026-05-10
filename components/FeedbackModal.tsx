import React, { useState } from 'react';
import { Send } from 'lucide-react';
import Modal from './ui/Modal';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (feedbackText: string) => void;
    messageText: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, messageText }) => {
    const [feedback, setFeedback] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedback.trim()) {
            onSubmit(feedback);
            setFeedback('');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title="Fornecer feedback detalhado"
            description="Sua opinião nos ajuda a melhorar as respostas da IA."
        >
            <div className="rounded-xl bg-ink-50 ring-1 ring-ink-200 p-4 mb-4">
                <p className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-2">Resposta da IA</p>
                <p className="text-sm text-ink-700 italic">"{messageText}"</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Qual foi o problema ou o que você gostou? Seja específico..."
                    className="input min-h-[120px] resize-y"
                    required
                />
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button type="submit" className="btn-primary">
                        <Send className="w-4 h-4" /> Enviar feedback
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default FeedbackModal;
