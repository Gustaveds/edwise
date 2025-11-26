import React, { useState, useEffect } from 'react';
import CourseEditor from './CourseEditor';
import AnalyticsDashboard from './AnalyticsDashboard';
import { Course } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Users, BarChart2 } from 'lucide-react';

const ProfessorDashboard: React.FC = () => {
    const { token } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/courses', {
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
        if (!window.confirm('Tem certeza que deseja excluir este curso?')) return;
        try {
            await fetch(`http://localhost:3001/api/courses/${courseId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCourses();
        } catch (err) {
            console.error(err);
        }
    };

    if (showAnalytics) {
        return (
            <div>
                <button onClick={() => setShowAnalytics(false)} className="mb-4 text-blue-600 hover:underline">
                    &larr; Voltar para Cursos
                </button>
                <AnalyticsDashboard />
            </div>
        );
    }

    if (isEditing) {
        return (
            <CourseEditor
                course={selectedCourse}
                onSave={() => {
                    setIsEditing(false);
                    fetchCourses();
                }}
                onCancel={() => setIsEditing(false)}
            />
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Painel do Professor</h2>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Gerencie seus cursos e acompanhe o progresso dos alunos.</p>
                </div>
                <div className="flex space-x-4">
                    <button
                        onClick={() => setShowAnalytics(true)}
                        className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <BarChart2 className="w-5 h-5 mr-2" />
                        Analytics
                    </button>
                    <button
                        onClick={handleCreateCourse}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Curso
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                    <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden group">
                        <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 p-6 flex flex-col justify-end">
                            <h3 className="text-xl font-bold text-white">{course.title}</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-2">
                                {course.description || 'Sem descrição.'}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleEditCourse(course)}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCourse(course.id)}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex items-center text-gray-400 text-sm">
                                    <Users className="w-4 h-4 mr-1" />
                                    <span>0 alunos</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Empty State Card for New Course */}
                <button
                    onClick={handleCreateCourse}
                    className="h-full min-h-[300px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                >
                    <Plus className="w-12 h-12 mb-4" />
                    <span className="font-medium">Criar Novo Curso</span>
                </button>
            </div>
        </div>
    );
};

export default ProfessorDashboard;
