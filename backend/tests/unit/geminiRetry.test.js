import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateContentWithRetry } from '../../services/geminiRetry.js';

// isDailyQuotaExceeded não é exportada diretamente, então testamos seu
// comportamento através de generateContentWithRetry: ela decide se vale a
// pena tentar de novo ou falhar na hora.

function dailyQuotaError() {
    const error = new Error('quota exceeded');
    error.status = 429;
    error.errorDetails = [
        {
            '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
            violations: [{ quotaId: 'GenerateContentPaidTierInputTokensPerModelPerDay' }],
        },
    ];
    return error;
}

function perMinuteRateLimitError() {
    const error = new Error('rate limited');
    error.status = 429;
    error.errorDetails = [
        {
            '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
            violations: [{ quotaId: 'GenerateContentPaidTierInputTokensPerMinute' }],
        },
    ];
    return error;
}

function serverOverloadedError() {
    const error = new Error('service unavailable');
    error.status = 503;
    return error;
}

function nonRetryableError() {
    const error = new Error('bad request');
    error.status = 400;
    return error;
}

describe('geminiRetry.generateContentWithRetry', () => {
    test('falha imediatamente (sem retry) quando a cota diária acabou', async () => {
        let calls = 0;
        const model = {
            generateContent: async () => {
                calls++;
                throw dailyQuotaError();
            },
        };

        await assert.rejects(
            () => generateContentWithRetry(model, 'prompt', { maxRetries: 4, baseDelayMs: 1, maxDelayMs: 1 }),
            /Limite diário gratuito/
        );
        assert.equal(calls, 1, 'não deve tentar de novo quando a cota diária esgotou');
    });

    test('tenta novamente em erro 429 que não é de cota diária, e retorna no sucesso', async () => {
        let calls = 0;
        const model = {
            generateContent: async () => {
                calls++;
                if (calls < 3) throw perMinuteRateLimitError();
                return { response: { text: () => 'ok' } };
            },
        };

        const result = await generateContentWithRetry(model, 'prompt', { maxRetries: 4, baseDelayMs: 1, maxDelayMs: 1 });
        assert.equal(calls, 3);
        assert.equal(result.response.text(), 'ok');
    });

    test('tenta novamente em erro 503 (servidor sobrecarregado)', async () => {
        let calls = 0;
        const model = {
            generateContent: async () => {
                calls++;
                if (calls < 2) throw serverOverloadedError();
                return { response: { text: () => 'ok' } };
            },
        };

        const result = await generateContentWithRetry(model, 'prompt', { maxRetries: 4, baseDelayMs: 1, maxDelayMs: 1 });
        assert.equal(calls, 2);
        assert.equal(result.response.text(), 'ok');
    });

    test('propaga o erro original quando o código de status não é retentável', async () => {
        let calls = 0;
        const model = {
            generateContent: async () => {
                calls++;
                throw nonRetryableError();
            },
        };

        await assert.rejects(
            () => generateContentWithRetry(model, 'prompt', { maxRetries: 4, baseDelayMs: 1, maxDelayMs: 1 }),
            /bad request/
        );
        assert.equal(calls, 1, 'erro não-retentável não deve gerar novas tentativas');
    });

    test('desiste após esgotar o número máximo de tentativas', async () => {
        let calls = 0;
        const model = {
            generateContent: async () => {
                calls++;
                throw serverOverloadedError();
            },
        };

        await assert.rejects(
            () => generateContentWithRetry(model, 'prompt', { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 }),
            /service unavailable/
        );
        assert.equal(calls, 3, 'tentativa inicial + 2 retries = 3 chamadas');
    });
});
