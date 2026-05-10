import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Check, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type Tone = 'info' | 'success' | 'warning' | 'danger';

interface Toast {
    id: number;
    title: string;
    message?: string;
    tone: Tone;
}

interface ToastContextValue {
    toast: (t: Omit<Toast, 'id'>) => void;
    success: (title: string, message?: string) => void;
    error:   (title: string, message?: string) => void;
    info:    (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<Tone, { ring: string; bg: string; iconBg: string; iconText: string; icon: any; titleColor: string }> = {
    info:    { ring: 'ring-blue-200',    bg: 'bg-blue-50',    iconBg: 'bg-blue-500',    iconText: 'text-white', icon: Info,          titleColor: 'text-blue-900' },
    success: { ring: 'ring-emerald-200', bg: 'bg-emerald-50', iconBg: 'bg-emerald-500', iconText: 'text-white', icon: Check,         titleColor: 'text-emerald-900' },
    warning: { ring: 'ring-amber-200',   bg: 'bg-amber-50',   iconBg: 'bg-amber-500',   iconText: 'text-white', icon: AlertTriangle, titleColor: 'text-amber-900' },
    danger:  { ring: 'ring-red-200',     bg: 'bg-red-50',     iconBg: 'bg-red-500',     iconText: 'text-white', icon: AlertCircle,   titleColor: 'text-red-900' },
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
    const style = TONE_STYLES[toast.tone];
    const Icon = style.icon;
    useEffect(() => {
        const t = setTimeout(() => onDismiss(toast.id), 5000);
        return () => clearTimeout(t);
    }, [toast.id, onDismiss]);

    return (
        <div className={`flex items-start gap-3 ${style.bg} ring-1 ${style.ring} rounded-xl p-4 shadow-card animate-fade-in-up min-w-[280px] max-w-md`}>
            <div className={`w-8 h-8 rounded-lg ${style.iconBg} ${style.iconText} grid place-items-center flex-shrink-0`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${style.titleColor}`}>{toast.title}</p>
                {toast.message && <p className="text-sm text-ink-700 mt-0.5">{toast.message}</p>}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded text-ink-500 hover:bg-white/60 hover:text-ink-900 transition-colors flex-shrink-0"
                aria-label="Fechar"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: number) => {
        setToasts(t => t.filter(x => x.id !== id));
    }, []);

    const push = useCallback((t: Omit<Toast, 'id'>) => {
        setToasts(prev => [...prev, { ...t, id: Date.now() + Math.random() }]);
    }, []);

    const value: ToastContextValue = {
        toast:   push,
        success: (title, message) => push({ title, message, tone: 'success' }),
        error:   (title, message) => push({ title, message, tone: 'danger'  }),
        info:    (title, message) => push({ title, message, tone: 'info'    }),
        warning: (title, message) => push({ title, message, tone: 'warning' }),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
                <div className="pointer-events-auto flex flex-col gap-2 items-end">
                    {toasts.map(t => (
                        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
    return ctx;
};
