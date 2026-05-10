import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, Info, Trash2, Check, AlertCircle } from 'lucide-react';
import Modal from './Modal';

type Tone = 'info' | 'warning' | 'danger' | 'success';

interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: Tone;
}

interface AlertOptions {
    title: string;
    message?: string;
    tone?: Tone;
}

type Resolver = (value: boolean) => void;

interface DialogState {
    options: ConfirmOptions;
    resolve: Resolver;
    /** When true → only OK button (alert mode). */
    alertOnly?: boolean;
}

interface DialogContextValue {
    confirm: (opts: ConfirmOptions) => Promise<boolean>;
    notify: (opts: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

const TONE_STYLES: Record<Tone, { iconBg: string; iconText: string; icon: any; confirmBtn: string }> = {
    info:    { iconBg: 'bg-blue-50',    iconText: 'text-blue-600',    icon: Info,           confirmBtn: 'btn-primary' },
    success: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', icon: Check,          confirmBtn: 'btn-primary' },
    warning: { iconBg: 'bg-amber-50',   iconText: 'text-amber-600',   icon: AlertTriangle,  confirmBtn: 'btn-primary' },
    danger:  { iconBg: 'bg-red-50',     iconText: 'text-red-600',     icon: Trash2,         confirmBtn: 'btn bg-red-600 text-white hover:bg-red-700 shadow-card' },
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dialog, setDialog] = useState<DialogState | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>(resolve => {
            setDialog({ options, resolve });
        });
    }, []);

    const notify = useCallback((options: AlertOptions) => {
        return new Promise<void>(resolve => {
            setDialog({
                options: { ...options, confirmLabel: 'OK' },
                resolve: () => resolve(),
                alertOnly: true,
            });
        });
    }, []);

    const close = (value: boolean) => {
        if (!dialog) return;
        dialog.resolve(value);
        setDialog(null);
    };

    const tone = dialog?.options.tone || 'info';
    const style = TONE_STYLES[tone];
    const Icon = style?.icon || AlertCircle;

    return (
        <DialogContext.Provider value={{ confirm, notify }}>
            {children}
            <Modal
                isOpen={!!dialog}
                onClose={() => close(false)}
                size="sm"
            >
                {dialog && (
                    <div className="-mt-4">
                        <div className="flex items-start gap-4">
                            <div className={`w-11 h-11 rounded-2xl grid place-items-center ${style.iconBg} ${style.iconText} flex-shrink-0`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-display text-lg font-semibold text-ink-900 leading-tight">
                                    {dialog.options.title}
                                </h3>
                                {dialog.options.message && (
                                    <p className="mt-1.5 text-sm text-ink-600">{dialog.options.message}</p>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                            {!dialog.alertOnly && (
                                <button onClick={() => close(false)} className="btn-secondary">
                                    {dialog.options.cancelLabel || 'Cancelar'}
                                </button>
                            )}
                            <button onClick={() => close(true)} className={style.confirmBtn}>
                                {dialog.options.confirmLabel || (dialog.alertOnly ? 'OK' : 'Confirmar')}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>');
    return ctx;
};
