import React, { useState, useCallback, ChangeEvent } from 'react';
import { Upload, Youtube, X, Paperclip, FileText, Film, BarChart } from 'lucide-react';
import { sendWebhook } from '../services/webhookService';
import { WebhookEvent, FileUploadPayload } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

// Helper to extract YouTube video ID from various URL formats
const extractVideoId = (url: string): string | null => {
    const patterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
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
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus(null);

        try {
            if (activeTab === 'youtube') {
                if (!youtubeUrl) throw new Error("Por favor, insira uma URL do YouTube.");
                const videoId = extractVideoId(youtubeUrl);
                if (!videoId) throw new Error("URL do YouTube inválida.");

                await sendWebhook({
                    eventType: WebhookEvent.CONTENT_UPLOADED,
                    source: 'youtube',
                    url: youtubeUrl,
                    videoId,
                    timestamp: new Date().toISOString(),
                });
                setYoutubeUrl('');

            } else {
                if (files.length === 0) throw new Error("Por favor, selecione pelo menos um arquivo para enviar.");

                // FIX: Add explicit type `FileUploadPayload[]` to `filePayloads` to prevent type widening of `eventType`.
                const filePayloads: FileUploadPayload[] = await Promise.all(
                  files.map(async (file) => {
                    const base64Data = await fileToBase64(file);
                    return {
                      eventType: WebhookEvent.CONTENT_UPLOADED,
                      source: 'file' as 'file',
                      filename: file.name,
                      filetype: file.type,
                      size: file.size,
                      data: base64Data,
                      timestamp: new Date().toISOString(),
                    };
                  })
                );
                
                // Send webhooks sequentially, you could also send them in parallel
                for (const payload of filePayloads) {
                    await sendWebhook(payload);
                }
                
                setFiles([]);
            }
            const successMessage = activeTab === 'youtube' 
                ? 'Vídeo do YouTube processado com sucesso.' 
                : `${files.length} arquivo(s) processado(s) com sucesso.`;
            setStatus({ type: 'success', message: successMessage });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Ocorreu um erro desconhecido.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);
    
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(prev => [...prev, ...droppedFiles]);
    }, []);

    const FileIcon = ({ file }: { file: File }) => {
        if (file.type.startsWith('image/')) return <Paperclip className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
        if (file.type.startsWith('video/')) return <Film className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
        if (file.type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
        if (file.type.includes('presentation') || file.type.includes('powerpoint')) return <BarChart className="w-5 h-5 text-orange-500" />;
        return <Paperclip className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg w-full h-full">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Enviar Novo Material</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Adicione conteúdo do curso para ser processado pelo assistente de IA.</p>
            
            <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-xl flex items-center space-x-1 mb-6 max-w-sm">
                <button onClick={() => setActiveTab('youtube')} className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'youtube' ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                    <Youtube className="w-5 h-5"/>
                    <span>Vídeo do YouTube</span>
                </button>
                <button onClick={() => setActiveTab('file')} className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'file' ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                    <Upload className="w-5 h-5"/>
                    <span>Envio de Arquivo</span>
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {activeTab === 'youtube' && (
                    <div className="space-y-4">
                        <label htmlFor="youtubeUrl" className="font-semibold text-gray-700 dark:text-gray-300">URL do YouTube</label>
                        <input 
                            type="text" 
                            id="youtubeUrl"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder-gray-500 dark:placeholder-gray-400"
                        />
                    </div>
                )}

                {activeTab === 'file' && (
                    <div className="space-y-4">
                        <label className="font-semibold text-gray-700 dark:text-gray-300">Enviar Arquivos</label>
                        <div 
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={() => document.getElementById('file-input')?.click()}
                            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'}`}
                        >
                            <Upload className="w-10 h-10 text-gray-400 mb-3"/>
                            <p className="text-gray-600 dark:text-gray-300 font-semibold">Clique para procurar ou arraste e solte os arquivos</p>
                            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, PPTX, TXT, MP4, etc.</p>
                            <input id="file-input" type="file" multiple onChange={handleFileChange} className="hidden" />
                        </div>
                        {files.length > 0 && (
                            <div className="space-y-2 pt-4">
                                <h4 className="font-semibold text-sm dark:text-gray-300">Arquivos selecionados:</h4>
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <FileIcon file={file} />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">{file.name}</span>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveFile(index)} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                                            <X className="w-4 h-4 text-red-500"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full mt-6 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center">
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processando...
                        </>
                    ) : 'Enviar Conteúdo'}
                </button>

                {status && (
                    <div className={`mt-4 p-3 rounded-lg text-sm text-center ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {status.message}
                    </div>
                )}
            </form>
        </div>
    );
};

export default ContentUploader;
