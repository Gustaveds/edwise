import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './ui/Modal';
import { Course, EnrolledStudent } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ui/Toast';
import config from '../config';
import { Search, UserPlus, X, Users } from 'lucide-react';

interface Props {
    course: Course | null;
    onClose: () => void;
    onChanged?: () => void;
}

interface StudentResult {
    id: number;
    name: string;
    email: string;
}

const EnrollStudentsModal: React.FC<Props> = ({ course, onClose, onChanged }) => {
    const { token } = useAuth();
    const toast = useToast();
    const [enrolled, setEnrolled] = useState<EnrolledStudent[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<StudentResult[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<number | null>(null);

    const isOpen = !!course;
    const courseId = course?.id;

    const authHeaders = useMemo(
        () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
        [token]
    );

    const loadEnrolled = async () => {
        if (!courseId) return;
        setLoading(true);
        try {
            const res = await fetch(`${config.API_URL}/api/courses/${courseId}/students`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to load enrolled students');
            setEnrolled(await res.json());
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar alunos matriculados');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            loadEnrolled();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }
            setSearching(true);
            try {
                const url = new URL(`${config.API_URL}/api/students/search`);
                url.searchParams.set('q', query);
                if (courseId) url.searchParams.set('courseId', String(courseId));
                const res = await fetch(url.toString(), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Search failed');
                setResults(await res.json());
            } catch (err) {
                console.error(err);
            } finally {
                setSearching(false);
            }
        }, 250);
        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [query, courseId, token, isOpen]);

    const enroll = async (student: StudentResult) => {
        if (!courseId) return;
        try {
            const res = await fetch(`${config.API_URL}/api/courses/${courseId}/students`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ studentId: student.id }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Falha ao matricular');
            }
            toast.success(`${student.email} matriculado`);
            setQuery('');
            setResults([]);
            await loadEnrolled();
            onChanged?.();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Erro ao matricular');
        }
    };

    const unenroll = async (student: EnrolledStudent) => {
        if (!courseId) return;
        try {
            const res = await fetch(
                `${config.API_URL}/api/courses/${courseId}/students/${student.id}`,
                { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Falha ao remover');
            toast.success(`${student.email} removido`);
            await loadEnrolled();
            onChanged?.();
        } catch (err) {
            console.error(err);
            toast.error('Erro ao remover aluno');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title="Gerenciar Alunos"
            description={course ? course.title : undefined}
        >
            <div className="space-y-6">
                {/* Search & enroll */}
                <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-2 block">
                        Adicionar aluno
                    </label>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar por email ou nome..."
                            className="input pl-9 w-full"
                            autoFocus
                        />
                    </div>

                    {query.trim() && (
                        <div className="mt-2 rounded-card border border-ink-200 bg-white max-h-56 overflow-auto divide-y divide-ink-100">
                            {searching && (
                                <div className="px-4 py-3 text-sm text-ink-500">Buscando...</div>
                            )}
                            {!searching && results.length === 0 && (
                                <div className="px-4 py-3 text-sm text-ink-500">
                                    Nenhum aluno encontrado.
                                </div>
                            )}
                            {results.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => enroll(r)}
                                    className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-brand-50 transition-colors"
                                >
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-ink-900 truncate">{r.name}</div>
                                        <div className="text-xs text-ink-500 truncate">{r.email}</div>
                                    </div>
                                    <UserPlus className="w-4 h-4 text-brand-600 flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Enrolled list */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-ink-500">
                            Matriculados
                        </label>
                        <span className="text-xs text-ink-500 inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {enrolled.length}
                        </span>
                    </div>

                    <div className="rounded-card border border-ink-200 bg-white max-h-72 overflow-auto divide-y divide-ink-100">
                        {loading && (
                            <div className="px-4 py-3 text-sm text-ink-500">Carregando...</div>
                        )}
                        {!loading && enrolled.length === 0 && (
                            <div className="px-4 py-6 text-sm text-ink-500 text-center">
                                Nenhum aluno matriculado ainda.
                            </div>
                        )}
                        {enrolled.map((s) => (
                            <div
                                key={s.id}
                                className="px-4 py-2.5 flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-ink-900 truncate">{s.name}</div>
                                    <div className="text-xs text-ink-500 truncate">{s.email}</div>
                                </div>
                                <button
                                    onClick={() => unenroll(s)}
                                    className="p-1.5 rounded-lg text-ink-500 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                                    title="Remover"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default EnrollStudentsModal;
