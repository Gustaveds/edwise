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
    faqs?: Array<{
        pergunta: string;
        tempo: string;
    }>;
    transcription?: string;
    error?: string;
}

const VideoAIDataPanel: React.FC<VideoAIDataPanelProps> = ({ videoId }) => {
    const [data, setData] = useState<VideoAIData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTranscription, setShowTranscription] = useState(false);
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

    useEffect(() => {
        fetchVideoAIData();
    }, [videoId]);

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
            setData({
                status: 'error',
                error: 'Falha ao carregar dados da IA'
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Carregando dados da IA...</span>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                Nenhum dado disponível
            </div>
        );
    }

    if (data.status === 'processing') {
        return (
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <h3 className="font-semibold text-blue-900">Processando Vídeo</h3>
                </div>
                <p className="text-sm text-blue-700">
                    {data.current_stage === 'generating_summary' && 'Gerando resumo com IA...'}
                    {data.current_stage === 'generating_faqs' && 'Criando FAQs...'}
                    {data.current_stage === 'creating_embeddings' && 'Criando embeddings...'}
                    {data.current_stage === 'transcribing' && 'Transcrevendo áudio...'}
                    {!data.current_stage && 'Processando...'}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                    Os dados da IA estarão disponíveis em alguns minutos.
                </p>
            </div>
        );
    }

    if (data.status === 'error') {
        return (
            <div className="p-6 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <h3 className="font-semibold text-red-900">Erro no Processamento</h3>
                </div>
                <p className="text-sm text-red-700">{data.error}</p>
            </div>
        );
    }

    // Ready state - show summary and FAQs
    return (
        <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Processado com IA</span>
            </div>

            {/* Summary Section */}
            {data.summary && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Resumo Gerado pela IA</h3>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown>{data.summary}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* FAQs Section */}
            {data.faqs && data.faqs.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageCircle className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">
                            Perguntas Frequentes ({data.faqs.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {data.faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="border border-gray-200 rounded-lg overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                                    className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 text-sm">{faq.pergunta}</p>
                                        {faq.tempo && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock className="w-3 h-3 text-gray-400" />
                                                <span className="text-xs text-gray-500">{faq.tempo}</span>
                                            </div>
                                        )}
                                    </div>
                                    {expandedFAQ === index ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                                    )}
                                </button>
                                {expandedFAQ === index && (
                                    <div className="p-4 bg-white border-t border-gray-200">
                                        <p className="text-sm text-gray-700">
                                            Esta pergunta é respondida no vídeo aos <strong>{faq.tempo}</strong>
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Transcription Section (Collapsible) */}
            {data.transcription && (
                <div className="bg-white rounded-lg border border-gray-200">
                    <button
                        onClick={() => setShowTranscription(!showTranscription)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-600" />
                            <h3 className="font-semibold text-gray-900">Transcrição Completa</h3>
                        </div>
                        {showTranscription ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>
                    {showTranscription && (
                        <div className="p-4 border-t border-gray-200">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
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
