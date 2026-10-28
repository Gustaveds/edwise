import { describe, test, expect } from 'vitest';
import { getStepIndex, STAGE_STEPS } from '../components/VideoProcessingSteps';

describe('VideoProcessingSteps.getStepIndex', () => {
    test('status "ready" sempre aponta para a última etapa (Pronto), mesmo sem stage', () => {
        expect(getStepIndex('ready', null)).toBe(STAGE_STEPS.length - 1);
        expect(getStepIndex('ready', undefined)).toBe(STAGE_STEPS.length - 1);
    });

    test('mapeia cada etapa interna do worker para o passo visível correto', () => {
        expect(getStepIndex('processing', 'initializing')).toBe(0);
        expect(getStepIndex('processing', 'downloading')).toBe(0);
        expect(getStepIndex('processing', 'transcribing')).toBe(1);
        expect(getStepIndex('processing', 'generating_summary')).toBe(2);
        expect(getStepIndex('processing', 'generating_faqs')).toBe(2);
        expect(getStepIndex('processing', 'creating_embeddings')).toBe(3);
        expect(getStepIndex('processing', 'finalizing')).toBe(3);
        expect(getStepIndex('processing', 'complete')).toBe(4);
    });

    test('volta para a primeira etapa quando o stage é desconhecido ou ausente', () => {
        expect(getStepIndex('processing', 'algum-stage-novo-nao-mapeado')).toBe(0);
        expect(getStepIndex('processing', null)).toBe(0);
        expect(getStepIndex(undefined, undefined)).toBe(0);
    });

    test('STAGE_STEPS tem exatamente os 5 rótulos exibidos na interface', () => {
        expect(STAGE_STEPS).toEqual(['Enviado', 'Transcrevendo', 'Resumindo', 'Indexando', 'Pronto']);
    });
});
