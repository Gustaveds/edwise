import config from '../config';

export interface FlashcardSet {
    id: number;
    title: string;
    cards: Array<{ question: string; answer: string }>;
    created_at: string;
}

export const fetchSavedFlashcardSets = async (courseId: string | number): Promise<FlashcardSet[]> => {
    try {
        const response = await fetch(`${config.API_URL}/api/flashcards?course_id=${courseId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch flashcards: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching flashcard sets:', error);
        return [];
    }
};

export const deleteFlashcardSet = async (setId: number): Promise<void> => {
    try {
        const response = await fetch(`${config.API_URL}/api/flashcards/${setId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });

        if (!response.ok) {
            throw new Error(`Failed to delete flashcard set: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error deleting flashcard set:', error);
        throw error;
    }
};
