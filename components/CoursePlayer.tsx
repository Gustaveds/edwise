import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, CheckCircle, FileText, MessageSquare, Info, Edit3, ChevronRight, Menu, Sparkles, Brain, ListChecks, Trash2 } from 'lucide-react';
import { Course, MaterialType, QuizQuestion } from '../types';
import ChatModal from './ChatModal';
import VideoAIDisplay from './VideoAIDisplay';
import FlashcardsModal from './FlashcardsModal';
import QuizModal from './QuizModal';
import { useAuth } from '../contexts/AuthContext';
import { fetchGeneratedQuizzes, deleteGeneratedQuiz } from '../services/quizService';
import config from '../config';

interface CoursePlayerProps {
    course: Course;
    onBack: () => void;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ course, onBack }) => {
    const { user } = useAuth();
    const [activeModuleId, setActiveModuleId] = useState<string | number | null>(null);
    const [activeContent, setActiveContent] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'aidata' | 'comments' | 'notes' | 'flashcards' | 'quizzes'>('info');
    const [showSidebar, setShowSidebar] = useState(true);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [isFlashcardsModalOpen, setIsFlashcardsModalOpen] = useState(false);
    const [generatedQuizzes, setGeneratedQuizzes] = useState<any[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<QuizQuestion[] | null>(null);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

    const [noteText, setNoteText] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Fetch note on content change
    React.useEffect(() => {
        if (activeContent?.id) {
            setNoteText(''); // Clear previous note while loading
            fetch(`${config.API_URL}/api/notes?content_id=${activeContent.id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => res.json())
                .then(data => setNoteText(data.note || ''))
                .catch(err => console.error('Error fetching note:', err));
        }
    }, [activeContent]);

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setNoteText(newText);
        setIsSavingNote(true);

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            if (!activeContent?.id) return;
            try {
                await fetch(`${config.API_URL}/api/notes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ content_id: activeContent.id, note: newText })
                });
                setIsSavingNote(false);
            } catch (err) {
                console.error('Error saving note:', err);
                setIsSavingNote(false);
            }
        }, 1000); // 1 second debounce
    };

    const isProfessor = user?.role === 'professor' || user?.role === 'admin';

    // Mock data structure if not present in course (adapter)
    const modules = course.modules || [
        {
            id: 1,
            title: 'Módulo 1: Introdução',
            contents: course.materials?.map(m => ({ ...m, type: m.type === MaterialType.Video ? 'video' : 'pdf' })) || []
        }
    ];

    // Set initial content
    React.useEffect(() => {
        if (modules.length > 0 && modules[0].contents && modules[0].contents.length > 0 && !activeContent) {
            setActiveContent(modules[0].contents[0]);
            setActiveModuleId(modules[0].id);
        }
    }, [modules]);

    // Fetch quizzes when quizzes tab is active
    useEffect(() => {
        if (activeTab === 'quizzes') {
            loadQuizzes();
        }
    }, [activeTab, course.id]);

    const loadQuizzes = async () => {
        const quizzes = await fetchGeneratedQuizzes(course.id);
        setGeneratedQuizzes(quizzes);
    };

    const handleOpenQuiz = (quiz: any) => {
        try {
            const questions = typeof quiz.questions === 'string'
                ? JSON.parse(quiz.questions)
                : quiz.questions;
            setSelectedQuiz(questions);
            setIsQuizModalOpen(true);
        } catch (error) {
            console.error('Error parsing quiz questions:', error);
        }
    };

    const handleDeleteQuiz = async (quizId: number) => {
        if (confirm('Tem certeza que deseja deletar este quiz?')) {
            await deleteGeneratedQuiz(quizId);
            loadQuizzes();
        }
    };

    const handleQuizComplete = (results: any) => {
        const correct = results.filter((r: any) => r.isCorrect).length;
        alert(`Quiz concluído! Você acertou ${correct} de ${results.length} questões.`);
        setIsQuizModalOpen(false);
    };

    const handleContentSelect = (content: any, moduleId: string | number) => {
        setActiveContent(content);
        setActiveModuleId(moduleId);
    };

    const videoRef = React.useRef<HTMLVideoElement>(null);

    // Helper to parse time string (e.g., "00m34s", "1h20m", "90s") to seconds
    const parseTime = (timeStr: string): number | null => {
        if (!timeStr) return null;

        let totalSeconds = 0;

        const hoursMatch = timeStr.match(/(\d+)h/);
        const minutesMatch = timeStr.match(/(\d+)m/);
        const secondsMatch = timeStr.match(/(\d+)s/);

        if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
        if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
        if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);

        // Fallback for simple numbers (seconds)
        if (!hoursMatch && !minutesMatch && !secondsMatch && !isNaN(Number(timeStr))) {
            totalSeconds = Number(timeStr);
        }

        return totalSeconds > 0 ? totalSeconds : null;
    };

    // Listen for URL hash changes to seek video
    React.useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash && hash.includes('&t=')) {
                const timeParam = hash.split('&t=')[1];
                const seconds = parseTime(timeParam);

                if (seconds !== null && videoRef.current) {
                    videoRef.current.currentTime = seconds;
                    videoRef.current.play().catch(e => console.log('Auto-play prevented:', e));
                }
            }
        };

        // Check on mount and add listener
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [activeContent]);

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden">
            {/* Main Player Area */}
            <div className="flex-1 flex flex-col relative">
                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-4 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                    <button onClick={onBack} className="flex items-center text-white/80 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Voltar para Cursos
                    </button>
                    <button onClick={() => setShowSidebar(!showSidebar)} className="md:hidden text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Video/Content Container */}
                <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
                    {activeContent ? (
                        activeContent.type === 'video' ? (
                            <div className="w-full h-full bg-black">
                                {activeContent.video_id ? (
                                    // Uploaded video - stream from backend
                                    <video
                                        ref={videoRef}
                                        className="w-full h-full"
                                        controls
                                        controlsList="nodownload"
                                        src={`${config.API_URL}/api/videos/${activeContent.video_id}/stream?token=${localStorage.getItem('token')}`}
                                    >
                                        Seu navegador não suporta a tag de vídeo.
                                    </video>
                                ) : activeContent.content ? (
                                    // External video (YouTube, Vimeo, etc)
                                    <iframe
                                        className="w-full h-full"
                                        src={activeContent.content}
                                        title={activeContent.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className="text-center">
                                        <Play className="w-20 h-20 text-white/20 mx-auto mb-4" />
                                        <p className="text-gray-400">Vídeo não disponível</p>
                                        <p className="text-xs text-gray-600 mt-2">Verifique se o vídeo foi carregado corretamente</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-full p-8 overflow-y-auto bg-white text-gray-900">
                                <h2 className="text-2xl font-bold mb-4">{activeContent.title}</h2>
                                <div className="prose max-w-none">
                                    {activeContent.content}
                                </div>
                            </div>
                        )
                    ) : (
                        <p className="text-gray-500">Selecione uma aula para começar</p>
                    )}
                </div>

                {/* Bottom Tabs Area */}
                <div className="h-1/3 bg-gray-900 border-t border-gray-800 flex flex-col">
                    <div className="flex border-b border-gray-800">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`px-6 py-3 flex items-center text-sm font-medium transition-colors ${activeTab === 'info' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Info className="w-4 h-4 mr-2" />
                            Informações
                        </button>
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`px-6 py-3 flex items-center text-sm font-medium transition-colors ${activeTab === 'comments' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Comentários
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`px-6 py-3 flex items-center text-sm font-medium transition-colors ${activeTab === 'notes' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Anotações
                        </button>
                        <button
                            onClick={() => setActiveTab('flashcards')}
                            className={`px-6 py-3 flex items-center text-sm font-medium transition-colors ${activeTab === 'flashcards' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Brain className="w-4 h-4 mr-2" />
                            Flashcards
                        </button>
                        <button
                            onClick={() => setActiveTab('quizzes')}
                            className={`px-6 py-3 flex items-center text-sm font-medium transition-colors ${activeTab === 'quizzes' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <ListChecks className="w-4 h-4 mr-2" />
                            Quizzes
                        </button>
                        {isProfessor && activeContent?.video_id && (
                            <button
                                onClick={() => setActiveTab('aidata')}
                                className={`px-6 py-3 flex items-center text-sm font-medium transition-colors ${activeTab === 'aidata' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Dados IA
                            </button>
                        )}
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'info' && (
                            <div>
                                <h1 className="text-2xl font-bold mb-2">{activeContent?.title || course.title}</h1>
                                <p className="text-gray-400 mb-4">{course.description}</p>
                                {activeContent?.description && (
                                    <div className="mt-4">
                                        <h3 className="text-sm font-semibold text-gray-400 mb-2">Sobre esta aula</h3>
                                        <p className="text-gray-300">{activeContent.description}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'comments' && (
                            <div className="text-center text-gray-500 mt-10">
                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p>Nenhum comentário ainda.</p>
                            </div>
                        )}
                        {activeTab === 'notes' && (
                            <div className="relative h-full">
                                <textarea
                                    className="w-full h-full bg-gray-800 text-white p-4 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    placeholder="Faça suas anotações aqui..."
                                    value={noteText}
                                    onChange={handleNoteChange}
                                />
                                {isSavingNote && (
                                    <div className="absolute bottom-4 right-4 text-xs text-gray-400 flex items-center bg-gray-900/80 px-2 py-1 rounded">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                                        Salvando...
                                    </div>
                                )}
                                {!isSavingNote && noteText && (
                                    <div className="absolute bottom-4 right-4 text-xs text-gray-400 flex items-center bg-gray-900/80 px-2 py-1 rounded">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                        Salvo
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'flashcards' && (
                            <div className="text-center text-gray-400 mt-10">
                                <Brain className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="mb-4">Flashcards salvos deste curso</p>
                                <button
                                    onClick={() => setIsFlashcardsModalOpen(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    Ver Flashcards
                                </button>
                            </div>
                        )}
                        {activeTab === 'quizzes' && (
                            <div className="p-6">
                                {generatedQuizzes.length > 0 ? (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                            Quizzes Gerados ({generatedQuizzes.length})
                                        </h3>
                                        {generatedQuizzes.map((quiz) => (
                                            <div
                                                key={quiz.id}
                                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                                            {quiz.title}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {typeof quiz.questions === 'string'
                                                                ? JSON.parse(quiz.questions).length
                                                                : quiz.questions?.length || 0} perguntas
                                                        </p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                            {new Date(quiz.created_at).toLocaleString('pt-BR')}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleOpenQuiz(quiz)}
                                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                                                        >
                                                            Abrir Quiz
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteQuiz(quiz.id)}
                                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Deletar quiz"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 mt-10">
                                        <ListChecks className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="mb-4">Gere quizzes usando o Assistente IA</p>
                                        <button
                                            onClick={() => setIsChatModalOpen(true)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                        >
                                            Abrir Assistente IA
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Chat Button */}
            <button
                onClick={() => setIsChatModalOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 z-40 flex items-center gap-2 group"
                aria-label="Abrir assistente IA"
            >
                <MessageSquare className="w-6 h-6" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium">
                    Assistente IA
                </span>
            </button>


            {/* Chat Modal */}
            <ChatModal
                isOpen={isChatModalOpen}
                onClose={() => setIsChatModalOpen(false)}
                course={course}
                activeContent={activeContent}
                onQuizSaved={loadQuizzes}
            />

            {/* Flashcards Modal */}
            <FlashcardsModal
                courseId={course.id}
                isOpen={isFlashcardsModalOpen}
                onClose={() => setIsFlashcardsModalOpen(false)}
            />

            {/* Quiz Modal */}
            {selectedQuiz && (
                <QuizModal
                    isOpen={isQuizModalOpen}
                    onClose={() => setIsQuizModalOpen(false)}
                    questions={selectedQuiz}
                    onComplete={handleQuizComplete}
                    courseName={course.title}
                />
            )}

            {/* Sidebar Timeline */}
            <div className={`w-80 bg-gray-900 border-l border-gray-800 flex flex-col transition-all duration-300 ${showSidebar ? 'translate-x-0' : 'translate-x-full hidden md:flex'}`}>
                <div className="p-4 border-b border-gray-800">
                    <h3 className="font-bold text-lg">Conteúdo do Curso</h3>
                    <div className="w-full bg-gray-800 h-2 rounded-full mt-3 overflow-hidden">
                        <div className="bg-green-500 h-full w-1/3"></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">33% Concluído</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {modules.map((module: any) => (
                        <div key={module.id} className="border-b border-gray-800/50">
                            <div className="px-4 py-3 bg-gray-800/30 font-medium text-sm text-gray-300">
                                {module.title}
                            </div>
                            <div>
                                {module.contents?.map((content: any) => (
                                    <button
                                        key={content.id}
                                        onClick={() => handleContentSelect(content, module.id)}
                                        className={`w-full text-left px-4 py-3 flex items-start hover:bg-gray-800 transition-colors ${activeContent?.id === content.id ? 'bg-gray-800 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                                    >
                                        <div className="mt-1 mr-3">
                                            {content.type === 'video' ? <Play className="w-4 h-4 text-gray-400" /> : <FileText className="w-4 h-4 text-gray-400" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm ${activeContent?.id === content.id ? 'text-white font-medium' : 'text-gray-400'}`}>{content.title}</p>
                                            <p className="text-xs text-gray-600 mt-0.5">10 min</p>
                                        </div>
                                        {/* <CheckCircle className="w-4 h-4 text-green-500 ml-2" /> */}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};

export default CoursePlayer;
