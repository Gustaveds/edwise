import React, { useState } from 'react';
import { Save, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface LinkFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
    initialData?: any;
}

const extractYouTubeId = (url: string): string | null => {
    const patterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

const LinkForm: React.FC<LinkFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [url, setUrl] = useState(initialData?.data?.url || '');
    const [error, setError] = useState<string | null>(null);

    const videoId = extractYouTubeId(url);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const id = extractYouTubeId(url);
        if (!id) {
            setError('Link do YouTube inválido. Use um link como https://www.youtube.com/watch?v=... ou https://youtu.be/...');
            return;
        }
        setError(null);
        onSubmit({
            title,
            type: 'link',
            data: { url, videoId: id, provider: 'youtube' },
            description,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
                <label className="label">Título da Aula</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder="Ex: Aula externa — Introdução ao tema"
                    required
                />
            </div>

            <div>
                <label className="label">Link do YouTube</label>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError(null); }}
                    className="input"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                />
                {error && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                    </p>
                )}
            </div>

            <div>
                <label className="label">Descrição / Instruções (Opcional)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="input resize-y"
                    placeholder="Contexto sobre o vídeo externo para os alunos…"
                />
            </div>

            {videoId && (
                <div className="rounded-xl border border-ink-200 overflow-hidden bg-ink-50/50">
                    <div className="aspect-video bg-ink-900">
                        <img
                            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                            alt="Prévia do vídeo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="p-3 flex items-center gap-2 text-xs text-ink-600">
                        <LinkIcon className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                        Link reconhecido — prévia carregada
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-ink-100">
                <button type="button" onClick={onCancel} className="btn-secondary">
                    Cancelar
                </button>
                <button type="submit" className="btn-primary">
                    <Save className="w-4 h-4" /> Salvar
                </button>
            </div>
        </form>
    );
};

export default LinkForm;
