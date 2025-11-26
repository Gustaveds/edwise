import { WebhookPayload, WebhookEvent } from '../types';

const WEBHOOK_URL_STORAGE_KEY = 'edwise_webhook_urls';

type WebhookUrlMap = Record<string, string>;

/**
 * Saves a webhook URL for a specific event type to local storage.
 * @param url The URL to save.
 * @param eventType The event type associated with the URL.
 */
export const saveWebhookUrl = (url: string, eventType: WebhookEvent): void => {
    try {
        const currentUrls = getAllWebhookUrls();
        const updatedUrls = { ...currentUrls, [eventType]: url };
        localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, JSON.stringify(updatedUrls));
    } catch (error) {
        console.error("Could not save webhook URL to local storage:", error);
    }
};

/**
 * Retrieves all saved webhook URLs.
 * @returns A map of event types to URLs.
 */
export const getAllWebhookUrls = (): WebhookUrlMap => {
    try {
        const stored = localStorage.getItem(WEBHOOK_URL_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error("Could not retrieve webhook URLs from local storage:", error);
        return {};
    }
}

/**
 * Retrieves the webhook URL for a specific event type.
 * @param eventType The event type to get the URL for.
 * @returns The saved URL or null if not found.
 */
export const getWebhookUrl = (eventType: WebhookEvent): string | null => {
    const urls = getAllWebhookUrls();
    return urls[eventType] || null;
};

/**
 * Sends a payload to the configured webhook URL for the specific event.
 * @param payload The webhook payload object.
 */
export const sendWebhook = async (payload: WebhookPayload): Promise<void> => {
    const url = getWebhookUrl(payload.eventType);

    if (!url) {
        console.warn(`URL do Webhook não configurada para o evento "${payload.eventType}". Pulando o envio.`);
        return;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Envio do webhook falhou com o status: ${response.status}`);
        }

        console.log(`Webhook para o evento "${payload.eventType}" enviado com sucesso.`);

    } catch (error) {
        console.error("Erro ao enviar webhook:", error);
        throw error;
    }
};