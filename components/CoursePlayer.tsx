import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, FileText, MessageSquare, Info, Edit3, Menu, Sparkles, Brain, ListChecks, Trash2, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { Course, MaterialType, QuizQuestion } from '../types';
import ChatModal from './ChatModal';
import VideoAIDisplay from './VideoAIDisplay';
import FlashcardsModal from './FlashcardsModal';
import QuizModal from './QuizModal';
import { useAuth } from '../contexts/AuthContext';
import { fetchGeneratedQuizzes, deleteGeneratedQuiz } from '../services/quizService';
import { fetchSavedFlashcardSets, deleteFlashcardSet, FlashcardSet } from '../services/flashcardService';
import { useDialog } from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';
import config from '../config';

interface CoursePlayerProps {
    course: Course;
    onBack: () => void;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ course, onBack }) => {
    const { user } = useAuth();
    const { confirm } = useDialog();
    const toast = useToast();
    const [activeModuleId, setActiveModuleId] = useState<string | number | null>(null);
    const [activeContent, setActiveContent] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'aidata' | 'comments' | 'notes' | 'flashcards' | 'quizzes'>('info');
    const [showSidebar, setShowSidebar] = useState(true);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [isFlashcardsModalOpen, setIsFlashcardsModalOpen] = useState(false);
    const [savedFlashcardSets, setSavedFlashcardSets] = useState<FlashcardSet[]>([]);
    const [selectedFlashcardSet, setSelectedFlashcardSet] = useState<FlashcardSet | null>(null);
    const [generatedQuizzes, setGeneratedQuizzes] = useState<any[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<QuizQuestion[] | null>(null);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

    const [noteText, setNoteText] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        if (activeContent?.id) {
            setNoteText('');
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
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify({ content_id: activeContent.id, note: newText })
                });
                setIsSavingNote(false);
            } catch (err) {
                console.error('Error saving note:', err);
                setIsSavingNote(false);
            }
        }, 1000);
    };

    const isProfessor = user?.role === 'professor' || user?.role === 'admin';

    const modules = course.modules || [{
        id: 1,
        title: 'Módulo 1: Introdução',
        contents: course.materials?.map(m => ({ ...m, type: m.type === MaterialType.Video ? 'video' : 'pdf' })) || []
    }];

    React.useEffect(() => {
        if (modules.length > 0 && modules[0].contents && modules[0].contents.length > 0 && !activeContent) {
            setActiveContent(modules[0].contents[0]);
            setActiveModuleId(modules[0].id);
        }
    }, [modules]);

    useEffect(() => {
        if (activeTab === 'quizzes') loadQuizzes();
        if (activeTab === 'flashcards') loadFlashcardSets();
    }, [activeTab, course.id]);

    const loadQuizzes = async () => {
        const quizzes = await fetchGeneratedQuizzes(course.id);
        setGeneratedQuizzes(quizzes);
    };

    const loadFlashcardSets = async () => {
        const sets = await fetchSavedFlashcardSets(course.id);
        setSavedFlashcardSets(sets);
    };

    const handleOpenFlashcardSet = (set: FlashcardSet) => {
        setSelectedFlashcardSet(set);
        setIsFlashcardsModalOpen(true);
    };

    const handleDeleteFlashcardSet = async (setId: number) => {
        const ok = await confirm({
            title: 'Deletar este conjunto de flashcards?',
            message: 'Esta ação não pode ser desfeita.',
            confirmLabel: 'Deletar',
            tone: 'danger',
        });
        if (!ok) return;
        await deleteFlashcardSet(setId);
        loadFlashcardSets();
        toast.success('Flashcards deletados');
    };

    const handleOpenQuiz = (quiz: any) => {
        try {
            const questions = typeof quiz.questions === 'string' ? JSON.parse(quiz.questions) : quiz.questions;
            setSelectedQuiz(questions);
            setIsQuizModalOpen(true);
        } catch (error) {
            console.error('Error parsing quiz questions:', error);
        }
    };

    const handleDeleteQuiz = async (quizId: number) => {
        const ok = await confirm({
            title: 'Deletar este quiz?',
            message: 'Esta ação não pode ser desfeita.',
            confirmLabel: 'Deletar',
            tone: 'danger',
        });
        if (!ok) return;
        await deleteGeneratedQuiz(quizId);
        loadQuizzes();
        toast.success('Quiz deletado');
    };

    const handleQuizComplete = (results: any) => {
        const correct = results.filter((r: any) => r.isCorrect).length;
        toast.success('Quiz concluído!', `Você acertou ${correct} de ${results.length} questões.`);
        setIsQuizModalOpen(false);
    };

    const handleContentSelect = (content: any, moduleId: string | number) => {
        setActiveContent(content);
        setActiveModuleId(moduleId);
    };

    const videoRef = React.useRef<HTMLVideoElement>(null);

    const parseTime = (timeStr: string): number | null => {
        if (!timeStr) return null;

        // A IA às vezes gera timestamps malformados com uma unidade duplicada
        // (ex: "t=0m1m40s" em vez de "t=1m40s"). Somar todas as ocorrências de
        // cada unidade em vez de pegar só a primeira lida corretamente esse
        // caso (0m + 1m = 1m), em vez de travar no primeiro "0m" e ignorar o
        // resto.
        const sumUnit = (regex: RegExp): number | null => {
            let total = 0;
            let found = false;
            for (const match of timeStr.matchAll(regex)) {
                total += parseInt(match[1], 10);
                found = true;
            }
            return found ? total : null;
        };

        const hoursSum = sumUnit(/(\d+)h/g);
        const minutesSum = sumUnit(/(\d+)m/g);
        const secondsSum = sumUnit(/(\d+)s/g);

        let totalSeconds = 0;
        if (hoursSum !== null) totalSeconds += hoursSum * 3600;
        if (minutesSum !== null) totalSeconds += minutesSum * 60;
        if (secondsSum !== null) totalSeconds += secondsSum;

        if (hoursSum === null && minutesSum === null && secondsSum === null && !isNaN(Number(timeStr))) {
            totalSeconds = Number(timeStr);
        }
        return totalSeconds > 0 ? totalSeconds : null;
    };

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
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [activeContent]);

    const tab = (key: typeof activeTab, label: string, Icon: any) => (
        <button
            onClick={() => setActiveTab(key)}
            className={`px-5 py-3 inline-flex items-center gap-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap
                ${activeTab === key
                    ? 'text-brand-600 border-brand-500'
                    : 'text-ink-500 hover:text-ink-900 border-transparent'}`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );

    return (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 min-h-[calc(100vh-1px)] bg-ink-50">
            {/* Top header bar */}
            <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-ink-200">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
                    <button onClick={onBack} className="btn-ghost !px-3">
                        <ArrowLeft className="w-4 h-4" /> Voltar para cursos
                    </button>
                    <div className="hidden sm:block w-px h-6 bg-ink-200" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono uppercase tracking-wider text-ink-500">Aula</p>
                        <h1 className="font-display font-semibold text-base text-ink-900 truncate">
                            {activeContent?.title || course.title}
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="md:hidden btn-secondary !px-3"
                        aria-label="Abrir conteúdo do curso"
                    >
                        <Menu className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                {/* Left: video + tabs */}
                <div className="surface overflow-hidden flex flex-col">
                    {/* Video / content container */}
                    <div className="bg-ink-950 grid place-items-center aspect-video relative overflow-hidden">
                        {activeContent ? (
                            activeContent.type === 'video' ? (
                                activeContent.video_id ? (
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
                                    <iframe
                                        className="w-full h-full"
                                        src={activeContent.content}
                                        title={activeContent.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className="text-center text-ink-300">
                                        <Play className="w-16 h-16 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">Vídeo não disponível</p>
                                    </div>
                                )
                            ) : activeContent.type === 'pdf' || (activeContent.data && activeContent.data.s3_key) ? (
                                <div className="w-full h-full bg-ink-900 flex flex-col items-center justify-center p-8 text-white text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 grid place-items-center mb-4">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-display font-semibold mb-2">{activeContent.title}</h3>
                                    <p className="text-xs text-ink-300 mb-6 max-w-md">
                                        {activeContent.data?.filename || 'Documento / Arquivo anexo'}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <a
                                            href={`${config.API_URL}/api/contents/${activeContent.id}/file?token=${localStorage.getItem('token')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            <ExternalLink className="w-4 h-4" /> Visualizar Arquivo
                                        </a>
                                        <a
                                            href={`${config.API_URL}/api/contents/${activeContent.id}/file?token=${localStorage.getItem('token')}`}
                                            download={activeContent.data?.filename || 'material.pdf'}
                                            className="btn-secondary !bg-white/10 !text-white hover:!bg-white/20 !border-white/20 flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" /> Baixar
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full bg-white text-ink-900 p-8 overflow-y-auto ds-scroll">
                                    <h2 className="font-display text-2xl font-semibold mb-4">{activeContent.title}</h2>
                                    <div className="prose max-w-none">{activeContent.content}</div>
                                </div>
                            )
                        ) : (
                            <p className="text-ink-300 text-sm">Selecione uma aula para começar</p>
                        )}
                    </div>

                    {/* Bottom tabs */}
                    <div className="border-t border-ink-200 flex border-b border-ink-200 px-2 overflow-x-auto ds-scroll">
                        {tab('info',       'Informações', Info)}
                        {tab('comments',   'Comentários', MessageSquare)}
                        {tab('notes',      'Anotações',   Edit3)}
                        {tab('flashcards', 'Flashcards',  Brain)}
                        {tab('quizzes',    'Quizzes',     ListChecks)}
                        {isProfessor && activeContent?.video_id && tab('aidata', 'Dados IA', Sparkles)}
                    </div>

                    <div className="p-6 min-h-[260px]">
                        {activeTab === 'info' && (
                            <div>
                                <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">
                                    {activeContent?.title || course.title}
                                </h2>
                                <p className="text-ink-600 text-sm">{course.description}</p>
                                {activeContent?.description && (
                                    <div className="mt-5">
                                        <p className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-2">Sobre esta aula</p>
                                        <p className="text-ink-700">{activeContent.description}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'comments' && (
                            <div className="text-center text-ink-500 py-10">
                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p>Nenhum comentário ainda.</p>
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="relative">
                                <textarea
                                    className="w-full min-h-[220px] input resize-y text-sm"
                                    placeholder="Faça suas anotações aqui..."
                                    value={noteText}
                                    onChange={handleNoteChange}
                                />
                                {(isSavingNote || noteText) && (
                                    <div className="absolute bottom-3 right-3 text-xs text-ink-600 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-pill ring-1 ring-ink-200">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isSavingNote ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        {isSavingNote ? 'Salvando...' : 'Salvo'}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'flashcards' && (
                            <div>
                                {savedFlashcardSets.length > 0 ? (
                                    <div className="space-y-3">
                                        <h3 className="font-display text-lg font-semibold text-ink-900 mb-3">
                                            Flashcards gerados ({savedFlashcardSets.length})
                                        </h3>
                                        {savedFlashcardSets.map((set) => (
                                            <div key={set.id} className="rounded-xl ring-1 ring-ink-200 bg-white p-4 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h4 className="font-medium text-ink-900 mb-1 truncate">{set.title}</h4>
                                                    <p className="text-xs text-ink-500">
                                                        {set.cards.length} cards
                                                    </p>
                                                    <p className="text-[11px] font-mono text-ink-400 mt-1">
                                                        {new Date(set.created_at).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button onClick={() => handleOpenFlashcardSet(set)} className="btn-primary !py-1.5 !px-3 text-xs">
                                                        Abrir
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteFlashcardSet(set.id)}
                                                        className="p-2 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Deletar flashcards"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-ink-500 py-10">
                                        <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 grid place-items-center mb-4">
                                            <Brain className="w-5 h-5 text-brand-600" />
                                        </div>
                                        <p className="mb-4 text-sm">Gere flashcards usando o assistente IA</p>
                                        <button onClick={() => setIsChatModalOpen(true)} className="btn-primary">
                                            Abrir assistente
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'quizzes' && (
                            <div>
                                {generatedQuizzes.length > 0 ? (
                                    <div className="space-y-3">
                                        <h3 className="font-display text-lg font-semibold text-ink-900 mb-3">
                                            Quizzes gerados ({generatedQuizzes.length})
                                        </h3>
                                        {generatedQuizzes.map((quiz) => (
                                            <div key={quiz.id} className="rounded-xl ring-1 ring-ink-200 bg-white p-4 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h4 className="font-medium text-ink-900 mb-1 truncate">{quiz.title}</h4>
                                                    <p className="text-xs text-ink-500">
                                                        {(typeof quiz.questions === 'string' ? JSON.parse(quiz.questions) : quiz.questions || []).length} perguntas
                                                    </p>
                                                    <p className="text-[11px] font-mono text-ink-400 mt-1">
                                                        {new Date(quiz.created_at).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button onClick={() => handleOpenQuiz(quiz)} className="btn-primary !py-1.5 !px-3 text-xs">
                                                        Abrir
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuiz(quiz.id)}
                                                        className="p-2 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Deletar quiz"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-ink-500 py-10">
                                        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 grid place-items-center mb-4">
                                            <ListChecks className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <p className="mb-4 text-sm">Gere quizzes usando o assistente IA</p>
                                        <button onClick={() => setIsChatModalOpen(true)} className="btn-primary">
                                            Abrir assistente
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'aidata' && activeContent?.video_id && (
                            <VideoAIDisplay
                                videoId={activeContent.video_id}
                                isOwner={isProfessor}
                                onSeek={(tempo) => {
                                    const seconds = parseTime(tempo);
                                    if (seconds !== null && videoRef.current) {
                                        videoRef.current.currentTime = seconds;
                                        videoRef.current.play().catch(e => console.log('Auto-play prevented:', e));
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Right: course timeline */}
                <aside className={`surface flex flex-col self-start ${showSidebar ? '' : 'hidden lg:flex'}`}>
                    <div className="p-5 border-b border-ink-200">
                        <h3 className="font-display font-semibold text-base text-ink-900">Conteúdo do curso</h3>
                        <div className="w-full bg-ink-100 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-brand-gradient h-full w-1/3" />
                        </div>
                        <p className="text-[11px] font-mono text-ink-500 mt-1.5">33% Concluído</p>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto ds-scroll">
                        {modules.map((module: any) => (
                            <div key={module.id} className="border-b border-ink-100 last:border-0">
                                <div className="px-4 py-2.5 bg-ink-50 text-[11px] font-mono uppercase tracking-wider text-ink-500">
                                    {module.title}
                                </div>
                                <div>
                                    {module.contents?.map((content: any) => {
                                        const active = activeContent?.id === content.id;
                                        return (
                                            <button
                                                key={content.id}
                                                onClick={() => handleContentSelect(content, module.id)}
                                                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-ink-50/60 transition-colors border-l-2
                                                    ${active ? 'bg-brand-50/60 border-brand-500' : 'border-transparent'}`}
                                            >
                                                <div className="mt-0.5 flex-shrink-0">
                                                    {content.type === 'video'
                                                        ? <Play className={`w-4 h-4 ${active ? 'text-brand-600' : 'text-ink-400'}`} />
                                                        : <FileText className={`w-4 h-4 ${active ? 'text-brand-600' : 'text-ink-400'}`} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm truncate ${active ? 'text-brand-700 font-semibold' : 'text-ink-800'}`}>
                                                        {content.title}
                                                    </p>
                                                    <p className="text-[11px] font-mono text-ink-400 mt-0.5">10 min</p>
                                                </div>
                                                {active && <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>

            {/* Floating Chat Button */}
            <button
                onClick={() => setIsChatModalOpen(true)}
                className="fixed bottom-6 right-6 inline-flex items-center gap-2 px-4 py-3 rounded-pill bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-glow-brand z-40 hover:brightness-105 active:brightness-95 transition-all"
                aria-label="Abrir assistente IA"
            >
                <Sparkles className="w-4 h-4" />
                <span className="font-medium text-sm">Assistente IA</span>
            </button>

            <ChatModal
                isOpen={isChatModalOpen}
                onClose={() => setIsChatModalOpen(false)}
                course={course}
                activeContent={activeContent}
                onQuizSaved={loadQuizzes}
            />

            {selectedFlashcardSet && (
                <FlashcardsModal
                    isOpen={isFlashcardsModalOpen}
                    onClose={() => setIsFlashcardsModalOpen(false)}
                    title={selectedFlashcardSet.title}
                    cards={selectedFlashcardSet.cards}
                />
            )}

            {selectedQuiz && (
                <QuizModal
                    isOpen={isQuizModalOpen}
                    onClose={() => setIsQuizModalOpen(false)}
                    questions={selectedQuiz}
                    onComplete={handleQuizComplete}
                    courseName={course.title}
                />
            )}
        </div>
    );
};

export default CoursePlayer;
