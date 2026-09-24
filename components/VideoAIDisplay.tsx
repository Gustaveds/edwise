import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Sparkles, FileText, MessageSquare, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import config from '../config';
import ProcessingSteps from './VideoProcessingSteps';

interface VideoAIData {
    id: number;
    title: string;
    summary: string | null;
    faqs: Array<{ pergunta: string; tempo: string }>;
    transcription: string | null;
    status: string;
    current_stage?: string | null;
    error?: string | null;
    processed: boolean;
}

interface VideoAIDisplayProps {
    videoId: number;
    isOwner: boolean;
    onSeek?: (tempo: string) => void;
}

const VideoAIDisplay: React.FC<VideoAIDisplayProps> = ({ videoId, isOwner, onSeek }) => {
    const [aiData, setAiData] = useState<VideoAIData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        loadAIData();
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
        };
    }, [videoId]);

    // Assim que soubermos que o vídeo está em processamento — seja porque o
    // usuário acabou de clicar em "Processar com IA", seja porque o pipeline
    // automático do upload já está rodando — começa (ou para) o polling.
    // Isso faz o indicador de etapas funcionar nos dois casos, não só quando
    // o clique acontece nesta mesma sessão do componente.
    useEffect(() => {
        if (aiData?.status === 'processing' && !pollRef.current) {
            startPolling();
        }
        if (aiData?.status !== 'processing' && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, [aiData?.status]);

    const fetchAIData = async (): Promise<VideoAIData> => {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${config.API_URL}/api/videos/${videoId}/ai-data`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    };

    const loadAIData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAIData();
            setAiData(data);
        } catch (err: any) {
            console.error('Error loading AI data:', err);
            setError(err.response?.data?.error || 'Failed to load AI data');
        } finally {
            setLoading(false);
        }
    };

    const startPolling = () => {
        const maxAttempts = 200; // ~10 minutos a cada 3s
        let attempts = 0;
        pollRef.current = setInterval(async () => {
            attempts++;
            try {
                const data = await fetchAIData();
                setAiData(data);
                if (data.processed || data.status === 'error') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    pollRef.current = null;
                    if (data.status === 'error') {
                        setError(data.error || 'Falha ao processar vídeo com IA');
                    }
                } else if (attempts >= maxAttempts) {
                    if (pollRef.current) clearInterval(pollRef.current);
                    pollRef.current = null;
                    setError('O processamento está demorando mais que o esperado. Atualize a página em alguns instantes.');
                }
            } catch (err) {
                console.error('Error polling AI data:', err);
            }
        }, 3000);
    };

    const processWithAI = async () => {
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${config.API_URL}/api/videos/${videoId}/process-ai`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await loadAIData(); // status vira 'processing' e o effect acima liga o polling
        } catch (err: any) {
            console.error('Error processing video:', err);
            setError(err.response?.data?.error || 'Failed to process video with AI');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 text-ink-500">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                <span className="ml-2 text-sm">Carregando dados da IA...</span>
            </div>
        );
    }

    if (error && !aiData) {
        return (
            <div className="rounded-xl ring-1 ring-red-200 bg-red-50 p-4 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
            </div>
        );
    }

    const isProcessing = aiData?.status === 'processing';

    if (!aiData?.processed && isOwner) {
        return (
            <div className="rounded-card bg-brand-gradient-soft ring-1 ring-brand-100 p-6">
                <div className="flex items-center gap-2 mb-3 text-brand-700">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Processar com IA</span>
                </div>
                <p className="text-sm text-ink-700 mb-4">
                    Gere automaticamente um resumo detalhado e FAQs com timestamps usando IA.
                </p>
                {isProcessing ? (
                    <div>
                        <div className="flex items-center gap-2 text-brand-700 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processando vídeo… isso pode levar alguns minutos.</span>
                        </div>
                        <ProcessingSteps status={aiData?.status} stage={aiData?.current_stage} />
                    </div>
                ) : (
                    <button onClick={processWithAI} className="btn-primary">
                        <Sparkles className="w-4 h-4" />
                        Processar com IA
                    </button>
                )}
                {error && (
                    <div className="mt-3 flex items-center gap-2 text-red-700 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        );
    }

    if (!aiData?.processed) return null;

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 rounded-xl ring-1 ring-emerald-200 bg-emerald-50 p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">Vídeo processado com IA</span>
            </div>

            {aiData.summary && (
                <div className="surface p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
                            <FileText className="w-4 h-4 text-brand-600" />
                        </div>
                        <h3 className="font-display text-base font-semibold text-ink-900">Resumo do vídeo</h3>
                    </div>
                    <div className="prose prose-sm max-w-none text-ink-700">
                        <ReactMarkdown>{aiData.summary}</ReactMarkdown>
                    </div>
                </div>
            )}

            {aiData.faqs && aiData.faqs.length > 0 && (
                <div className="surface p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 grid place-items-center">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-display text-base font-semibold text-ink-900">
                            Perguntas frequentes ({aiData.faqs.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {aiData.faqs.map((faq, index) => (
                            <div key={index} className="rounded-xl ring-1 ring-ink-200 p-4 hover:bg-brand-50/30 transition-colors">
                                <div className="flex items-start gap-3">
                                    <MessageSquare className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-ink-800 font-medium mb-1.5">{faq.pergunta}</p>
                                        <button
                                            type="button"
                                            onClick={() => onSeek?.(faq.tempo)}
                                            disabled={!onSeek}
                                            className="inline-flex items-center gap-1 text-xs font-mono text-brand-600 hover:text-brand-700 disabled:text-ink-400 disabled:cursor-default"
                                        >
                                            <Clock className="w-3 h-3" />
                                            {faq.tempo}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoAIDisplay;
