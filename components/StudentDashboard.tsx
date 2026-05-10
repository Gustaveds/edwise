import React, { useState, useEffect } from 'react';
import { Course } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Play, Clock, BookOpen, ArrowRight } from 'lucide-react';
import CoursePlayer from './CoursePlayer';
import config from '../config';

const StudentDashboard: React.FC = () => {
    const { token } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'player'>('grid');

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
        } finally {
            setIsLoading(false);
        }
    };

    const handleCourseClick = async (courseId: string | number) => {
        try {
            const res = await fetch(`${config.API_URL}/api/courses/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            const adaptedCourse = { ...data, modules: data.modules || [] };
            setSelectedCourse(adaptedCourse);
            setViewMode('player');
        } catch (err) {
            console.error(err);
        }
    };

    if (viewMode === 'player' && selectedCourse) {
        return <CoursePlayer course={selectedCourse} onBack={() => setViewMode('grid')} />;
    }

    return (
        <div className="space-y-10">
            <div>
                <span className="label">Painel</span>
                <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink-900">
                    Painel do Aluno
                </h2>
                <p className="mt-2 text-base text-ink-600">Continue de onde parou.</p>
            </div>

            {/* Continue Watching hero */}
            {courses.length > 0 && (
                <div
                    onClick={() => handleCourseClick(courses[0].id)}
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
                            {courses[0].title}
                        </h3>
                        <p className="text-ink-200 line-clamp-2 max-w-2xl mb-4 text-sm">
                            {courses[0].description}
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
                    <h3 className="font-display text-xl font-semibold text-ink-900">Meus Cursos</h3>
                    <span className="text-sm text-ink-500">{courses.length} cursos</span>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-card bg-ink-100 animate-pulse" />
                        ))}
                    </div>
                ) : courses.length === 0 ? (
                    <div className="surface p-10 text-center">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 grid place-items-center mb-4">
                            <BookOpen className="w-6 h-6 text-brand-500" />
                        </div>
                        <h4 className="font-display font-semibold text-lg text-ink-900">
                            Nenhum curso ainda
                        </h4>
                        <p className="mt-1 text-sm text-ink-600">
                            Quando seu professor publicar um curso, ele aparecerá aqui.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                            <button
                                key={course.id}
                                onClick={() => handleCourseClick(course.id)}
                                className="group surface text-left overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
                            >
                                <div className="h-36 relative bg-gradient-to-br from-ink-700 to-ink-900 overflow-hidden">
                                    <div className="absolute inset-0 bg-brand-glow opacity-50" />
                                    <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 bg-ink-950/40 transition-opacity">
                                        <div className="w-12 h-12 rounded-full bg-brand-500 grid place-items-center shadow-glow-brand">
                                            <Play className="w-5 h-5 text-white fill-current" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h4 className="font-display font-semibold text-base text-ink-900 mb-1 line-clamp-1">
                                        {course.title}
                                    </h4>
                                    <p className="text-sm text-ink-600 line-clamp-2 mb-4 h-10">
                                        {course.description || 'Sem descrição.'}
                                    </p>
                                    <div className="flex items-center justify-between pt-4 border-t border-ink-100 text-xs text-ink-500">
                                        <div className="flex items-center gap-1.5">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            <span>12 aulas</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>4h 30m</span>
                                        </div>
                                        <ArrowRight className="w-3.5 h-3.5 text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
