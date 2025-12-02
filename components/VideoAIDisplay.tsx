import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, FileText, MessageSquare, Clock, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import config from '../config';

interface VideoAIData {
    id: number;
    title: string;
    summary: string | null;
    faqs: Array<{ pergunta: string; tempo: string }>;
    transcription: string | null;
    status: string;
    processed: boolean;
}

interface VideoAIDisplayProps {
    videoId: number;
    isOwner: boolean;
}

const VideoAIDisplay: React.FC<VideoAIDisplayProps> = ({ videoId, isOwner }) => {
    const [aiData, setAiData] = useState<VideoAIData | null>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAIData();
    }, [videoId]);

    const loadAIData = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${config.API_URL}/api/videos/${videoId}/ai-data`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAiData(response.data);
        } catch (err: any) {
            console.error('Error loading AI data:', err);
            setError(err.response?.data?.error || 'Failed to load AI data');
        } finally {
            setLoading(false);
        }
    };

    const processWithAI = async () => {
        setProcessing(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${config.API_URL}/api/videos/${videoId}/process-ai`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Poll for completion
            const pollInterval = setInterval(async () => {
                const response = await axios.get(`${config.API_URL}/api/videos/${videoId}/ai-data`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.processed) {
                    clearInterval(pollInterval);
                    setAiData(response.data);
                    setProcessing(false);
                }
            }, 3000);

        } catch (err: any) {
            console.error('Error processing video:', err);
            setError(err.response?.data?.error || 'Failed to process video with AI');
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Carregando dados da IA...</span>
            </div>
        );
    }

    if (error && !aiData) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700">{error}</span>
            </div>
        );
    }

    if (!aiData?.processed && isOwner) {
        return (
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Processar com IA</h3>
                </div>
                <p className="text-gray-600 mb-4">
                    Gere automaticamente um resumo detalhado e FAQs com timestamps usando IA.
                </p>
                {processing ? (
                    <div className="flex items-center gap-2 text-blue-600">
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Processando vídeo com IA... Isso pode levar alguns minutos.</span>
                    </div>
                ) : (
                    <button
                        onClick={processWithAI}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Processar com IA
                    </button>
                )}
            </div>
        );
    }

    if (!aiData?.processed) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Success Indicator */}
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Vídeo processado com IA</span>
            </div>

            {/* Summary Section */}
            {aiData.summary && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Resumo do Vídeo</h3>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert text-gray-600 dark:text-gray-300">
                        <ReactMarkdown>{aiData.summary}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* FAQs Section */}
            {aiData.faqs && aiData.faqs.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                            Perguntas Frequentes ({aiData.faqs.length})
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {aiData.faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">{faq.pergunta}</p>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                            <a
                                                href={`#${faq.tempo}`}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                                            >
                                                {faq.tempo}
                                            </a>
                                        </div>
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
