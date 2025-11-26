export enum UserRole {
    Admin = 'ADMIN',
    Professor = 'PROFESSOR',
    Student = 'STUDENT',
}

export enum MaterialType {
    Video = 'VIDEO',
    PDF = 'PDF',
    Document = 'DOCUMENT',
    Quiz = 'QUIZ'
}

export interface Material {
    id: string;
    title: string;
    type: MaterialType;
    content: string; // URL for video/pdf, or JSON for quiz
}

export interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    materials: Material[];
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}

export interface QuizResult {
    question: QuizQuestion;
    userAnswer: string;
    isCorrect: boolean;
}

export interface Flashcard {
    question: string;
    answer: string;
}

export interface Summary {
    title: string;
    points: string[];
}

export interface StudyAid {
    type: 'flashcards' | 'summary';
    content: Flashcard[] | Summary;
}

// Fix: Add ChatMessage interface for chat functionality.
export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    feedback?: 'positive' | 'negative';
    feedbackText?: string;
}


// Webhook related types
export enum WebhookEvent {
    CONTENT_UPLOADED = 'content.uploaded',
    QUIZ_COMPLETED = 'quiz.completed',
    STUDENT_QUESTION = 'student.question',
}

export interface YoutubeUploadPayload {
    eventType: WebhookEvent.CONTENT_UPLOADED;
    source: 'youtube';
    url: string;
    videoId: string;
    timestamp: string;
}

export interface FileUploadPayload {
    eventType: WebhookEvent.CONTENT_UPLOADED;
    source: 'file';
    filename: string;
    filetype: string;
    size: number;
    data: string; // base64 encoded file
    timestamp: string;
}

export interface QuizCompletionPayload {
    eventType: WebhookEvent.QUIZ_COMPLETED;
    courseId: string;
    courseTitle: string;
    results: QuizResult[];
    score: number;
    total: number;
    timestamp: string;
}

export interface StudentQuestionPayload {
    eventType: WebhookEvent.STUDENT_QUESTION;
    courseId: string;
    courseTitle: string;
    studentMessage: string;
    timestamp: string;
}

export type WebhookPayload = YoutubeUploadPayload | FileUploadPayload | QuizCompletionPayload | StudentQuestionPayload;