import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { parseTimeLabel, formatSeconds } from '../utils/timeParsing';

// MEL-01 — Capítulos na timeline do player. Nenhum dado novo é gerado: os
// capítulos vêm das FAQs que a IA já extrai do vídeo (pergunta + tempo), só
// ganham uma exibição visual (marcadores + lista clicável) que hoje fica
// presa em texto corrido na aba "Dados IA".

interface Faq {
    pergunta: string;
    tempo: string;
}

interface Chapter {
    pergunta: string;
    seconds: number;
}

interface VideoChaptersProps {
    faqs: Faq[];
    duration: number;
    currentTime: number;
    onSeek: (seconds: number) => void;
}

function buildChapters(faqs: Faq[]): Chapter[] {
    const chapters = faqs
        .map((faq) => ({ pergunta: faq.pergunta, seconds: parseTimeLabel(faq.tempo) }))
        .filter((c): c is Chapter => c.seconds !== null);
    chapters.sort((a, b) => a.seconds - b.seconds);
    return chapters;
}

const VideoChapters: React.FC<VideoChaptersProps> = ({ faqs, duration, currentTime, onSeek }) => {
    const chapters = useMemo(() => buildChapters(faqs), [faqs]);

    if (chapters.length === 0) return null;

    const activeIndex = chapters.reduce(
        (active, chapter, index) => (chapter.seconds <= currentTime ? index : active),
        -1
    );

    return (
        <div className="px-4 pt-3 pb-1">
            {/* Faixa de marcadores — não há como desenhar em cima da barra
                nativa do <video controls>, então os marcadores ficam numa
                faixa própria logo abaixo do player, proporcional à duração. */}
            {duration > 0 && (
                <div className="relative h-2 rounded-full bg-ink-100 mb-3">
                    {chapters.map((chapter, index) => (
                        <button
                            key={index}
                            type="button"
                            title={`${formatSeconds(chapter.seconds)} — ${chapter.pergunta}`}
                            onClick={() => onSeek(chapter.seconds)}
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-white transition-colors
                                ${index === activeIndex ? 'bg-brand-600' : 'bg-ink-400 hover:bg-brand-400'}`}
                            style={{ left: `${Math.min(100, Math.max(0, (chapter.seconds / duration) * 100))}%` }}
                        />
                    ))}
                </div>
            )}

            <p className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-2">
                Capítulos ({chapters.length})
            </p>
            <div className="space-y-1">
                {chapters.map((chapter, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => onSeek(chapter.seconds)}
                        className={`w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors
                            ${index === activeIndex ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-ink-50'}`}
                    >
                        <span className="inline-flex items-center gap-1 flex-shrink-0 text-xs font-mono mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatSeconds(chapter.seconds)}
                        </span>
                        <span className="text-sm leading-snug">{chapter.pergunta}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default VideoChapters;
