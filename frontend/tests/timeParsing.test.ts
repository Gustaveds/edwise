import { describe, test, expect } from 'vitest';
import { parseTimeLabel, formatSeconds } from '../utils/timeParsing';

describe('timeParsing.parseTimeLabel', () => {
    test('converte horas, minutos e segundos combinados', () => {
        expect(parseTimeLabel('t=1h5m30s')).toBe(1 * 3600 + 5 * 60 + 30);
    });

    test('converte só minutos e segundos', () => {
        expect(parseTimeLabel('t=15m10s')).toBe(15 * 60 + 10);
    });

    test('converte só segundos', () => {
        expect(parseTimeLabel('t=45s')).toBe(45);
    });

    test('soma unidades duplicadas em timestamps malformados da IA', () => {
        expect(parseTimeLabel('t=0m1m40s')).toBe(1 * 60 + 40);
    });

    test('retorna null para entrada vazia ou nula', () => {
        expect(parseTimeLabel('')).toBeNull();
        expect(parseTimeLabel(null)).toBeNull();
        expect(parseTimeLabel(undefined)).toBeNull();
    });

    test('retorna null quando o resultado é zero (timestamp inválido)', () => {
        expect(parseTimeLabel('t=0s')).toBeNull();
    });
});

describe('timeParsing.formatSeconds', () => {
    test('formata menos de uma hora como mm:ss', () => {
        expect(formatSeconds(75)).toBe('1:15');
        expect(formatSeconds(5)).toBe('0:05');
    });

    test('formata uma hora ou mais como h:mm:ss', () => {
        expect(formatSeconds(3665)).toBe('1:01:05');
    });

    test('lida com valores inválidos sem quebrar', () => {
        expect(formatSeconds(NaN)).toBe('0:00');
        expect(formatSeconds(-10)).toBe('0:00');
    });
});
