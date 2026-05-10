import React from 'react';
import QuizView from './QuizView';
import { QuizQuestion, QuizResult } from '../types';
import Modal from './ui/Modal';

interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    questions: QuizQuestion[];
    onComplete: (results: QuizResult[]) => void;
    courseName: string;
}

const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose, questions, onComplete, courseName }) => {
    const handleComplete = (results: QuizResult[]) => {
        onComplete(results);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            title="Quiz"
            description={courseName}
        >
            <div className="-mx-6 -mb-6 max-h-[70vh] overflow-y-auto ds-scroll">
                <QuizView questions={questions} onComplete={handleComplete} />
            </div>
        </Modal>
    );
};

export default QuizModal;
