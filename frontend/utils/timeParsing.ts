// Parsing de timestamps no formato usado pela IA (ex: "t=2m47s", "t=1h5m30s")
// e pelas legendas SRT. Extraído do CoursePlayer para ser reaproveitado pelos
// capítulos (MEL-01) e pela transcrição sincronizada (MEL-02), que precisam
// da mesma conversão tempo-texto <-> segundos.

/**
 * Converte um timestamp no formato "t=1h5m30s" (ou variações: só minutos,
 * só segundos, etc.) para segundos totais. Soma todas as ocorrências de cada
 * unidade em vez de pegar só a primeira — a IA às vezes gera timestamps
 * malformados com uma unidade duplicada (ex: "t=0m1m40s" em vez de "t=1m40s"),
 * e somar as ocorrências lê esse caso corretamente (0m + 1m = 1m).
 */
export function parseTimeLabel(timeStr: string | null | undefined): number | null {
    if (!timeStr) return null;

    const sumUnit = (regex: RegExp): number | null => {
        let total = 0;
        let found = false;
        for (const match of timeStr.matchAll(regex)) {
            total += parseInt(match[1], 10);
            found = true;
        }
        return found ? total : null;
    };

    const hoursSum = sumUnit(/(\d+)h/g);
    const minutesSum = sumUnit(/(\d+)m/g);
    const secondsSum = sumUnit(/(\d+)s/g);

    let totalSeconds = 0;
    if (hoursSum !== null) totalSeconds += hoursSum * 3600;
    if (minutesSum !== null) totalSeconds += minutesSum * 60;
    if (secondsSum !== null) totalSeconds += secondsSum;

    if (hoursSum === null && minutesSum === null && secondsSum === null && !isNaN(Number(timeStr))) {
        totalSeconds = Number(timeStr);
    }
    return totalSeconds > 0 ? totalSeconds : null;
}

/** Formata segundos totais como "mm:ss" (ou "h:mm:ss" quando passa de 1 hora). */
export function formatSeconds(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
    const ss = String(seconds).padStart(2, '0');
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
