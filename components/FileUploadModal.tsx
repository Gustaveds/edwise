import React, { useState } from 'react';
import axios from 'axios';
import { Upload, AlertCircle, FileText, Loader2, File, CheckCircle2 } from 'lucide-react';
import Modal from './ui/Modal';
import config from '../config';

interface FileUploadModalProps {
    moduleId: number;
    onUploadComplete: () => void;
    onCancel: () => void;
    onFileCreated?: (fileData: { id: number; title: string; type: string; data: any }) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const FileUploadModal: React.FC<FileUploadModalProps> = ({ moduleId, onUploadComplete, onCancel, onFileCreated }) => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            if (!title) {
                setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
            }
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Selecione um arquivo para enviar.');
            return;
        }
        if (!title.trim()) {
            setError('Informe um título para o material.');
            return;
        }

        setUploadState('uploading');
        setError(null);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('module_id', moduleId.toString());

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(config.API_URL + '/api/upload/file', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
                    }
                }
            });

            setUploadState('success');
            setUploadProgress(100);

            if (onFileCreated && response.data.content) {
                onFileCreated({
                    id: response.data.content.id,
                    title: response.data.content.title,
                    type: response.data.content.type,
                    data: response.data.content.data
                });
            }

            setTimeout(() => {
                onUploadComplete();
            }, 600);

        } catch (err: any) {
            console.error('File upload error:', err);
            setError(err.response?.data?.error || 'Falha no upload do arquivo. Tente novamente.');
            setUploadState('error');
        }
    };

    return (
        <Modal
            isOpen
            onClose={onCancel}
            size="md"
            title="Upload de Arquivo / Material"
            description="PDF, Word (DOCX), PPTX, TXT ou ZIP — até 100MB."
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
                    htmlFor="file-upload-input"
                    className="block rounded-card border-2 border-dashed border-ink-200 p-6 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                >
                    <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt,.pptx,.xlsx,.zip"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload-input"
                        disabled={uploadState === 'uploading' || uploadState === 'success'}
                    />
                    {file ? (
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center mb-2">
                                <FileText className="w-5 h-5 text-brand-600" />
                            </div>
                            <span className="text-sm font-medium text-ink-900">{file.name}</span>
                            <span className="text-xs font-mono text-ink-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-12 h-12 rounded-2xl bg-ink-100 grid place-items-center mb-2">
                                <File className="w-5 h-5 text-ink-500" />
                            </div>
                            <span className="text-sm font-medium text-ink-700">Clique para selecionar o arquivo</span>
                            <span className="text-xs text-ink-500">PDF, DOCX, PPTX, TXT, etc.</span>
                        </div>
                    )}
                </label>

                <div>
                    <label className="label">Título do Material</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input"
                        placeholder="Ex: Apostila Módulo 1 - PDF"
                        disabled={uploadState === 'uploading' || uploadState === 'success'}
                    />
                </div>

                <div>
                    <label className="label">Descrição (Opcional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="input min-h-[70px] resize-y"
                        placeholder="Breve descrição sobre o arquivo ou instruções de leitura…"
                        disabled={uploadState === 'uploading' || uploadState === 'success'}
                    />
                </div>

                {uploadState === 'uploading' && (
                    <div>
                        <div className="w-full bg-ink-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-brand-gradient rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-center font-mono text-ink-500 mt-2">{uploadProgress}% enviados</p>
                    </div>
                )}

                {uploadState === 'success' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 font-medium py-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Arquivo anexado com sucesso!
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
                        disabled={uploadState === 'uploading' || uploadState === 'success' || !file}
                        className="btn-primary"
                    >
                        {uploadState === 'uploading' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Enviando…
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" /> Anexar Arquivo
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default FileUploadModal;
