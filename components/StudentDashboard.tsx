import React, { useState, useEffect } from 'react';
import { Course, MaterialType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Play, Clock, BookOpen } from 'lucide-react';
import CoursePlayer from './CoursePlayer';
import config from '../config';

const StudentDashboard: React.FC = () => {
    const { token } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'player'>('grid');

    useEffect(() => {
        fetchCourses();
    }, []);

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

            // Adapter for backend data structure
            const adaptedCourse = {
                ...data,
                // Ensure modules structure exists or create default
                modules: data.modules || []
            };

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
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Painel do Aluno</h2>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Continue de onde parou.</p>
            </div>

            {/* Continue Watching Section (Mock) */}
            {courses.length > 0 && (
                <div className="relative h-64 rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900 to-purple-900 shadow-2xl mb-12 group cursor-pointer" onClick={() => handleCourseClick(courses[0].id)}>
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-all"></div>
                    <div className="absolute bottom-0 left-0 p-8 w-full bg-gradient-to-t from-black/90 to-transparent">
                        <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full mb-3">CONTINUAR ASSISTINDO</span>
                        <h3 className="text-3xl font-bold text-white mb-2">{courses[0].title}</h3>
                        <p className="text-gray-200 line-clamp-2 max-w-2xl">{courses[0].description}</p>
                        <div className="mt-4 flex items-center">
                            <button className="bg-white text-black px-6 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors">
                                <Play className="w-5 h-5 mr-2 fill-current" />
                                Reproduzir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Meus Cursos</h3>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <div
                            key={course.id}
                            onClick={() => handleCourseClick(course.id)}
                            className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-700"
                        >
                            <div className="h-40 bg-gradient-to-br from-gray-700 to-gray-900 relative">
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                    <Play className="w-12 h-12 text-white fill-current" />
                                </div>
                            </div>
                            <div className="p-5">
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-1">{course.title}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 h-10">
                                    {course.description || 'Sem descrição.'}
                                </p>
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
                                    <div className="flex items-center">
                                        <BookOpen className="w-4 h-4 mr-1" />
                                        <span>12 Aulas</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Clock className="w-4 h-4 mr-1" />
                                        <span>4h 30m</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
