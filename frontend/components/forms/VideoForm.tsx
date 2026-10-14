import React, { useState } from 'react';
import { MaterialType } from '../../types';
import VideoAIDataPanel from '../VideoAIDataPanel';
import { Video, Trash2, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import config from '../../config';
import { useDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';

interface VideoFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
    initialData?: any;
}

const VideoForm: React.FC<VideoFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const { token } = useAuth();
    const { confirm } = useDialog();
    const toast = useToast();
    const [title, setTitle] = useState(initialData?.title || '');
    const [url, setUrl] = useState(initialData?.content || '');
    const [description, setDescription] = useState(initialData?.description || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ title, type: MaterialType.Video, content: url, description });
        toast.success('Vídeo salvo');
    };

    const handleDelete = async () => {
        const ok = await confirm({
            title: 'Excluir este vídeo?',
            message: 'Esta ação é irreversível.',
            confirmLabel: 'Excluir vídeo',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            const res = await fetch(`${config.API_URL}/api/contents/${initialData.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete video');
            onCancel();
            window.location.reload();
        } catch (err) {
            console.error(err);
            toast.error('Erro ao excluir vídeo');
        }
    };

    const isUploadedVideo = initialData?.video_id;

    return (
        <div className="p-8 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="label">Título da aula</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input"
                        placeholder="Ex: Introdução ao React"
                        required
                    />
                </div>

                {!isUploadedVideo && (
                    <div>
                        <label className="label">URL do vídeo (YouTube/Vimeo)</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="input font-mono text-xs"
                            placeholder="https://youtube.com/watch?v=..."
                            required
                        />
                    </div>
                )}

                {isUploadedVideo && (
                    <div className="space-y-4">
                        <div className="bg-ink-950 rounded-card overflow-hidden aspect-video">
                            <video
                                controls
                                className="w-full h-full"
                                src={`${config.API_URL}/api/videos/${initialData.video_id}/stream?token=${token}`}
                            >
                                Seu navegador não suporta o elemento de vídeo.
                            </video>
                        </div>

                        <div className="rounded-xl ring-1 ring-blue-100 bg-blue-50 p-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-500 grid place-items-center text-white flex-shrink-0">
                                <Video className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-blue-900">Vídeo carregado</p>
                                <p className="text-xs text-blue-700 font-mono">ID #{initialData.video_id}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="label">Descrição (opcional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="input resize-y"
                        placeholder="Descreva o que será abordado nesta aula..."
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-ink-100">
                    {initialData?.id ? (
                        <button type="button" onClick={handleDelete} className="btn-danger-ghost">
                            <Trash2 className="w-4 h-4" /> Excluir vídeo
                        </button>
                    ) : <span />}
                    <div className="flex gap-3 ml-auto">
                        <button type="button" onClick={onCancel} className="btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary">
                            <Save className="w-4 h-4" /> Salvar
                        </button>
                    </div>
                </div>
            </form>

            {isUploadedVideo && (
                <div className="pt-6 border-t border-ink-100">
                    <h3 className="font-display text-lg font-semibold text-ink-900 mb-4">
                        Dados gerados pela IA
                    </h3>
                    <VideoAIDataPanel videoId={initialData.video_id} />
                </div>
            )}
        </div>
    );
};

export default VideoForm;
