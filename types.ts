export enum UserRole {
    Admin = 'ADMIN',
    Professor = 'PROFESSOR',
    Student = 'STUDENT',
}

export enum MaterialType {
    Video = 'VIDEO',
    PDF = 'PDF',
    Text = 'TEXT',
    Quiz = 'QUIZ',
    Assignment = 'ASSIGNMENT',
    Link = 'LINK',
    File = 'FILE'
}

export interface Material {
    id: string;
    title: string;
    type: MaterialType;
    content: string; // URL, Text content, or JSON
    description?: string;
    settings?: any;
    is_published?: boolean;
    release_at?: string;
    release_after_days?: number;
    order_index?: number;
    module_id?: number;
}

export interface Question {
    id?: number;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false';
    options: { text: string; isCorrect: boolean }[];
    order_index?: number;
}

export interface Quiz {
    id?: number;
    content_id?: number;
    title: string;
    passing_score: number;
    questions: Question[];
}

export interface Assignment {
    id?: number;
    content_id?: number;
    max_score: number;
    due_date?: string;
    instructions: string;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    materials: Material[]; // Legacy support, prefer modules structure
    modules?: Module[];
}

export interface Module {
    id: number;
    title: string;
    contents: Material[];
    subModules?: Module[];
}

export interface QuizResult {
    questionId: number;
    userAnswer: any;
    isCorrect: boolean;
    score: number;
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