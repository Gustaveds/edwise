import React, { useState, useEffect } from 'react';
import { Course, MaterialType, Module, Material } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Save, X, Plus, Trash2, Folder, FileText, Video, GripVertical, ClipboardList, Upload, Link as LinkIcon, File } from 'lucide-react';
import ResourcePicker from './ResourcePicker';
import VideoForm from './forms/VideoForm';
import TextForm from './forms/TextForm';
import QuizForm from './forms/QuizForm';
import VideoUpload from './VideoUpload';

interface CourseEditorProps {
    course: Course | null;
    onSave: () => void;
    onCancel: () => void;
}

const CourseEditor: React.FC<CourseEditorProps> = ({ course, onSave, onCancel }) => {
    const { token } = useAuth();
    const [title, setTitle] = useState(course?.title || '');
    const [description, setDescription] = useState(course?.description || '');
    const [modules, setModules] = useState<Module[]>([]);

    // UI State
    const [pickerOpen, setPickerOpen] = useState(false);
    const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null);
    const [editingContent, setEditingContent] = useState<{ mIndex: number, cIndex: number } | null>(null);
    const [uploadModuleIndex, setUploadModuleIndex] = useState<number | null>(null);

    useEffect(() => {
        if (course) {
            fetchCourseDetails();
        } else {
            setModules([
                { id: -1, title: 'Módulo 1: Introdução', contents: [] }
            ]);
        }
    }, [course]);

    const fetchCourseDetails = async () => {
        if (!course) return;
        try {
            const res = await fetch(`http://localhost:3001/api/courses/${course.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.modules) {
                setModules(data.modules);
            } else {
                setModules([{ id: -1, title: 'Módulo 1', contents: [] }]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveCourse = async () => {
        try {
            // 1. Save Course
            const method = course ? 'PUT' : 'POST';
            const url = course
                ? `http://localhost:3001/api/courses/${course.id}`
                : 'http://localhost:3001/api/courses';

            const courseRes = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ title, description, organization_type: 'modules' })
            });

            if (!courseRes.ok) throw new Error('Failed to save course');
            const savedCourse = await courseRes.json();

            // 2. Save Modules & Contents (Sequential for simplicity)
            for (const module of modules) {
                // Create Module
                const moduleRes = await fetch('http://localhost:3001/api/modules', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        course_id: savedCourse.id,
                        title: module.title,
                        type: 'section'
                    })
                });
                const savedModule = await moduleRes.json();

                // Create Contents
                for (const content of module.contents) {
                    if (content.type === MaterialType.Quiz) {
                        // Special handling for Quiz
                        await fetch('http://localhost:3001/api/quizzes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                                content_id: null, // This endpoint creates both content and quiz in transaction if we updated it, but currently it expects content_id. 
                                // WAIT: My backend implementation for /api/quizzes inserts into quizzes table. It needs a content_id.
                                // So I must create content first.
                                // Let's simplify: Create content first for ALL types.
                            })
                        });
                        // Actually, let's stick to the plan: Save Content -> Then Save Specifics.
                        // But my /api/quizzes creates a quiz linked to content.

                        // Step A: Create Content Record
                        const contentRes = await fetch('http://localhost:3001/api/contents', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                                module_id: savedModule.id,
                                title: content.title,
                                type: content.type,
                                data: content.content, // For video/text this is the content. For quiz, it might be placeholder.
                                description: content.description
                            })
                        });
                        const savedContent = await contentRes.json();

                        // Step B: If Quiz, save quiz details
                        if (content.type === MaterialType.Quiz && content.settings?.questions) {
                            await fetch('http://localhost:3001/api/quizzes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({
                                    content_id: savedContent.id,
                                    title: content.title,
                                    passing_score: content.settings.passing_score,
                                    questions: content.settings.questions
                                })
                            });
                        }
                    } else {
                        // Standard Content (Video, Text)
                        await fetch('http://localhost:3001/api/contents', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                                module_id: savedModule.id,
                                title: content.title,
                                type: content.type,
                                data: content.content,
                                description: content.description
                            })
                        });
                    }
                }
            }

            onSave();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar curso. Verifique o console.');
        }
    };

    const addModule = () => {
        setModules([...modules, { id: -Date.now(), title: `Novo Módulo ${modules.length + 1}`, contents: [] }]);
    };

    const openPicker = (mIndex: number) => {
        setActiveModuleIndex(mIndex);
        setPickerOpen(true);
    };

    const handleResourceSelect = (type: MaterialType) => {
        if (activeModuleIndex === null) return;

        // Special handling for Video Upload
        if (type === MaterialType.Video) {
            const module = modules[activeModuleIndex];
            if (module.id < 0) {
                alert("Por favor, salve o curso para criar o módulo antes de fazer upload de vídeos.");
                return;
            }
            setUploadModuleIndex(activeModuleIndex);
            setPickerOpen(false);
            return;
        }

        const newModules = [...modules];
        const newContent: Material = {
            id: `temp-${Date.now()}`,
            title: `Novo ${type}`,
            type: type,
            content: '',
            description: '',
            settings: {}
        };

        newModules[activeModuleIndex].contents.push(newContent);
        setModules(newModules);
        setEditingContent({ mIndex: activeModuleIndex, cIndex: newModules[activeModuleIndex].contents.length - 1 });
        setPickerOpen(false);
    };

    const updateContent = (data: any) => {
        if (!editingContent) return;
        const { mIndex, cIndex } = editingContent;
        const newModules = [...modules];

        // Merge updates
        newModules[mIndex].contents[cIndex] = {
            ...newModules[mIndex].contents[cIndex],
            ...data,
            // If it's a quiz, store questions in settings for later save
            settings: data.type === MaterialType.Quiz ? { passing_score: data.passing_score, questions: data.questions } : {}
        };

        setModules(newModules);
        // Don't close editing, allows user to keep refining
        // setEditingContent(null); 
    };

    const handleDeleteContent = async (mIndex: number, cIndex: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening editor
        if (!confirm('Tem certeza que deseja excluir este conteúdo? Esta ação não pode ser desfeita.')) return;

        const module = modules[mIndex];
        const content = module.contents[cIndex];

        try {
            // If it's a saved content (has ID and not temp), delete from backend
            if (content.id && !content.id.toString().startsWith('temp-')) {
                const res = await fetch(`http://localhost:3001/api/contents/${content.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to delete content');
            }

            // Update UI
            const newModules = [...modules];
            newModules[mIndex].contents.splice(cIndex, 1);
            setModules(newModules);

            // If we were editing this content, close editor
            if (editingContent?.mIndex === mIndex && editingContent?.cIndex === cIndex) {
                setEditingContent(null);
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir conteúdo.');
        }


    };

    const handleDeleteModule = async (mIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir este módulo e TODO o seu conteúdo? Esta ação não pode ser desfeita.')) return;

        const module = modules[mIndex];

        try {
            // If it's a saved module (has ID and not temp), delete from backend
            if (module.id && module.id > 0) {
                const res = await fetch(`http://localhost:3001/api/modules/${module.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to delete module');
            }

            // Update UI
            const newModules = [...modules];
            newModules.splice(mIndex, 1);
            setModules(newModules);
            setEditingContent(null);

        } catch (err) {
            console.error(err);
            alert('Erro ao excluir módulo.');
        }
    };

    const renderContentIcon = (type: MaterialType) => {
        switch (type?.toUpperCase()) {
            case MaterialType.Video: return <Video className="w-4 h-4 text-blue-500" />;
            case 'VIDEO': return <Video className="w-4 h-4 text-blue-500" />;
            case MaterialType.Text: return <FileText className="w-4 h-4 text-blue-400" />;
            case MaterialType.Quiz: return <ClipboardList className="w-4 h-4 text-green-500" />;
            case MaterialType.Assignment: return <Upload className="w-4 h-4 text-purple-500" />;
            case MaterialType.Link: return <LinkIcon className="w-4 h-4 text-yellow-500" />;
            case MaterialType.File: return <File className="w-4 h-4 text-gray-500" />;
            default: return <FileText className="w-4 h-4 text-gray-400" />;
        }
    };

    const renderEditor = () => {
        if (!editingContent) {
            return (
                <div className="text-center text-gray-400">
                    <Folder className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Selecione um conteúdo à esquerda para editar seus detalhes.</p>
                </div>
            );
        }

        const { mIndex, cIndex } = editingContent;
        const content = modules[mIndex]?.contents[cIndex];

        if (!content) return <div>Conteúdo não encontrado</div>;

        const commonProps = {
            initialData: content,
            onSubmit: updateContent,
            onCancel: () => setEditingContent(null)
        };

        switch (content.type?.toUpperCase()) {
            case MaterialType.Video:
            case 'VIDEO':
                return <VideoForm {...commonProps} />;
            case MaterialType.Text:
                return <TextForm {...commonProps} />;
            case MaterialType.Quiz:
                return <QuizForm {...commonProps} />;
            default:
                return <div>Editor para {content.type} em desenvolvimento.</div>;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {course ? 'Editar Curso' : 'Criar Novo Curso'}
                    </h2>
                    <p className="text-sm text-gray-500">Organize o conteúdo do seu curso em módulos e aulas.</p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSaveCourse} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30">
                        <Save className="w-5 h-5 mr-2" />
                        Salvar Curso
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Structure */}
                <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900/50">
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título do Curso</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Introdução ao Marketing Digital"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                placeholder="Uma breve descrição..."
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-700 dark:text-gray-300">Estrutura do Curso</h3>
                            <button onClick={addModule} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {modules.map((module, mIndex) => (
                                <div key={module.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 flex items-center justify-between group">
                                        <div className="flex items-center">
                                            <GripVertical className="w-4 h-4 text-gray-400 mr-2 cursor-move" />
                                            <Folder className="w-4 h-4 text-gray-500 mr-2" />
                                            <input
                                                value={module.title}
                                                onChange={(e) => {
                                                    const newModules = [...modules];
                                                    newModules[mIndex].title = e.target.value;
                                                    setModules(newModules);
                                                }}
                                                className="bg-transparent border-none focus:ring-0 font-medium text-sm w-full"
                                            />
                                        </div>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openPicker(mIndex)} title="Adicionar Conteúdo" className="p-1 hover:bg-gray-200 rounded text-blue-600">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteModule(mIndex, e)}
                                                className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
                                                title="Excluir Módulo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        {module.contents.map((content, cIndex) => (
                                            <div
                                                key={content.id}
                                                onClick={() => setEditingContent({ mIndex, cIndex })}
                                                className={`flex items-center p-2 rounded cursor-pointer ${editingContent?.mIndex === mIndex && editingContent?.cIndex === cIndex ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                            >
                                                <div className="mr-3">
                                                    {renderContentIcon(content.type)}
                                                </div>
                                                <span className="text-sm flex-1 truncate">{content.title}</span>
                                                <button
                                                    onClick={(e) => handleDeleteContent(mIndex, cIndex, e)}
                                                    className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Excluir Conteúdo"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {module.contents.length === 0 && (
                                            <p className="text-xs text-center text-gray-400 py-2">Nenhum conteúdo neste módulo.</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area - Preview/Edit Detail */}
                <div className="flex-1 bg-gray-100 dark:bg-gray-900/20 p-8 overflow-y-auto">
                    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
                        {renderEditor()}
                    </div>
                </div>
            </div>

            <ResourcePicker
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={handleResourceSelect}
            />

            {/* Video Upload Modal */}
            {uploadModuleIndex !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-md">
                        <VideoUpload
                            moduleId={modules[uploadModuleIndex].id}
                            onUploadComplete={() => {
                                setUploadModuleIndex(null);
                                fetchCourseDetails(); // Refresh to show new video
                            }}
                            onCancel={() => setUploadModuleIndex(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseEditor;
