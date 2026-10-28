import { describe, test, expect } from 'vitest';
import { parseSrtToSegments } from '../utils/srtParser';

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,000
Bem-vindos à aula de hoje.

2
00:00:04,500 --> 00:00:08,000
Vamos falar sobre processamento assíncrono.

3
00:01:02,000 --> 00:01:06,000
Esse trecho já está no segundo minuto.
`;

describe('srtParser.parseSrtToSegments', () => {
    test('extrai os três trechos na ordem do arquivo', () => {
        const segments = parseSrtToSegments(SAMPLE_SRT);
        expect(segments).toHaveLength(3);
        expect(segments[0].text).toBe('Bem-vindos à aula de hoje.');
        expect(segments[2].text).toBe('Esse trecho já está no segundo minuto.');
    });

    test('converte os tempos de início/fim para segundos', () => {
        const segments = parseSrtToSegments(SAMPLE_SRT);
        expect(segments[0].startSeconds).toBe(1);
        expect(segments[0].endSeconds).toBe(4);
        expect(segments[2].startSeconds).toBe(62);
    });

    test('retorna array vazio para entrada vazia ou sem formato SRT', () => {
        expect(parseSrtToSegments(null)).toEqual([]);
        expect(parseSrtToSegments('')).toEqual([]);
        expect(parseSrtToSegments('texto qualquer sem timestamps')).toEqual([]);
    });
});
