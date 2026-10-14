import React, { createContext, useContext, useMemo, useState, ReactNode, useCallback } from 'react';
import { QuizResult } from '../types';

type FeedbackType = 'positive' | 'negative';

interface InteractionEvent {
  id: string;
  courseId: string;
  courseTitle: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface QuizEvent {
  id: string;
  courseId: string;
  courseTitle: string;
  correct: number;
  total: number;
  score: number;
  timestamp: string;
}

interface FeedbackEvent {
  id: string;
  courseId: string;
  courseTitle: string;
  type: FeedbackType;
  message: string;
  feedbackText?: string;
  timestamp: string;
}

interface AnalyticsState {
  interactions: InteractionEvent[];
  quizzes: QuizEvent[];
  feedbacks: FeedbackEvent[];
}

interface AnalyticsContextType {
  state: AnalyticsState;
  recordInteraction: (event: Omit<InteractionEvent, 'id' | 'timestamp'>) => void;
  recordQuizCompletion: (params: {
    courseId: string;
    courseTitle: string;
    results: QuizResult[];
  }) => void;
  recordFeedback: (params: {
    courseId: string;
    courseTitle: string;
    type: FeedbackType;
    message: string;
    feedbackText?: string;
  }) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

const createId = () => `${Date.now()}-${Math.random()}`;

export const AnalyticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [interactions, setInteractions] = useState<InteractionEvent[]>([]);
  const [quizzes, setQuizzes] = useState<QuizEvent[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackEvent[]>([]);

  const recordInteraction: AnalyticsContextType['recordInteraction'] = useCallback((event) => {
    setInteractions((prev) => [
      ...prev,
      {
        ...event,
        id: createId(),
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const recordQuizCompletion: AnalyticsContextType['recordQuizCompletion'] = useCallback(
    ({ courseId, courseTitle, results }) => {
      const total = results.length;
      const correct = results.filter((r) => r.isCorrect).length;
      const score = total > 0 ? (correct / total) * 100 : 0;

      setQuizzes((prev) => [
        ...prev,
        {
          id: createId(),
          courseId,
          courseTitle,
          correct,
          total,
          score,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    [],
  );

  const recordFeedback: AnalyticsContextType['recordFeedback'] = useCallback(
    ({ courseId, courseTitle, type, message, feedbackText }) => {
      setFeedbacks((prev) => [
        ...prev,
        {
          id: createId(),
          courseId,
          courseTitle,
          type,
          message,
          feedbackText,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    [],
  );

  const value = useMemo<AnalyticsContextType>(
    () => ({
      state: { interactions, quizzes, feedbacks },
      recordInteraction,
      recordQuizCompletion,
      recordFeedback,
    }),
    [interactions, quizzes, feedbacks, recordInteraction, recordQuizCompletion, recordFeedback],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics deve ser usado dentro de um AnalyticsProvider');
  }
  return context;
};
