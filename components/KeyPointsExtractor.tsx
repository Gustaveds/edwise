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
        if (e.target.files && e.target.files.length > 0) {
            setFileName(e.target.files[0].name);
        }
    };
    
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFileName(e.dataTransfer.files[0].name);
        }
    }, []);

    const resetState = () => {
        setIsLoading(false);
        setKeyPoints(null);
        setError(null);
    };

    const handleTabChange = (tab: 'youtube' | 'file') => {
        setActiveTab(tab);
        setYoutubeUrl('');
        setFileName(null);
        resetState();
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setKeyPoints(null);
        setError(null);

        try {
            let context = '';
            if (activeTab === 'youtube') {
                if (!youtubeUrl.trim()) throw new Error("Por favor, insira uma URL do YouTube.");
                context = `Este é um resumo simulado do conteúdo do vídeo do YouTube em: ${youtubeUrl}. O vídeo discute os fundamentos da programação, incluindo variáveis, tipos de dados e estruturas de controle como laços e condicionais. Ele também aborda a importância de escrever código limpo e de funções para reutilização.`;
            } else {
                if (!fileName) throw new Error("Por favor, selecione um arquivo.");
                context = `Este é um resumo simulado do conteúdo do arquivo chamado "${fileName}". O documento cobre tópicos avançados de estruturas de dados, como árvores, grafos e algoritmos de ordenação. Ele explica a notação Big O para análise de complexidade.`;
            }
            
            const points = await extractKeyPoints(context);
            setKeyPoints(points);

        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro desconhecido.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);

    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg w-full h-full">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Extrair Pontos-Chave do Conteúdo</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Envie um material para que a IA extraia os principais objetivos de aprendizado.</p>
            
            <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-xl flex items-center space-x-1 mb-6 max-w-sm">
                 <button onClick={() => handleTabChange('youtube')} className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'youtube' ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                    <Youtube className="w-5 h-5"/>
                    <span>Vídeo do YouTube</span>
                </button>
                <button onClick={() => handleTabChange('file')} className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'file' ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                    <Upload className="w-5 h-5"/>
                    <span>Envio de Arquivo</span>
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {activeTab === 'youtube' && (
                    <div className="space-y-4">
                        <label htmlFor="youtubeUrl-extractor" className="font-semibold text-gray-700 dark:text-gray-300">URL do YouTube</label>
                        <input 
                            type="text" 
                            id="youtubeUrl-extractor"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder-gray-500 dark:placeholder-gray-400"
                        />
                    </div>
                )}

                {activeTab === 'file' && (
                    <div className="space-y-4">
                        <label className="font-semibold text-gray-700 dark:text-gray-300">Enviar Arquivo</label>
                        <div 
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={() => document.getElementById('file-input-extractor')?.click()}
                            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'}`}
                        >
                            <Upload className="w-10 h-10 text-gray-400 mb-3"/>
                            <p className="text-gray-600 dark:text-gray-300 font-semibold">{fileName ? fileName : 'Clique para procurar ou arraste e solte um arquivo'}</p>
                            <p className="text-xs text-gray-400 mt-1">{fileName ? 'Clique para substituir' : 'PDF, DOCX, TXT, etc.'}</p>
                            <input id="file-input-extractor" type="file" onChange={handleFileChange} className="hidden" />
                        </div>
                    </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full mt-6 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center">
                    {isLoading ? (
                        <>
                           <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                            Extraindo...
                        </>
                    ) : (
                        <>
                        <Key className="w-5 h-5 mr-2" />
                        Extrair Pontos-Chave
                        </>
                    )}
                </button>
            </form>

            {/* Results Section */}
            <div className="mt-8">
                {isLoading && (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                        <p>Analisando o conteúdo, isso pode levar um momento...</p>
                    </div>
                )}
                {error && (
                    <div className="flex items-center p-4 rounded-lg bg-red-100 text-red-800">
                        <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {keyPoints && keyPoints.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                            <CheckCircle className="w-6 h-6 mr-2 text-green-500"/>
                            Pontos-Chave Extraídos com Sucesso
                        </h4>
                        <ul className="space-y-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                            {keyPoints.map((point, index) => (
                                <li key={index} className="text-gray-700 dark:text-gray-200 flex items-start">
                                    <CheckCircle className="w-4 h-4 mr-3 mt-1 text-blue-500 flex-shrink-0"/>
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