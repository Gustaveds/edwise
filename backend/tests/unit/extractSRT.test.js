import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseSRT } from '../../services/extractSRT.js';

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

describe('extractSRT.parseSRT', () => {
    test('agrupa as legendas pelo minuto de início', () => {
        const grouped = parseSRT(SAMPLE_SRT);

        assert.ok(Object.prototype.hasOwnProperty.call(grouped, '0'), 'deve ter entradas no minuto 0');
        assert.ok(Object.prototype.hasOwnProperty.call(grouped, '1'), 'deve ter entradas no minuto 1');
        assert.equal(grouped['0'].length, 2);
        assert.equal(grouped['1'].length, 1);
    });

    test('extrai o texto normalizando espaços em branco', () => {
        const grouped = parseSRT(SAMPLE_SRT);
        assert.equal(grouped['0'][0].text, 'Bem-vindos à aula de hoje.');
        assert.equal(grouped['0'][1].text, 'Vamos falar sobre processamento assíncrono.');
    });

    test('monta o timestamp no formato HhMmSs usado pelos links do player', () => {
        const grouped = parseSRT(SAMPLE_SRT);
        assert.equal(grouped['0'][0].timestamp, '0h0m1s');
        assert.equal(grouped['1'][0].timestamp, '0h1m2s');
    });

    test('retorna objeto vazio para texto sem legendas válidas', () => {
        const grouped = parseSRT('conteúdo sem formato de SRT nenhum');
        assert.deepEqual(grouped, {});
    });
});
