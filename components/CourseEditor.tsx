import React, { useState, useEffect } from 'react';
import { Course, MaterialType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Save, X, Plus, Trash2, Folder, FileText, Video, GripVertical } from 'lucide-react';

interface CourseEditorProps {
    course: Course | null;
    onSave: () => void;
    onCancel: () => void;
}

const CourseEditor: React.FC<CourseEditorProps> = ({ course, onSave, onCancel }) => {
    const { token } = useAuth();
    const [title, setTitle] = useState(course?.title || '');
    const [description, setDescription] = useState(course?.description || '');
    const [modules, setModules] = useState<any[]>([]);

    useEffect(() => {
        if (course) {
            fetchCourseDetails();
        } else {
            // Default structure for new course
            setModules([
                { id: 'temp-1', title: 'Módulo 1: Introdução', contents: [] }
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
                // Fallback if no modules yet
                setModules([{ id: 'temp-1', title: 'Módulo 1', contents: [] }]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        try {
            const method = course ? 'PUT' : 'POST';
            const url = course
                ? `http://localhost:3001/api/courses/${course.id}`
                : 'http://localhost:3001/api/courses';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    // In a real app, we would save modules/contents here or via separate endpoints
                    // For this demo, let's assume the backend handles a nested structure or we just save basic info
                    // and then save modules.
                    // To keep it simple for now, we'll just save the course info.
                    // Implementing full nested save requires backend support for it.
                })
            });

            if (res.ok) {
                // If we have modules to save and it's a new course, we might need the ID.
                // For now, let's just close.
                onSave();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addModule = () => {
        setModules([...modules, { id: `temp-${Date.now()}`, title: `Novo Módulo ${modules.length + 1}`, contents: [] }]);
    };

    const addContent = (moduleIndex: number, type: 'video' | 'pdf') => {
        const newModules = [...modules];
        newModules[moduleIndex].contents.push({
            id: `temp-c-${Date.now()}`,
            title: type === 'video' ? 'Nova Aula de Vídeo' : 'Novo Material PDF',
            type: type,
            content: ''
        });
        setModules(newModules);
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
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-lg shadow-blue-500/30"
                    >
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
                                placeholder="Uma breve descrição sobre o que os alunos irão aprender..."
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
                                            <button onClick={() => addContent(mIndex, 'video')} title="Adicionar Vídeo" className="p-1 hover:bg-gray-200 rounded"><Video className="w-4 h-4 text-blue-500" /></button>
                                            <button onClick={() => addContent(mIndex, 'pdf')} title="Adicionar PDF" className="p-1 hover:bg-gray-200 rounded"><FileText className="w-4 h-4 text-red-500" /></button>
                                            <button title="Excluir Módulo" className="p-1 hover:bg-gray-200 rounded"><Trash2 className="w-4 h-4 text-gray-500" /></button>
                                        </div>
                                    </div>
                                    <div className="p-2 space-y-2">
                                        {module.contents.map((content: any, cIndex: number) => (
                                            <div key={content.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded group">
                                                <div className="mr-3">
                                                    {content.type === 'video' ? <Video className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-red-500" />}
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        value={content.title}
                                                        onChange={(e) => {
                                                            const newModules = [...modules];
                                                            newModules[mIndex].contents[cIndex].title = e.target.value;
                                                            setModules(newModules);
                                                        }}
                                                        className="bg-transparent border-none focus:ring-0 text-sm w-full"
                                                    />
                                                </div>
                                                <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
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
                <div className="flex-1 bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center p-8">
                    <div className="text-center text-gray-400">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg">Selecione um conteúdo à esquerda para editar seus detalhes.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseEditor;
