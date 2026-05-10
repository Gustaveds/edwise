import React, { useState } from 'react';
import axios from 'axios';
import { Upload, AlertCircle, FileVideo, Loader2 } from 'lucide-react';
import MinimizableProcessingModal from './MinimizableProcessingModal';
import Modal from './ui/Modal';
import config from '../config';

interface VideoUploadProps {
    moduleId: number;
    onUploadComplete: () => void;
    onCancel: () => void;
    onVideoCreated?: (videoData: { id: number; title: string; status: string; video_id: number }) => void;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'error';

const VideoUpload: React.FC<VideoUploadProps> = ({ moduleId, onUploadComplete, onCancel, onVideoCreated }) => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [videoId, setVideoId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleUpload = async () => {
        if (!file || !title) {
            setError('Selecione um arquivo e dê um título.');
            return;
        }
        setUploadState('uploading');
        setError(null);
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('module_id', moduleId.toString());
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(config.API_URL + '/api/upload/video', formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
                    }
                }
            });
            setVideoId(response.data.video_id);
            setUploadState('processing');
            setUploadProgress(100);
            onVideoCreated?.({
                id: response.data.content_id,
                title,
                status: 'processing',
                video_id: response.data.video_id,
            });
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Falha no upload do vídeo.');
            setUploadState('error');
        }
    };

    if (uploadState === 'processing' && videoId) {
        return (
            <MinimizableProcessingModal
                videoId={videoId}
                videoTitle={title}
                onComplete={onUploadComplete}
                onClose={onUploadComplete}
            />
        );
    }

    return (
        <Modal
            isOpen
            onClose={onCancel}
            size="md"
            title="Upload de vídeo"
            description="MP4, WebM ou MOV — até 2GB."
            hideClose={uploadState === 'uploading'}
        >
            {error && (
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 ring-1 ring-red-200 p-3 text-sm text-red-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="space-y-4">
                <label
                    htmlFor="video-upload"
                    className="block rounded-card border-2 border-dashed border-ink-200 p-6 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                >
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="video-upload"
                        disabled={uploadState === 'uploading'}
                    />
                    {file ? (
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center mb-2">
                                <FileVideo className="w-5 h-5 text-brand-600" />
                            </div>
                            <span className="text-sm font-medium text-ink-900">{file.name}</span>
                            <span className="text-xs font-mono text-ink-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-12 h-12 rounded-2xl bg-ink-100 grid place-items-center mb-2">
                                <Upload className="w-5 h-5 text-ink-500" />
                            </div>
                            <span className="text-sm font-medium text-ink-700">Clique para selecionar o vídeo</span>
                            <span className="text-xs text-ink-500">ou arraste e solte aqui</span>
                        </div>
                    )}
                </label>

                <div>
                    <label className="label">Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input"
                        placeholder="Ex: Introdução ao React"
                        disabled={uploadState === 'uploading'}
                    />
                </div>

                <div>
                    <label className="label">Descrição</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="input min-h-[80px] resize-y"
                        placeholder="Breve descrição da aula…"
                        disabled={uploadState === 'uploading'}
                    />
                </div>

                {uploadState === 'uploading' && (
                    <div>
                        <div className="w-full bg-ink-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-brand-gradient rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <p className="text-xs text-center font-mono text-ink-500 mt-2">{uploadProgress}% enviados</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onCancel}
                        disabled={uploadState === 'uploading'}
                        className="btn-secondary"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={uploadState === 'uploading' || !file}
                        className="btn-primary"
                    >
                        {uploadState === 'uploading' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Enviando…
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" /> Fazer upload
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default VideoUpload;
