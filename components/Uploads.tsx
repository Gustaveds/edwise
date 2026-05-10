import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    Upload, FileVideo, Youtube, Search, AlertCircle, Loader2,
    CheckCircle2, Clock, X, Film, Trash2, Play,
} from 'lucide-react';
import { Course, Module } from '../types';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';
import { useToast } from './ui/Toast';
import { useDialog } from './ui/ConfirmDialog';

interface VideoListItem {
    id: number;
    title: string;
    content_title?: string;
    status: 'uploading' | 'processing' | 'ready' | 'error' | string;
    duration?: number;
    file_size?: number;
    created_at: string;
    course_id?: number;
    module_id?: number;
    course_title?: string;
}

const formatBytes = (b?: number) => {
    if (!b) return '—';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatDuration = (s?: number) => {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
};

const STATUS_BADGE: Record<string, { label: string; className: string; Icon: any }> = {
    ready:      { label: 'Pronto',      className: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
    processing: { label: 'Processando', className: 'bg-amber-100 text-amber-700',     Icon: Loader2 },
    uploading:  { label: 'Enviando',    className: 'bg-blue-100 text-blue-700',       Icon: Upload },
    error:      { label: 'Erro',        className: 'bg-red-100 text-red-700',         Icon: AlertCircle },
};

const Uploads: React.FC = () => {
    const { token } = useAuth();
    const toast = useToast();
    const { confirm } = useDialog();

    const [courses, setCourses] = useState<Course[]>([]);
    const [courseDetails, setCourseDetails] = useState<Record<string | number, Course>>({});
    const [videos, setVideos] = useState<VideoListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [activeTab, setActiveTab] = useState<'video' | 'youtube'>('video');
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [courseId, setCourseId] = useState<string>('');
    const [moduleId, setModuleId] = useState<string>('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { void loadAll(); }, []);

    const loadAll = async () => {
        setIsLoading(true);
        try {
            const [coursesRes, videosRes] = await Promise.all([
                fetch(`${config.API_URL}/api/courses`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${config.API_URL}/api/videos`,  { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const coursesData = await coursesRes.json();
            const videosData  = await videosRes.json();
            setCourses(Array.isArray(coursesData) ? coursesData : []);
            setVideos(Array.isArray(videosData) ? videosData : []);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar dados');
        } finally {
            setIsLoading(false);
        }
    };

    const ensureCourseDetails = async (id: string) => {
        if (!id || courseDetails[id]) return courseDetails[id];
        try {
            const res = await fetch(`${config.API_URL}/api/courses/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setCourseDetails(prev => ({ ...prev, [id]: data }));
            return data;
        } catch {
            return null;
        }
    };

    const handleCourseChange = async (id: string) => {
        setCourseId(id);
        setModuleId('');
        if (id) await ensureCourseDetails(id);
    };

    const modulesForSelected: Module[] = useMemo(() => {
        if (!courseId) return [];
        return courseDetails[courseId]?.modules || [];
    }, [courseId, courseDetails]);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped && dropped.type.startsWith('video/')) {
            setFile(dropped);
            if (!title) setTitle(dropped.name.replace(/\.[^/.]+$/, ''));
        } else if (dropped) {
            toast.error('Apenas arquivos de vídeo são suportados');
        }
    };

    const handleFile = (f: File) => {
        setFile(f);
        if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    };

    const resetForm = () => {
        setFile(null);
        setTitle('');
        setDescription('');
        setYoutubeUrl('');
        setProgress(0);
        setError(null);
        setUploadState('idle');
    };

    const submitVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!file)     return setError('Selecione um arquivo de vídeo.');
        if (!title)    return setError('Informe um título.');
        if (!moduleId) return setError('Escolha um curso e um módulo de destino.');

        setUploadState('uploading');
        setProgress(0);

        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('module_id', moduleId);

        try {
            await axios.post(`${config.API_URL}/api/upload/video`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
                onUploadProgress: (ev) => {
                    if (ev.total) setProgress(Math.round((ev.loaded * 100) / ev.total));
                },
            });
            setUploadState('success');
            toast.success('Upload concluído', 'O vídeo está sendo processado.');
            resetForm();
            await loadAll();
        } catch (err: any) {
            console.error(err);
            const msg = err?.response?.data?.error || err?.message || 'Falha no upload';
            setError(msg);
            setUploadState('error');
        }
    };

    const submitYoutube = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!youtubeUrl.trim()) return setError('Informe a URL do YouTube.');
        toast.info('Funcionalidade em construção', 'Importação direta do YouTube ainda não está disponível neste painel.');
    };

    const deleteVideo = async (id: number) => {
        const ok = await confirm({
            title: 'Excluir este vídeo?',
            message: 'O conteúdo associado também será removido. Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            await fetch(`${config.API_URL}/api/videos/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Vídeo excluído');
            setVideos(v => v.filter(x => x.id !== id));
        } catch (err) {
            console.error(err);
            toast.error('Erro ao excluir vídeo');
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return videos;
        return videos.filter(v =>
            v.title?.toLowerCase().includes(q) ||
            v.content_title?.toLowerCase().includes(q) ||
            v.course_title?.toLowerCase().includes(q)
        );
    }, [videos, search]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <span className="label">Mídia</span>
                <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink-900">
                    Subir Arquivos
                </h2>
                <p className="mt-2 text-base text-ink-600">
                    Envie vídeos para os seus cursos e acompanhe o processamento.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
                {/* Uploader card */}
                <div className="surface p-6">
                    <div className="flex gap-1 p-1 rounded-pill bg-ink-50 mb-5 w-fit">
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`px-4 py-1.5 rounded-pill text-sm font-medium transition-colors inline-flex items-center gap-2
                                ${activeTab === 'video' ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-900'}`}
                        >
                            <FileVideo className="w-4 h-4" /> Vídeo
                        </button>
                        <button
                            onClick={() => setActiveTab('youtube')}
                            className={`px-4 py-1.5 rounded-pill text-sm font-medium transition-colors inline-flex items-center gap-2
                                ${activeTab === 'youtube' ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-900'}`}
                        >
                            <Youtube className="w-4 h-4" /> YouTube
                        </button>
                    </div>

                    {activeTab === 'video' ? (
                        <form onSubmit={submitVideo} className="space-y-4">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={onDrop}
                                className={`relative rounded-card border-2 border-dashed transition-colors p-8 text-center
                                    ${isDragOver ? 'border-brand-400 bg-brand-50' : 'border-ink-200 bg-ink-50/50 hover:border-brand-300'}`}
                            >
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-100 grid place-items-center">
                                            <Film className="w-5 h-5 text-brand-700" />
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="text-sm font-medium text-ink-900 truncate">{file.name}</p>
                                            <p className="text-xs text-ink-500">{formatBytes(file.size)}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setFile(null); }}
                                            className="p-1 rounded text-ink-500 hover:text-red-600 hover:bg-red-50 ml-auto"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center mx-auto mb-3">
                                            <Upload className="w-5 h-5 text-brand-600" />
                                        </div>
                                        <p className="text-sm font-medium text-ink-900">
                                            Arraste um vídeo ou clique para selecionar
                                        </p>
                                        <p className="text-xs text-ink-500 mt-1">
                                            MP4, MOV, WEBM até 2GB
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-ink-700 mb-1.5">Curso</label>
                                    <select
                                        value={courseId}
                                        onChange={(e) => handleCourseChange(e.target.value)}
                                        required
                                        className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink-200 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300"
                                    >
                                        <option value="">Selecione...</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={String(c.id)}>{c.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ink-700 mb-1.5">Módulo</label>
                                    <select
                                        value={moduleId}
                                        onChange={(e) => setModuleId(e.target.value)}
                                        required
                                        disabled={!courseId}
                                        className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink-200 text-sm text-ink-900 disabled:bg-ink-50 disabled:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300"
                                    >
                                        <option value="">{courseId ? 'Selecione...' : 'Escolha um curso primeiro'}</option>
                                        {modulesForSelected.map(m => (
                                            <option key={m.id} value={String(m.id)}>{m.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-ink-700 mb-1.5">Título</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    placeholder="Título da aula"
                                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink-200 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                                    Descrição <span className="text-ink-400 font-normal">(opcional)</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Sobre o que é esta aula..."
                                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink-200 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 resize-none"
                                />
                            </div>

                            {uploadState === 'uploading' && (
                                <div>
                                    <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                                        <span>Enviando...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                                        <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    disabled={uploadState === 'uploading'}
                                    className="btn-ghost"
                                >
                                    Limpar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadState === 'uploading'}
                                    className="btn-primary"
                                >
                                    {uploadState === 'uploading' ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                                    ) : (
                                        <><Upload className="w-4 h-4" /> Enviar Vídeo</>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={submitYoutube} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ink-700 mb-1.5">URL do YouTube</label>
                                <input
                                    type="url"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink-200 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300"
                                />
                            </div>
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>
                                    A importação por URL ainda está em construção. Por enquanto, baixe o vídeo e envie pela aba "Vídeo".
                                </span>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="submit" className="btn-primary opacity-60" disabled>
                                    <Youtube className="w-4 h-4" /> Importar
                                </button>
                            </div>
                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </form>
                    )}
                </div>

                {/* Recent uploads */}
                <div className="surface p-6">
                    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                        <div>
                            <span className="label">Histórico</span>
                            <h3 className="font-display text-xl font-semibold text-ink-900">
                                Vídeos enviados
                            </h3>
                        </div>
                        <span className="text-sm text-ink-500">{videos.length} vídeo{videos.length === 1 ? '' : 's'}</span>
                    </div>

                    <div className="relative mb-4">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar vídeo, aula ou curso..."
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-ink-200 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300"
                        />
                    </div>

                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-ink-100 animate-pulse" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-10 text-ink-500">
                            <Film className="w-10 h-10 mx-auto mb-3 text-ink-300" />
                            <p className="text-sm">
                                {videos.length === 0
                                    ? 'Nenhum vídeo enviado ainda.'
                                    : 'Nenhum vídeo corresponde à busca.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[600px] overflow-y-auto ds-scroll pr-1">
                            {filtered.map(v => {
                                const status = STATUS_BADGE[v.status] || STATUS_BADGE.processing;
                                const StatusIcon = status.Icon;
                                return (
                                    <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-ink-100 hover:border-ink-200 hover:bg-ink-50/40 transition-colors">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ink-700 to-ink-900 grid place-items-center flex-shrink-0 relative overflow-hidden">
                                            <Play className="w-4 h-4 text-white relative z-10" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-ink-900 truncate">
                                                {v.content_title || v.title}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-ink-500">
                                                <Clock className="w-3 h-3" />
                                                <span>{formatDuration(v.duration)}</span>
                                                <span>·</span>
                                                <span>{formatBytes(v.file_size)}</span>
                                                {v.course_title && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="truncate">{v.course_title}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${status.className}`}>
                                            <StatusIcon className={`w-3 h-3 ${v.status === 'processing' ? 'animate-spin' : ''}`} />
                                            {status.label}
                                        </span>
                                        <button
                                            onClick={() => deleteVideo(v.id)}
                                            className="p-1.5 rounded text-ink-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Uploads;
