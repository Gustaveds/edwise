const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);

/**
 * A 429 can mean two very different things: a short burst rate-limit (worth
 * retrying in seconds) or the free tier's PER-DAY quota being fully used up
 * (retrying does nothing until the quota resets, often hours away). Retrying
 * the latter just wastes minutes before failing anyway, which is exactly
 * what made video jobs take 7+ minutes to fail instead of a few seconds.
 */
function isDailyQuotaExceeded(error) {
    if (error.status !== 429 || !Array.isArray(error.errorDetails)) return false;
    return error.errorDetails.some((detail) =>
        detail['@type']?.includes('QuotaFailure') &&
        detail.violations?.some((v) => v.quotaId?.includes('PerDay'))
    );
}

/**
 * Calls model.generateContent(prompt) retrying on transient Gemini errors
 * (429 rate limit, 500/503 server overload) with exponential backoff.
 */
async function generateContentWithRetry(model, prompt, { maxRetries = 4, baseDelayMs = 2000, maxDelayMs = 10_000 } = {}) {
    let attempt = 0;

    while (true) {
        try {
            return await model.generateContent(prompt);
        } catch (error) {
            attempt++;

            if (isDailyQuotaExceeded(error)) {
                console.error('🛑 [GEMINI] Cota diária gratuita esgotada para este modelo — não vale a pena tentar de novo agora.');
                throw new Error(
                    'Limite diário gratuito da API do Gemini foi atingido para este modelo. ' +
                    'Tente novamente mais tarde (a cota reseta diariamente) ou configure faturamento no Google AI Studio.'
                );
            }

            const isRetryable = RETRYABLE_STATUS_CODES.has(error.status);
            if (!isRetryable || attempt > maxRetries) {
                throw error;
            }

            const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
            console.warn(`⚠️  [GEMINI] ${error.status} recebido, tentando novamente em ${delay}ms (tentativa ${attempt}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

export { generateContentWithRetry };
