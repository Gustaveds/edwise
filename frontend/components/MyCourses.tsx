import React, { useEffect, useMemo, useState } from 'react';
import {
    BookOpen, Search, LayoutGrid, List, Plus, Play, Clock, Users,
    Edit, Trash2, ArrowRight,
} from 'lucide-react';
import { Course, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';
import CoursePlayer from './CoursePlayer';
import CourseEditor from './CourseEditor';
import { useDialog } from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';

interface MyCoursesProps {
    userRole: UserRole;
}

type ViewMode = 'grid' | 'list';
type Mode = 'browse' | 'play' | 'edit';

const MyCourses: React.FC<MyCoursesProps> = ({ userRole }) => {
    const { token } = useAuth();
    const { confirm } = useDialog();
    const toast = useToast();

    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [view, setView] = useState<ViewMode>('grid');
    const [mode, setMode] = useState<Mode>('browse');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    const isStaff = userRole === UserRole.Professor || userRole === UserRole.Admin;

    useEffect(() => { fetchCourses(); }, []);

    const fetchCourses = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${config.API_URL}/api/courses`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setCourses(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar cursos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpen = async (courseId: string | number) => {
        try {
            const res = await fetch(`${config.API_URL}/api/courses/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setSelectedCourse({ ...data, modules: data.modules || [] });
            setMode('play');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao abrir curso');
        }
    };

    const handleCreate = () => {
        setSelectedCourse(null);
        setMode('edit');
    };

    const handleEdit = (course: Course) => {
        setSelectedCourse(course);
        setMode('edit');
    };

    const handleDelete = async (courseId: string | number) => {
        const ok = await confirm({
            title: 'Excluir este curso?',
            message: 'Todos os módulos e aulas serão removidos. Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir curso',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            await fetch(`${config.API_URL}/api/courses/${courseId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Curso excluído');
            fetchCourses();
        } catch (err) {
            console.error(err);
            toast.error('Erro ao excluir curso');
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return courses;
        return courses.filter(c =>
            c.title?.toLowerCase().includes(q) ||
            c.description?.toLowerCase().includes(q)
        );
    }, [courses, search]);

    if (mode === 'play' && selectedCourse) {
        return <CoursePlayer course={selectedCourse} onBack={() => setMode('browse')} />;
    }
    if (mode === 'edit') {
        return (
            <CourseEditor
                course={selectedCourse}
                onSave={() => { setMode('browse'); fetchCourses(); }}
                onCancel={() => setMode('browse')}
            />
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="label">Biblioteca</span>
                    <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink-900">
                        Meus Cursos
                    </h2>
                    <p className="mt-2 text-base text-ink-600">
                        {isStaff
                            ? 'Gerencie e organize todos os cursos sob sua responsabilidade.'
                            : 'Todos os cursos em que você está matriculado.'}
                    </p>
                </div>
                {isStaff && (
                    <button onClick={handleCreate} className="btn-primary">
                        <Plus className="w-4 h-4" /> Novo Curso
                    </button>
                )}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[260px] max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por título ou descrição..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-pill bg-white border border-ink-200 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300"
                    />
                </div>
                <div className="flex items-center gap-1 p-1 rounded-pill bg-white border border-ink-200">
                    <button
                        onClick={() => setView('grid')}
                        className={`p-2 rounded-pill transition-colors ${view === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:text-ink-900'}`}
                        title="Grade"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={`p-2 rounded-pill transition-colors ${view === 'list' ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:text-ink-900'}`}
                        title="Lista"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
                <span className="ml-auto text-sm text-ink-500">
                    {filtered.length} de {courses.length} curso{courses.length === 1 ? '' : 's'}
                </span>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 rounded-card bg-ink-100 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="surface p-10 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 grid place-items-center mb-4">
                        <BookOpen className="w-6 h-6 text-brand-500" />
                    </div>
                    <h4 className="font-display font-semibold text-lg text-ink-900">
                        {courses.length === 0 ? 'Nenhum curso ainda' : 'Nenhum curso corresponde à busca'}
                    </h4>
                    <p className="mt-1 text-sm text-ink-600">
                        {courses.length === 0
                            ? (isStaff ? 'Clique em "Novo Curso" para criar o primeiro.' : 'Quando você for matriculado em um curso, ele aparecerá aqui.')
                            : 'Tente outros termos de busca.'}
                    </p>
                </div>
            ) : view === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(course => (
                        <div
                            key={course.id}
                            className="group surface overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <button
                                onClick={() => handleOpen(course.id)}
                                className="w-full h-36 relative bg-gradient-to-br from-ink-700 to-ink-900 overflow-hidden text-left"
                            >
                                <div className="absolute inset-0 bg-brand-glow opacity-50" />
                                <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 bg-ink-950/40 transition-opacity">
                                    <div className="w-12 h-12 rounded-full bg-brand-500 grid place-items-center shadow-glow-brand">
                                        <Play className="w-5 h-5 text-white fill-current" />
                                    </div>
                                </div>
                                <div className="absolute bottom-3 left-4 right-4">
                                    <h4 className="font-display font-semibold text-base text-white line-clamp-1">
                                        {course.title}
                                    </h4>
                                </div>
                            </button>
                            <div className="p-5">
                                <p className="text-sm text-ink-600 line-clamp-2 mb-4 h-10">
                                    {course.description || 'Sem descrição.'}
                                </p>
                                <div className="flex items-center justify-between pt-4 border-t border-ink-100">
                                    {isStaff ? (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEdit(course)}
                                                className="p-2 rounded-lg text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(course.id)}
                                                className="p-2 rounded-lg text-ink-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-xs text-ink-500">
                                            <span className="inline-flex items-center gap-1.5">
                                                <BookOpen className="w-3.5 h-3.5" />
                                                {(course.modules?.length ?? 0)} módulos
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                Em andamento
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleOpen(course.id)}
                                        className="text-xs font-medium text-ink-500 hover:text-brand-600 inline-flex items-center gap-1 transition-colors"
                                    >
                                        Abrir <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="surface divide-y divide-ink-100 overflow-hidden">
                    {filtered.map(course => (
                        <div key={course.id} className="flex items-center gap-4 p-4 hover:bg-ink-50 transition-colors">
                            <button
                                onClick={() => handleOpen(course.id)}
                                className="w-12 h-12 rounded-xl bg-gradient-to-br from-ink-700 to-ink-900 grid place-items-center flex-shrink-0 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-brand-glow opacity-60" />
                                <BookOpen className="w-5 h-5 text-white relative z-10" />
                            </button>
                            <button
                                onClick={() => handleOpen(course.id)}
                                className="flex-1 min-w-0 text-left"
                            >
                                <h4 className="font-display font-semibold text-ink-900 truncate">{course.title}</h4>
                                <p className="text-sm text-ink-600 truncate">
                                    {course.description || 'Sem descrição.'}
                                </p>
                            </button>
                            <div className="hidden md:flex items-center gap-4 text-xs text-ink-500">
                                <span className="inline-flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    {(course.modules?.length ?? 0)} módulos
                                </span>
                                {isStaff && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5" /> Alunos
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                                {isStaff && (
                                    <>
                                        <button
                                            onClick={() => handleEdit(course)}
                                            className="p-2 rounded-lg text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(course.id)}
                                            className="p-2 rounded-lg text-ink-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => handleOpen(course.id)}
                                    className="btn-ghost !px-3"
                                    title="Abrir"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyCourses;
