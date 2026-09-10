import React, { useState, useEffect } from 'react';
import { Course, MaterialType, Module, Material } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
    Save, Plus, Trash2, Folder, FileText, Video, GripVertical,
    ClipboardList, Upload, Link as LinkIcon, File, Loader2,
    ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Sparkles
} from 'lucide-react';
import ResourcePicker from './ResourcePicker';
import VideoForm from './forms/VideoForm';
import TextForm from './forms/TextForm';
import QuizForm from './forms/QuizForm';
import FileForm from './forms/FileForm';
import VideoUpload from './VideoUpload';
import FileUploadModal from './FileUploadModal';
import config from '../config';
import { useDialog } from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';

interface CourseEditorProps {
    course: Course | null;
    onSave: () => void;
    onCancel: () => void;
}

type StepKey = 1 | 2 | 3;

const STEPS: { id: StepKey; label: string; helper: string }[] = [
    { id: 1, label: 'Metadados',  helper: 'Título, descrição e tipo do curso' },
    { id: 2, label: 'Estrutura',  helper: 'Organize módulos e aulas' },
    { id: 3, label: 'Publicação', helper: 'Revise e publique para os alunos' },
];

const CourseEditor: React.FC<CourseEditorProps> = ({ course, onSave, onCancel }) => {
    const { token } = useAuth();
    const { confirm } = useDialog();
    const toast = useToast();
    const [title, setTitle] = useState(course?.title || '');
    const [description, setDescription] = useState(course?.description || '');
    const [modules, setModules] = useState<Module[]>([]);
    const [currentCourseId, setCurrentCourseId] = useState<string | number | null>(
        course?.id ? (typeof course.id === 'string' ? parseInt(course.id) : course.id) : null
    );

    const [step, setStep] = useState<StepKey>(1);
    const [expandedModules, setExpandedModules] = useState<Set<number | string>>(new Set());

    const [pickerOpen, setPickerOpen] = useState(false);
    const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null);
    const [editingContent, setEditingContent] = useState<{ mIndex: number, cIndex: number } | null>(null);
    const [uploadModuleIndex, setUploadModuleIndex] = useState<number | null>(null);
    const [uploadFileModuleIndex, setUploadFileModuleIndex] = useState<number | null>(null);

    useEffect(() => {
        if (course) {
            fetchCourseDetails();
        } else {
            const initial = { id: -1, title: 'Módulo 1: Introdução', contents: [] };
            setModules([initial]);
            setExpandedModules(new Set([initial.id]));
        }
    }, [course]);

    const fetchCourseDetails = async () => {
        if (!course) return;
        try {
            const res = await fetch(`${config.API_URL}/api/courses/${course.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            const list = data.modules?.length ? data.modules : [{ id: -1, title: 'Módulo 1', contents: [] }];
            setModules(list);
            setExpandedModules(new Set(list.map((m: Module) => m.id)));
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveCourse = async () => {
        try {
            const method = currentCourseId ? 'PUT' : 'POST';
            const url = currentCourseId
                ? `${config.API_URL}/api/courses/${currentCourseId}`
                : config.API_URL + '/api/courses';

            const courseRes = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title, description, organization_type: 'modules' })
            });
            if (!courseRes.ok) throw new Error('Failed to save course');

            if (!currentCourseId) {
                const savedCourse = await courseRes.json();
                setCurrentCourseId(savedCourse.id);
            }

            for (const module of modules) {
                if (module.id > 0) {
                    await fetch(`${config.API_URL}/api/modules/${module.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ title: module.title, type: 'section' })
                    });
                }
            }
            toast.success('Curso salvo', 'As alterações foram persistidas.');
            onSave();
        } catch (err) {
            console.error(err);
            toast.error('Erro ao salvar curso', 'Verifique o console e tente novamente.');
        }
    };

    const addModule = () => {
        const newModule = { id: -Date.now(), title: `Novo Módulo ${modules.length + 1}`, contents: [] };
        setModules([...modules, newModule]);
        setExpandedModules(prev => new Set([...prev, newModule.id]));
    };

    const toggleModule = (id: number | string) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const openPicker = (mIndex: number) => {
        setActiveModuleIndex(mIndex);
        setPickerOpen(true);
    };

    const handleResourceSelect = async (type: MaterialType) => {
        if (activeModuleIndex === null) return;
        try {
            let courseId = currentCourseId;
            if (!courseId) {
                if (!title.trim()) {
                    toast.warning('Falta o título', 'Dê um título ao curso antes de adicionar conteúdo.');
                    return;
                }
                const courseRes = await fetch(config.API_URL + '/api/courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ title, description, organization_type: 'modules' })
                });
                if (!courseRes.ok) throw new Error('Failed to save course');
                const savedCourse = await courseRes.json();
                courseId = savedCourse.id;
                setCurrentCourseId(courseId);
            }

            let module = modules[activeModuleIndex];
            if (module.id < 0) {
                const moduleRes = await fetch(config.API_URL + '/api/modules', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ course_id: courseId, title: module.title, type: 'section' })
                });
                if (!moduleRes.ok) throw new Error('Failed to save module');
                const savedModule = await moduleRes.json();
                const newModules = [...modules];
                newModules[activeModuleIndex].id = savedModule.id;
                setModules(newModules);
                module = newModules[activeModuleIndex];
            }

            if (type === MaterialType.Video) {
                setUploadModuleIndex(activeModuleIndex);
                setPickerOpen(false);
                return;
            }

            if (type === MaterialType.File || type === MaterialType.PDF) {
                setUploadFileModuleIndex(activeModuleIndex);
                setPickerOpen(false);
                return;
            }

            const contentRes = await fetch(config.API_URL + '/api/contents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    module_id: module.id,
                    title: `Novo ${type}`,
                    type, data: {}, description: ''
                })
            });
            if (!contentRes.ok) throw new Error('Failed to create content');
            const savedContent = await contentRes.json();

            const newModules = [...modules];
            const newContent: Material = {
                id: savedContent.id,
                title: `Novo ${type}`,
                type, content: '', description: '', settings: {}
            };
            newModules[activeModuleIndex].contents.push(newContent);
            setModules(newModules);
            setEditingContent({ mIndex: activeModuleIndex, cIndex: newModules[activeModuleIndex].contents.length - 1 });
            setPickerOpen(false);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao criar conteúdo', 'Por favor, tente novamente.');
        }
    };

    const updateContent = async (data: any) => {
        if (!editingContent) return;
        const { mIndex, cIndex } = editingContent;
        const newModules = [...modules];
        const updatedContent = {
            ...newModules[mIndex].contents[cIndex],
            ...data,
            settings: data.type === MaterialType.Quiz
                ? { passing_score: data.passing_score, questions: data.questions }
                : {}
        };
        newModules[mIndex].contents[cIndex] = updatedContent;
        setModules(newModules);

        try {
            const contentId = updatedContent.id;
            await fetch(`${config.API_URL}/api/contents/${contentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: data.title, type: data.type, data: data.content, description: data.description
                })
            });
            if (data.type === MaterialType.Quiz && data.questions) {
                await fetch(config.API_URL + '/api/quizzes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        content_id: contentId, title: data.title,
                        passing_score: data.passing_score, questions: data.questions
                    })
                });
            }
        } catch (err) {
            console.error('Erro ao salvar alterações:', err);
        }
    };

    const handleDeleteContent = async (mIndex: number, cIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const ok = await confirm({
            title: 'Excluir conteúdo?',
            message: 'Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir',
            tone: 'danger',
        });
        if (!ok) return;
        const module = modules[mIndex];
        const content = module.contents[cIndex];
        try {
            if (content.id && !content.id.toString().startsWith('temp-')) {
                const res = await fetch(`${config.API_URL}/api/contents/${content.id}`, {
                    method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to delete content');
            }
            const newModules = [...modules];
            newModules[mIndex].contents.splice(cIndex, 1);
            setModules(newModules);
            if (editingContent?.mIndex === mIndex && editingContent?.cIndex === cIndex) {
                setEditingContent(null);
            }
            toast.success('Conteúdo excluído');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao excluir conteúdo');
        }
    };

    const handleDeleteModule = async (mIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const ok = await confirm({
            title: 'Excluir este módulo?',
            message: 'Todo o conteúdo dentro dele também será excluído. Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir módulo',
            tone: 'danger',
        });
        if (!ok) return;
        const module = modules[mIndex];
        try {
            if (module.id && module.id > 0) {
                const res = await fetch(`${config.API_URL}/api/modules/${module.id}`, {
                    method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to delete module');
            }
            const newModules = [...modules];
            newModules.splice(mIndex, 1);
            setModules(newModules);
            setEditingContent(null);
            toast.success('Módulo excluído');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao excluir módulo');
        }
    };

    const renderContentIcon = (type: MaterialType) => {
        const map: Record<string, { icon: any; color: string }> = {
            VIDEO:      { icon: Video,         color: 'text-blue-600 bg-blue-50' },
            TEXT:       { icon: FileText,      color: 'text-indigo-600 bg-indigo-50' },
            QUIZ:       { icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
            ASSIGNMENT: { icon: Upload,        color: 'text-purple-600 bg-purple-50' },
            LINK:       { icon: LinkIcon,      color: 'text-amber-600 bg-amber-50' },
            FILE:       { icon: File,          color: 'text-ink-600 bg-ink-100' },
        };
        const entry = map[type?.toUpperCase()] || { icon: FileText, color: 'text-ink-500 bg-ink-100' };
        const Icon = entry.icon;
        return (
            <div className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${entry.color}`}>
                <Icon className="w-4 h-4" />
            </div>
        );
    };

    /* ────────────────────────── STEP 1: METADADOS ─────────────────────── */
    const renderMetadataStep = () => (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
            <div className="surface p-8 space-y-6">
                <div>
                    <label className="label">Título do Curso</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="input"
                        placeholder="Ex: Introdução ao Marketing Digital"
                    />
                </div>
                <div>
                    <label className="label">Descrição</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="input min-h-[140px] resize-y"
                        placeholder="Descreva o objetivo, público-alvo e o resultado esperado."
                    />
                    <p className="mt-2 text-xs text-ink-500">
                        Uma boa descrição ajuda os alunos a saberem se o curso é para eles.
                    </p>
                </div>
            </div>

            {/* Live preview card */}
            <aside className="space-y-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    <span className="label !mb-0">Pré-visualização</span>
                </div>
                <div className="surface overflow-hidden">
                    <div className="h-32 bg-brand-gradient relative">
                        <div className="absolute inset-0 bg-brand-glow" />
                    </div>
                    <div className="p-5">
                        <h3 className="font-display font-semibold text-lg text-ink-900 truncate">
                            {title || 'Título do seu curso'}
                        </h3>
                        <p className="mt-1 text-sm text-ink-600 line-clamp-2">
                            {description || 'A descrição aparecerá aqui assim que você preencher.'}
                        </p>
                        <div className="mt-4 flex items-center gap-3 text-xs text-ink-500">
                            <span>{modules.length} módulos</span>
                            <span className="w-1 h-1 rounded-full bg-ink-300" />
                            <span>{modules.reduce((acc, m) => acc + m.contents.length, 0)} aulas</span>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );

    /* ─────────────────────── STEP 2: ESTRUTURA ────────────────────────── */
    const renderEditorPanel = () => {
        if (!editingContent) {
            return (
                <div className="h-full grid place-items-center text-center px-8 py-16">
                    <div className="max-w-sm">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 grid place-items-center mb-4">
                            <Folder className="w-6 h-6 text-brand-500" />
                        </div>
                        <h3 className="font-display font-semibold text-lg text-ink-900">
                            Selecione um conteúdo
                        </h3>
                        <p className="mt-1 text-sm text-ink-600">
                            Escolha uma aula à esquerda para editar seus detalhes, ou crie uma nova com o botão
                            <span className="inline-flex align-middle mx-1 px-1.5 py-0.5 rounded bg-ink-100 text-ink-700 text-xs font-mono">+</span>
                            no módulo desejado.
                        </p>
                    </div>
                </div>
            );
        }
        const { mIndex, cIndex } = editingContent;
        const content = modules[mIndex]?.contents[cIndex];
        if (!content) return <div className="p-8 text-ink-500">Conteúdo não encontrado</div>;

        const commonProps = {
            initialData: content,
            onSubmit: updateContent,
            onCancel: () => setEditingContent(null),
        };

        switch (content.type?.toUpperCase()) {
            case MaterialType.Video:
            case 'VIDEO':
                return <VideoForm {...commonProps} />;
            case MaterialType.Text:
                return <TextForm {...commonProps} />;
            case MaterialType.Quiz:
                return <QuizForm {...commonProps} />;
            case MaterialType.File:
            case MaterialType.PDF:
            case 'FILE':
            case 'PDF':
            case 'WORD':
                return <FileForm {...commonProps} />;
            default:
                return <div className="p-8 text-ink-600">Editor para <strong>{content.type}</strong> em desenvolvimento.</div>;
        }
    };

    const renderStructureStep = () => (
        <div className="grid lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] gap-6 h-[calc(100vh-280px)] min-h-[500px]">
            {/* Modules list */}
            <div className="surface flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-ink-200 flex items-center justify-between">
                    <div>
                        <h3 className="font-display font-semibold text-base text-ink-900">Estrutura do Curso</h3>
                        <p className="text-xs text-ink-500 mt-0.5">{modules.length} módulos</p>
                    </div>
                    <button onClick={addModule} className="btn-secondary !py-1.5 !px-3 text-xs">
                        <Plus className="w-3.5 h-3.5" /> Módulo
                    </button>
                </div>

                <div className="flex-1 ds-scroll overflow-y-auto p-4 space-y-3">
                    {modules.map((module, mIndex) => {
                        const expanded = expandedModules.has(module.id);
                        return (
                            <div
                                key={module.id}
                                className="rounded-xl border border-ink-200 bg-white hover:border-ink-300 transition-colors"
                            >
                                {/* Module header */}
                                <div className="flex items-center gap-2 px-3 py-2.5 group">
                                    <button
                                        onClick={() => toggleModule(module.id)}
                                        className="p-1 rounded text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
                                        title={expanded ? 'Recolher' : 'Expandir'}
                                    >
                                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    <GripVertical className="w-4 h-4 text-ink-300 cursor-move" />
                                    <Folder className="w-4 h-4 text-brand-500 flex-shrink-0" />
                                    <input
                                        value={module.title}
                                        onChange={(e) => {
                                            const newModules = [...modules];
                                            newModules[mIndex].title = e.target.value;
                                            setModules(newModules);
                                        }}
                                        className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm font-semibold text-ink-900 min-w-0"
                                    />
                                    <span className="text-[11px] font-mono text-ink-400 flex-shrink-0">
                                        {module.contents.length}
                                    </span>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openPicker(mIndex)}
                                            title="Adicionar conteúdo"
                                            className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteModule(mIndex, e)}
                                            title="Excluir módulo"
                                            className="p-1.5 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Contents */}
                                {expanded && (
                                    <div className="px-3 pb-3 pl-9 space-y-1">
                                        {module.contents.map((content, cIndex) => {
                                            const isEditing = editingContent?.mIndex === mIndex && editingContent?.cIndex === cIndex;
                                            return (
                                                <div
                                                    key={content.id}
                                                    onClick={() => setEditingContent({ mIndex, cIndex })}
                                                    className={`group/item flex items-center gap-3 p-2 pl-2.5 rounded-lg cursor-pointer transition-colors
                                                        ${isEditing
                                                            ? 'bg-brand-50 ring-1 ring-brand-200'
                                                            : 'hover:bg-ink-50'
                                                        }`}
                                                >
                                                    {renderContentIcon(content.type)}
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm truncate ${isEditing ? 'font-semibold text-brand-700' : 'text-ink-800'}`}>
                                                            {content.title}
                                                        </p>
                                                        <p className="text-[11px] font-mono uppercase tracking-wider text-ink-400">
                                                            {content.type}
                                                        </p>
                                                    </div>
                                                    {content.settings?.status === 'processing' && (
                                                        <span className="chip bg-blue-50 text-blue-700">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Processando
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => handleDeleteContent(mIndex, cIndex, e)}
                                                        title="Excluir"
                                                        className="p-1 rounded-md text-ink-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {module.contents.length === 0 && (
                                            <button
                                                onClick={() => openPicker(mIndex)}
                                                className="w-full py-3 rounded-lg border border-dashed border-ink-200 text-xs text-ink-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/40 transition-colors"
                                            >
                                                + Adicionar conteúdo
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add module button (always visible at end) */}
                    <button
                        onClick={addModule}
                        className="w-full py-4 rounded-xl border border-dashed border-ink-200 text-sm text-ink-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/40 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Adicionar Módulo
                    </button>
                </div>
            </div>

            {/* Editor panel */}
            <div className="surface flex flex-col overflow-hidden">
                <div className="flex-1 ds-scroll overflow-y-auto">
                    {renderEditorPanel()}
                </div>
            </div>
        </div>
    );

    /* ────────────────────── STEP 3: PUBLICAÇÃO ─────────────────────────── */
    const renderPublishStep = () => {
        const totalLessons = modules.reduce((acc, m) => acc + m.contents.length, 0);
        return (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
                <div className="surface p-8 space-y-6">
                    <div>
                        <span className="label">Resumo</span>
                        <h3 className="font-display font-semibold text-2xl text-ink-900">{title || 'Sem título'}</h3>
                        <p className="mt-2 text-ink-600">{description || 'Sem descrição.'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-ink-200">
                        <div>
                            <span className="label">Módulos</span>
                            <p className="font-display text-3xl font-semibold text-ink-900">{modules.length}</p>
                        </div>
                        <div>
                            <span className="label">Aulas</span>
                            <p className="font-display text-3xl font-semibold text-ink-900">{totalLessons}</p>
                        </div>
                        <div>
                            <span className="label">Status</span>
                            <p className="font-display text-3xl font-semibold text-emerald-600">Pronto</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-ink-200">
                        <span className="label">Checklist</span>
                        <ul className="space-y-2 text-sm">
                            <li className={`flex items-center gap-2 ${title ? 'text-ink-700' : 'text-ink-400'}`}>
                                <Check className={`w-4 h-4 ${title ? 'text-emerald-500' : 'text-ink-300'}`} />
                                Título preenchido
                            </li>
                            <li className={`flex items-center gap-2 ${description ? 'text-ink-700' : 'text-ink-400'}`}>
                                <Check className={`w-4 h-4 ${description ? 'text-emerald-500' : 'text-ink-300'}`} />
                                Descrição preenchida
                            </li>
                            <li className={`flex items-center gap-2 ${totalLessons > 0 ? 'text-ink-700' : 'text-ink-400'}`}>
                                <Check className={`w-4 h-4 ${totalLessons > 0 ? 'text-emerald-500' : 'text-ink-300'}`} />
                                Pelo menos uma aula
                            </li>
                        </ul>
                    </div>
                </div>

                <aside className="rounded-card border border-brand-200 bg-brand-gradient-soft p-6 self-start">
                    <div className="flex items-center gap-2 text-brand-700 mb-3">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Tudo certo?</span>
                    </div>
                    <h4 className="font-display font-semibold text-lg text-ink-900">Publicar curso</h4>
                    <p className="text-sm text-ink-700 mt-1">
                        Os alunos selecionados poderão acessá-lo imediatamente após a publicação.
                    </p>
                    <button
                        onClick={handleSaveCourse}
                        className="btn-primary mt-5 w-full justify-center"
                    >
                        <Save className="w-4 h-4" /> Publicar Curso
                    </button>
                </aside>
            </div>
        );
    };

    /* ─────────────────────────── HEADER ─────────────────────────────── */
    return (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 min-h-[calc(100vh-1px)] bg-ink-50">
            {/* Top bar */}
            <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-ink-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
                    <button onClick={onCancel} className="btn-ghost !px-3">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                    <div className="hidden sm:block w-px h-6 bg-ink-200" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono uppercase tracking-wider text-ink-500">Studio</p>
                        <h1 className="font-display font-semibold text-lg text-ink-900 truncate">
                            {course ? (title || 'Editar Curso') : 'Criar Novo Curso'}
                        </h1>
                    </div>
                    <button onClick={handleSaveCourse} className="btn-secondary">
                        <Save className="w-4 h-4" /> Salvar Rascunho
                    </button>
                    <button
                        onClick={() => step < 3 ? setStep((step + 1) as StepKey) : handleSaveCourse()}
                        className="btn-primary"
                    >
                        {step < 3 ? <>Próximo <ArrowRight className="w-4 h-4" /></> : <><Check className="w-4 h-4" /> Publicar</>}
                    </button>
                </div>

                {/* Stepper */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-5">
                    <div className="flex items-center gap-4">
                        {STEPS.map((s, idx, arr) => {
                            const stateClass = step === s.id ? 'step-active' : step > s.id ? 'step-done' : '';
                            return (
                                <React.Fragment key={s.id}>
                                    <button onClick={() => setStep(s.id)} className={`step ${stateClass}`}>
                                        <span className="step-bullet">
                                            {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                                        </span>
                                        <span className="hidden md:inline">{s.label}</span>
                                    </button>
                                    {idx < arr.length - 1 && <div className="flex-1 h-px bg-ink-200" />}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-900">
                        {STEPS[step - 1].label}
                    </h2>
                    <p className="text-ink-600 mt-1">{STEPS[step - 1].helper}</p>
                </div>

                <div className="animate-fade-in-up" key={step}>
                    {step === 1 && renderMetadataStep()}
                    {step === 2 && renderStructureStep()}
                    {step === 3 && renderPublishStep()}
                </div>

                <div className="mt-8 flex items-center justify-between">
                    <button
                        onClick={() => step > 1 && setStep((step - 1) as StepKey)}
                        disabled={step === 1}
                        className="btn-secondary disabled:invisible"
                    >
                        <ArrowLeft className="w-4 h-4" /> Anterior
                    </button>
                    <button
                        onClick={() => step < 3 ? setStep((step + 1) as StepKey) : handleSaveCourse()}
                        className="btn-primary"
                    >
                        {step < 3 ? <>Próximo <ArrowRight className="w-4 h-4" /></> : <><Check className="w-4 h-4" /> Publicar Curso</>}
                    </button>
                </div>
            </div>

            <ResourcePicker
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={handleResourceSelect}
            />

            {uploadModuleIndex !== null && (
                <VideoUpload
                    moduleId={modules[uploadModuleIndex].id}
                    onUploadComplete={() => {
                        setUploadModuleIndex(null);
                        fetchCourseDetails();
                    }}
                    onCancel={() => setUploadModuleIndex(null)}
                    onVideoCreated={(videoData) => {
                        const newModules = [...modules];
                        const newContent: any = {
                            id: videoData.id.toString(),
                            title: videoData.title,
                            type: MaterialType.Video,
                            content: '', description: '',
                            video_id: videoData.video_id,
                            settings: { status: videoData.status }
                        };
                        newModules[uploadModuleIndex].contents.push(newContent);
                        setModules(newModules);
                    }}
                />
            )}

            {uploadFileModuleIndex !== null && (
                <FileUploadModal
                    moduleId={modules[uploadFileModuleIndex].id}
                    onUploadComplete={() => {
                        setUploadFileModuleIndex(null);
                        fetchCourseDetails();
                    }}
                    onCancel={() => setUploadFileModuleIndex(null)}
                    onFileCreated={(fileData) => {
                        const newModules = [...modules];
                        const newContent: any = {
                            id: fileData.id.toString(),
                            title: fileData.title,
                            type: fileData.type === 'word' ? MaterialType.File : MaterialType.PDF,
                            content: '',
                            description: '',
                            data: fileData.data,
                            settings: {}
                        };
                        newModules[uploadFileModuleIndex].contents.push(newContent);
                        setModules(newModules);
                    }}
                />
            )}
        </div>
    );
};

export default CourseEditor;
