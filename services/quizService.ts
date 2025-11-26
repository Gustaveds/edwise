import { QuizQuestion, QuizResult } from '../types';

export const saveQuiz = async (courseId: string, title: string, questions: QuizQuestion[]): Promise<string> => {
    try {
        const response = await fetch('http://localhost:3001/api/quizzes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                courseId,
                title,
                questions,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to save quiz: ${response.statusText}`);
        }

        const data = await response.json();
        return data.id;
    } catch (error) {
        console.error('Error saving quiz:', error);
        throw error;
    }
};

export const saveQuizResult = async (quizId: string, studentId: string, score: number, totalQuestions: number, answers: any[]): Promise<void> => {
    try {
        const response = await fetch('http://localhost:3001/api/quiz-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quizId,
                studentId,
                score,
                totalQuestions,
                answers,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to save quiz result: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error saving quiz result:', error);
        throw error;
    }
};
