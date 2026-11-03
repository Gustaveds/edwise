import React from 'react';

// Anel de progresso simples (SVG), usado no painel do aluno para mostrar o
// quanto do curso já foi concluído (MEL-05).
interface ProgressRingProps {
    percent: number; // 0–100
    size?: number;
    strokeWidth?: number;
    label?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ percent, size = 44, strokeWidth = 4, label }) => {
    const clamped = Math.min(100, Math.max(0, percent));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - clamped / 100);

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-ink-100"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="text-brand-500 transition-[stroke-dashoffset] duration-500"
                />
            </svg>
            <span className="absolute text-[11px] font-mono font-semibold text-ink-700">
                {label ?? `${Math.round(clamped)}%`}
            </span>
        </div>
    );
};

export default ProgressRing;
