import React, { useState, useEffect } from 'react';
import CourseEditor from './CourseEditor';
import AnalyticsDashboard from './AnalyticsDashboard';
import EnrollStudentsModal from './EnrollStudentsModal';
import { Course } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Users, BarChart2, ArrowLeft, BookOpen, UserPlus } from 'lucide-react';
import config from '../config';
import { useDialog } from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';

const ProfessorDashboard: React.FC = () => {
    const { token } = useAuth();
    const { confirm } = useDialog();
    const toast = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [managingStudentsCourse, setManagingStudentsCourse] = useState<Course | null>(null);

    useEffect(() => { fetchCourses(); }, []);

    const fetchCourses = async () => {
        try {
            const res = await fetch(config.API_URL + '/api/courses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setCourses(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateCourse = () => {
        setSelectedCourse(null);
        setIsEditing(true);
    };

    const handleEditCourse = (course: Course) => {
        setSelectedCourse(course);
        setIsEditing(true);
    };

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
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Curso excluído');
            fetchCourses();
        } catch (err) {
            console.error(err);
            toast.error('Erro ao excluir curso');
        }
    };

    if (showAnalytics) {
        return (
            <div>
                <button onClick={() => setShowAnalytics(false)} className="btn-ghost mb-4 !px-3">
                    <ArrowLeft className="w-4 h-4" /> Voltar para Cursos
                </button>
                <AnalyticsDashboard />
            </div>
        );
    }

    if (isEditing) {
        return (
            <CourseEditor
                course={selectedCourse}
                onSave={() => { setIsEditing(false); fetchCourses(); }}
                onCancel={() => setIsEditing(false)}
            />
        );
    }

    return (
        <div className="space-y-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="label">Studio</span>
                    <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink-900">
                        Painel do Professor
                    </h2>
                    <p className="mt-2 text-base text-ink-600">
                        Gerencie seus cursos e acompanhe o progresso dos alunos.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowAnalytics(true)} className="btn-secondary">
                        <BarChart2 className="w-4 h-4" /> Analytics
                    </button>
                    <button onClick={handleCreateCourse} className="btn-primary">
                        <Plus className="w-4 h-4" /> Novo Curso
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                    <div key={course.id} className="surface overflow-hidden group hover:shadow-card-hover transition-shadow">
                        <div className="h-32 relative bg-gradient-to-br from-ink-700 to-ink-900 p-5 flex items-end overflow-hidden">
                            <div className="absolute inset-0 bg-brand-glow opacity-60" />
                            <h3 className="font-display text-lg font-semibold text-white relative z-10 line-clamp-2">
                                {course.title}
                            </h3>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-ink-600 mb-5 line-clamp-2 h-10">
                                {course.description || 'Sem descrição.'}
                            </p>
                            <div className="flex items-center justify-between pt-4 border-t border-ink-100">
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
                                <button
                                    onClick={() => setManagingStudentsCourse(course)}
                                    className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-brand-600 transition-colors"
                                    title="Gerenciar alunos"
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    <span>{course.student_count ?? 0} alunos</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Empty State Card */}
                <button
                    onClick={handleCreateCourse}
                    className="min-h-[260px] rounded-card border-2 border-dashed border-ink-200 flex flex-col items-center justify-center text-ink-500 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/40 transition-all"
                >
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center mb-3">
                        <Plus className="w-5 h-5 text-brand-500" />
                    </div>
                    <span className="font-display font-semibold text-ink-800">Criar Novo Curso</span>
                    <span className="text-xs text-ink-500 mt-1">Comece com um título e descrição</span>
                </button>
            </div>

            {courses.length === 0 && (
                <div className="text-center text-sm text-ink-500 max-w-md mx-auto">
                    <BookOpen className="w-5 h-5 inline-block mr-1 -mt-0.5 text-ink-400" />
                    Você ainda não criou nenhum curso. Clique em <strong className="text-ink-700">Novo Curso</strong> para começar.
                </div>
            )}

            <EnrollStudentsModal
                course={managingStudentsCourse}
                onClose={() => setManagingStudentsCourse(null)}
                onChanged={fetchCourses}
            />
        </div>
    );
};

export default ProfessorDashboard;
