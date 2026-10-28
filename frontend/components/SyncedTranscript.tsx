import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { parseSrtToSegments } from '../utils/srtParser';
import { formatSeconds } from '../utils/timeParsing';

// MEL-02 — Transcrição sincronizada com busca. A transcrição (SRT bruto) já
// vem do backend com timestamp por trecho; aqui ela vira uma lista de linhas
// clicáveis, destacando a linha atual conforme o vídeo avança, com um campo
// de busca que filtra e realça o termo dentro da aula.

interface SyncedTranscriptProps {
    transcription: string | null;
    currentTime: number;
    onSeek: (seconds: number) => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query) return text;
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-brand-200 text-brand-900 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
}

const SyncedTranscript: React.FC<SyncedTranscriptProps> = ({ transcription, currentTime, onSeek }) => {
    const [query, setQuery] = useState('');
    const activeRef = useRef<HTMLButtonElement | null>(null);

    const segments = useMemo(() => parseSrtToSegments(transcription), [transcription]);

    const activeIndex = useMemo(
        () => segments.findIndex((seg) => currentTime >= seg.startSeconds && currentTime < seg.endSeconds),
        [segments, currentTime]
    );

    const filtered = useMemo(() => {
        if (!query.trim()) return segments.map((seg, index) => ({ ...seg, index }));
        const q = query.trim().toLowerCase();
        return segments
            .map((seg, index) => ({ ...seg, index }))
            .filter((seg) => seg.text.toLowerCase().includes(q));
    }, [segments, query]);

    useEffect(() => {
        if (!query && activeRef.current) {
            activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [activeIndex, query]);

    if (segments.length === 0) return null;

    return (
        <div>
            <div className="relative mb-3">
                <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar na transcrição..."
                    className="input !pl-9 !pr-8 text-sm w-full"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                        aria-label="Limpar busca"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {filtered.length === 0 ? (
                <p className="text-sm text-ink-500 text-center py-6">Nenhum trecho encontrado para "{query}".</p>
            ) : (
                <div className="max-h-[360px] overflow-y-auto ds-scroll space-y-0.5">
                    {filtered.map((seg) => (
                        <button
                            key={seg.index}
                            ref={seg.index === activeIndex ? activeRef : undefined}
                            type="button"
                            onClick={() => onSeek(seg.startSeconds)}
                            className={`w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors
                                ${seg.index === activeIndex ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-ink-50'}`}
                        >
                            <span className="flex-shrink-0 text-xs font-mono text-ink-400 mt-0.5 tabular-nums">
                                {formatSeconds(seg.startSeconds)}
                            </span>
                            <span className="text-sm leading-snug">{highlightMatch(seg.text, query)}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SyncedTranscript;
