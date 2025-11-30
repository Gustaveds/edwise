import React, { useState } from 'react';
import { ArrowLeft, Play, CheckCircle, FileText, MessageSquare, Info, Edit3, ChevronRight, Menu } from 'lucide-react';
import { Course, MaterialType } from '../types';
import ChatAssistant from './ChatAssistant';
import VideoAIDisplay from './VideoAIDisplay';
import { useAuth } from '../contexts/AuthContext';

interface CoursePlayerProps {
    course: Course;
    onBack: () => void;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ course, onBack }) => {
    const { user } = useAuth();
    const [activeModuleId, setActiveModuleId] = useState<string | number | null>(null);
    const [activeContent, setActiveContent] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'ai' | 'comments' | 'notes'>('info');
    const [showSidebar, setShowSidebar] = useState(true);

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

    const handleContentSelect = (content: any, moduleId: string | number) => {
        setActiveContent(content);
        setActiveModuleId(moduleId);
    };

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
                                {activeContent.video_id && activeContent.data?.s3_key ? (
                                    <video
                                        className="w-full h-full"
                                        controls
                                        controlsList="nodownload"
                                        src={`${process.env.REACT_APP_MINIO_ENDPOINT || 'http://localhost:9000'}/${process.env.REACT_APP_MINIO_BUCKET || 'edwise'}/${activeContent.data.s3_key}`}
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
                                        <p className="text-gray-400">Processando vídeo...</p>
                                        <p className="text-xs text-gray-600 mt-2">Aguarde o processamento ser concluído</p>
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
                            onClick={() => setActiveTab('ai')}
                            className={`px-6 py-3 flex items-center text-sm font-medium transition-colors ${activeTab === 'ai' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            IA
                        </button>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'info' && (
                            <div>
                                <h1 className="text-2xl font-bold mb-2">{activeContent?.title || course.title}</h1>
                                <p className="text-gray-400">{course.description}</p>
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-3">Assistente IA</h3>
                                    <div className="bg-gray-800 rounded-xl p-4 h-64">
                                        <ChatAssistant course={course} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'comments' && (
                            <div className="text-center text-gray-500 mt-10">
                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p>Nenhum comentário ainda.</p>
                            </div>
                        )}
                        {activeTab === 'notes' && (
                            <textarea
                                className="w-full h-full bg-gray-800 text-white p-4 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                placeholder="Faça suas anotações aqui..."
                            />
                        )}
                        {activeTab === 'ai' && activeContent?.video_id && (
                            <div className="bg-gray-800 rounded-lg p-4">
                                <VideoAIDisplay
                                    videoId={activeContent.video_id}
                                    isOwner={user?.role === 'professor' || user?.role === 'admin'}
                                />
                            </div>
                        )}
                        {activeTab === 'ai' && !activeContent?.video_id && (
                            <div className="text-center text-gray-500 mt-10">
                                <Info className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p>Recursos de IA disponíveis apenas para conteúdos de vídeo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
        </div>
    );
};

export default CoursePlayer;
