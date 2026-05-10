import React, { useState, useCallback, ChangeEvent } from 'react';
import { Upload, Youtube, X, Paperclip, FileText, Film, BarChart, Loader2 } from 'lucide-react';
import { sendWebhook } from '../services/webhookService';
import { WebhookEvent, FileUploadPayload } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

const extractVideoId = (url: string): string | null => {
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

const ContentUploader: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'youtube' | 'file'>('youtube');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus(null);
        try {
            if (activeTab === 'youtube') {
                if (!youtubeUrl) throw new Error('Por favor, insira uma URL do YouTube.');
                const videoId = extractVideoId(youtubeUrl);
                if (!videoId) throw new Error('URL do YouTube inválida.');
                await sendWebhook({
                    eventType: WebhookEvent.CONTENT_UPLOADED,
                    source: 'youtube', url: youtubeUrl, videoId,
                    timestamp: new Date().toISOString(),
                });
                setYoutubeUrl('');
            } else {
                if (files.length === 0) throw new Error('Selecione pelo menos um arquivo.');
                const filePayloads: FileUploadPayload[] = await Promise.all(
                    files.map(async (file) => ({
                        eventType: WebhookEvent.CONTENT_UPLOADED,
                        source: 'file' as 'file',
                        filename: file.name, filetype: file.type, size: file.size,
                        data: await fileToBase64(file),
                        timestamp: new Date().toISOString(),
                    }))
                );
                for (const payload of filePayloads) await sendWebhook(payload);
                setFiles([]);
            }
            const message = activeTab === 'youtube'
                ? 'Vídeo do YouTube processado com sucesso.'
                : `${files.length} arquivo(s) processado(s) com sucesso.`;
            setStatus({ type: 'success', message });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Ocorreu um erro desconhecido.' });
        } finally {
            setIsLoading(false);
        }
    };

    const FileIcon = ({ file }: { file: File }) => {
        if (file.type.startsWith('image/')) return <Paperclip className="w-4 h-4 text-ink-500" />;
        if (file.type.startsWith('video/')) return <Film className="w-4 h-4 text-blue-500" />;
        if (file.type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
        if (file.type.includes('presentation')) return <BarChart className="w-4 h-4 text-amber-500" />;
        return <Paperclip className="w-4 h-4 text-ink-500" />;
    };

    return (
        <div className="surface p-8 w-full">
            <div className="mb-6">
                <span className="label">Upload</span>
                <h3 className="font-display text-2xl font-semibold text-ink-900 mb-1">Enviar novo material</h3>
                <p className="text-sm text-ink-600">Adicione conteúdo do curso para ser processado pelo assistente de IA.</p>
            </div>

            <div className="surface-muted p-1 rounded-pill flex items-center gap-1 mb-6 max-w-sm">
                <button
                    onClick={() => setActiveTab('youtube')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-pill transition-colors
                        ${activeTab === 'youtube' ? 'bg-white text-brand-700 shadow-card' : 'text-ink-600 hover:text-ink-900'}`}
                >
                    <Youtube className="w-4 h-4" />
                    YouTube
                </button>
                <button
                    onClick={() => setActiveTab('file')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-pill transition-colors
                        ${activeTab === 'file' ? 'bg-white text-brand-700 shadow-card' : 'text-ink-600 hover:text-ink-900'}`}
                >
                    <Upload className="w-4 h-4" />
                    Arquivo
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {activeTab === 'youtube' ? (
                    <div>
                        <label className="label">URL do YouTube</label>
                        <input
                            type="text"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="input"
                        />
                    </div>
                ) : (
                    <div>
                        <label className="label">Arquivos</label>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragOver(false);
                                setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                            }}
                            onClick={() => document.getElementById('file-input')?.click()}
                            className={`flex flex-col items-center justify-center p-8 rounded-card border-2 border-dashed cursor-pointer transition-colors
                                ${isDragOver ? 'border-brand-500 bg-brand-50/40' : 'border-ink-200 hover:border-brand-300 hover:bg-brand-50/20'}`}
                        >
                            <div className="w-12 h-12 rounded-2xl bg-ink-100 grid place-items-center mb-3">
                                <Upload className="w-5 h-5 text-ink-500" />
                            </div>
                            <p className="text-sm text-ink-800 font-medium">Clique ou arraste arquivos</p>
                            <p className="text-xs text-ink-500 mt-1">PDF, DOCX, PPTX, TXT, MP4, etc.</p>
                            <input id="file-input" type="file" multiple onChange={handleFileChange} className="hidden" />
                        </div>

                        {files.length > 0 && (
                            <div className="space-y-2 pt-4">
                                <p className="text-xs font-mono uppercase tracking-wider text-ink-500">Selecionados</p>
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-ink-50 ring-1 ring-ink-200 p-2 rounded-lg">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileIcon file={file} />
                                            <span className="text-sm text-ink-800 truncate">{file.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                                            className="p-1 rounded text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center mt-6 py-3">
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processando...
                        </>
                    ) : 'Enviar conteúdo'}
                </button>

                {status && (
                    <div className={`mt-4 p-3 rounded-xl text-sm text-center ring-1
                        ${status.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                            : 'bg-red-50 text-red-800 ring-red-200'}`}>
                        {status.message}
                    </div>
                )}
            </form>
        </div>
    );
};

export default ContentUploader;
