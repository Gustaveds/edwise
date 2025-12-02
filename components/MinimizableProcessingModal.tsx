import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Minimize2, Maximize2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import config from '../config';

interface ProcessingStatus {
    status: 'processing' | 'ready' | 'error';
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

const MinimizableProcessingModal: React.FC<MinimizableProcessingModalProps> = ({
    videoId,
    videoTitle,
    onComplete,
    onClose
}) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);

    // Polling for processing status
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

                if (status.status === 'ready') {
                    // Auto-show if minimized when complete
                    if (isMinimized) {
                        setIsMinimized(false);
                    }
                }
            } catch (err: any) {
                console.error('Error polling status:', err);
            }
        };

        // Poll every 3 seconds
        const interval = setInterval(pollStatus, 3000);
        pollStatus(); // Initial poll

        return () => clearInterval(interval);
    }, [videoId, isMinimized]);

    const getStageDisplay = (stage?: string) => {
        const stages: Record<string, { label: string; icon: string }> = {
            initializing: { label: 'Inicializando...', icon: '🔄' },
            downloading: { label: 'Baixando vídeo...', icon: '📥' },
            transcribing: { label: 'Transcrevendo com Whisper...', icon: '🎙️' },
            generating_summary: { label: 'Gerando resumo com IA...', icon: '🤖' },
            generating_faqs: { label: 'Criando FAQs...', icon: '❓' },
            creating_embeddings: { label: 'Criando embeddings...', icon: '🧠' },
            finalizing: { label: 'Finalizando...', icon: '💾' },
            complete: { label: 'Completo!', icon: '✅' },
        };

        return stages[stage || 'initializing'] || { label: 'Processando...', icon: '⚙️' };
    };

    const duration = processingStatus?.processingTimeSeconds || 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const stageInfo = getStageDisplay(processingStatus?.current_stage);

    // Minimized view (Bottom-right corner) - NO BACKDROP
    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-300 w-80 z-50 transition-all duration-300">
                <div className="p-3 flex items-center gap-3 cursor-pointer" onClick={() => setIsMinimized(false)}>
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{videoTitle}</p>
                        <p className="text-xs text-gray-600 truncate">{stageInfo.label}</p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(false);
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                        title="Expandir"
                    >
                        <Maximize2 className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
                <div className="px-3 pb-3">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 animate-pulse"
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Full modal view - WITH BACKDROP
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        {processingStatus?.status === 'ready' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : processingStatus?.status === 'error' ? (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        ) : (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-800">
                            {processingStatus?.status === 'ready'
                                ? 'Processamento Concluído'
                                : processingStatus?.status === 'error'
                                    ? 'Erro no Processamento'
                                    : 'Processando Vídeo'}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {processingStatus?.status === 'processing' && (
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                title="Minimizar"
                            >
                                <Minimize2 className="w-4 h-4 text-gray-600" />
                            </button>
                        )}
                        {processingStatus?.status === 'ready' && (
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-600" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Video Info */}
                    <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm font-medium text-gray-800">{videoTitle}</p>
                    </div>

                    {processingStatus?.status === 'ready' ? (
                        // Success message
                        <div className="text-center py-4">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                            <p className="text-gray-700 font-medium mb-2">Vídeo processado com sucesso!</p>
                            <p className="text-sm text-gray-600">
                                Resumo, FAQs e transcrição foram gerados pela IA.
                            </p>
                        </div>
                    ) : processingStatus?.status === 'error' ? (
                        // Error message
                        <div className="text-center py-4">
                            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
                            <p className="text-gray-700 font-medium mb-2">Erro ao processar vídeo</p>
                            <p className="text-sm text-red-600">{processingStatus.error}</p>
                        </div>
                    ) : (
                        // Processing view
                        <>
                            {/* Current Stage */}
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-md">
                                <span className="text-3xl">{stageInfo.icon}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{stageInfo.label}</p>
                                    <p className="text-xs text-gray-600">
                                        Tempo decorrido: {minutes}m {seconds}s
                                    </p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-500 animate-pulse"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <p className="text-xs text-center text-gray-500">
                                    Aguarde enquanto seu vídeo está sendo processado...
                                </p>
                            </div>

                            {/* Info Box */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                <p className="text-xs text-yellow-800">
                                    ℹ️ Você pode minimizar esta janela e continuar editando. O processamento
                                    continuará em segundo plano e você será notificado quando concluir.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {processingStatus?.status === 'ready' && (
                    <div className="p-4 border-t border-gray-200 flex justify-end">
                        <button
                            onClick={() => {
                                onComplete();
                                onClose();
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
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
