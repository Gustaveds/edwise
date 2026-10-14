import React from 'react';
import { Loader2, Check } from 'lucide-react';

// As etapas granulares do worker (server/worker.js e videoAI.js) mapeadas
// para os 5 passos que o usuário vê — várias etapas internas viram um só
// passo visível (ex: generating_summary + generating_faqs, que hoje é uma
// única chamada ao Gemini, ainda são reportadas em duas etapas internas).
export const STAGE_STEPS = ['Enviado', 'Transcrevendo', 'Resumindo', 'Indexando', 'Pronto'] as const;

const STAGE_TO_STEP_INDEX: Record<string, number> = {
    initializing: 0,
    downloading: 0,
    transcribing: 1,
    generating_summary: 2,
    generating_faqs: 2,
    creating_embeddings: 3,
    finalizing: 3,
    complete: 4,
};

export const getStepIndex = (status?: string, stage?: string | null): number => {
    if (status === 'ready') return 4;
    if (stage && stage in STAGE_TO_STEP_INDEX) return STAGE_TO_STEP_INDEX[stage];
    return 0;
};

const VideoProcessingSteps: React.FC<{ status?: string; stage?: string | null }> = ({ status, stage }) => {
    const activeIndex = getStepIndex(status, stage);
    return (
        <div className="flex items-start gap-1.5 mt-4">
            {STAGE_STEPS.map((label, index) => {
                const isDone = index < activeIndex;
                const isCurrent = index === activeIndex;
                return (
                    <React.Fragment key={label}>
                        <div className="flex flex-col items-center gap-1.5 w-14 flex-shrink-0">
                            <div
                                className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-semibold transition-colors
                                ${isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-400'}`}
                            >
                                {isDone ? (
                                    <Check className="w-3.5 h-3.5" />
                                ) : isCurrent ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <span
                                className={`text-[10px] text-center leading-tight ${isCurrent ? 'text-brand-700 font-medium' : isDone ? 'text-emerald-700' : 'text-ink-400'
                                    }`}
                            >
                                {label}
                            </span>
                        </div>
                        {index < STAGE_STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 rounded-full mt-3 ${index < activeIndex ? 'bg-emerald-400' : 'bg-ink-100'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default VideoProcessingSteps;
