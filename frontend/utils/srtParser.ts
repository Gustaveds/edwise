// Parser de legendas SRT para a transcrição sincronizada (MEL-02). Mesma
// gramática usada no parser do backend (backend/services/extractSRT.js),
// mas devolvendo uma lista linear com os tempos já em segundos — mais fácil
// de usar para destacar a linha atual e dar scroll/busca no frontend.

export interface TranscriptSegment {
    startSeconds: number;
    endSeconds: number;
    text: string;
}

const SRT_BLOCK_REGEX =
    /(\d+)\s+(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})\s+([\s\S]*?)(?=\s+\d+\s+\d{2}:\d{2}:\d{2},\d{3}|\s*$)/g;

function toSeconds(hh: string, mm: string, ss: string, ms: string): number {
    return parseInt(hh, 10) * 3600 + parseInt(mm, 10) * 60 + parseInt(ss, 10) + parseInt(ms, 10) / 1000;
}

export function parseSrtToSegments(srtText: string | null | undefined): TranscriptSegment[] {
    if (!srtText) return [];

    const segments: TranscriptSegment[] = [];
    let match: RegExpExecArray | null;
    // matchAll clona o regex implicitamente a cada chamada; usamos exec em
    // loop com uma instância nova para não reaproveitar o `lastIndex`.
    const regex = new RegExp(SRT_BLOCK_REGEX);
    while ((match = regex.exec(srtText)) !== null) {
        const startSeconds = toSeconds(match[2], match[3], match[4], match[5]);
        const endSeconds = toSeconds(match[6], match[7], match[8], match[9]);
        const text = match[10].replace(/\s+/g, ' ').trim();
        if (text) {
            segments.push({ startSeconds, endSeconds, text });
        }
    }
    return segments;
}
