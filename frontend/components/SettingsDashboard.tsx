import React, { useState, useEffect } from 'react';
import { getAllWebhookUrls, saveWebhookUrl } from '../services/webhookService';
import { Save, Webhook } from 'lucide-react';
import { WebhookEvent } from '../types';
import { useToast } from './ui/Toast';

const SettingsDashboard: React.FC = () => {
    const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({});
    const toast = useToast();

    useEffect(() => {
        setWebhookUrls(getAllWebhookUrls());
    }, []);

    const handleUrlChange = (eventType: string, value: string) => {
        setWebhookUrls(prev => ({ ...prev, [eventType]: value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        Object.entries(webhookUrls).forEach(([eventType, url]) => {
            if (url) saveWebhookUrl(url, eventType as WebhookEvent);
        });
        toast.success('Configurações salvas', 'Suas URLs de webhook foram atualizadas.');
    };

    const webhookLabels: Record<WebhookEvent, string> = {
        [WebhookEvent.CONTENT_UPLOADED]: 'Upload de Conteúdo (YouTube/Arquivos)',
        [WebhookEvent.QUIZ_COMPLETED]:   'Conclusão de Quiz',
        [WebhookEvent.STUDENT_QUESTION]: 'Nova Pergunta do Aluno',
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div>
                <span className="label">Configurações</span>
                <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink-900">
                    Webhooks
                </h2>
                <p className="mt-2 text-base text-ink-600">
                    Configure URLs para receber eventos do sistema em tempo real.
                </p>
            </div>

            <div className="surface p-8">
                <div className="flex items-start gap-4 mb-8 pb-6 border-b border-ink-100">
                    <div className="w-11 h-11 rounded-2xl bg-brand-50 grid place-items-center flex-shrink-0">
                        <Webhook className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h3 className="font-display text-lg font-semibold text-ink-900">Eventos do sistema</h3>
                        <p className="text-sm text-ink-600 mt-0.5">
                            Cada evento dispara um POST para a URL configurada com o payload do evento.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {Object.values(WebhookEvent).map((eventType) => (
                        <div key={eventType}>
                            <label htmlFor={`webhook-${eventType}`} className="label">
                                {webhookLabels[eventType] || eventType}
                            </label>
                            <input
                                type="url"
                                id={`webhook-${eventType}`}
                                value={webhookUrls[eventType] || ''}
                                onChange={(e) => handleUrlChange(eventType, e.target.value)}
                                placeholder={`https://seu-backend.com/webhook/${eventType}`}
                                className="input font-mono text-xs"
                            />
                        </div>
                    ))}

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-ink-100">
                        <button type="submit" className="btn-primary">
                            <Save className="w-4 h-4" />
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsDashboard;
