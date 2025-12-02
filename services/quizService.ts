import { QuizQuestion, QuizResult } from '../types';
import config from '../config';

export const saveQuiz = async (courseId: string, title: string, questions: QuizQuestion[]): Promise<string> => {
    try {
        const response = await fetch(config.API_URL + '/api/generated-quizzes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
                course_id: courseId,
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

export const fetchGeneratedQuizzes = async (courseId: string): Promise<any[]> => {
    try {
        const response = await fetch(`${config.API_URL}/api/generated-quizzes?course_id=${courseId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch quizzes: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching generated quizzes:', error);
        return [];
    }
};

export const deleteGeneratedQuiz = async (quizId: number): Promise<void> => {
    try {
        const response = await fetch(`${config.API_URL}/api/generated-quizzes/${quizId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to delete quiz: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error deleting quiz:', error);
        throw error;
    }
};

export const saveQuizResult = async (quizId: string, studentId: string, score: number, totalQuestions: number, answers: any[]): Promise<void> => {
    try {
        const response = await fetch(config.API_URL + '/api/quiz-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
