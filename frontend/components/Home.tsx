import React, { useEffect, useRef, useState } from 'react';
import {
    Play, BookOpen, Clock, Edit, Trash2, UserPlus, Users,
    Plus, BarChart2, ChevronLeft, ChevronRight, ArrowLeft,
} from 'lucide-react';
import { Course, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';
import CoursePlayer from './CoursePlayer';
import CourseEditor from './CourseEditor';
import AnalyticsDashboard from './AnalyticsDashboard';
import EnrollStudentsModal from './EnrollStudentsModal';
import { useDialog } from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';

interface HomeProps {
    userRole: UserRole;
}

type Mode = 'browse' | 'play' | 'edit' | 'analytics';

const Home: React.FC<HomeProps> = ({ userRole }) => {
    const { token, user } = useAuth();
    const { confirm } = useDialog();
    const toast = useToast();
    const isStaff = userRole === UserRole.Professor || userRole === UserRole.Admin;

    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mode, setMode] = useState<Mode>('browse');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [managingStudentsCourse, setManagingStudentsCourse] = useState<Course | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

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

    const handleCreateCourse = () => { setSelectedCourse(null); setMode('edit'); };
    const handleEditCourse = (course: Course) => { setSelectedCourse(course); setMode('edit'); };

    const handleDeleteCourse = async (courseId: string | number) => {
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

    const scrollByAmount = (dir: 'left' | 'right') => {
        scrollRef.current?.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' });
    };

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
    if (mode === 'analytics') {
        return (
            <div>
                <button onClick={() => setMode('browse')} className="btn-ghost mb-4 !px-3">
                    <ArrowLeft className="w-4 h-4" /> Voltar para Início
                </button>
                <AnalyticsDashboard />
            </div>
        );
    }

    const firstName = user?.name?.split(' ')[0];
    const continueCourse = !isStaff ? courses[0] : null;

    return (
        <div className="space-y-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="label">Início</span>
                    <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink-900">
                        Olá{firstName ? `, ${firstName}` : ''}!
                    </h2>
                    <p className="mt-2 text-base text-ink-600">
                        {isStaff ? 'Aqui está um resumo rápido dos seus cursos.' : 'Continue de onde parou.'}
                    </p>
                </div>
                {isStaff && (
                    <div className="flex gap-3">
                        <button onClick={() => setMode('analytics')} className="btn-secondary">
                            <BarChart2 className="w-4 h-4" /> Analytics
                        </button>
                        <button onClick={handleCreateCourse} className="btn-primary">
                            <Plus className="w-4 h-4" /> Novo Curso
                        </button>
                    </div>
                )}
            </div>

            {continueCourse && (
                <div
                    onClick={() => handleOpen(continueCourse.id)}
                    className="group relative h-64 rounded-modal overflow-hidden cursor-pointer shadow-card hover:shadow-card-hover transition-shadow"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-ink-800 to-ink-950" />
                    <div className="absolute inset-0 bg-brand-glow opacity-60" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-ink-950/95 via-ink-950/40 to-transparent">
                        <span className="chip-brand mb-3">
                            <Play className="w-3 h-3 fill-current" />
                            Continuar assistindo
                        </span>
                        <h3 className="font-display text-2xl md:text-3xl font-semibold text-white mb-2 line-clamp-1">
                            {continueCourse.title}
                        </h3>
                        <p className="text-ink-200 line-clamp-2 max-w-2xl mb-4 text-sm">
                            {continueCourse.description}
                        </p>
                        <button className="btn-primary">
                            <Play className="w-4 h-4 fill-current" />
                            Reproduzir
                        </button>
                    </div>
                </div>
            )}

            <div>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display text-xl font-semibold text-ink-900">
                        {isStaff ? 'Seus cursos' : 'Meus cursos'}
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-ink-500">
                            {courses.length} curso{courses.length === 1 ? '' : 's'}
                        </span>
                        {courses.length > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => scrollByAmount('left')}
                                    className="p-2 rounded-full bg-white border border-ink-200 text-ink-500 hover:text-brand-600 hover:border-brand-300 transition-colors"
                                    title="Anterior"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => scrollByAmount('right')}
                                    className="p-2 rounded-full bg-white border border-ink-200 text-ink-500 hover:text-brand-600 hover:border-brand-300 transition-colors"
                                    title="Próximo"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex gap-6 overflow-hidden">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 w-80 flex-shrink-0 rounded-card bg-ink-100 animate-pulse" />
                        ))}
                    </div>
                ) : courses.length === 0 ? (
                    <div className="surface p-10 text-center">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 grid place-items-center mb-4">
                            <BookOpen className="w-6 h-6 text-brand-500" />
                        </div>
                        <h4 className="font-display font-semibold text-lg text-ink-900">Nenhum curso ainda</h4>
                        <p className="mt-1 text-sm text-ink-600">
                            {isStaff
                                ? 'Clique em "Novo Curso" para criar o primeiro.'
                                : 'Quando seu professor publicar um curso, ele aparecerá aqui.'}
                        </p>
                    </div>
                ) : (
                    <div
                        ref={scrollRef}
                        className="flex gap-6 overflow-x-auto ds-scroll snap-x snap-mandatory pb-2 -mx-1 px-1"
                    >
                        {courses.map(course => (
                            <div
                                key={course.id}
                                className="snap-start flex-shrink-0 w-80 group surface overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
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
                                                    onClick={() => handleEditCourse(course)}
                                                    className="p-2 rounded-lg text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setManagingStudentsCourse(course)}
                                                    className="p-2 rounded-lg text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                                    title="Gerenciar alunos"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCourse(course.id)}
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
                                        {isStaff && (
                                            <button
                                                onClick={() => setManagingStudentsCourse(course)}
                                                className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-brand-600 transition-colors"
                                                title="Gerenciar alunos"
                                            >
                                                <Users className="w-3.5 h-3.5" />
                                                <span>{course.student_count ?? 0} alunos</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isStaff && (
                            <button
                                onClick={handleCreateCourse}
                                className="snap-start flex-shrink-0 w-80 min-h-[260px] rounded-card border-2 border-dashed border-ink-200 flex flex-col items-center justify-center text-ink-500 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/40 transition-all"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center mb-3">
                                    <Plus className="w-5 h-5 text-brand-500" />
                                </div>
                                <span className="font-display font-semibold text-ink-800">Criar Novo Curso</span>
                                <span className="text-xs text-ink-500 mt-1">Comece com um título e descrição</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {isStaff && (
                <EnrollStudentsModal
                    course={managingStudentsCourse}
                    onClose={() => setManagingStudentsCourse(null)}
                    onChanged={fetchCourses}
                />
            )}
        </div>
    );
};

export default Home;
