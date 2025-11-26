import React, { useState, useEffect } from 'react';
import { getAllWebhookUrls, saveWebhookUrl } from '../services/webhookService';
import { Save, CheckCircle, Webhook } from 'lucide-react';
import { WebhookEvent } from '../types';

const SettingsDashboard: React.FC = () => {
    const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const urls = getAllWebhookUrls();
        setWebhookUrls(urls);
    }, []);

    const handleUrlChange = (eventType: string, value: string) => {
        setWebhookUrls(prev => ({ ...prev, [eventType]: value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        Object.entries(webhookUrls).forEach(([eventType, url]) => {
            if (url) {
                saveWebhookUrl(url, eventType as WebhookEvent);
            }
        });

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const webhookLabels: Record<WebhookEvent, string> = {
        [WebhookEvent.CONTENT_UPLOADED]: 'Upload de Conteúdo (YouTube/Arquivos)',
        [WebhookEvent.QUIZ_COMPLETED]: 'Conclusão de Quiz',
        [WebhookEvent.STUDENT_QUESTION]: 'Nova Pergunta do Aluno',
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-2xl mx-auto">
            <div className="flex items-center mb-6">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full mr-4">
                    <Webhook className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Configurações de Webhook</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Configure URLs para receber eventos do sistema em tempo real.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {Object.values(WebhookEvent).map((eventType) => (
                    <div key={eventType}>
                        <label htmlFor={`webhook-${eventType}`} className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {webhookLabels[eventType] || eventType}
                        </label>
                        <input
                            type="text"
                            id={`webhook-${eventType}`}
                            value={webhookUrls[eventType] || ''}
                            onChange={(e) => handleUrlChange(eventType, e.target.value)}
                            placeholder={`https://seu-backend.com/webhook/${eventType}`}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>
                ))}

                <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {saved && (
                        <div className="flex items-center text-green-600 dark:text-green-400 animate-fade-in">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            <span className="font-medium">Configurações salvas!</span>
                        </div>
                    )}
                    <button
                        type="submit"
                        className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center shadow-md hover:shadow-lg"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        Salvar Alterações
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsDashboard;
