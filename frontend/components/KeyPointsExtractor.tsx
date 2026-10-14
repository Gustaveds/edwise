import React, { useState, useCallback, ChangeEvent } from 'react';
import { Youtube, Upload, Key, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { extractKeyPoints } from '../services/geminiService';

const KeyPointsExtractor: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'youtube' | 'file'>('youtube');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [fileName, setFileName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [keyPoints, setKeyPoints] = useState<string[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) setFileName(e.target.files[0].name);
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFileName(e.dataTransfer.files[0].name);
        }
    }, []);

    const handleTabChange = (tab: 'youtube' | 'file') => {
        setActiveTab(tab);
        setYoutubeUrl('');
        setFileName(null);
        setIsLoading(false);
        setKeyPoints(null);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setKeyPoints(null);
        setError(null);
        try {
            let context = '';
            if (activeTab === 'youtube') {
                if (!youtubeUrl.trim()) throw new Error('Por favor, insira uma URL do YouTube.');
                context = `Resumo simulado do conteúdo em: ${youtubeUrl}.`;
            } else {
                if (!fileName) throw new Error('Por favor, selecione um arquivo.');
                context = `Resumo simulado do conteúdo do arquivo "${fileName}".`;
            }
            const points = await extractKeyPoints(context);
            setKeyPoints(points);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro desconhecido.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="surface p-8 w-full">
            <div className="mb-6">
                <span className="label">IA</span>
                <h3 className="font-display text-2xl font-semibold text-ink-900 mb-1">Extrair pontos-chave</h3>
                <p className="text-sm text-ink-600">
                    Envie um material para que a IA extraia os principais objetivos de aprendizado.
                </p>
            </div>

            <div className="surface-muted p-1 rounded-pill flex items-center gap-1 mb-6 max-w-sm">
                <button
                    onClick={() => handleTabChange('youtube')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-pill transition-colors
                        ${activeTab === 'youtube' ? 'bg-white text-brand-700 shadow-card' : 'text-ink-600 hover:text-ink-900'}`}
                >
                    <Youtube className="w-4 h-4" />
                    YouTube
                </button>
                <button
                    onClick={() => handleTabChange('file')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-pill transition-colors
                        ${activeTab === 'file' ? 'bg-white text-brand-700 shadow-card' : 'text-ink-600 hover:text-ink-900'}`}
                >
                    <Upload className="w-4 h-4" />
                    Arquivo
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {activeTab === 'youtube' && (
                    <div>
                        <label htmlFor="youtubeUrl-extractor" className="label">URL do YouTube</label>
                        <input
                            type="text"
                            id="youtubeUrl-extractor"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="input"
                        />
                    </div>
                )}

                {activeTab === 'file' && (
                    <div>
                        <label className="label">Arquivo</label>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                            onDrop={onDrop}
                            onClick={() => document.getElementById('file-input-extractor')?.click()}
                            className={`flex flex-col items-center justify-center p-8 rounded-card border-2 border-dashed cursor-pointer transition-colors
                                ${isDragOver ? 'border-brand-500 bg-brand-50/40' : 'border-ink-200 hover:border-brand-300 hover:bg-brand-50/20'}`}
                        >
                            <div className="w-12 h-12 rounded-2xl bg-ink-100 grid place-items-center mb-3">
                                <Upload className="w-5 h-5 text-ink-500" />
                            </div>
                            <p className="text-ink-800 font-medium text-sm">{fileName || 'Clique ou arraste um arquivo'}</p>
                            <p className="text-xs text-ink-500 mt-1">{fileName ? 'Clique para substituir' : 'PDF, DOCX, TXT, etc.'}</p>
                            <input id="file-input-extractor" type="file" onChange={handleFileChange} className="hidden" />
                        </div>
                    </div>
                )}

                <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center mt-6 py-3">
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin w-4 h-4" />
                            Extraindo...
                        </>
                    ) : (
                        <>
                            <Key className="w-4 h-4" />
                            Extrair pontos-chave
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8">
                {error && (
                    <div className="flex items-center gap-3 rounded-xl bg-red-50 ring-1 ring-red-200 p-4 text-sm text-red-800">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {keyPoints && keyPoints.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            Pontos-chave extraídos
                        </h4>
                        <ul className="space-y-2 bg-brand-gradient-soft ring-1 ring-brand-100 p-4 rounded-card">
                            {keyPoints.map((point, index) => (
                                <li key={index} className="text-ink-800 flex items-start gap-2 text-sm">
                                    <CheckCircle className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KeyPointsExtractor;
