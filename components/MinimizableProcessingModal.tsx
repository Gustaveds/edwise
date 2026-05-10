import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Minimize2, Maximize2, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import config from '../config';

interface ProcessingStatus {
    status: 'processing' | 'ready' | 'error';
    processingState?: 'queued' | 'processing' | 'completed' | 'error';
    current_stage?: string;
    processingTimeSeconds: number;
    error?: string;
}

interface MinimizableProcessingModalProps {
    videoId: number;
    videoTitle: string;
    onComplete: () => void;
    onClose: () => void;
}

const STAGES: Record<string, { label: string }> = {
    initializing:        { label: 'Inicializando…' },
    downloading:         { label: 'Baixando vídeo…' },
    transcribing:        { label: 'Transcrevendo com Whisper…' },
    generating_summary:  { label: 'Gerando resumo com IA…' },
    generating_faqs:     { label: 'Criando FAQs…' },
    creating_embeddings: { label: 'Criando embeddings…' },
    finalizing:          { label: 'Finalizando…' },
    complete:            { label: 'Completo!' },
};

const MinimizableProcessingModal: React.FC<MinimizableProcessingModalProps> = ({
    videoId, videoTitle, onComplete, onClose
}) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);

    useEffect(() => {
        const pollStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(
                    `${config.API_URL}/api/videos/${videoId}/processing-status`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const status: ProcessingStatus = response.data;
                setProcessingStatus(status);
                if (status.status === 'ready' && isMinimized) setIsMinimized(false);
            } catch (err) {
                console.error('Error polling status:', err);
            }
        };
        const interval = setInterval(pollStatus, 3000);
        pollStatus();
        return () => clearInterval(interval);
    }, [videoId, isMinimized]);

    const duration = processingStatus?.processingTimeSeconds || 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const isQueued = processingStatus?.processingState === 'queued';
    const stageLabel = isQueued
        ? 'Aguardando na fila…'
        : STAGES[processingStatus?.current_stage || 'initializing']?.label || 'Processando…';

    /* ── Minimized chip in the corner ───────────────────────────────── */
    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 surface w-80 z-50 transition-all">
                <button
                    onClick={() => setIsMinimized(false)}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-ink-50/60 transition-colors"
                >
                    <Loader2 className={`w-4 h-4 flex-shrink-0 ${isQueued ? 'text-amber-500' : 'text-brand-500'} animate-spin`} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-900 truncate">{videoTitle}</p>
                        <p className="text-xs text-ink-500 truncate">{stageLabel}</p>
                    </div>
                    <Maximize2 className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
                </button>
                <div className="px-3 pb-3">
                    <div className="w-full bg-ink-100 rounded-full h-1 overflow-hidden">
                        <div className={`h-full rounded-full ${isQueued ? 'bg-amber-500' : 'bg-brand-gradient'} animate-pulse`} style={{ width: '100%' }} />
                    </div>
                </div>
            </div>
        );
    }

    /* ── Full modal ─────────────────────────────────────────────────── */
    return (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6 animate-fade-in-up">
            <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" />
            <div className="relative glass max-w-md w-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200">
                    <div className="flex items-center gap-3">
                        {processingStatus?.status === 'ready' ? (
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 grid place-items-center text-emerald-600">
                                <CheckCircle className="w-4 h-4" />
                            </div>
                        ) : processingStatus?.status === 'error' ? (
                            <div className="w-9 h-9 rounded-xl bg-red-50 grid place-items-center text-red-600">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-brand-50 grid place-items-center text-brand-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                        )}
                        <h3 className="font-display text-base font-semibold text-ink-900">
                            {processingStatus?.status === 'ready'    ? 'Processamento concluído'
                             : processingStatus?.status === 'error'  ? 'Erro no processamento'
                             :                                         'Processando vídeo'}
                        </h3>
                    </div>
                    <div className="flex items-center gap-1">
                        {processingStatus?.status === 'processing' && (
                            <button onClick={() => setIsMinimized(true)} className="p-1.5 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900" title="Minimizar">
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        )}
                        {processingStatus?.status !== 'processing' && (
                            <button onClick={onClose} className="p-1.5 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label="Fechar">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3">
                        <p className="text-sm font-medium text-ink-900 truncate">{videoTitle}</p>
                    </div>

                    {processingStatus?.status === 'ready' ? (
                        <div className="text-center py-3">
                            <p className="font-display text-base font-semibold text-ink-900">Vídeo processado com sucesso!</p>
                            <p className="text-sm text-ink-600 mt-1">
                                Resumo, FAQs e transcrição foram gerados pela IA.
                            </p>
                        </div>
                    ) : processingStatus?.status === 'error' ? (
                        <div className="text-center py-3">
                            <p className="font-display text-base font-semibold text-ink-900">Erro ao processar vídeo</p>
                            <p className="text-sm text-red-600 mt-1">{processingStatus.error}</p>
                        </div>
                    ) : (
                        <>
                            <div className={`flex items-center gap-3 p-4 rounded-xl ring-1 ${isQueued ? 'bg-amber-50 ring-amber-100' : 'bg-ink-50 ring-ink-100'}`}>
                                <Loader2 className={`w-5 h-5 flex-shrink-0 ${isQueued ? 'text-amber-600' : 'text-brand-600'} animate-spin`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-ink-900">{stageLabel}</p>
                                    <p className="text-xs text-ink-500 font-mono">
                                        {isQueued ? 'Seu vídeo está na fila' : `Tempo decorrido: ${minutes}m ${seconds}s`}
                                    </p>
                                </div>
                            </div>

                            <div className="w-full bg-ink-100 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full ${isQueued ? 'bg-amber-500' : 'bg-brand-gradient'} animate-pulse`} style={{ width: '100%' }} />
                            </div>

                            <div className="rounded-xl bg-blue-50 ring-1 ring-blue-100 p-3 flex items-start gap-2">
                                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800">
                                    Você pode minimizar esta janela e continuar editando. O processamento continuará em segundo plano.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {processingStatus?.status === 'ready' && (
                    <div className="px-6 py-4 border-t border-ink-200 bg-white/60 flex justify-end">
                        <button
                            onClick={() => { onComplete(); onClose(); }}
                            className="btn-primary"
                        >
                            Fechar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MinimizableProcessingModal;
