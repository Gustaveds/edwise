const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);

/**
 * Calls model.generateContent(prompt) retrying on transient Gemini errors
 * (429 rate limit, 500/503 server overload) with exponential backoff.
 */
async function generateContentWithRetry(model, prompt, { maxRetries = 3, baseDelayMs = 2000 } = {}) {
    let attempt = 0;

    while (true) {
        try {
            return await model.generateContent(prompt);
        } catch (error) {
            const isRetryable = RETRYABLE_STATUS_CODES.has(error.status);
            attempt++;

            if (!isRetryable || attempt > maxRetries) {
                throw error;
            }

            const delay = baseDelayMs * 2 ** (attempt - 1);
            console.warn(`⚠️  [GEMINI] ${error.status} recebido, tentando novamente em ${delay}ms (tentativa ${attempt}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

export { generateContentWithRetry };
