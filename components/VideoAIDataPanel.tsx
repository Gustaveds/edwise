import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, FileText, MessageCircle, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import config from '../config';

interface VideoAIDataPanelProps {
    videoId: number | string;
}

interface VideoAIData {
    status: 'processing' | 'ready' | 'error';
    current_stage?: string;
    summary?: string;
    faqs?: Array<{ pergunta: string; tempo: string }>;
    transcription?: string;
    error?: string;
}

const STAGE_LABELS: Record<string, string> = {
    generating_summary:  'Gerando resumo com IA…',
    generating_faqs:     'Criando FAQs…',
    creating_embeddings: 'Criando embeddings…',
    transcribing:        'Transcrevendo áudio…',
};

const VideoAIDataPanel: React.FC<VideoAIDataPanelProps> = ({ videoId }) => {
    const [data, setData] = useState<VideoAIData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTranscription, setShowTranscription] = useState(false);
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

    useEffect(() => { fetchVideoAIData(); }, [videoId]);

    const fetchVideoAIData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${config.API_URL}/api/videos/${videoId}/ai-data`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setData(response.data);
        } catch (err: any) {
            console.error('Error fetching AI data:', err);
            setData({ status: 'error', error: 'Falha ao carregar dados da IA' });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 text-ink-500">
                <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                <span className="ml-3 text-sm">Carregando dados da IA…</span>
            </div>
        );
    }

    if (!data) {
        return <div className="surface-muted p-4 text-center text-ink-500 text-sm">Nenhum dado disponível</div>;
    }

    if (data.status === 'processing') {
        return (
            <div className="rounded-card ring-1 ring-blue-100 bg-blue-50 p-6">
                <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <h3 className="font-display font-semibold text-blue-900">Processando vídeo</h3>
                </div>
                <p className="text-sm text-blue-700">
                    {STAGE_LABELS[data.current_stage || ''] || 'Processando…'}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                    Os dados da IA estarão disponíveis em alguns minutos.
                </p>
            </div>
        );
    }

    if (data.status === 'error') {
        return (
            <div className="rounded-card ring-1 ring-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="font-display font-semibold text-red-900">Erro no processamento</h3>
                </div>
                <p className="text-sm text-red-700">{data.error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 rounded-xl ring-1 ring-emerald-200 bg-emerald-50 p-3">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">Processado com IA</span>
            </div>

            {data.summary && (
                <div className="surface p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
                            <FileText className="w-4 h-4 text-brand-600" />
                        </div>
                        <h3 className="font-display text-base font-semibold text-ink-900">Resumo gerado pela IA</h3>
                    </div>
                    <div className="prose prose-sm max-w-none text-ink-700">
                        <ReactMarkdown>{data.summary}</ReactMarkdown>
                    </div>
                </div>
            )}

            {data.faqs && data.faqs.length > 0 && (
                <div className="surface p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 grid place-items-center">
                            <MessageCircle className="w-4 h-4 text-purple-600" />
                        </div>
                        <h3 className="font-display text-base font-semibold text-ink-900">
                            Perguntas frequentes ({data.faqs.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {data.faqs.map((faq, index) => (
                            <div key={index} className="rounded-xl ring-1 ring-ink-200 overflow-hidden">
                                <button
                                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                                    className="w-full p-3 flex items-center justify-between bg-ink-50/60 hover:bg-ink-50 transition-colors text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-ink-900 text-sm">{faq.pergunta}</p>
                                        {faq.tempo && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock className="w-3 h-3 text-ink-400" />
                                                <span className="text-xs font-mono text-ink-500">{faq.tempo}</span>
                                            </div>
                                        )}
                                    </div>
                                    {expandedFAQ === index ? (
                                        <ChevronUp className="w-4 h-4 text-ink-400 flex-shrink-0 ml-2" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-ink-400 flex-shrink-0 ml-2" />
                                    )}
                                </button>
                                {expandedFAQ === index && (
                                    <div className="p-3 bg-white border-t border-ink-200">
                                        <p className="text-sm text-ink-700">
                                            Esta pergunta é respondida no vídeo aos <strong>{faq.tempo}</strong>
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.transcription && (
                <div className="surface overflow-hidden">
                    <button
                        onClick={() => setShowTranscription(!showTranscription)}
                        className="w-full p-4 flex items-center justify-between hover:bg-ink-50/60 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-ink-500" />
                            <h3 className="font-display font-semibold text-ink-900">Transcrição completa</h3>
                        </div>
                        {showTranscription
                            ? <ChevronUp className="w-4 h-4 text-ink-400" />
                            : <ChevronDown className="w-4 h-4 text-ink-400" />}
                    </button>
                    {showTranscription && (
                        <div className="p-4 border-t border-ink-200">
                            <pre className="text-xs text-ink-700 whitespace-pre-wrap font-mono bg-ink-50 p-4 rounded-lg max-h-96 overflow-y-auto ds-scroll">
                                {data.transcription}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoAIDataPanel;
